package db

import (
	"context"
	"time"

	"github.com/google/uuid"
)

const closeSprint = `-- name: CloseSprint :one
UPDATE sprints SET state = 'closed', closed_at = now()
WHERE id = $1 AND project_id = $2 AND state = 'active'
RETURNING id, project_id, name, goal, state, start_date, end_date, closed_at, created_at, updated_at
`

type CloseSprintParams struct {
	ID        uuid.UUID
	ProjectID uuid.UUID
}

func (q *Queries) CloseSprint(ctx context.Context, arg CloseSprintParams) (Sprint, error) {
	row := q.db.QueryRow(ctx, closeSprint, arg.ID, arg.ProjectID)
	var i Sprint
	err := row.Scan(
		&i.ID,
		&i.ProjectID,
		&i.Name,
		&i.Goal,
		&i.State,
		&i.StartDate,
		&i.EndDate,
		&i.ClosedAt,
		&i.CreatedAt,
		&i.UpdatedAt,
	)
	return i, err
}

const createSprint = `-- name: CreateSprint :one
INSERT INTO sprints (project_id, name, goal, start_date, end_date)
VALUES ($1, $2, $3, $4, $5)
RETURNING id, project_id, name, goal, state, start_date, end_date, closed_at, created_at, updated_at
`

type CreateSprintParams struct {
	ProjectID uuid.UUID
	Name      string
	Goal      string
	StartDate *time.Time
	EndDate   *time.Time
}

func (q *Queries) CreateSprint(ctx context.Context, arg CreateSprintParams) (Sprint, error) {
	row := q.db.QueryRow(ctx, createSprint,
		arg.ProjectID,
		arg.Name,
		arg.Goal,
		arg.StartDate,
		arg.EndDate,
	)
	var i Sprint
	err := row.Scan(
		&i.ID,
		&i.ProjectID,
		&i.Name,
		&i.Goal,
		&i.State,
		&i.StartDate,
		&i.EndDate,
		&i.ClosedAt,
		&i.CreatedAt,
		&i.UpdatedAt,
	)
	return i, err
}

const createVersion = `-- name: CreateVersion :one
INSERT INTO versions (project_id, name, description, release_date)
VALUES ($1, $2, $3, $4)
RETURNING id, project_id, name, description, release_date, released_at, created_at, updated_at
`

type CreateVersionParams struct {
	ProjectID   uuid.UUID
	Name        string
	Description string
	ReleaseDate *time.Time
}

func (q *Queries) CreateVersion(ctx context.Context, arg CreateVersionParams) (Version, error) {
	row := q.db.QueryRow(ctx, createVersion,
		arg.ProjectID,
		arg.Name,
		arg.Description,
		arg.ReleaseDate,
	)
	var i Version
	err := row.Scan(
		&i.ID,
		&i.ProjectID,
		&i.Name,
		&i.Description,
		&i.ReleaseDate,
		&i.ReleasedAt,
		&i.CreatedAt,
		&i.UpdatedAt,
	)
	return i, err
}

const createWorklog = `-- name: CreateWorklog :one
INSERT INTO worklogs (issue_id, user_id, minutes, work_date, note)
VALUES ($1, $2, $3, $4, $5)
RETURNING id, issue_id, user_id, minutes, work_date, note, created_at
`

type CreateWorklogParams struct {
	IssueID  uuid.UUID
	UserID   *uuid.UUID
	Minutes  int32
	WorkDate time.Time
	Note     string
}

func (q *Queries) CreateWorklog(ctx context.Context, arg CreateWorklogParams) (Worklog, error) {
	row := q.db.QueryRow(ctx, createWorklog,
		arg.IssueID,
		arg.UserID,
		arg.Minutes,
		arg.WorkDate,
		arg.Note,
	)
	var i Worklog
	err := row.Scan(
		&i.ID,
		&i.IssueID,
		&i.UserID,
		&i.Minutes,
		&i.WorkDate,
		&i.Note,
		&i.CreatedAt,
	)
	return i, err
}

const deleteSprint = `-- name: DeleteSprint :execrows
DELETE FROM sprints WHERE id = $1 AND project_id = $2 AND state <> 'active'
`

type DeleteSprintParams struct {
	ID        uuid.UUID
	ProjectID uuid.UUID
}

func (q *Queries) DeleteSprint(ctx context.Context, arg DeleteSprintParams) (int64, error) {
	result, err := q.db.Exec(ctx, deleteSprint, arg.ID, arg.ProjectID)
	if err != nil {
		return 0, err
	}
	return result.RowsAffected(), nil
}

const deleteVersion = `-- name: DeleteVersion :execrows
DELETE FROM versions WHERE id = $1 AND project_id = $2
`

type DeleteVersionParams struct {
	ID        uuid.UUID
	ProjectID uuid.UUID
}

func (q *Queries) DeleteVersion(ctx context.Context, arg DeleteVersionParams) (int64, error) {
	result, err := q.db.Exec(ctx, deleteVersion, arg.ID, arg.ProjectID)
	if err != nil {
		return 0, err
	}
	return result.RowsAffected(), nil
}

const deleteWorklog = `-- name: DeleteWorklog :exec
DELETE FROM worklogs WHERE id = $1
`

func (q *Queries) DeleteWorklog(ctx context.Context, id uuid.UUID) error {
	_, err := q.db.Exec(ctx, deleteWorklog, id)
	return err
}

const getSprint = `-- name: GetSprint :one
SELECT id, project_id, name, goal, state, start_date, end_date, closed_at, created_at, updated_at FROM sprints WHERE id = $1 AND project_id = $2
`

type GetSprintParams struct {
	ID        uuid.UUID
	ProjectID uuid.UUID
}

func (q *Queries) GetSprint(ctx context.Context, arg GetSprintParams) (Sprint, error) {
	row := q.db.QueryRow(ctx, getSprint, arg.ID, arg.ProjectID)
	var i Sprint
	err := row.Scan(
		&i.ID,
		&i.ProjectID,
		&i.Name,
		&i.Goal,
		&i.State,
		&i.StartDate,
		&i.EndDate,
		&i.ClosedAt,
		&i.CreatedAt,
		&i.UpdatedAt,
	)
	return i, err
}

const getVersion = `-- name: GetVersion :one
SELECT id, project_id, name, description, release_date, released_at, created_at, updated_at FROM versions WHERE id = $1 AND project_id = $2
`

type GetVersionParams struct {
	ID        uuid.UUID
	ProjectID uuid.UUID
}

func (q *Queries) GetVersion(ctx context.Context, arg GetVersionParams) (Version, error) {
	row := q.db.QueryRow(ctx, getVersion, arg.ID, arg.ProjectID)
	var i Version
	err := row.Scan(
		&i.ID,
		&i.ProjectID,
		&i.Name,
		&i.Description,
		&i.ReleaseDate,
		&i.ReleasedAt,
		&i.CreatedAt,
		&i.UpdatedAt,
	)
	return i, err
}

const getWorklogInProject = `-- name: GetWorklogInProject :one
SELECT w.id, w.issue_id, w.user_id, w.minutes, w.work_date, w.note, w.created_at FROM worklogs w JOIN issues i ON i.id = w.issue_id
WHERE w.id = $1 AND i.project_id = $2
`

type GetWorklogInProjectParams struct {
	ID        uuid.UUID
	ProjectID uuid.UUID
}

func (q *Queries) GetWorklogInProject(ctx context.Context, arg GetWorklogInProjectParams) (Worklog, error) {
	row := q.db.QueryRow(ctx, getWorklogInProject, arg.ID, arg.ProjectID)
	var i Worklog
	err := row.Scan(
		&i.ID,
		&i.IssueID,
		&i.UserID,
		&i.Minutes,
		&i.WorkDate,
		&i.Note,
		&i.CreatedAt,
	)
	return i, err
}

const listSprints = `-- name: ListSprints :many
SELECT s.id, s.project_id, s.name, s.goal, s.state, s.start_date, s.end_date, s.closed_at, s.created_at, s.updated_at,
  count(i.id)::int                                            AS issues_total,
  count(i.id) FILTER (WHERE i.status = 'done')::int           AS issues_done,
  coalesce(sum(i.points), 0)::int                             AS points_total,
  coalesce(sum(i.points) FILTER (WHERE i.status = 'done'), 0)::int AS points_done
FROM sprints s
LEFT JOIN issues i ON i.sprint_id = s.id
WHERE s.project_id = $1
GROUP BY s.id
ORDER BY (s.state = 'closed'), (s.state = 'planned'), s.start_date NULLS LAST, s.created_at
`

type ListSprintsRow struct {
	ID          uuid.UUID
	ProjectID   uuid.UUID
	Name        string
	Goal        string
	State       SprintState
	StartDate   *time.Time
	EndDate     *time.Time
	ClosedAt    *time.Time
	CreatedAt   time.Time
	UpdatedAt   time.Time
	IssuesTotal int32
	IssuesDone  int32
	PointsTotal int32
	PointsDone  int32
}

func (q *Queries) ListSprints(ctx context.Context, projectID uuid.UUID) ([]ListSprintsRow, error) {
	rows, err := q.db.Query(ctx, listSprints, projectID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []ListSprintsRow
	for rows.Next() {
		var i ListSprintsRow
		if err := rows.Scan(
			&i.ID,
			&i.ProjectID,
			&i.Name,
			&i.Goal,
			&i.State,
			&i.StartDate,
			&i.EndDate,
			&i.ClosedAt,
			&i.CreatedAt,
			&i.UpdatedAt,
			&i.IssuesTotal,
			&i.IssuesDone,
			&i.PointsTotal,
			&i.PointsDone,
		); err != nil {
			return nil, err
		}
		items = append(items, i)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return items, nil
}

const listVersions = `-- name: ListVersions :many
SELECT v.id, v.project_id, v.name, v.description, v.release_date, v.released_at, v.created_at, v.updated_at,
  count(i.id)::int                                  AS issues_total,
  count(i.id) FILTER (WHERE i.status = 'done')::int AS issues_done
FROM versions v
LEFT JOIN issues i ON i.fix_version_id = v.id
WHERE v.project_id = $1
GROUP BY v.id
ORDER BY (v.released_at IS NOT NULL), v.release_date NULLS LAST, v.created_at
`

type ListVersionsRow struct {
	ID          uuid.UUID
	ProjectID   uuid.UUID
	Name        string
	Description string
	ReleaseDate *time.Time
	ReleasedAt  *time.Time
	CreatedAt   time.Time
	UpdatedAt   time.Time
	IssuesTotal int32
	IssuesDone  int32
}

func (q *Queries) ListVersions(ctx context.Context, projectID uuid.UUID) ([]ListVersionsRow, error) {
	rows, err := q.db.Query(ctx, listVersions, projectID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []ListVersionsRow
	for rows.Next() {
		var i ListVersionsRow
		if err := rows.Scan(
			&i.ID,
			&i.ProjectID,
			&i.Name,
			&i.Description,
			&i.ReleaseDate,
			&i.ReleasedAt,
			&i.CreatedAt,
			&i.UpdatedAt,
			&i.IssuesTotal,
			&i.IssuesDone,
		); err != nil {
			return nil, err
		}
		items = append(items, i)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return items, nil
}

const listWorklogs = `-- name: ListWorklogs :many
SELECT w.id, w.issue_id, w.user_id, w.minutes, w.work_date, w.note, w.created_at, u.name AS user_name
FROM worklogs w LEFT JOIN users u ON u.id = w.user_id
WHERE w.issue_id = $1
ORDER BY w.work_date DESC, w.created_at DESC
`

type ListWorklogsRow struct {
	ID        uuid.UUID
	IssueID   uuid.UUID
	UserID    *uuid.UUID
	Minutes   int32
	WorkDate  time.Time
	Note      string
	CreatedAt time.Time
	UserName  *string
}

func (q *Queries) ListWorklogs(ctx context.Context, issueID uuid.UUID) ([]ListWorklogsRow, error) {
	rows, err := q.db.Query(ctx, listWorklogs, issueID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []ListWorklogsRow
	for rows.Next() {
		var i ListWorklogsRow
		if err := rows.Scan(
			&i.ID,
			&i.IssueID,
			&i.UserID,
			&i.Minutes,
			&i.WorkDate,
			&i.Note,
			&i.CreatedAt,
			&i.UserName,
		); err != nil {
			return nil, err
		}
		items = append(items, i)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return items, nil
}

const moveUnfinishedIssues = `-- name: MoveUnfinishedIssues :execrows
UPDATE issues SET sprint_id = $1
WHERE sprint_id = $2 AND status <> 'done'
`

type MoveUnfinishedIssuesParams struct {
	ToSprintID   *uuid.UUID
	FromSprintID *uuid.UUID
}

func (q *Queries) MoveUnfinishedIssues(ctx context.Context, arg MoveUnfinishedIssuesParams) (int64, error) {
	result, err := q.db.Exec(ctx, moveUnfinishedIssues, arg.ToSprintID, arg.FromSprintID)
	if err != nil {
		return 0, err
	}
	return result.RowsAffected(), nil
}

const sprintIssues = `-- name: SprintIssues :many
SELECT id, status, points, completed_at, created_at FROM issues WHERE sprint_id = $1
`

type SprintIssuesRow struct {
	ID          uuid.UUID
	Status      IssueStatus
	Points      *int16
	CompletedAt *time.Time
	CreatedAt   time.Time
}

func (q *Queries) SprintIssues(ctx context.Context, sprintID *uuid.UUID) ([]SprintIssuesRow, error) {
	rows, err := q.db.Query(ctx, sprintIssues, sprintID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []SprintIssuesRow
	for rows.Next() {
		var i SprintIssuesRow
		if err := rows.Scan(
			&i.ID,
			&i.Status,
			&i.Points,
			&i.CompletedAt,
			&i.CreatedAt,
		); err != nil {
			return nil, err
		}
		items = append(items, i)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return items, nil
}

const startSprint = `-- name: StartSprint :one
UPDATE sprints SET state = 'active', start_date = $1, end_date = $2
WHERE id = $3 AND project_id = $4 AND state = 'planned'
RETURNING id, project_id, name, goal, state, start_date, end_date, closed_at, created_at, updated_at
`

type StartSprintParams struct {
	StartDate *time.Time
	EndDate   *time.Time
	ID        uuid.UUID
	ProjectID uuid.UUID
}

func (q *Queries) StartSprint(ctx context.Context, arg StartSprintParams) (Sprint, error) {
	row := q.db.QueryRow(ctx, startSprint,
		arg.StartDate,
		arg.EndDate,
		arg.ID,
		arg.ProjectID,
	)
	var i Sprint
	err := row.Scan(
		&i.ID,
		&i.ProjectID,
		&i.Name,
		&i.Goal,
		&i.State,
		&i.StartDate,
		&i.EndDate,
		&i.ClosedAt,
		&i.CreatedAt,
		&i.UpdatedAt,
	)
	return i, err
}

const timeReport = `-- name: TimeReport :many
SELECT w.user_id, w.work_date, sum(w.minutes)::int AS minutes
FROM worklogs w JOIN issues i ON i.id = w.issue_id
WHERE i.project_id = $1 AND w.work_date BETWEEN $2 AND $3
GROUP BY w.user_id, w.work_date
ORDER BY w.work_date
`

type TimeReportParams struct {
	ProjectID uuid.UUID
	DateFrom  time.Time
	DateTo    time.Time
}

type TimeReportRow struct {
	UserID   *uuid.UUID
	WorkDate time.Time
	Minutes  int32
}

func (q *Queries) TimeReport(ctx context.Context, arg TimeReportParams) ([]TimeReportRow, error) {
	rows, err := q.db.Query(ctx, timeReport, arg.ProjectID, arg.DateFrom, arg.DateTo)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []TimeReportRow
	for rows.Next() {
		var i TimeReportRow
		if err := rows.Scan(&i.UserID, &i.WorkDate, &i.Minutes); err != nil {
			return nil, err
		}
		items = append(items, i)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return items, nil
}

const updateSprint = `-- name: UpdateSprint :one
UPDATE sprints SET name = $1, goal = $2, start_date = $3, end_date = $4
WHERE id = $5 AND project_id = $6
RETURNING id, project_id, name, goal, state, start_date, end_date, closed_at, created_at, updated_at
`

type UpdateSprintParams struct {
	Name      string
	Goal      string
	StartDate *time.Time
	EndDate   *time.Time
	ID        uuid.UUID
	ProjectID uuid.UUID
}

func (q *Queries) UpdateSprint(ctx context.Context, arg UpdateSprintParams) (Sprint, error) {
	row := q.db.QueryRow(ctx, updateSprint,
		arg.Name,
		arg.Goal,
		arg.StartDate,
		arg.EndDate,
		arg.ID,
		arg.ProjectID,
	)
	var i Sprint
	err := row.Scan(
		&i.ID,
		&i.ProjectID,
		&i.Name,
		&i.Goal,
		&i.State,
		&i.StartDate,
		&i.EndDate,
		&i.ClosedAt,
		&i.CreatedAt,
		&i.UpdatedAt,
	)
	return i, err
}

const updateVersion = `-- name: UpdateVersion :one
UPDATE versions SET name = $1, description = $2, release_date = $3,
  released_at = $4
WHERE id = $5 AND project_id = $6
RETURNING id, project_id, name, description, release_date, released_at, created_at, updated_at
`

type UpdateVersionParams struct {
	Name        string
	Description string
	ReleaseDate *time.Time
	ReleasedAt  *time.Time
	ID          uuid.UUID
	ProjectID   uuid.UUID
}

func (q *Queries) UpdateVersion(ctx context.Context, arg UpdateVersionParams) (Version, error) {
	row := q.db.QueryRow(ctx, updateVersion,
		arg.Name,
		arg.Description,
		arg.ReleaseDate,
		arg.ReleasedAt,
		arg.ID,
		arg.ProjectID,
	)
	var i Version
	err := row.Scan(
		&i.ID,
		&i.ProjectID,
		&i.Name,
		&i.Description,
		&i.ReleaseDate,
		&i.ReleasedAt,
		&i.CreatedAt,
		&i.UpdatedAt,
	)
	return i, err
}
