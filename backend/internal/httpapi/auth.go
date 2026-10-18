package httpapi

import (
	"context"
	"errors"
	"net/http"
	"net/mail"
	"net/url"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"issuetracker/internal/auth"
	"issuetracker/internal/database/db"
)

const (
	accessCookie  = "it_access"
	refreshCookie = "it_refresh"
	oauthCookie   = "it_oauth"
)

func (s *Server) setCookie(w http.ResponseWriter, name, value, path string, maxAge time.Duration) {
	http.SetCookie(w, &http.Cookie{
		Name: name, Value: value, Path: path,
		MaxAge:   int(maxAge.Seconds()),
		HttpOnly: true,
		Secure:   s.cfg.CookieSecure,
		SameSite: http.SameSiteLaxMode,
	})
}

func (s *Server) clearCookie(w http.ResponseWriter, name, path string) {
	http.SetCookie(w, &http.Cookie{Name: name, Value: "", Path: path, MaxAge: -1, HttpOnly: true, Secure: s.cfg.CookieSecure, SameSite: http.SameSiteLaxMode})
}

func (s *Server) startSession(ctx context.Context, w http.ResponseWriter, r *http.Request, uid uuid.UUID) error {
	raw, hash := auth.NewRefreshToken()
	if _, err := s.q.CreateSession(ctx, db.CreateSessionParams{
		UserID: uid, RefreshTokenHash: hash,
		UserAgent: truncate(r.UserAgent(), 300), Ip: r.RemoteAddr,
		ExpiresAt: time.Now().Add(s.cfg.RefreshTTL),
	}); err != nil {
		return err
	}
	access, err := s.tokens.NewAccessToken(uid)
	if err != nil {
		return err
	}
	s.setCookie(w, accessCookie, access, "/api", s.cfg.AccessTTL)
	s.setCookie(w, refreshCookie, raw, "/api/auth", s.cfg.RefreshTTL)
	return nil
}

func (s *Server) userResponse(ctx context.Context, u db.User) (userDTO, error) {
	accounts, err := s.q.ListOAuthAccountsByUser(ctx, u.ID)
	if err != nil {
		return userDTO{}, err
	}
	return toUser(u, accounts), nil
}

type credentials struct {
	Name     string `json:"name"`
	Email    string `json:"email"`
	Password string `json:"password"`
}

func normalizeEmail(e string) (string, bool) {
	e = strings.TrimSpace(strings.ToLower(e))
	a, err := mail.ParseAddress(e)
	if err != nil || a.Address != e || !strings.Contains(e[strings.LastIndex(e, "@"):], ".") {
		return e, false
	}
	return e, true
}

func (s *Server) register(w http.ResponseWriter, r *http.Request) error {
	var in credentials
	if err := decodeJSON(w, r, &in); err != nil {
		return err
	}
	v := validation{}
	in.Name = strings.TrimSpace(in.Name)
	email, ok := normalizeEmail(in.Email)
	if !ok {
		v.add("email", "Введите email в формате name@example.com.")
	}
	if in.Name == "" || len([]rune(in.Name)) > 100 {
		v.add("name", "Введите имя и фамилию (до 100 символов).")
	}
	if msg := auth.ValidatePassword(in.Password); msg != "" {
		v.add("password", msg)
	}
	if err := v.err(); err != nil {
		return err
	}

	hash, err := auth.HashPassword(in.Password)
	if err != nil {
		return err
	}
	ctx := r.Context()
	u, err := s.q.CreateUser(ctx, db.CreateUserParams{Email: email, Name: in.Name, PasswordHash: &hash})
	if isUniqueViolation(err) {
		return errConflict("EMAIL_TAKEN", "Аккаунт с таким email уже существует.", map[string]string{"email": "Этот email уже зарегистрирован."})
	}
	if err != nil {
		return err
	}
	if err := s.q.AcceptInvitesForUser(ctx, db.AcceptInvitesForUserParams{UserID: u.ID, Email: u.Email}); err != nil {
		return err
	}
	if err := s.startSession(ctx, w, r, u.ID); err != nil {
		return err
	}
	out, err := s.userResponse(ctx, u)
	if err != nil {
		return err
	}
	writeJSON(w, http.StatusCreated, out)
	return nil
}

func (s *Server) login(w http.ResponseWriter, r *http.Request) error {
	var in credentials
	if err := decodeJSON(w, r, &in); err != nil {
		return err
	}
	email, _ := normalizeEmail(in.Email)
	ctx := r.Context()
	u, err := s.q.GetUserByEmail(ctx, email)
	if errors.Is(err, pgx.ErrNoRows) {
		auth.BurnPasswordCheck(in.Password)
		return errUnauthorized("Неверный email или пароль. Проверьте данные и попробуйте снова.")
	}
	if err != nil {
		return err
	}
	if u.PasswordHash == nil {
		return errUnauthorized("Для этого аккаунта пароль не задан — войдите через Google или GitHub.")
	}
	if !auth.CheckPassword(*u.PasswordHash, in.Password) {
		return errUnauthorized("Неверный email или пароль. Проверьте данные и попробуйте снова.")
	}
	if err := s.q.AcceptInvitesForUser(ctx, db.AcceptInvitesForUserParams{UserID: u.ID, Email: u.Email}); err != nil {
		return err
	}
	if err := s.startSession(ctx, w, r, u.ID); err != nil {
		return err
	}
	out, err := s.userResponse(ctx, u)
	if err != nil {
		return err
	}
	writeJSON(w, http.StatusOK, out)
	return nil
}

func (s *Server) refresh(w http.ResponseWriter, r *http.Request) error {
	c, err := r.Cookie(refreshCookie)
	if err != nil {
		return errUnauthorized("Сессия истекла. Войдите снова.")
	}
	ctx := r.Context()
	sess, err := s.q.GetActiveSessionByHash(ctx, auth.HashToken(c.Value))
	if errors.Is(err, pgx.ErrNoRows) {
		s.clearCookie(w, accessCookie, "/api")
		s.clearCookie(w, refreshCookie, "/api/auth")
		return errUnauthorized("Сессия истекла. Войдите снова.")
	}
	if err != nil {
		return err
	}
	if err := s.q.RevokeSession(ctx, sess.ID); err != nil {
		return err
	}
	u, err := s.q.GetUserByID(ctx, sess.UserID)
	if err != nil {
		return err
	}
	if err := s.startSession(ctx, w, r, u.ID); err != nil {
		return err
	}
	out, err := s.userResponse(ctx, u)
	if err != nil {
		return err
	}
	writeJSON(w, http.StatusOK, out)
	return nil
}

func (s *Server) logout(w http.ResponseWriter, r *http.Request) error {
	if c, err := r.Cookie(refreshCookie); err == nil {
		if sess, err := s.q.GetActiveSessionByHash(r.Context(), auth.HashToken(c.Value)); err == nil {
			_ = s.q.RevokeSession(r.Context(), sess.ID)
		}
	}
	s.clearCookie(w, accessCookie, "/api")
	s.clearCookie(w, refreshCookie, "/api/auth")
	w.WriteHeader(http.StatusNoContent)
	return nil
}

func (s *Server) me(w http.ResponseWriter, r *http.Request) error {
	u, err := s.q.GetUserByID(r.Context(), userID(r))
	if errors.Is(err, pgx.ErrNoRows) {
		return errUnauthorized("Пользователь не найден.")
	}
	if err != nil {
		return err
	}
	out, err := s.userResponse(r.Context(), u)
	if err != nil {
		return err
	}
	writeJSON(w, http.StatusOK, out)
	return nil
}

func (s *Server) providers(w http.ResponseWriter, r *http.Request) error {
	writeJSON(w, http.StatusOK, map[string]bool{"google": s.oauth["google"] != nil, "github": s.oauth["github"] != nil})
	return nil
}

func (s *Server) oauthStart(w http.ResponseWriter, r *http.Request) error {
	name := chi.URLParam(r, "provider")
	p := s.oauth[name]
	mode := r.URL.Query().Get("mode")
	if mode != "link" {
		mode = "login"
	}
	back := "/login"
	if mode == "link" {
		back = "/app/profile"
	}
	if p == nil {
		http.Redirect(w, r, s.cfg.AppURL+back+"?oauth_error=disabled&provider="+url.QueryEscape(name), http.StatusFound)
		return nil
	}
	state := auth.RandomString(24)
	s.setCookie(w, oauthCookie, state+"|"+mode+"|"+name, "/api/auth/oauth", 10*time.Minute)
	http.Redirect(w, r, p.AuthCodeURL(state), http.StatusFound)
	return nil
}

func (s *Server) oauthCallback(w http.ResponseWriter, r *http.Request) error {
	name := chi.URLParam(r, "provider")
	p := s.oauth[name]
	q := r.URL.Query()

	c, _ := r.Cookie(oauthCookie)
	s.clearCookie(w, oauthCookie, "/api/auth/oauth")
	var state, mode, cookieProvider string
	if c != nil {
		parts := strings.SplitN(c.Value, "|", 3)
		if len(parts) == 3 {
			state, mode, cookieProvider = parts[0], parts[1], parts[2]
		}
	}
	back := "/login"
	if mode == "link" {
		back = "/app/profile"
	}
	fail := func(code string) error {
		http.Redirect(w, r, s.cfg.AppURL+back+"?oauth_error="+code+"&provider="+url.QueryEscape(name), http.StatusFound)
		return nil
	}

	if p == nil || state == "" || cookieProvider != name || q.Get("state") != state {
		return fail("state")
	}
	if q.Get("error") != "" {
		return fail("denied")
	}
	ctx := r.Context()
	profile, err := p.Exchange(ctx, q.Get("code"))
	if err != nil {
		s.log.Warn("oauth exchange failed", "provider", name, "error", err)
		return fail("exchange")
	}
	provider := db.OauthProvider(name)

	if mode == "link" {
		ac, err := r.Cookie(accessCookie)
		if err != nil {
			return fail("session")
		}
		uid, err := s.tokens.ParseAccessToken(ac.Value)
		if err != nil {
			return fail("session")
		}
		existing, err := s.q.GetOAuthAccount(ctx, db.GetOAuthAccountParams{Provider: provider, ProviderUserID: profile.ProviderUserID})
		if err == nil && existing.UserID != uid {
			return fail("taken")
		}
		if errors.Is(err, pgx.ErrNoRows) {
			if _, err := s.q.CreateOAuthAccount(ctx, db.CreateOAuthAccountParams{UserID: uid, Provider: provider, ProviderUserID: profile.ProviderUserID, Email: nilIfEmpty(profile.Email)}); err != nil {
				if isUniqueViolation(err) {
					return fail("already_linked")
				}
				return err
			}
		}
		http.Redirect(w, r, s.cfg.AppURL+"/app/profile?linked="+name, http.StatusFound)
		return nil
	}

	var u db.User
	acc, err := s.q.GetOAuthAccount(ctx, db.GetOAuthAccountParams{Provider: provider, ProviderUserID: profile.ProviderUserID})
	switch {
	case err == nil:
		if u, err = s.q.GetUserByID(ctx, acc.UserID); err != nil {
			return err
		}
	case errors.Is(err, pgx.ErrNoRows):
		if profile.Email == "" || !profile.EmailVerified {
			return fail("no_email")
		}
		email, _ := normalizeEmail(profile.Email)
		u, err = s.q.GetUserByEmail(ctx, email)
		if errors.Is(err, pgx.ErrNoRows) {
			name := strings.TrimSpace(profile.Name)
			if name == "" {
				name = strings.Split(email, "@")[0]
			}
			u, err = s.q.CreateUser(ctx, db.CreateUserParams{Email: email, Name: truncate(name, 100)})
		}
		if err != nil {
			return err
		}
		if _, err := s.q.CreateOAuthAccount(ctx, db.CreateOAuthAccountParams{UserID: u.ID, Provider: provider, ProviderUserID: profile.ProviderUserID, Email: &email}); err != nil && !isUniqueViolation(err) {
			return err
		}
	default:
		return err
	}
	if profile.AvatarURL != "" {
		_ = s.q.UpdateUserAvatarIfEmpty(ctx, db.UpdateUserAvatarIfEmptyParams{ID: u.ID, AvatarUrl: &profile.AvatarURL})
	}
	if err := s.q.AcceptInvitesForUser(ctx, db.AcceptInvitesForUserParams{UserID: u.ID, Email: u.Email}); err != nil {
		return err
	}
	if err := s.startSession(ctx, w, r, u.ID); err != nil {
		return err
	}
	http.Redirect(w, r, s.cfg.AppURL+"/app/board", http.StatusFound)
	return nil
}

func nilIfEmpty(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}

func truncate(s string, n int) string {
	r := []rune(s)
	if len(r) > n {
		return string(r[:n])
	}
	return s
}
