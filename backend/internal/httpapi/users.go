package httpapi

import (
	"errors"
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgconn"

	"issuetracker/internal/auth"
	"issuetracker/internal/database/db"
)

func isUniqueViolation(err error) bool {
	var pg *pgconn.PgError
	return errors.As(err, &pg) && pg.Code == "23505"
}

func isFKViolation(err error) bool {
	var pg *pgconn.PgError
	return errors.As(err, &pg) && pg.Code == "23503"
}

func (s *Server) updateMe(w http.ResponseWriter, r *http.Request) error {
	var in struct {
		Name     *string `json:"name"`
		JobTitle *string `json:"jobTitle"`
		About    *string `json:"about"`
	}
	if err := decodeJSON(w, r, &in); err != nil {
		return err
	}
	ctx := r.Context()
	u, err := s.q.GetUserByID(ctx, userID(r))
	if err != nil {
		return err
	}
	p := db.UpdateUserProfileParams{ID: u.ID, Name: u.Name, JobTitle: u.JobTitle, About: u.About}
	if in.Name != nil {
		p.Name = strings.TrimSpace(*in.Name)
	}
	if in.JobTitle != nil {
		p.JobTitle = strings.TrimSpace(*in.JobTitle)
	}
	if in.About != nil {
		p.About = strings.TrimSpace(*in.About)
	}
	v := validation{}
	if p.Name == "" || len([]rune(p.Name)) > 100 {
		v.add("name", "Введите имя и фамилию (до 100 символов).")
	}
	if len([]rune(p.JobTitle)) > 80 {
		v.add("jobTitle", "Не больше 80 символов.")
	}
	if len([]rune(p.About)) > 500 {
		v.add("about", "Не больше 500 символов.")
	}
	if err := v.err(); err != nil {
		return err
	}
	u, err = s.q.UpdateUserProfile(ctx, p)
	if err != nil {
		return err
	}
	out, err := s.userResponse(ctx, u)
	if err != nil {
		return err
	}
	writeJSON(w, http.StatusOK, out)
	return nil
}

func (s *Server) changePassword(w http.ResponseWriter, r *http.Request) error {
	var in struct {
		Current string `json:"current"`
		Next    string `json:"next"`
	}
	if err := decodeJSON(w, r, &in); err != nil {
		return err
	}
	ctx := r.Context()
	u, err := s.q.GetUserByID(ctx, userID(r))
	if err != nil {
		return err
	}
	if u.PasswordHash != nil && !auth.CheckPassword(*u.PasswordHash, in.Current) {
		return errBadRequest("Текущий пароль указан неверно.", map[string]string{"current": "Текущий пароль указан неверно."})
	}
	if msg := auth.ValidatePassword(in.Next); msg != "" {
		return errBadRequest(msg, map[string]string{"next": msg})
	}
	hash, err := auth.HashPassword(in.Next)
	if err != nil {
		return err
	}
	if err := s.q.UpdateUserPassword(ctx, db.UpdateUserPasswordParams{ID: u.ID, PasswordHash: &hash}); err != nil {
		return err
	}
	w.WriteHeader(http.StatusNoContent)
	return nil
}

func (s *Server) disconnectProvider(w http.ResponseWriter, r *http.Request) error {
	provider := db.OauthProvider(chi.URLParam(r, "provider"))
	if !provider.Valid() {
		return errNotFound("Неизвестный провайдер.")
	}
	ctx := r.Context()
	u, err := s.q.GetUserByID(ctx, userID(r))
	if err != nil {
		return err
	}
	accounts, err := s.q.ListOAuthAccountsByUser(ctx, u.ID)
	if err != nil {
		return err
	}
	others := 0
	for _, a := range accounts {
		if a.Provider != provider {
			others++
		}
	}
	if u.PasswordHash == nil && others == 0 {
		return errBadRequest("Это единственный способ входа. Сначала задайте пароль или подключите другой аккаунт.", nil)
	}
	if _, err := s.q.DeleteOAuthAccount(ctx, db.DeleteOAuthAccountParams{UserID: u.ID, Provider: provider}); err != nil {
		return err
	}
	out, err := s.userResponse(ctx, u)
	if err != nil {
		return err
	}
	writeJSON(w, http.StatusOK, out)
	return nil
}
