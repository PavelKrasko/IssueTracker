package httpapi

import (
	"context"
	"errors"
	"net/http"
	"slices"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"issuetracker/internal/database/db"
)

type ctxKey int

const (
	ctxUserID ctxKey = iota
	ctxProject
)

func userID(r *http.Request) uuid.UUID {
	id, _ := r.Context().Value(ctxUserID).(uuid.UUID)
	return id
}

func project(r *http.Request) db.GetProjectForUserRow {
	p, _ := r.Context().Value(ctxProject).(db.GetProjectForUserRow)
	return p
}

var roleRank = map[db.ProjectRole]int{db.ProjectRoleViewer: 0, db.ProjectRoleMember: 1, db.ProjectRoleAdmin: 2, db.ProjectRoleOwner: 3}

func requireRole(r *http.Request, min db.ProjectRole) error {
	if roleRank[project(r).Role] < roleRank[min] {
		switch min {
		case db.ProjectRoleMember:
			return errForbidden("У вас доступ только на просмотр. Попросите администратора проекта выдать роль «Участник».")
		case db.ProjectRoleAdmin:
			return errForbidden("Это действие доступно только администраторам проекта.")
		default:
			return errForbidden("Это действие доступно только владельцу проекта.")
		}
	}
	return nil
}

func (s *Server) requestLogger(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ww := middleware.NewWrapResponseWriter(w, r.ProtoMajor)
		start := time.Now()
		next.ServeHTTP(ww, r)
		s.log.Info("http", "method", r.Method, "path", r.URL.Path, "status", ww.Status(),
			"duration_ms", time.Since(start).Milliseconds(), "request_id", middleware.GetReqID(r.Context()))
	})
}

func (s *Server) cors(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		if origin != "" && slices.Contains(s.cfg.AllowedOrigins, origin) {
			h := w.Header()
			h.Set("Access-Control-Allow-Origin", origin)
			h.Set("Access-Control-Allow-Credentials", "true")
			h.Set("Vary", "Origin")
			if r.Method == http.MethodOptions {
				h.Set("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS")
				h.Set("Access-Control-Allow-Headers", "Content-Type")
				h.Set("Access-Control-Max-Age", "600")
				w.WriteHeader(http.StatusNoContent)
				return
			}
		}
		next.ServeHTTP(w, r)
	})
}

func (s *Server) originCheck(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet, http.MethodHead, http.MethodOptions:
		default:
			if origin := r.Header.Get("Origin"); origin != "" && !slices.Contains(s.cfg.AllowedOrigins, origin) {
				writeJSON(w, http.StatusForbidden, errForbidden("Запрос с недоверенного адреса отклонён."))
				return
			}
		}
		next.ServeHTTP(w, r)
	})
}

func (s *Server) authRequired(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		c, err := r.Cookie(accessCookie)
		if err != nil {
			writeJSON(w, http.StatusUnauthorized, errUnauthorized("Войдите, чтобы продолжить."))
			return
		}
		id, err := s.tokens.ParseAccessToken(c.Value)
		if err != nil {
			writeJSON(w, http.StatusUnauthorized, errUnauthorized("Сессия истекла. Войдите снова."))
			return
		}
		next.ServeHTTP(w, r.WithContext(context.WithValue(r.Context(), ctxUserID, id)))
	})
}

func (s *Server) projectAccess(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		pid, err := uuid.Parse(chi.URLParam(r, "projectID"))
		if err != nil {
			writeJSON(w, http.StatusNotFound, errNotFound("Проект не найден."))
			return
		}
		p, err := s.q.GetProjectForUser(r.Context(), db.GetProjectForUserParams{UserID: userID(r), ProjectID: pid})
		if errors.Is(err, pgx.ErrNoRows) {
			writeJSON(w, http.StatusNotFound, errNotFound("Проект не найден или у вас нет к нему доступа."))
			return
		}
		if err != nil {
			s.fail(w, r, err)
			return
		}
		next.ServeHTTP(w, r.WithContext(context.WithValue(r.Context(), ctxProject, p)))
	})
}

func urlUUID(r *http.Request, name, what string) (uuid.UUID, error) {
	id, err := uuid.Parse(chi.URLParam(r, name))
	if err != nil {
		return uuid.Nil, errNotFound(what + " не найден(а).")
	}
	return id, nil
}
