package telegram

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"sync"
	"time"
)

type Bot struct {
	apiURL string
	token  string
	http   *http.Client
	poll   *http.Client
	log    *slog.Logger

	mu       sync.RWMutex
	username string
}

type Message struct {
	ChatID   int64
	Username string
	Text     string
}

func New(apiURL, token, username string, log *slog.Logger) *Bot {
	if apiURL == "" {
		apiURL = "https://api.telegram.org"
	}
	return &Bot{
		apiURL:   strings.TrimRight(apiURL, "/"),
		token:    token,
		username: strings.TrimPrefix(username, "@"),
		http:     &http.Client{Timeout: 40 * time.Second, Transport: newTransport()},
		poll:     &http.Client{Timeout: 40 * time.Second, Transport: newTransport()},
		log:      log,
	}
}

func newTransport() *http.Transport {
	t := http.DefaultTransport.(*http.Transport).Clone()
	t.IdleConnTimeout = 30 * time.Second
	return t
}

var errAPI = errors.New("telegram api error")

func (b *Bot) Username() string {
	b.mu.RLock()
	defer b.mu.RUnlock()
	return b.username
}

type apiResponse struct {
	OK          bool            `json:"ok"`
	Result      json.RawMessage `json:"result"`
	Description string          `json:"description"`
}

func (b *Bot) call(ctx context.Context, method string, params url.Values, out any) error {
	endpoint := b.apiURL + "/bot" + b.token + "/" + method
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, strings.NewReader(params.Encode()))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	client := b.http
	if method == "getUpdates" {
		client = b.poll
	}
	res, err := client.Do(req)
	if err != nil {
		var ue *url.Error
		if errors.As(err, &ue) {
			return fmt.Errorf("telegram %s: %w", method, ue.Err)
		}
		return fmt.Errorf("telegram %s: %w", method, err)
	}
	defer res.Body.Close()
	var r apiResponse
	if err := json.NewDecoder(io.LimitReader(res.Body, 4<<20)).Decode(&r); err != nil {
		return fmt.Errorf("telegram %s: %w", method, err)
	}
	if !r.OK {
		return fmt.Errorf("telegram %s: %s: %w", method, r.Description, errAPI)
	}
	if out != nil {
		return json.Unmarshal(r.Result, out)
	}
	return nil
}

func (b *Bot) Send(ctx context.Context, chatID int64, html string) error {
	params := url.Values{
		"chat_id":                  {strconv.FormatInt(chatID, 10)},
		"text":                     {html},
		"parse_mode":               {"HTML"},
		"disable_web_page_preview": {"true"},
	}
	var err error
	for i, pause := range []time.Duration{0, 2 * time.Second, 5 * time.Second, 15 * time.Second, 30 * time.Second, 60 * time.Second} {
		if pause > 0 && !sleep(ctx, pause) {
			return err
		}
		attempt, cancel := context.WithTimeout(ctx, 15*time.Second)
		err = b.call(attempt, "sendMessage", params, nil)
		cancel()
		if err == nil || errors.Is(err, errAPI) || ctx.Err() != nil {
			return err
		}
		b.http.CloseIdleConnections()
		b.log.Info("telegram: не удалось отправить, повторим", "attempt", i+1, "error", err)
	}
	return err
}

type update struct {
	UpdateID int64 `json:"update_id"`
	Message  *struct {
		Text string `json:"text"`
		Chat struct {
			ID   int64  `json:"id"`
			Type string `json:"type"`
		} `json:"chat"`
		From *struct {
			Username string `json:"username"`
		} `json:"from"`
	} `json:"message"`
}

func (b *Bot) Run(ctx context.Context, handle func(context.Context, Message)) {
	for b.Username() == "" {
		var me struct {
			Username string `json:"username"`
		}
		if err := b.call(ctx, "getMe", url.Values{}, &me); err != nil {
			b.log.Warn("telegram недоступен, повтор через 30 с", "error", err)
			if !sleep(ctx, 30*time.Second) {
				return
			}
			continue
		}
		b.mu.Lock()
		b.username = me.Username
		b.mu.Unlock()
	}
	b.log.Info("telegram-бот запущен", "username", b.Username())

	var offset int64
	for ctx.Err() == nil {
		var updates []update
		err := b.call(ctx, "getUpdates", url.Values{
			"offset":          {strconv.FormatInt(offset, 10)},
			"timeout":         {"25"},
			"allowed_updates": {`["message"]`},
		}, &updates)
		if err != nil {
			if ctx.Err() != nil {
				return
			}
			b.log.Warn("telegram getUpdates", "error", err)
			b.poll.CloseIdleConnections()
			sleep(ctx, 5*time.Second)
			continue
		}
		for _, u := range updates {
			offset = u.UpdateID + 1
			if u.Message == nil || u.Message.Chat.Type != "private" {
				continue
			}
			m := Message{ChatID: u.Message.Chat.ID, Text: strings.TrimSpace(u.Message.Text)}
			if u.Message.From != nil {
				m.Username = u.Message.From.Username
			}
			handle(ctx, m)
		}
	}
}

func sleep(ctx context.Context, d time.Duration) bool {
	t := time.NewTimer(d)
	defer t.Stop()
	select {
	case <-ctx.Done():
		return false
	case <-t.C:
		return true
	}
}