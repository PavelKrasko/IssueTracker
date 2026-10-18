package auth

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"
)

type Profile struct {
	ProviderUserID string
	Email          string
	EmailVerified  bool
	Name           string
	AvatarURL      string
}

type Provider struct {
	Name         string
	ClientID     string
	ClientSecret string
	RedirectURL  string
	authURL      string
	tokenURL     string
	scopes       []string
	fetch        func(ctx context.Context, p *Provider, token string) (Profile, error)
	http         *http.Client
}

func NewGoogle(clientID, secret, redirect string) *Provider {
	return &Provider{
		Name: "google", ClientID: clientID, ClientSecret: secret, RedirectURL: redirect,
		authURL:  "https://accounts.google.com/o/oauth2/v2/auth",
		tokenURL: "https://oauth2.googleapis.com/token",
		scopes:   []string{"openid", "email", "profile"},
		fetch:    fetchGoogle,
		http:     &http.Client{Transport: newTransport()},
	}
}

func NewGitHub(clientID, secret, redirect string) *Provider {
	return &Provider{
		Name: "github", ClientID: clientID, ClientSecret: secret, RedirectURL: redirect,
		authURL:  "https://github.com/login/oauth/authorize",
		tokenURL: "https://github.com/login/oauth/access_token",
		scopes:   []string{"read:user", "user:email"},
		fetch:    fetchGitHub,
		http:     &http.Client{Transport: newTransport()},
	}
}

func (p *Provider) AuthCodeURL(state string) string {
	q := url.Values{
		"client_id":     {p.ClientID},
		"redirect_uri":  {p.RedirectURL},
		"response_type": {"code"},
		"scope":         {strings.Join(p.scopes, " ")},
		"state":         {state},
	}
	if p.Name == "google" {
		q.Set("prompt", "select_account")
	}
	return p.authURL + "?" + q.Encode()
}

func (p *Provider) Exchange(ctx context.Context, code string) (Profile, error) {
	form := url.Values{
		"client_id":     {p.ClientID},
		"client_secret": {p.ClientSecret},
		"code":          {code},
		"redirect_uri":  {p.RedirectURL},
		"grant_type":    {"authorization_code"},
	}
	res, err := p.do(ctx, func(ctx context.Context) (*http.Request, error) {
		req, err := http.NewRequestWithContext(ctx, http.MethodPost, p.tokenURL, strings.NewReader(form.Encode()))
		if err != nil {
			return nil, err
		}
		req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
		req.Header.Set("Accept", "application/json")
		return req, nil
	})
	if err != nil {
		return Profile{}, fmt.Errorf("token request: %w", err)
	}
	defer res.Body.Close()
	var tok struct {
		AccessToken string `json:"access_token"`
		Error       string `json:"error"`
		Description string `json:"error_description"`
	}
	if err := json.NewDecoder(io.LimitReader(res.Body, 1<<20)).Decode(&tok); err != nil {
		return Profile{}, fmt.Errorf("token response: %w", err)
	}
	if tok.AccessToken == "" {
		return Profile{}, fmt.Errorf("token error: %s %s", tok.Error, tok.Description)
	}
	return p.fetch(ctx, p, tok.AccessToken)
}

func newTransport() *http.Transport {
	t := http.DefaultTransport.(*http.Transport).Clone()
	t.IdleConnTimeout = 30 * time.Second
	return t
}

func (p *Provider) do(ctx context.Context, build func(context.Context) (*http.Request, error)) (*http.Response, error) {
	var lastErr error
	for _, pause := range []time.Duration{0, time.Second, 3 * time.Second} {
		if pause > 0 {
			select {
			case <-ctx.Done():
				return nil, lastErr
			case <-time.After(pause):
			}
		}
		attempt, cancel := context.WithTimeout(ctx, 10*time.Second)
		req, err := build(attempt)
		if err != nil {
			cancel()
			return nil, err
		}
		res, err := p.http.Do(req)
		if err == nil {
			res.Body = &cancelOnClose{ReadCloser: res.Body, cancel: cancel}
			return res, nil
		}
		cancel()
		lastErr = err
		if ctx.Err() != nil {
			return nil, err
		}
		p.http.CloseIdleConnections()
	}
	return nil, lastErr
}

type cancelOnClose struct {
	io.ReadCloser
	cancel context.CancelFunc
}

func (c *cancelOnClose) Close() error {
	err := c.ReadCloser.Close()
	c.cancel()
	return err
}

func getJSON(ctx context.Context, p *Provider, endpoint, token string, out any) error {
	res, err := p.do(ctx, func(ctx context.Context) (*http.Request, error) {
		req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
		if err != nil {
			return nil, err
		}
		req.Header.Set("Authorization", "Bearer "+token)
		req.Header.Set("Accept", "application/json")
		return req, nil
	})
	if err != nil {
		return err
	}
	defer res.Body.Close()
	if res.StatusCode != http.StatusOK {
		return fmt.Errorf("%s: %s", endpoint, res.Status)
	}
	return json.NewDecoder(io.LimitReader(res.Body, 1<<20)).Decode(out)
}

func fetchGoogle(ctx context.Context, p *Provider, token string) (Profile, error) {
	var u struct {
		Sub           string `json:"sub"`
		Email         string `json:"email"`
		EmailVerified bool   `json:"email_verified"`
		Name          string `json:"name"`
		Picture       string `json:"picture"`
	}
	if err := getJSON(ctx, p, "https://openidconnect.googleapis.com/v1/userinfo", token, &u); err != nil {
		return Profile{}, err
	}
	if u.Sub == "" {
		return Profile{}, errors.New("google: пустой sub")
	}
	return Profile{ProviderUserID: u.Sub, Email: u.Email, EmailVerified: u.EmailVerified, Name: u.Name, AvatarURL: u.Picture}, nil
}

func fetchGitHub(ctx context.Context, p *Provider, token string) (Profile, error) {
	var u struct {
		ID        int64  `json:"id"`
		Login     string `json:"login"`
		Name      string `json:"name"`
		AvatarURL string `json:"avatar_url"`
	}
	if err := getJSON(ctx, p, "https://api.github.com/user", token, &u); err != nil {
		return Profile{}, err
	}
	var emails []struct {
		Email    string `json:"email"`
		Primary  bool   `json:"primary"`
		Verified bool   `json:"verified"`
	}
	_ = getJSON(ctx, p, "https://api.github.com/user/emails", token, &emails)
	prof := Profile{ProviderUserID: strconv.FormatInt(u.ID, 10), Name: u.Name, AvatarURL: u.AvatarURL}
	if prof.Name == "" {
		prof.Name = u.Login
	}
	for _, e := range emails {
		if e.Primary && e.Verified {
			prof.Email, prof.EmailVerified = e.Email, true
			break
		}
	}
	return prof, nil
}
