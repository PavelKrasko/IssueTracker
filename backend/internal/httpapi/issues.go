package httpapi

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgconn"

	"issuetracker/internal/database/db"
)

type issueInput struct {
	Title       json.RawMessage `json:"title"`
	Description json.RawMessage `json:"description"`
	Type        json.RawMessage `json:"type"`
	Status      json.RawMessage `json:"status"`
	Priority    json.RawMessage `json:"priority"`
	AssigneeID  json.RawMessage `json:"assigneeId"`
	TeamID      json.RawMessage `json:"teamId"`
	StartDate   json.RawMessage `json:"startDate"`
	DueDate     json.RawMessage `json:"dueDate"`
	Points      json.RawMessage `json:"points"`
	ParentID    json.RawMessage `json:"parentId"`
	SprintID    json.RawMessage `json:"sprintId"`
	VersionID   json.RawMessage `json:"fixVersionId"`
	Estimate    json.RawMessage `json:"estimateMinutes"`
}

type issueFields struct {
	Title       string
	Description string
	Type        db.IssueType
	Status      db.IssueStatus
	Priority    db.IssuePriority
	AssigneeID  *uuid.UUID
	TeamID      *uuid.UUID
	StartDate   *time.Time
	DueDate     *time.Time
	Points      *int16
	ParentID    *uuid.UUID
	SprintID    *uuid.UUID
	VersionID   *uuid.UUID
	Estimate    *int32
}

func fieldsOf(i db.Issue) issueFields {
	return issueFields{i.Title, i.Description, i.Type, i.Status, i.Priority, i.AssigneeID, i.TeamID, i.StartDate, i.DueDate, i.Points,
		i.ParentID, i.SprintID, i.FixVersionID, i.EstimateMinutes}
}

func nullish(raw json.RawMessage) bool {
	s := strings.TrimSpace(string(raw))
	return s == "null" || s == `""`
}

func (f *issueFields) apply(in issueInput, v validation) {
	if in.Title != nil {
		var s string
		if !nullish(in.Title) && json.Unmarshal(in.Title, &s) != nil {
			v.add("title", "Некорректное название.")
		}
		f.Title = strings.TrimSpace(s)
	}
	if in.Description != nil {
		var s string
		if !nullish(in.Description) && json.Unmarshal(in.Description, &s) != nil {
			v.add("description", "Некорректное описание.")
		}
		f.Description = s
	}
	if in.Type != nil {
		var s string
		_ = json.Unmarshal(in.Type, &s)
		if f.Type = db.IssueType(s); !f.Type.Valid() {
			v.add("type", "Тип: task, bug или story.")
		}
	}
	if in.Status != nil {
		var s string
		_ = json.Unmarshal(in.Status, &s)
		if f.Status = db.IssueStatus(s); !f.Status.Valid() {
			v.add("status", "Статус: todo, in_progress, review или done.")
		}
	}
	if in.Priority != nil {
		var s string
		_ = json.Unmarshal(in.Priority, &s)
		if f.Priority = db.IssuePriority(s); !f.Priority.Valid() {
			v.add("priority", "Приоритет: highest, high, medium или low.")
		}
	}
	if in.AssigneeID != nil {
		f.AssigneeID = parseUUIDPtr(in.AssigneeID, "assigneeId", v)
	}
	if in.TeamID != nil {
		f.TeamID = parseUUIDPtr(in.TeamID, "teamId", v)
	}
	if in.StartDate != nil {
		f.StartDate = parseDatePtr(in.StartDate, "startDate", v)
	}
	if in.DueDate != nil {
		f.DueDate = parseDatePtr(in.DueDate, "dueDate", v)
	}
	if in.Points != nil {
		f.Points = parsePoints(in.Points, v)
	}
	if in.ParentID != nil {
		f.ParentID = parseUUIDPtr(in.ParentID, "parentId", v)
	}
	if in.SprintID != nil {
		f.SprintID = parseUUIDPtr(in.SprintID, "sprintId", v)
	}
	if in.VersionID != nil {
		f.VersionID = parseUUIDPtr(in.VersionID, "fixVersionId", v)
	}
	if in.Estimate != nil {
		f.Estimate = parseMinutes(in.Estimate, "estimateMinutes", 100000, v)
	}

	if f.Title == "" {
		v.add("title", "Введите название задачи.")
	} else if len([]rune(f.Title)) > 255 {
		v.add("title", "Не больше 255 символов.")
	}
	if len(f.Description) > 50_000 {
		v.add("description", "Описание слишком длинное.")
	}
	if f.StartDate != nil && f.DueDate != nil && f.StartDate.After(*f.DueDate) {
		v.add("dueDate", "Срок не может быть раньше даты начала.")
	}
}

func parseUUIDPtr(raw json.RawMessage, field string, v validation) *uuid.UUID {
	if nullish(raw) {
		return nil
	}
	var s string
	if json.Unmarshal(raw, &s) != nil {
		v.add(field, "Некорректный идентификатор.")
		return nil
	}
	id, err := uuid.Parse(s)
	if err != nil {
		v.add(field, "Некорректный идентификатор.")
		return nil
	}
	return &id
}

func parseDatePtr(raw json.RawMessage, field string, v validation) *time.Time {
	if nullish(raw) {
		return nil
	}
	var s string
	if json.Unmarshal(raw, &s) != nil {
		v.add(field, "Дата в формате ГГГГ-ММ-ДД.")
		return nil
	}
	t, err := time.Parse(dateLayout, s)
	if err != nil {
		v.add(field, "Дата в формате ГГГГ-ММ-ДД.")
		return nil
	}
	return &t
}

func parsePoints(raw json.RawMessage, v validation) *int16 {
	if nullish(raw) {
		return nil
	}
	s := strings.Trim(strings.TrimSpace(string(raw)), `"`)
	n, err := strconv.Atoi(s)
	if err != nil || n < 0 || n > 100 {
		v.add("points", "Целое число от 0 до 100.")
		return nil
	}
	p := int16(n)
	return &p
}

func parseMinutes(raw json.RawMessage, field string, max int, v validation) *int32 {
	if nullish(raw) {
		return nil
	}
	n, err := strconv.Atoi(strings.Trim(strings.TrimSpace(string(raw)), `"`))
	if err != nil || n < 0 || n > max {
		v.add(field, fmt.Sprintf("Целое число минут от 0 до %d.", max))
		return nil
	}
	m := int32(n)
	return &m
}

func mapIssueFK(err error) error {
	var pg *pgconn.PgError
	if errors.As(err, &pg) && pg.Code == "23503" {
		switch {
		case strings.Contains(pg.ConstraintName, "assignee"):
			return errBadRequest("Исполнитель должен быть участником проекта.", map[string]string{"assigneeId": "Выберите участника проекта."})
		case strings.Contains(pg.ConstraintName, "team"):
			return errBadRequest("Команда не найдена в этом проекте.", map[string]string{"teamId": "Выберите команду проекта."})
		case strings.Contains(pg.ConstraintName, "parent"):
			return errBadRequest("Родительская задача не найдена в этом проекте.", map[string]string{"parentId": "Выберите задачу этого проекта."})
		case strings.Contains(pg.ConstraintName, "sprint"):
			return errBadRequest("Спринт не найден в этом проекте.", map[string]string{"sprintId": "Выберите спринт проекта."})
		case strings.Contains(pg.ConstraintName, "version"):
			return errBadRequest("Версия не найдена в этом проекте.", map[string]string{"fixVersionId": "Выберите версию проекта."})
		}
	}
	if errors.As(err, &pg) && pg.Code == "23514" && pg.ConstraintName == "issues_not_own_parent" {
		return errBadRequest("Задача не может быть подзадачей самой себя.", map[string]string{"parentId": "Выберите другую задачу."})
	}
	return err
}

func completedAt(prevStatus db.IssueStatus, prev *time.Time, next db.IssueStatus) *time.Time {
	if next != db.IssueStatusDone {
		return nil
	}
	if prevStatus == db.IssueStatusDone && prev != nil {
		return prev
	}
	now := time.Now()
	return &now
}

func (s *Server) issueResponse(r *http.Request, i db.Issue) (issueDTO, error) {
	ctx := r.Context()
	var x issueExtras
	var err error
	if x.Attachments, err = s.q.ListAttachmentsByIssue(ctx, i.ID); err != nil {
		return issueDTO{}, err
	}
	if x.Watchers, err = s.q.ListWatcherIDs(ctx, i.ID); err != nil {
		return issueDTO{}, err
	}
	if x.Spent, err = s.q.SpentByIssue(ctx, i.ID); err != nil {
		return issueDTO{}, err
	}
	if x.Comments, err = s.q.CommentCountByIssue(ctx, i.ID); err != nil {
		return issueDTO{}, err
	}
	return toIssue(project(r).Key, i, x), nil
}

func (s *Server) writeIssue(w http.ResponseWriter, r *http.Request, status int, i db.Issue) error {
	out, err := s.issueResponse(r, i)
	if err != nil {
		return err
	}
	writeJSON(w, status, out)
	return nil
}

func issueKey(r *http.Request, i db.Issue) string {
	return fmt.Sprintf("%s-%d", project(r).Key, i.Number)
}

func (s *Server) checkParent(r *http.Request, id uuid.UUID, parent *uuid.UUID) error {
	if parent == nil {
		return nil
	}
	if *parent == id {
		return errBadRequest("Задача не может быть подзадачей самой себя.", map[string]string{"parentId": "Выберите другую задачу."})
	}
	ancestors, err := s.q.IssueAncestorIDs(r.Context(), *parent)
	if err != nil {
		return err
	}
	for _, a := range ancestors {
		if a == id {
			return errBadRequest("Нельзя сделать задачу подзадачей её же подзадачи.", map[string]string{"parentId": "Эта задача ниже по иерархии."})
		}
	}
	return nil
}

func (s *Server) checkSprint(r *http.Request, sprint *uuid.UUID) error {
	if sprint == nil {
		return nil
	}
	sp, err := s.q.GetSprint(r.Context(), db.GetSprintParams{ID: *sprint, ProjectID: project(r).ID})
	if isNoRows(err) {
		return errBadRequest("Спринт не найден в этом проекте.", map[string]string{"sprintId": "Выберите спринт проекта."})
	}
	if err != nil {
		return err
	}
	if sp.State == db.SprintStateClosed {
		return errBadRequest("Спринт уже завершён.", map[string]string{"sprintId": "Выберите активный или запланированный спринт."})
	}
	return nil
}

func (s *Server) listIssues(w http.ResponseWriter, r *http.Request) error {
	ctx := r.Context()
	pid := project(r).ID
	params := db.ListIssuesParams{ProjectID: pid}
	q := r.URL.Query()
	if v := strings.TrimSpace(q.Get("q")); v != "" {
		params.Q = &v
	}
	if v := db.IssueStatus(q.Get("status")); v.Valid() {
		params.Status = db.NullIssueStatus{IssueStatus: v, Valid: true}
	}
	if v, err := uuid.Parse(q.Get("assignee")); err == nil {
		params.AssigneeID = &v
	}
	issues, err := s.q.ListIssues(ctx, params)
	if err != nil {
		return err
	}
	atts, err := s.q.ListAttachmentsByProject(ctx, pid)
	if err != nil {
		return err
	}
	extras := map[uuid.UUID]*issueExtras{}
	get := func(id uuid.UUID) *issueExtras {
		if extras[id] == nil {
			extras[id] = &issueExtras{}
		}
		return extras[id]
	}
	for _, a := range atts {
		x := get(a.IssueID)
		x.Attachments = append(x.Attachments, a)
	}
	watchers, err := s.q.ListWatchersByProject(ctx, pid)
	if err != nil {
		return err
	}
	for _, wt := range watchers {
		x := get(wt.IssueID)
		x.Watchers = append(x.Watchers, wt.UserID)
	}
	spent, err := s.q.SpentByProject(ctx, pid)
	if err != nil {
		return err
	}
	for _, sp := range spent {
		get(sp.IssueID).Spent = sp.Minutes
	}
	comments, err := s.q.CommentCountsByProject(ctx, pid)
	if err != nil {
		return err
	}
	for _, c := range comments {
		get(c.IssueID).Comments = c.Count
	}
	out := make([]issueDTO, 0, len(issues))
	for _, i := range issues {
		out = append(out, toIssue(project(r).Key, i, *get(i.ID)))
	}
	writeJSON(w, http.StatusOK, out)
	return nil
}

func (s *Server) getIssue(w http.ResponseWriter, r *http.Request) error {
	id, err := urlUUID(r, "issueID", "Задача")
	if err != nil {
		return err
	}
	i, err := s.q.GetIssue(r.Context(), db.GetIssueParams{ID: id, ProjectID: project(r).ID})
	if err != nil {
		return err
	}
	return s.writeIssue(w, r, http.StatusOK, i)
}

func (s *Server) createIssue(w http.ResponseWriter, r *http.Request) error {
	if err := requireRole(r, db.ProjectRoleMember); err != nil {
		return err
	}
	var in issueInput
	if err := decodeJSON(w, r, &in); err != nil {
		return err
	}
	f := issueFields{Type: db.IssueTypeTask, Status: db.IssueStatusTodo, Priority: db.IssuePriorityMedium}
	v := validation{}
	f.apply(in, v)
	if err := v.err(); err != nil {
		return err
	}
	if err := s.checkSprint(r, f.SprintID); err != nil {
		return err
	}

	ctx := r.Context()
	pid, uid := project(r).ID, userID(r)
	mentioned := parseMentions(f.Description)
	var issue db.Issue
	err := s.inTx(ctx, func(q *db.Queries) error {
		num, err := q.NextIssueNumber(ctx, pid)
		if err != nil {
			return err
		}
		issue, err = q.CreateIssue(ctx, db.CreateIssueParams{
			ProjectID: pid, Number: num, Title: f.Title, Description: f.Description,
			Type: f.Type, Status: f.Status, Priority: f.Priority,
			AssigneeID: f.AssigneeID, ReporterID: &uid, TeamID: f.TeamID,
			StartDate: f.StartDate, DueDate: f.DueDate, Points: f.Points,
			CompletedAt: completedAt("", nil, f.Status),
			ParentID:    f.ParentID, SprintID: f.SprintID, FixVersionID: f.VersionID, EstimateMinutes: f.Estimate,
		})
		if err != nil {
			return err
		}

		if err := s.watch(ctx, q, issue, append([]*uuid.UUID{&uid, f.AssigneeID}, ptrs(mentioned)...)...); err != nil {
			return err
		}
		return q.CreateIssueEvent(ctx, db.CreateIssueEventParams{IssueID: issue.ID, ActorID: &uid, Kind: "created", Changes: json.RawMessage(`{}`)})
	})
	if err != nil {
		return mapIssueFK(err)
	}
	key := issueKey(r, issue)
	var events []notification
	if f.AssigneeID != nil {
		events = append(events, notification{Kind: notifyAssigned, Issue: issue, IssueKey: key, ActorID: uid, Recipients: []uuid.UUID{*f.AssigneeID}})
	}
	if len(mentioned) > 0 {
		events = append(events, notification{Kind: notifyMentioned, Issue: issue, IssueKey: key, ActorID: uid, Recipients: mentioned, Text: excerpt(f.Description, 200)})
	}
	s.notify(ctx, events...)
	return s.writeIssue(w, r, http.StatusCreated, issue)
}

func (s *Server) updateIssue(w http.ResponseWriter, r *http.Request) error {
	if err := requireRole(r, db.ProjectRoleMember); err != nil {
		return err
	}
	id, err := urlUUID(r, "issueID", "Задача")
	if err != nil {
		return err
	}
	var in issueInput
	if err := decodeJSON(w, r, &in); err != nil {
		return err
	}
	ctx := r.Context()
	pid, uid := project(r).ID, userID(r)
	cur, err := s.q.GetIssue(ctx, db.GetIssueParams{ID: id, ProjectID: pid})
	if err != nil {
		return err
	}
	before := fieldsOf(cur)
	f := before
	v := validation{}
	f.apply(in, v)
	if err := v.err(); err != nil {
		return err
	}
	if !sameUUID(before.ParentID, f.ParentID) {
		if err := s.checkParent(r, id, f.ParentID); err != nil {
			return err
		}
	}
	if !sameUUID(before.SprintID, f.SprintID) {
		if err := s.checkSprint(r, f.SprintID); err != nil {
			return err
		}
	}
	mentioned := newMentions(before.Description, f.Description)
	assigneeChanged := f.AssigneeID != nil && !sameUUID(before.AssigneeID, f.AssigneeID)

	var updated db.Issue
	err = s.inTx(ctx, func(q *db.Queries) error {
		var err error
		updated, err = q.UpdateIssue(ctx, db.UpdateIssueParams{
			ID: id, ProjectID: pid, Title: f.Title, Description: f.Description,
			Type: f.Type, Status: f.Status, Priority: f.Priority,
			AssigneeID: f.AssigneeID, TeamID: f.TeamID, StartDate: f.StartDate, DueDate: f.DueDate, Points: f.Points,
			CompletedAt: completedAt(cur.Status, cur.CompletedAt, f.Status),
			ParentID:    f.ParentID, SprintID: f.SprintID, FixVersionID: f.VersionID, EstimateMinutes: f.Estimate,
		})
		if err != nil {
			return err
		}
		watchers := ptrs(mentioned)
		if assigneeChanged {
			watchers = append(watchers, f.AssigneeID)
		}
		if err := s.watch(ctx, q, updated, watchers...); err != nil {
			return err
		}
		if changes := diffIssue(before, f); len(changes) > 0 {
			b, _ := json.Marshal(changes)
			return q.CreateIssueEvent(ctx, db.CreateIssueEventParams{IssueID: id, ActorID: &uid, Kind: "updated", Changes: b})
		}
		return nil
	})
	if err != nil {
		return mapIssueFK(err)
	}

	key := issueKey(r, updated)
	var events []notification
	if assigneeChanged {
		events = append(events, notification{Kind: notifyAssigned, Issue: updated, IssueKey: key, ActorID: uid, Recipients: []uuid.UUID{*f.AssigneeID}})
	}
	if len(mentioned) > 0 {
		events = append(events, notification{Kind: notifyMentioned, Issue: updated, IssueKey: key, ActorID: uid, Recipients: mentioned, Text: excerpt(f.Description, 200)})
	}
	if before.Status != f.Status {
		if watchers, err := s.q.ListWatcherIDs(ctx, id); err == nil {
			events = append(events, notification{Kind: notifyStatus, Issue: updated, IssueKey: key, ActorID: uid, Recipients: watchers, From: string(before.Status), To: string(f.Status)})
		}
	}
	s.notify(ctx, events...)
	return s.writeIssue(w, r, http.StatusOK, updated)
}

func sameUUID(a, b *uuid.UUID) bool {
	if a == nil || b == nil {
		return a == b
	}
	return *a == *b
}

type change struct {
	From any `json:"from"`
	To   any `json:"to"`
}

func diffIssue(a, b issueFields) map[string]change {
	out := map[string]change{}
	str := func(p any) any {
		switch x := p.(type) {
		case *uuid.UUID:
			if x == nil {
				return nil
			}
			return x.String()
		case *time.Time:
			if x == nil {
				return nil
			}
			return x.Format(dateLayout)
		case *int16:
			if x == nil {
				return nil
			}
			return *x
		case *int32:
			if x == nil {
				return nil
			}
			return *x
		}
		return p
	}
	add := func(name string, from, to any) {
		f, t := str(from), str(to)
		if fmt.Sprint(f) != fmt.Sprint(t) {
			out[name] = change{f, t}
		}
	}
	add("title", a.Title, b.Title)
	if a.Description != b.Description {
		out["description"] = change{nil, nil}
	}
	add("type", string(a.Type), string(b.Type))
	add("status", string(a.Status), string(b.Status))
	add("priority", string(a.Priority), string(b.Priority))
	add("assigneeId", a.AssigneeID, b.AssigneeID)
	add("teamId", a.TeamID, b.TeamID)
	add("startDate", a.StartDate, b.StartDate)
	add("dueDate", a.DueDate, b.DueDate)
	add("points", a.Points, b.Points)
	add("parentId", a.ParentID, b.ParentID)
	add("sprintId", a.SprintID, b.SprintID)
	add("fixVersionId", a.VersionID, b.VersionID)
	add("estimateMinutes", a.Estimate, b.Estimate)
	return out
}

func (s *Server) deleteIssue(w http.ResponseWriter, r *http.Request) error {
	if err := requireRole(r, db.ProjectRoleMember); err != nil {
		return err
	}
	id, err := urlUUID(r, "issueID", "Задача")
	if err != nil {
		return err
	}
	ctx := r.Context()
	if _, err := s.q.GetIssue(ctx, db.GetIssueParams{ID: id, ProjectID: project(r).ID}); err != nil {
		return err
	}
	atts, err := s.q.ListAttachmentsByIssue(ctx, id)
	if err != nil {
		return err
	}
	if _, err := s.q.DeleteIssue(ctx, db.DeleteIssueParams{ID: id, ProjectID: project(r).ID}); err != nil {
		return err
	}
	keys := make([]string, 0, len(atts))
	for _, a := range atts {
		keys = append(keys, a.StorageKey)
	}
	s.deleteObjects(keys...)
	w.WriteHeader(http.StatusNoContent)
	return nil
}

func (s *Server) listIssueEvents(w http.ResponseWriter, r *http.Request) error {
	id, err := urlUUID(r, "issueID", "Задача")
	if err != nil {
		return err
	}
	if _, err := s.q.GetIssue(r.Context(), db.GetIssueParams{ID: id, ProjectID: project(r).ID}); err != nil {
		return err
	}
	rows, err := s.q.ListIssueEvents(r.Context(), id)
	if err != nil {
		return err
	}
	out := make([]eventDTO, 0, len(rows))
	for _, e := range rows {
		out = append(out, eventDTO{ID: e.ID, Kind: e.Kind, Changes: e.Changes, ActorID: e.ActorID, ActorName: e.ActorName, CreatedAt: e.CreatedAt})
	}
	writeJSON(w, http.StatusOK, out)
	return nil
}
