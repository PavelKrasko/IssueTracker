package httpapi

import (
	"log/slog"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/jackc/pgx/v5/pgxpool"

	"issuetracker/internal/auth"
	"issuetracker/internal/config"
	"issuetracker/internal/database/db"
	"issuetracker/internal/storage"
	"issuetracker/internal/telegram"
)

type Server struct {
	cfg    *config.Config
	pool   *pgxpool.Pool
	q      *db.Queries
	tokens *auth.Tokens
	store  storage.Storage
	oauth  map[string]*auth.Provider
	bot    *telegram.Bot
	log    *slog.Logger
}

func NewServer(cfg *config.Config, pool *pgxpool.Pool, store storage.Storage, log *slog.Logger) *Server {
	s := &Server{
		cfg:    cfg,
		pool:   pool,
		q:      db.New(pool),
		tokens: auth.NewTokens(cfg.JWTSecret, cfg.AccessTTL),
		store:  store,
		oauth:  map[string]*auth.Provider{},
		log:    log,
	}
	if cfg.Google.Enabled() {
		s.oauth["google"] = auth.NewGoogle(cfg.Google.ClientID, cfg.Google.ClientSecret, cfg.APIPublicURL+"/auth/oauth/google/callback")
	}
	if cfg.GitHub.Enabled() {
		s.oauth["github"] = auth.NewGitHub(cfg.GitHub.ClientID, cfg.GitHub.ClientSecret, cfg.APIPublicURL+"/auth/oauth/github/callback")
	}
	if cfg.TelegramToken != "" {
		s.bot = telegram.New(cfg.TelegramAPIURL, cfg.TelegramToken, cfg.TelegramBotUsername, log)
	}
	return s
}

func (s *Server) h(fn func(http.ResponseWriter, *http.Request) error) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if err := fn(w, r); err != nil {
			s.fail(w, r, err)
		}
	}
}

func (s *Server) Routes() http.Handler {
	r := chi.NewRouter()
	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(s.requestLogger)
	r.Use(middleware.Recoverer)
	r.Use(s.cors)
	r.Use(s.originCheck)
	r.Use(middleware.Timeout(60 * time.Second))

	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		if err := s.pool.Ping(r.Context()); err != nil {
			writeJSON(w, http.StatusServiceUnavailable, map[string]string{"status": "db down"})
			return
		}
		writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
	})

	r.Route("/api", func(r chi.Router) {
		r.Get("/openapi.yaml", s.openapi)
		r.Get("/docs", s.swaggerUI)

		r.Route("/auth", func(r chi.Router) {
			r.Post("/register", s.h(s.register))
			r.Post("/login", s.h(s.login))
			r.Post("/refresh", s.h(s.refresh))
			r.Post("/logout", s.h(s.logout))
			r.Get("/providers", s.h(s.providers))
			r.Get("/oauth/{provider}", s.h(s.oauthStart))
			r.Get("/oauth/{provider}/callback", s.h(s.oauthCallback))
			r.With(s.authRequired).Get("/me", s.h(s.me))
		})

		r.Group(func(r chi.Router) {
			r.Use(s.authRequired)

			r.Patch("/users/me", s.h(s.updateMe))
			r.Post("/users/me/password", s.h(s.changePassword))
			r.Delete("/users/me/providers/{provider}", s.h(s.disconnectProvider))
			r.Post("/users/me/avatar", s.h(s.uploadAvatar))
			r.Delete("/users/me/avatar", s.h(s.deleteAvatar))
			r.Get("/users/{userID}/avatar", s.h(s.userAvatar))
			r.Get("/users/me/telegram", s.h(s.getTelegram))
			r.Post("/users/me/telegram/link", s.h(s.linkTelegram))
			r.Patch("/users/me/telegram", s.h(s.updateTelegram))
			r.Delete("/users/me/telegram", s.h(s.unlinkTelegram))

			r.Get("/notifications", s.h(s.listNotifications))
			r.Post("/notifications/read", s.h(s.readNotifications))

			r.Get("/projects", s.h(s.listProjects))
			r.Post("/projects", s.h(s.createProject))

			r.Route("/projects/{projectID}", func(r chi.Router) {
				r.Use(s.projectAccess)
				r.Get("/", s.h(s.getProject))
				r.Patch("/", s.h(s.updateProject))
				r.Delete("/", s.h(s.deleteProject))

				r.Get("/members", s.h(s.listMembers))
				r.Post("/members", s.h(s.addMember))
				r.Patch("/members/{userID}", s.h(s.updateMember))
				r.Delete("/members/{userID}", s.h(s.removeMember))
				r.Delete("/invites/{inviteID}", s.h(s.deleteInvite))

				r.Get("/teams", s.h(s.listTeams))
				r.Post("/teams", s.h(s.createTeam))
				r.Patch("/teams/{teamID}", s.h(s.updateTeam))
				r.Delete("/teams/{teamID}", s.h(s.deleteTeam))
				r.Post("/teams/{teamID}/members", s.h(s.addTeamMember))
				r.Delete("/teams/{teamID}/members/{userID}", s.h(s.removeTeamMember))

				r.Get("/issues", s.h(s.listIssues))
				r.Post("/issues", s.h(s.createIssue))
				r.Get("/issues/{issueID}", s.h(s.getIssue))
				r.Patch("/issues/{issueID}", s.h(s.updateIssue))
				r.Delete("/issues/{issueID}", s.h(s.deleteIssue))
				r.Get("/issues/{issueID}/events", s.h(s.listIssueEvents))
				r.Post("/issues/{issueID}/attachments", s.h(s.uploadAttachment))
				r.Delete("/issues/{issueID}/attachments/{attachmentID}", s.h(s.deleteAttachment))
				r.Get("/attachments/{attachmentID}/content", s.h(s.attachmentContent))

				r.Get("/issues/{issueID}/comments", s.h(s.listComments))
				r.Post("/issues/{issueID}/comments", s.h(s.createComment))
				r.Patch("/comments/{commentID}", s.h(s.updateComment))
				r.Delete("/comments/{commentID}", s.h(s.deleteComment))
				r.Put("/issues/{issueID}/watchers/me", s.h(s.watchIssue))
				r.Delete("/issues/{issueID}/watchers/me", s.h(s.unwatchIssue))
				r.Get("/issues/{issueID}/worklogs", s.h(s.listWorklogs))
				r.Post("/issues/{issueID}/worklogs", s.h(s.createWorklog))
				r.Delete("/worklogs/{worklogID}", s.h(s.deleteWorklog))
				r.Get("/time-report", s.h(s.timeReport))

				r.Get("/sprints", s.h(s.listSprints))
				r.Post("/sprints", s.h(s.createSprint))
				r.Patch("/sprints/{sprintID}", s.h(s.updateSprint))
				r.Delete("/sprints/{sprintID}", s.h(s.deleteSprint))
				r.Post("/sprints/{sprintID}/start", s.h(s.startSprint))
				r.Post("/sprints/{sprintID}/complete", s.h(s.completeSprint))
				r.Get("/sprints/{sprintID}/burndown", s.h(s.sprintBurndown))

				r.Get("/versions", s.h(s.listVersions))
				r.Post("/versions", s.h(s.createVersion))
				r.Patch("/versions/{versionID}", s.h(s.updateVersion))
				r.Delete("/versions/{versionID}", s.h(s.deleteVersion))

				r.Get("/docs", s.h(s.listDocs))
				r.Post("/docs", s.h(s.uploadDoc))
				r.Post("/docs/links", s.h(s.createLinkDoc))
				r.Patch("/docs/{docID}", s.h(s.updateDoc))
				r.Delete("/docs/{docID}", s.h(s.deleteDoc))
				r.Get("/docs/{docID}/content", s.h(s.docContent))
			})
		})
	})

	r.NotFound(func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, http.StatusNotFound, errNotFound("Метод API не найден."))
	})
	return r
}
