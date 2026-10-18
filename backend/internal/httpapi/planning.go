package httpapi

import (
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"

	"issuetracker/internal/database/db"
)

type sprintDTO struct {
	ID          uuid.UUID  `json:"id"`
	Name        string     `json:"name"`
	Goal        string     `json:"goal"`
	State       string     `json:"state"`
	StartDate   *string    `json:"startDate"`
	EndDate     *string    `json:"endDate"`
	ClosedAt    *time.Time `json:"closedAt"`
	CreatedAt   time.Time  `json:"createdAt"`
	IssuesTotal int32      `json:"issuesTotal"`
	IssuesDone  int32      `json:"issuesDone"`
	PointsTotal int32      `json:"pointsTotal"`
	PointsDone  int32      `json:"pointsDone"`
}

func toSprint(s db.Sprint) sprintDTO {
	return sprintDTO{ID: s.ID, Name: s.Name, Goal: s.Goal, State: string(s.State), StartDate: fmtDate(s.StartDate), EndDate: fmtDate(s.EndDate), ClosedAt: s.ClosedAt, CreatedAt: s.CreatedAt}
}

func (s *Server) listSprints(w http.ResponseWriter, r *http.Request) error {
	rows, err := s.q.ListSprints(r.Context(), project(r).ID)
	if err != nil {
		return err
	}
	out := make([]sprintDTO, 0, len(rows))
	for _, x := range rows {
		d := toSprint(db.Sprint{ID: x.ID, Name: x.Name, Goal: x.Goal, State: x.State, StartDate: x.StartDate, EndDate: x.EndDate, ClosedAt: x.ClosedAt, CreatedAt: x.CreatedAt})
		d.IssuesTotal, d.IssuesDone, d.PointsTotal, d.PointsDone = x.IssuesTotal, x.IssuesDone, x.PointsTotal, x.PointsDone
		out = append(out, d)
	}
	writeJSON(w, http.StatusOK, out)
	return nil
}

type sprintInput struct {
	Name      *string         `json:"name"`
	Goal      *string         `json:"goal"`
	StartDate json.RawMessage `json:"startDate"`
	EndDate   json.RawMessage `json:"endDate"`
}

func (in sprintInput) apply(name, goal *string, start, end **time.Time) error {
	v := validation{}
	if in.Name != nil {
		*name = strings.TrimSpace(*in.Name)
	}
	if in.Goal != nil {
		*goal = strings.TrimSpace(*in.Goal)
	}
	if in.StartDate != nil {
		*start = parseDatePtr(in.StartDate, "startDate", v)
	}
	if in.EndDate != nil {
		*end = parseDatePtr(in.EndDate, "endDate", v)
	}
	if *name == "" || len([]rune(*name)) > 80 {
		v.add("name", "Введите название (до 80 символов).")
	}
	if len([]rune(*goal)) > 1000 {
		v.add("goal", "Не больше 1000 символов.")
	}
	if *start != nil && *end != nil && (*start).After(**end) {
		v.add("endDate", "Окончание не может быть раньше начала.")
	}
	return v.err()
}

func (s *Server) createSprint(w http.ResponseWriter, r *http.Request) error {
	if err := requireRole(r, db.ProjectRoleMember); err != nil {
		return err
	}
	var in sprintInput
	if err := decodeJSON(w, r, &in); err != nil {
		return err
	}
	var name, goal string
	var start, end *time.Time
	if err := in.apply(&name, &goal, &start, &end); err != nil {
		return err
	}
	sp, err := s.q.CreateSprint(r.Context(), db.CreateSprintParams{ProjectID: project(r).ID, Name: name, Goal: goal, StartDate: start, EndDate: end})
	if err != nil {
		return err
	}
	writeJSON(w, http.StatusCreated, toSprint(sp))
	return nil
}

func (s *Server) sprintFromURL(r *http.Request) (db.Sprint, error) {
	id, err := urlUUID(r, "sprintID", "Спринт")
	if err != nil {
		return db.Sprint{}, err
	}
	return s.q.GetSprint(r.Context(), db.GetSprintParams{ID: id, ProjectID: project(r).ID})
}

func (s *Server) updateSprint(w http.ResponseWriter, r *http.Request) error {
	if err := requireRole(r, db.ProjectRoleMember); err != nil {
		return err
	}
	sp, err := s.sprintFromURL(r)
	if err != nil {
		return err
	}
	var in sprintInput
	if err := decodeJSON(w, r, &in); err != nil {
		return err
	}
	name, goal, start, end := sp.Name, sp.Goal, sp.StartDate, sp.EndDate
	if err := in.apply(&name, &goal, &start, &end); err != nil {
		return err
	}
	if sp.State == db.SprintStateActive && (start == nil || end == nil) {
		return errBadRequest("У активного спринта должны быть даты начала и окончания.", nil)
	}
	updated, err := s.q.UpdateSprint(r.Context(), db.UpdateSprintParams{ID: sp.ID, ProjectID: sp.ProjectID, Name: name, Goal: goal, StartDate: start, EndDate: end})
	if err != nil {
		return err
	}
	writeJSON(w, http.StatusOK, toSprint(updated))
	return nil
}

func today() time.Time {
	t := time.Now()
	return time.Date(t.Year(), t.Month(), t.Day(), 0, 0, 0, 0, time.UTC)
}

func (s *Server) startSprint(w http.ResponseWriter, r *http.Request) error {
	if err := requireRole(r, db.ProjectRoleMember); err != nil {
		return err
	}
	sp, err := s.sprintFromURL(r)
	if err != nil {
		return err
	}
	if sp.State != db.SprintStatePlanned {
		return errBadRequest("Начать можно только запланированный спринт.", nil)
	}
	var in sprintInput
	if r.ContentLength != 0 {
		if err := decodeJSON(w, r, &in); err != nil {
			return err
		}
	}
	name, goal, start, end := sp.Name, sp.Goal, sp.StartDate, sp.EndDate
	if err := in.apply(&name, &goal, &start, &end); err != nil {
		return err
	}
	if start == nil {
		t := today()
		start = &t
	}
	if end == nil || end.Before(*start) {
		t := start.AddDate(0, 0, 14)
		end = &t
	}
	started, err := s.q.StartSprint(r.Context(), db.StartSprintParams{ID: sp.ID, ProjectID: sp.ProjectID, StartDate: start, EndDate: end})
	if isUniqueViolation(err) {
		return errConflict("SPRINT_ACTIVE", "В проекте уже есть активный спринт. Сначала завершите его.", nil)
	}
	if err != nil {
		return err
	}
	writeJSON(w, http.StatusOK, toSprint(started))
	return nil
}

func (s *Server) completeSprint(w http.ResponseWriter, r *http.Request) error {
	if err := requireRole(r, db.ProjectRoleMember); err != nil {
		return err
	}
	sp, err := s.sprintFromURL(r)
	if err != nil {
		return err
	}
	if sp.State != db.SprintStateActive {
		return errBadRequest("Завершить можно только активный спринт.", nil)
	}
	var in struct {
		MoveTo *uuid.UUID `json:"moveTo"`
	}
	if r.ContentLength != 0 {
		if err := decodeJSON(w, r, &in); err != nil {
			return err
		}
	}
	ctx := r.Context()
	if in.MoveTo != nil {
		target, err := s.q.GetSprint(ctx, db.GetSprintParams{ID: *in.MoveTo, ProjectID: sp.ProjectID})
		if err != nil || target.State != db.SprintStatePlanned {
			return errBadRequest("Перенести задачи можно только в запланированный спринт.", map[string]string{"moveTo": "Выберите запланированный спринт."})
		}
	}
	var closed db.Sprint
	var moved int64
	err = s.inTx(ctx, func(q *db.Queries) error {
		var err error
		if moved, err = q.MoveUnfinishedIssues(ctx, db.MoveUnfinishedIssuesParams{ToSprintID: in.MoveTo, FromSprintID: &sp.ID}); err != nil {
			return err
		}
		closed, err = q.CloseSprint(ctx, db.CloseSprintParams{ID: sp.ID, ProjectID: sp.ProjectID})
		return err
	})
	if err != nil {
		return err
	}
	writeJSON(w, http.StatusOK, map[string]any{"sprint": toSprint(closed), "movedIssues": moved})
	return nil
}

func (s *Server) deleteSprint(w http.ResponseWriter, r *http.Request) error {
	if err := requireRole(r, db.ProjectRoleMember); err != nil {
		return err
	}
	sp, err := s.sprintFromURL(r)
	if err != nil {
		return err
	}
	if sp.State == db.SprintStateActive {
		return errBadRequest("Активный спринт нельзя удалить — сначала завершите его.", nil)
	}
	if _, err := s.q.DeleteSprint(r.Context(), db.DeleteSprintParams{ID: sp.ID, ProjectID: sp.ProjectID}); err != nil {
		return err
	}
	w.WriteHeader(http.StatusNoContent)
	return nil
}

func (s *Server) sprintBurndown(w http.ResponseWriter, r *http.Request) error {
	sp, err := s.sprintFromURL(r)
	if err != nil {
		return err
	}
	if sp.StartDate == nil || sp.EndDate == nil {
		return errBadRequest("У спринта не заданы даты.", nil)
	}
	issues, err := s.q.SprintIssues(r.Context(), &sp.ID)
	if err != nil {
		return err
	}
	unit := "issues"
	for _, i := range issues {
		if i.Points != nil && *i.Points > 0 {
			unit = "points"
			break
		}
	}
	weight := func(p *int16) int {
		if unit == "issues" {
			return 1
		}
		if p == nil {
			return 0
		}
		return int(*p)
	}
	total := 0
	for _, i := range issues {
		total += weight(i.Points)
	}
	type point struct {
		Date      string  `json:"date"`
		Remaining *int    `json:"remaining"`
		Ideal     float64 `json:"ideal"`
	}
	start, end := *sp.StartDate, *sp.EndDate
	days := int(end.Sub(start).Hours()/24) + 1
	if days > 120 {
		days = 120
	}
	lastDay := today()
	if sp.ClosedAt != nil {
		c := sp.ClosedAt.UTC()
		lastDay = time.Date(c.Year(), c.Month(), c.Day(), 0, 0, 0, 0, time.UTC)
	}
	out := make([]point, 0, days)
	for d := 0; d < days; d++ {
		day := start.AddDate(0, 0, d)
		p := point{Date: day.Format(dateLayout)}
		if days > 1 {
			p.Ideal = float64(total) * float64(days-1-d) / float64(days-1)
		}
		if !day.After(lastDay) {
			endOfDay := day.AddDate(0, 0, 1)
			left := 0
			for _, i := range issues {
				done := i.Status == db.IssueStatusDone && i.CompletedAt != nil && i.CompletedAt.Before(endOfDay)
				if !done {
					left += weight(i.Points)
				}
			}
			p.Remaining = &left
		}
		out = append(out, p)
	}
	writeJSON(w, http.StatusOK, map[string]any{"unit": unit, "total": total, "days": out})
	return nil
}

type versionDTO struct {
	ID          uuid.UUID  `json:"id"`
	Name        string     `json:"name"`
	Description string     `json:"description"`
	ReleaseDate *string    `json:"releaseDate"`
	Released    bool       `json:"released"`
	ReleasedAt  *time.Time `json:"releasedAt"`
	CreatedAt   time.Time  `json:"createdAt"`
	IssuesTotal int32      `json:"issuesTotal"`
	IssuesDone  int32      `json:"issuesDone"`
}

func toVersion(v db.Version) versionDTO {
	return versionDTO{ID: v.ID, Name: v.Name, Description: v.Description, ReleaseDate: fmtDate(v.ReleaseDate), Released: v.ReleasedAt != nil, ReleasedAt: v.ReleasedAt, CreatedAt: v.CreatedAt}
}

func (s *Server) listVersions(w http.ResponseWriter, r *http.Request) error {
	rows, err := s.q.ListVersions(r.Context(), project(r).ID)
	if err != nil {
		return err
	}
	out := make([]versionDTO, 0, len(rows))
	for _, x := range rows {
		d := toVersion(db.Version{ID: x.ID, Name: x.Name, Description: x.Description, ReleaseDate: x.ReleaseDate, ReleasedAt: x.ReleasedAt, CreatedAt: x.CreatedAt})
		d.IssuesTotal, d.IssuesDone = x.IssuesTotal, x.IssuesDone
		out = append(out, d)
	}
	writeJSON(w, http.StatusOK, out)
	return nil
}

type versionInput struct {
	Name        *string         `json:"name"`
	Description *string         `json:"description"`
	ReleaseDate json.RawMessage `json:"releaseDate"`
	Released    *bool           `json:"released"`
}

func (in versionInput) apply(v *db.Version) error {
	val := validation{}
	if in.Name != nil {
		v.Name = strings.TrimSpace(*in.Name)
	}
	if in.Description != nil {
		v.Description = strings.TrimSpace(*in.Description)
	}
	if in.ReleaseDate != nil {
		v.ReleaseDate = parseDatePtr(in.ReleaseDate, "releaseDate", val)
	}
	if in.Released != nil {
		switch {
		case *in.Released && v.ReleasedAt == nil:
			now := time.Now()
			v.ReleasedAt = &now
		case !*in.Released:
			v.ReleasedAt = nil
		}
	}
	if v.Name == "" || len([]rune(v.Name)) > 60 {
		val.add("name", "Введите название версии (до 60 символов), например 1.2.0.")
	}
	if len([]rune(v.Description)) > 2000 {
		val.add("description", "Не больше 2000 символов.")
	}
	return val.err()
}

func versionConflict(err error) error {
	if isUniqueViolation(err) {
		return errConflict("VERSION_EXISTS", "Версия с таким названием уже есть.", map[string]string{"name": "Такая версия уже есть."})
	}
	return err
}

func (s *Server) createVersion(w http.ResponseWriter, r *http.Request) error {
	if err := requireRole(r, db.ProjectRoleMember); err != nil {
		return err
	}
	var in versionInput
	if err := decodeJSON(w, r, &in); err != nil {
		return err
	}
	var v db.Version
	if err := in.apply(&v); err != nil {
		return err
	}
	created, err := s.q.CreateVersion(r.Context(), db.CreateVersionParams{ProjectID: project(r).ID, Name: v.Name, Description: v.Description, ReleaseDate: v.ReleaseDate})
	if err != nil {
		return versionConflict(err)
	}
	if v.ReleasedAt != nil {
		created, err = s.q.UpdateVersion(r.Context(), db.UpdateVersionParams{ID: created.ID, ProjectID: created.ProjectID, Name: created.Name, Description: created.Description, ReleaseDate: created.ReleaseDate, ReleasedAt: v.ReleasedAt})
		if err != nil {
			return err
		}
	}
	writeJSON(w, http.StatusCreated, toVersion(created))
	return nil
}

func (s *Server) updateVersion(w http.ResponseWriter, r *http.Request) error {
	if err := requireRole(r, db.ProjectRoleMember); err != nil {
		return err
	}
	id, err := urlUUID(r, "versionID", "Версия")
	if err != nil {
		return err
	}
	v, err := s.q.GetVersion(r.Context(), db.GetVersionParams{ID: id, ProjectID: project(r).ID})
	if err != nil {
		return err
	}
	var in versionInput
	if err := decodeJSON(w, r, &in); err != nil {
		return err
	}
	if err := in.apply(&v); err != nil {
		return err
	}
	updated, err := s.q.UpdateVersion(r.Context(), db.UpdateVersionParams{ID: v.ID, ProjectID: v.ProjectID, Name: v.Name, Description: v.Description, ReleaseDate: v.ReleaseDate, ReleasedAt: v.ReleasedAt})
	if err != nil {
		return versionConflict(err)
	}
	writeJSON(w, http.StatusOK, toVersion(updated))
	return nil
}

func (s *Server) deleteVersion(w http.ResponseWriter, r *http.Request) error {
	if err := requireRole(r, db.ProjectRoleMember); err != nil {
		return err
	}
	id, err := urlUUID(r, "versionID", "Версия")
	if err != nil {
		return err
	}
	n, err := s.q.DeleteVersion(r.Context(), db.DeleteVersionParams{ID: id, ProjectID: project(r).ID})
	if err != nil {
		return err
	}
	if n == 0 {
		return errNotFound("Версия не найдена.")
	}
	w.WriteHeader(http.StatusNoContent)
	return nil
}
