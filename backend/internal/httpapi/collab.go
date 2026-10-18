package httpapi

import (
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"

	"issuetracker/internal/database/db"
)

type commentDTO struct {
	ID              uuid.UUID  `json:"id"`
	AuthorID        *uuid.UUID `json:"authorId"`
	AuthorName      *string    `json:"authorName"`
	AuthorAvatarURL *string    `json:"authorAvatarUrl"`
	Body            string     `json:"body"`
	Edited          bool       `json:"edited"`
	CreatedAt       time.Time  `json:"createdAt"`
	UpdatedAt       time.Time  `json:"updatedAt"`
}

func (s *Server) issueFromURL(r *http.Request) (db.Issue, error) {
	id, err := urlUUID(r, "issueID", "Задача")
	if err != nil {
		return db.Issue{}, err
	}
	return s.q.GetIssue(r.Context(), db.GetIssueParams{ID: id, ProjectID: project(r).ID})
}

func cleanCommentBody(body string) (string, error) {
	body = strings.TrimSpace(body)
	if body == "" {
		return "", errBadRequest("Напишите комментарий.", map[string]string{"body": "Комментарий пустой."})
	}
	if len([]rune(body)) > 10000 {
		return "", errBadRequest("Комментарий слишком длинный.", map[string]string{"body": "Не больше 10 000 символов."})
	}
	return body, nil
}

func (s *Server) listComments(w http.ResponseWriter, r *http.Request) error {
	issue, err := s.issueFromURL(r)
	if err != nil {
		return err
	}
	rows, err := s.q.ListComments(r.Context(), issue.ID)
	if err != nil {
		return err
	}
	out := make([]commentDTO, 0, len(rows))
	for _, c := range rows {
		out = append(out, commentDTO{
			ID: c.ID, AuthorID: c.AuthorID, AuthorName: c.AuthorName, AuthorAvatarURL: c.AuthorAvatarUrl, Body: c.Body,
			Edited: c.UpdatedAt.Sub(c.CreatedAt) > time.Second, CreatedAt: c.CreatedAt, UpdatedAt: c.UpdatedAt,
		})
	}
	writeJSON(w, http.StatusOK, out)
	return nil
}

func (s *Server) commentResponse(r *http.Request, c db.IssueComment) (commentDTO, error) {
	u, err := s.q.GetUserByID(r.Context(), userID(r))
	if err != nil {
		return commentDTO{}, err
	}
	return commentDTO{
		ID: c.ID, AuthorID: c.AuthorID, AuthorName: &u.Name, AuthorAvatarURL: u.AvatarUrl, Body: c.Body,
		Edited: c.UpdatedAt.Sub(c.CreatedAt) > time.Second, CreatedAt: c.CreatedAt, UpdatedAt: c.UpdatedAt,
	}, nil
}

func (s *Server) createComment(w http.ResponseWriter, r *http.Request) error {
	if err := requireRole(r, db.ProjectRoleMember); err != nil {
		return err
	}
	issue, err := s.issueFromURL(r)
	if err != nil {
		return err
	}
	var in struct {
		Body string `json:"body"`
	}
	if err := decodeJSON(w, r, &in); err != nil {
		return err
	}
	body, err := cleanCommentBody(in.Body)
	if err != nil {
		return err
	}
	ctx, uid := r.Context(), userID(r)
	mentioned := parseMentions(body)
	var c db.IssueComment
	err = s.inTx(ctx, func(q *db.Queries) error {
		var err error
		if c, err = q.CreateComment(ctx, db.CreateCommentParams{IssueID: issue.ID, AuthorID: &uid, Body: body}); err != nil {
			return err
		}
		if err := s.watch(ctx, q, issue, append([]*uuid.UUID{&uid}, ptrs(mentioned)...)...); err != nil {
			return err
		}
		return q.TouchIssue(ctx, issue.ID)
	})
	if err != nil {
		return err
	}
	watchers, err := s.q.ListWatcherIDs(ctx, issue.ID)
	if err != nil {
		return err
	}
	key, text := issueKey(r, issue), excerpt(body, 200)
	s.notify(ctx,
		notification{Kind: notifyMentioned, Issue: issue, IssueKey: key, ActorID: uid, Recipients: mentioned, Text: text},
		notification{Kind: notifyCommented, Issue: issue, IssueKey: key, ActorID: uid, Recipients: watchers, Text: text},
	)
	out, err := s.commentResponse(r, c)
	if err != nil {
		return err
	}
	writeJSON(w, http.StatusCreated, out)
	return nil
}

func (s *Server) commentFromURL(r *http.Request) (db.IssueComment, error) {
	id, err := urlUUID(r, "commentID", "Комментарий")
	if err != nil {
		return db.IssueComment{}, err
	}
	return s.q.GetCommentInProject(r.Context(), db.GetCommentInProjectParams{ID: id, ProjectID: project(r).ID})
}

func (s *Server) updateComment(w http.ResponseWriter, r *http.Request) error {
	c, err := s.commentFromURL(r)
	if err != nil {
		return err
	}
	if c.AuthorID == nil || *c.AuthorID != userID(r) {
		return errForbidden("Редактировать можно только свои комментарии.")
	}
	var in struct {
		Body string `json:"body"`
	}
	if err := decodeJSON(w, r, &in); err != nil {
		return err
	}
	body, err := cleanCommentBody(in.Body)
	if err != nil {
		return err
	}
	ctx := r.Context()
	updated, err := s.q.UpdateComment(ctx, db.UpdateCommentParams{ID: c.ID, Body: body})
	if err != nil {
		return err
	}
	if mentioned := newMentions(c.Body, body); len(mentioned) > 0 {
		if issue, err := s.q.GetIssue(ctx, db.GetIssueParams{ID: c.IssueID, ProjectID: project(r).ID}); err == nil {
			_ = s.watch(ctx, s.q, issue, ptrs(mentioned)...)
			s.notify(ctx, notification{Kind: notifyMentioned, Issue: issue, IssueKey: issueKey(r, issue), ActorID: userID(r), Recipients: mentioned, Text: excerpt(body, 200)})
		}
	}
	out, err := s.commentResponse(r, updated)
	if err != nil {
		return err
	}
	writeJSON(w, http.StatusOK, out)
	return nil
}

func (s *Server) deleteComment(w http.ResponseWriter, r *http.Request) error {
	c, err := s.commentFromURL(r)
	if err != nil {
		return err
	}
	own := c.AuthorID != nil && *c.AuthorID == userID(r)
	if !own && roleRank[project(r).Role] < roleRank[db.ProjectRoleAdmin] {
		return errForbidden("Удалять чужие комментарии могут только администраторы проекта.")
	}
	if err := s.q.DeleteComment(r.Context(), c.ID); err != nil {
		return err
	}
	w.WriteHeader(http.StatusNoContent)
	return nil
}

func (s *Server) watchIssue(w http.ResponseWriter, r *http.Request) error {
	issue, err := s.issueFromURL(r)
	if err != nil {
		return err
	}
	uid := userID(r)
	if err := s.watch(r.Context(), s.q, issue, &uid); err != nil {
		return err
	}
	return s.writeWatchers(w, r, issue.ID)
}

func (s *Server) unwatchIssue(w http.ResponseWriter, r *http.Request) error {
	issue, err := s.issueFromURL(r)
	if err != nil {
		return err
	}
	if err := s.q.RemoveWatcher(r.Context(), db.RemoveWatcherParams{IssueID: issue.ID, UserID: userID(r)}); err != nil {
		return err
	}
	return s.writeWatchers(w, r, issue.ID)
}

func (s *Server) writeWatchers(w http.ResponseWriter, r *http.Request, issueID uuid.UUID) error {
	ids, err := s.q.ListWatcherIDs(r.Context(), issueID)
	if err != nil {
		return err
	}
	if ids == nil {
		ids = []uuid.UUID{}
	}
	writeJSON(w, http.StatusOK, map[string]any{"watchers": ids})
	return nil
}

type worklogDTO struct {
	ID        uuid.UUID  `json:"id"`
	UserID    *uuid.UUID `json:"userId"`
	UserName  *string    `json:"userName"`
	Minutes   int32      `json:"minutes"`
	Date      string     `json:"date"`
	Note      string     `json:"note"`
	CreatedAt time.Time  `json:"createdAt"`
}

func (s *Server) writeWorklogs(w http.ResponseWriter, r *http.Request, issueID uuid.UUID, status int) error {
	rows, err := s.q.ListWorklogs(r.Context(), issueID)
	if err != nil {
		return err
	}
	spent, err := s.q.SpentByIssue(r.Context(), issueID)
	if err != nil {
		return err
	}
	out := make([]worklogDTO, 0, len(rows))
	for _, l := range rows {
		out = append(out, worklogDTO{ID: l.ID, UserID: l.UserID, UserName: l.UserName, Minutes: l.Minutes, Date: l.WorkDate.Format(dateLayout), Note: l.Note, CreatedAt: l.CreatedAt})
	}
	writeJSON(w, status, map[string]any{"worklogs": out, "spentMinutes": spent})
	return nil
}

func (s *Server) listWorklogs(w http.ResponseWriter, r *http.Request) error {
	issue, err := s.issueFromURL(r)
	if err != nil {
		return err
	}
	return s.writeWorklogs(w, r, issue.ID, http.StatusOK)
}

func (s *Server) createWorklog(w http.ResponseWriter, r *http.Request) error {
	if err := requireRole(r, db.ProjectRoleMember); err != nil {
		return err
	}
	issue, err := s.issueFromURL(r)
	if err != nil {
		return err
	}
	var in struct {
		Minutes int    `json:"minutes"`
		Date    string `json:"date"`
		Note    string `json:"note"`
	}
	if err := decodeJSON(w, r, &in); err != nil {
		return err
	}
	v := validation{}
	if in.Minutes < 1 || in.Minutes > 1440 {
		v.add("minutes", "От 1 минуты до 24 часов за одну запись.")
	}
	date := time.Now()
	if in.Date != "" {
		d, err := time.Parse(dateLayout, in.Date)
		if err != nil {
			v.add("date", "Дата в формате ГГГГ-ММ-ДД.")
		} else if d.After(time.Now().AddDate(0, 0, 1)) {
			v.add("date", "Нельзя списать время на будущую дату.")
		} else {
			date = d
		}
	}
	note := strings.TrimSpace(in.Note)
	if len([]rune(note)) > 500 {
		v.add("note", "Не больше 500 символов.")
	}
	if err := v.err(); err != nil {
		return err
	}
	uid := userID(r)
	if _, err := s.q.CreateWorklog(r.Context(), db.CreateWorklogParams{
		IssueID: issue.ID, UserID: &uid, Minutes: int32(in.Minutes), WorkDate: date, Note: note,
	}); err != nil {
		return err
	}
	_ = s.q.TouchIssue(r.Context(), issue.ID)
	return s.writeWorklogs(w, r, issue.ID, http.StatusCreated)
}

func (s *Server) deleteWorklog(w http.ResponseWriter, r *http.Request) error {
	id, err := urlUUID(r, "worklogID", "Запись времени")
	if err != nil {
		return err
	}
	l, err := s.q.GetWorklogInProject(r.Context(), db.GetWorklogInProjectParams{ID: id, ProjectID: project(r).ID})
	if err != nil {
		return err
	}
	own := l.UserID != nil && *l.UserID == userID(r)
	if !own && roleRank[project(r).Role] < roleRank[db.ProjectRoleAdmin] {
		return errForbidden("Удалять чужие записи времени могут только администраторы проекта.")
	}
	if err := s.q.DeleteWorklog(r.Context(), id); err != nil {
		return err
	}
	return s.writeWorklogs(w, r, l.IssueID, http.StatusOK)
}

func (s *Server) timeReport(w http.ResponseWriter, r *http.Request) error {
	to := time.Now()
	from := to.AddDate(0, 0, -29)
	if v, err := time.Parse(dateLayout, r.URL.Query().Get("from")); err == nil {
		from = v
	}
	if v, err := time.Parse(dateLayout, r.URL.Query().Get("to")); err == nil {
		to = v
	}
	if to.Sub(from) > 366*24*time.Hour || from.After(to) {
		return errBadRequest("Период — не больше года.", nil)
	}
	rows, err := s.q.TimeReport(r.Context(), db.TimeReportParams{ProjectID: project(r).ID, DateFrom: from, DateTo: to})
	if err != nil {
		return err
	}
	type row struct {
		UserID  *uuid.UUID `json:"userId"`
		Date    string     `json:"date"`
		Minutes int32      `json:"minutes"`
	}
	out := make([]row, 0, len(rows))
	for _, x := range rows {
		out = append(out, row{x.UserID, x.WorkDate.Format(dateLayout), x.Minutes})
	}
	writeJSON(w, http.StatusOK, map[string]any{"from": from.Format(dateLayout), "to": to.Format(dateLayout), "rows": out})
	return nil
}
