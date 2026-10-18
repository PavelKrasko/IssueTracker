package httpapi

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"html"
	"net/http"
	"net/url"
	"regexp"
	"strconv"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"issuetracker/internal/auth"
	"issuetracker/internal/database/db"
	"issuetracker/internal/telegram"
)

var mentionRe = regexp.MustCompile(`@\[([^\]\n]{1,100})\]\(user:([0-9a-fA-F-]{36})\)`)

func parseMentions(text string) []uuid.UUID {
	var out []uuid.UUID
	seen := map[uuid.UUID]bool{}
	for _, m := range mentionRe.FindAllStringSubmatch(text, 50) {
		if id, err := uuid.Parse(m[2]); err == nil && !seen[id] {
			seen[id] = true
			out = append(out, id)
		}
	}
	return out
}

func newMentions(before, after string) []uuid.UUID {
	old := map[uuid.UUID]bool{}
	for _, id := range parseMentions(before) {
		old[id] = true
	}
	var out []uuid.UUID
	for _, id := range parseMentions(after) {
		if !old[id] {
			out = append(out, id)
		}
	}
	return out
}

func plainText(text string) string {
	return mentionRe.ReplaceAllString(text, "@$1")
}

func excerpt(text string, n int) string {
	t := strings.Join(strings.Fields(plainText(text)), " ")
	if utf8.RuneCountInString(t) <= n {
		return t
	}
	return string([]rune(t)[:n-1]) + "…"
}

const (
	notifyAssigned  = "assigned"
	notifyMentioned = "mentioned"
	notifyCommented = "commented"
	notifyStatus    = "status"
)

type notification struct {
	Kind       string
	Issue      db.Issue
	IssueKey   string
	ActorID    uuid.UUID
	Recipients []uuid.UUID
	Text       string
	From, To   string
}

type notificationPayload struct {
	IssueKey string `json:"issueKey"`
	Title    string `json:"title"`
	Text     string `json:"text,omitempty"`
	From     string `json:"from,omitempty"`
	To       string `json:"to,omitempty"`
}

var statusLabels = map[string]string{"todo": "К выполнению", "in_progress": "В работе", "review": "На проверке", "done": "Готово"}

func (s *Server) notify(ctx context.Context, events ...notification) {
	sent := map[string]bool{}
	for _, n := range events {
		ids := make([]uuid.UUID, 0, len(n.Recipients))
		for _, id := range n.Recipients {
			key := id.String() + n.Issue.ID.String()
			if id == n.ActorID || id == uuid.Nil || sent[key] {
				continue
			}
			sent[key] = true
			ids = append(ids, id)
		}
		if len(ids) == 0 {
			continue
		}
		members, err := s.q.FilterProjectMembers(ctx, db.FilterProjectMembersParams{ProjectID: n.Issue.ProjectID, Ids: ids})
		if err != nil {
			s.log.Warn("notify: members", "error", err)
			continue
		}
		payload, _ := json.Marshal(notificationPayload{IssueKey: n.IssueKey, Title: n.Issue.Title, Text: n.Text, From: n.From, To: n.To})
		actor := n.ActorID
		pid, iid := n.Issue.ProjectID, n.Issue.ID
		for _, uid := range members {
			if _, err := s.q.CreateNotification(ctx, db.CreateNotificationParams{
				UserID: uid, ProjectID: &pid, IssueID: &iid, ActorID: &actor, Kind: n.Kind, Payload: payload,
			}); err != nil {
				s.log.Warn("notify: insert", "error", err)
				continue
			}
			if s.bot != nil {
				s.sendTelegram(uid, n)
			}
		}
	}
}

func (s *Server) sendTelegram(userID uuid.UUID, n notification) {
	go func() {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
		defer cancel()
		link, err := s.q.GetTelegramLink(ctx, userID)
		if err != nil || !link.Enabled {
			return
		}
		actorName := "Кто-то"
		if names, err := s.q.GetUserNames(ctx, []uuid.UUID{n.ActorID}); err == nil && len(names) == 1 {
			actorName = names[0].Name
		}
		if err := s.bot.Send(ctx, link.ChatID, s.telegramText(actorName, n)); err != nil {
			s.log.Warn("telegram send", "user", userID, "error", err)
		}
	}()
}

func (s *Server) telegramText(actor string, n notification) string {
	e := html.EscapeString
	var head string
	switch n.Kind {
	case notifyAssigned:
		head = "👤 <b>" + e(actor) + "</b> назначил(а) вас исполнителем"
	case notifyMentioned:
		head = "💬 <b>" + e(actor) + "</b> упомянул(а) вас"
	case notifyCommented:
		head = "💬 <b>" + e(actor) + "</b> оставил(а) комментарий"
	case notifyStatus:
		head = fmt.Sprintf("🔄 <b>%s</b> сменил(а) статус: %s → <b>%s</b>", e(actor), e(statusLabels[n.From]), e(statusLabels[n.To]))
	default:
		head = "🔔 Обновление задачи"
	}
	var b strings.Builder
	b.WriteString(head)
	b.WriteString("\n\n<b>" + e(n.IssueKey) + "</b> · " + e(n.Issue.Title))
	if n.Text != "" {
		b.WriteString("\n<i>«" + e(n.Text) + "»</i>")
	}
	link := fmt.Sprintf("%s/app/board?project=%s&issue=%s", s.cfg.AppURL, n.Issue.ProjectID, url.QueryEscape(n.IssueKey))
	b.WriteString("\n\n<a href=\"" + e(link) + "\">Открыть задачу</a>")
	return b.String()
}

func (s *Server) watch(ctx context.Context, q *db.Queries, issue db.Issue, ids ...*uuid.UUID) error {
	for _, id := range ids {
		if id == nil {
			continue
		}
		if err := q.AddWatcher(ctx, db.AddWatcherParams{IssueID: issue.ID, ProjectID: issue.ProjectID, UserID: *id}); err != nil {
			return err
		}
	}
	return nil
}

func ptrs(ids []uuid.UUID) []*uuid.UUID {
	out := make([]*uuid.UUID, len(ids))
	for i := range ids {
		out[i] = &ids[i]
	}
	return out
}

type notificationDTO struct {
	ID             int64           `json:"id"`
	Kind           string          `json:"kind"`
	ProjectID      *uuid.UUID      `json:"projectId"`
	IssueID        *uuid.UUID      `json:"issueId"`
	ActorID        *uuid.UUID      `json:"actorId"`
	ActorName      *string         `json:"actorName"`
	ActorAvatarURL *string         `json:"actorAvatarUrl"`
	Payload        json.RawMessage `json:"payload"`
	Read           bool            `json:"read"`
	CreatedAt      time.Time       `json:"createdAt"`
}

func (s *Server) listNotifications(w http.ResponseWriter, r *http.Request) error {
	ctx := r.Context()
	uid := userID(r)
	limit := 50
	if n, err := strconv.Atoi(r.URL.Query().Get("limit")); err == nil && n > 0 && n <= 200 {
		limit = n
	}
	rows, err := s.q.ListNotifications(ctx, db.ListNotificationsParams{UserID: uid, UnreadOnly: r.URL.Query().Get("unread") == "1", Lim: int32(limit)})
	if err != nil {
		return err
	}
	unread, err := s.q.CountUnreadNotifications(ctx, uid)
	if err != nil {
		return err
	}
	items := make([]notificationDTO, 0, len(rows))
	for _, n := range rows {
		items = append(items, notificationDTO{
			ID: n.ID, Kind: n.Kind, ProjectID: n.ProjectID, IssueID: n.IssueID, ActorID: n.ActorID,
			ActorName: n.ActorName, ActorAvatarURL: n.ActorAvatarUrl, Payload: n.Payload, Read: n.ReadAt != nil, CreatedAt: n.CreatedAt,
		})
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": items, "unread": unread})
	return nil
}

func (s *Server) readNotifications(w http.ResponseWriter, r *http.Request) error {
	var in struct {
		IDs []int64 `json:"ids"`
		All bool    `json:"all"`
	}
	if err := decodeJSON(w, r, &in); err != nil {
		return err
	}
	if in.IDs == nil {
		in.IDs = []int64{}
	}
	if err := s.q.MarkNotificationsRead(r.Context(), db.MarkNotificationsReadParams{UserID: userID(r), AllItems: in.All, Ids: in.IDs}); err != nil {
		return err
	}
	unread, err := s.q.CountUnreadNotifications(r.Context(), userID(r))
	if err != nil {
		return err
	}
	writeJSON(w, http.StatusOK, map[string]any{"unread": unread})
	return nil
}

type telegramDTO struct {
	Available   bool    `json:"available"`
	BotUsername string  `json:"botUsername"`
	Linked      bool    `json:"linked"`
	Enabled     bool    `json:"enabled"`
	Username    *string `json:"username"`
}

func (s *Server) telegramState(ctx context.Context, uid uuid.UUID) (telegramDTO, error) {
	out := telegramDTO{Available: s.bot != nil}
	if s.bot != nil {
		out.BotUsername = s.bot.Username()
	}
	link, err := s.q.GetTelegramLink(ctx, uid)
	if err == nil {
		out.Linked, out.Enabled, out.Username = true, link.Enabled, link.Username
	} else if !isNoRows(err) {
		return out, err
	}
	return out, nil
}

func (s *Server) getTelegram(w http.ResponseWriter, r *http.Request) error {
	out, err := s.telegramState(r.Context(), userID(r))
	if err != nil {
		return err
	}
	writeJSON(w, http.StatusOK, out)
	return nil
}

func (s *Server) linkTelegram(w http.ResponseWriter, r *http.Request) error {
	if s.bot == nil {
		return errBadRequest("Telegram-бот не настроен на сервере (TELEGRAM_BOT_TOKEN).", nil)
	}
	name := s.bot.Username()
	if name == "" {
		return errBadRequest("Сервер пока не может связаться с Telegram. Попробуйте через минуту.", nil)
	}
	ctx, uid := r.Context(), userID(r)
	code := randomCode()
	if err := s.q.DeleteTelegramCodesByUser(ctx, uid); err != nil {
		return err
	}
	expires := time.Now().Add(15 * time.Minute)
	if err := s.q.CreateTelegramCode(ctx, db.CreateTelegramCodeParams{Code: code, UserID: uid, ExpiresAt: expires}); err != nil {
		return err
	}
	writeJSON(w, http.StatusOK, map[string]any{"url": "https://t.me/" + name + "?start=" + code, "expiresAt": expires})
	return nil
}

func (s *Server) updateTelegram(w http.ResponseWriter, r *http.Request) error {
	var in struct {
		Enabled bool `json:"enabled"`
	}
	if err := decodeJSON(w, r, &in); err != nil {
		return err
	}
	if err := s.q.SetTelegramEnabled(r.Context(), db.SetTelegramEnabledParams{UserID: userID(r), Enabled: in.Enabled}); err != nil {
		return err
	}
	return s.getTelegram(w, r)
}

func (s *Server) unlinkTelegram(w http.ResponseWriter, r *http.Request) error {
	if err := s.q.DeleteTelegramLink(r.Context(), userID(r)); err != nil {
		return err
	}
	return s.getTelegram(w, r)
}

func (s *Server) HandleTelegram(ctx context.Context, m telegram.Message) {
	reply := func(text string) {
		if err := s.bot.Send(ctx, m.ChatID, text); err != nil {
			s.log.Warn("telegram reply", "error", err)
		}
	}
	cmd, arg, _ := strings.Cut(m.Text, " ")
	switch cmd {
	case "/start":
		code := strings.TrimSpace(arg)
		if code == "" {
			reply("Привет! Я присылаю уведомления IssueTracker.\n\nЧтобы подключиться, откройте <b>Профиль → Telegram → Подключить</b> на сайте.")
			return
		}
		uid, err := s.q.ConsumeTelegramCode(ctx, code)
		if err != nil {
			reply("Ссылка устарела или уже использована. Получите новую в профиле IssueTracker.")
			return
		}
		var username *string
		if m.Username != "" {
			username = &m.Username
		}
		err = s.inTx(ctx, func(q *db.Queries) error {
			if err := q.DeleteTelegramLinkByChat(ctx, m.ChatID); err != nil {
				return err
			}
			return q.UpsertTelegramLink(ctx, db.UpsertTelegramLinkParams{UserID: uid, ChatID: m.ChatID, Username: username})
		})
		if err != nil {
			s.log.Error("telegram link", "error", err)
			reply("Не получилось подключить аккаунт. Попробуйте ещё раз.")
			return
		}
		name := ""
		if names, err := s.q.GetUserNames(ctx, []uuid.UUID{uid}); err == nil && len(names) == 1 {
			name = ", " + html.EscapeString(names[0].Name)
		}
		reply("✅ Готово" + name + "! Буду присылать сюда уведомления: назначения на задачи, упоминания, комментарии и смену статуса.\n\nОтключить: /stop")
	case "/stop":
		_ = s.q.DeleteTelegramLinkByChat(ctx, m.ChatID)
		reply("Уведомления отключены. Подключить снова можно в профиле IssueTracker.")
	default:
		reply("Я умею только присылать уведомления 🙂\n/stop — отключить их.")
	}
}

func randomCode() string { return auth.RandomString(24) }

func isNoRows(err error) bool { return errors.Is(err, pgx.ErrNoRows) }

func (s *Server) RunTelegram(ctx context.Context) {
	if s.bot == nil {
		return
	}
	s.bot.Run(ctx, s.HandleTelegram)
}
