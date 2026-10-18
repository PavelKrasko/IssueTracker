package db

import (
	"context"
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

const commentCountByIssue = `-- name: CommentCountByIssue :one
SELECT count(*)::int FROM issue_comments WHERE issue_id = $1
`

func (q *Queries) CommentCountByIssue(ctx context.Context, issueID uuid.UUID) (int32, error) {
	row := q.db.QueryRow(ctx, commentCountByIssue, issueID)
	var column_1 int32
	err := row.Scan(&column_1)
	return column_1, err
}

const commentCountsByProject = `-- name: CommentCountsByProject :many
SELECT c.issue_id, count(*)::int AS count
FROM issue_comments c JOIN issues i ON i.id = c.issue_id
WHERE i.project_id = $1
GROUP BY c.issue_id
`

type CommentCountsByProjectRow struct {
	IssueID uuid.UUID
	Count   int32
}

func (q *Queries) CommentCountsByProject(ctx context.Context, projectID uuid.UUID) ([]CommentCountsByProjectRow, error) {
	rows, err := q.db.Query(ctx, commentCountsByProject, projectID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []CommentCountsByProjectRow
	for rows.Next() {
		var i CommentCountsByProjectRow
		if err := rows.Scan(&i.IssueID, &i.Count); err != nil {
			return nil, err
		}
		items = append(items, i)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return items, nil
}

const countAttachmentsByIssue = `-- name: CountAttachmentsByIssue :one
SELECT count(*)::int FROM issue_attachments WHERE issue_id = $1
`

func (q *Queries) CountAttachmentsByIssue(ctx context.Context, issueID uuid.UUID) (int32, error) {
	row := q.db.QueryRow(ctx, countAttachmentsByIssue, issueID)
	var column_1 int32
	err := row.Scan(&column_1)
	return column_1, err
}

const createAttachment = `-- name: CreateAttachment :one
INSERT INTO issue_attachments (id, issue_id, uploaded_by, file_name, content_type, size_bytes, storage_key)
VALUES ($1, $2, $3, $4, $5, $6, $7)
RETURNING id, issue_id, uploaded_by, file_name, content_type, size_bytes, storage_key, created_at
`

type CreateAttachmentParams struct {
	ID          uuid.UUID
	IssueID     uuid.UUID
	UploadedBy  *uuid.UUID
	FileName    string
	ContentType string
	SizeBytes   int64
	StorageKey  string
}

func (q *Queries) CreateAttachment(ctx context.Context, arg CreateAttachmentParams) (IssueAttachment, error) {
	row := q.db.QueryRow(ctx, createAttachment,
		arg.ID,
		arg.IssueID,
		arg.UploadedBy,
		arg.FileName,
		arg.ContentType,
		arg.SizeBytes,
		arg.StorageKey,
	)
	var i IssueAttachment
	err := row.Scan(
		&i.ID,
		&i.IssueID,
		&i.UploadedBy,
		&i.FileName,
		&i.ContentType,
		&i.SizeBytes,
		&i.StorageKey,
		&i.CreatedAt,
	)
	return i, err
}

const createIssue = `-- name: CreateIssue :one
INSERT INTO issues (
  project_id, number, title, description, type, status, priority,
  assignee_id, reporter_id, team_id, start_date, due_date, points, completed_at,
  parent_id, sprint_id, fix_version_id, estimate_minutes
) VALUES (
  $1, $2, $3, $4, $5, $6, $7,
  $8, $9, $10, $11, $12,
  $13, $14,
  $15, $16, $17, $18
)
RETURNING id, project_id, number, title, description, type, status, priority, assignee_id, reporter_id, team_id, start_date, due_date, points, completed_at, created_at, updated_at, parent_id, sprint_id, fix_version_id, estimate_minutes
`

type CreateIssueParams struct {
	ProjectID       uuid.UUID
	Number          int32
	Title           string
	Description     string
	Type            IssueType
	Status          IssueStatus
	Priority        IssuePriority
	AssigneeID      *uuid.UUID
	ReporterID      *uuid.UUID
	TeamID          *uuid.UUID
	StartDate       *time.Time
	DueDate         *time.Time
	Points          *int16
	CompletedAt     *time.Time
	ParentID        *uuid.UUID
	SprintID        *uuid.UUID
	FixVersionID    *uuid.UUID
	EstimateMinutes *int32
}

func (q *Queries) CreateIssue(ctx context.Context, arg CreateIssueParams) (Issue, error) {
	row := q.db.QueryRow(ctx, createIssue,
		arg.ProjectID,
		arg.Number,
		arg.Title,
		arg.Description,
		arg.Type,
		arg.Status,
		arg.Priority,
		arg.AssigneeID,
		arg.ReporterID,
		arg.TeamID,
		arg.StartDate,
		arg.DueDate,
		arg.Points,
		arg.CompletedAt,
		arg.ParentID,
		arg.SprintID,
		arg.FixVersionID,
		arg.EstimateMinutes,
	)
	var i Issue
	err := row.Scan(
		&i.ID,
		&i.ProjectID,
		&i.Number,
		&i.Title,
		&i.Description,
		&i.Type,
		&i.Status,
		&i.Priority,
		&i.AssigneeID,
		&i.ReporterID,
		&i.TeamID,
		&i.StartDate,
		&i.DueDate,
		&i.Points,
		&i.CompletedAt,
		&i.CreatedAt,
		&i.UpdatedAt,
		&i.ParentID,
		&i.SprintID,
		&i.FixVersionID,
		&i.EstimateMinutes,
	)
	return i, err
}

const createIssueEvent = `-- name: CreateIssueEvent :exec
INSERT INTO issue_events (issue_id, actor_id, kind, changes)
VALUES ($1, $2, $3, $4)
`

type CreateIssueEventParams struct {
	IssueID uuid.UUID
	ActorID *uuid.UUID
	Kind    string
	Changes json.RawMessage
}

func (q *Queries) CreateIssueEvent(ctx context.Context, arg CreateIssueEventParams) error {
	_, err := q.db.Exec(ctx, createIssueEvent,
		arg.IssueID,
		arg.ActorID,
		arg.Kind,
		arg.Changes,
	)
	return err
}

const deleteAttachment = `-- name: DeleteAttachment :exec
DELETE FROM issue_attachments WHERE id = $1
`

func (q *Queries) DeleteAttachment(ctx context.Context, id uuid.UUID) error {
	_, err := q.db.Exec(ctx, deleteAttachment, id)
	return err
}

const deleteIssue = `-- name: DeleteIssue :execrows
DELETE FROM issues WHERE id = $1 AND project_id = $2
`

type DeleteIssueParams struct {
	ID        uuid.UUID
	ProjectID uuid.UUID
}

func (q *Queries) DeleteIssue(ctx context.Context, arg DeleteIssueParams) (int64, error) {
	result, err := q.db.Exec(ctx, deleteIssue, arg.ID, arg.ProjectID)
	if err != nil {
		return 0, err
	}
	return result.RowsAffected(), nil
}

const getAttachmentInProject = `-- name: GetAttachmentInProject :one
SELECT a.id, a.issue_id, a.uploaded_by, a.file_name, a.content_type, a.size_bytes, a.storage_key, a.created_at FROM issue_attachments a
JOIN issues i ON i.id = a.issue_id
WHERE a.id = $1 AND i.project_id = $2
`

type GetAttachmentInProjectParams struct {
	ID        uuid.UUID
	ProjectID uuid.UUID
}

func (q *Queries) GetAttachmentInProject(ctx context.Context, arg GetAttachmentInProjectParams) (IssueAttachment, error) {
	row := q.db.QueryRow(ctx, getAttachmentInProject, arg.ID, arg.ProjectID)
	var i IssueAttachment
	err := row.Scan(
		&i.ID,
		&i.IssueID,
		&i.UploadedBy,
		&i.FileName,
		&i.ContentType,
		&i.SizeBytes,
		&i.StorageKey,
		&i.CreatedAt,
	)
	return i, err
}

const getIssue = `-- name: GetIssue :one
SELECT id, project_id, number, title, description, type, status, priority, assignee_id, reporter_id, team_id, start_date, due_date, points, completed_at, created_at, updated_at, parent_id, sprint_id, fix_version_id, estimate_minutes FROM issues WHERE id = $1 AND project_id = $2
`

type GetIssueParams struct {
	ID        uuid.UUID
	ProjectID uuid.UUID
}

func (q *Queries) GetIssue(ctx context.Context, arg GetIssueParams) (Issue, error) {
	row := q.db.QueryRow(ctx, getIssue, arg.ID, arg.ProjectID)
	var i Issue
	err := row.Scan(
		&i.ID,
		&i.ProjectID,
		&i.Number,
		&i.Title,
		&i.Description,
		&i.Type,
		&i.Status,
		&i.Priority,
		&i.AssigneeID,
		&i.ReporterID,
		&i.TeamID,
		&i.StartDate,
		&i.DueDate,
		&i.Points,
		&i.CompletedAt,
		&i.CreatedAt,
		&i.UpdatedAt,
		&i.ParentID,
		&i.SprintID,
		&i.FixVersionID,
		&i.EstimateMinutes,
	)
	return i, err
}

const issueAncestorIDs = `-- name: IssueAncestorIDs :many
WITH RECURSIVE up AS (
  SELECT i.id, i.parent_id, 1 AS depth FROM issues i WHERE i.id = $1
  UNION ALL
  SELECT p.id, p.parent_id, up.depth + 1 FROM issues p JOIN up ON p.id = up.parent_id WHERE up.depth < 50
)
SELECT up.id FROM up
`

func (q *Queries) IssueAncestorIDs(ctx context.Context, id uuid.UUID) ([]uuid.UUID, error) {
	rows, err := q.db.Query(ctx, issueAncestorIDs, id)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []uuid.UUID
	for rows.Next() {
		var id uuid.UUID
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		items = append(items, id)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return items, nil
}

const listAttachmentsByIssue = `-- name: ListAttachmentsByIssue :many
SELECT id, issue_id, uploaded_by, file_name, content_type, size_bytes, storage_key, created_at FROM issue_attachments WHERE issue_id = $1 ORDER BY created_at
`

func (q *Queries) ListAttachmentsByIssue(ctx context.Context, issueID uuid.UUID) ([]IssueAttachment, error) {
	rows, err := q.db.Query(ctx, listAttachmentsByIssue, issueID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []IssueAttachment
	for rows.Next() {
		var i IssueAttachment
		if err := rows.Scan(
			&i.ID,
			&i.IssueID,
			&i.UploadedBy,
			&i.FileName,
			&i.ContentType,
			&i.SizeBytes,
			&i.StorageKey,
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

const listAttachmentsByProject = `-- name: ListAttachmentsByProject :many
SELECT a.id, a.issue_id, a.uploaded_by, a.file_name, a.content_type, a.size_bytes, a.storage_key, a.created_at FROM issue_attachments a
JOIN issues i ON i.id = a.issue_id
WHERE i.project_id = $1
ORDER BY a.created_at
`

func (q *Queries) ListAttachmentsByProject(ctx context.Context, projectID uuid.UUID) ([]IssueAttachment, error) {
	rows, err := q.db.Query(ctx, listAttachmentsByProject, projectID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []IssueAttachment
	for rows.Next() {
		var i IssueAttachment
		if err := rows.Scan(
			&i.ID,
			&i.IssueID,
			&i.UploadedBy,
			&i.FileName,
			&i.ContentType,
			&i.SizeBytes,
			&i.StorageKey,
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

const listChildIDs = `-- name: ListChildIDs :many
SELECT id FROM issues WHERE parent_id = $1
`

func (q *Queries) ListChildIDs(ctx context.Context, parentID *uuid.UUID) ([]uuid.UUID, error) {
	rows, err := q.db.Query(ctx, listChildIDs, parentID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []uuid.UUID
	for rows.Next() {
		var id uuid.UUID
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		items = append(items, id)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return items, nil
}

const listIssueEvents = `-- name: ListIssueEvents :many
SELECT e.id, e.kind, e.changes, e.created_at, e.actor_id, u.name AS actor_name
FROM issue_events e
LEFT JOIN users u ON u.id = e.actor_id
WHERE e.issue_id = $1
ORDER BY e.created_at DESC, e.id DESC
LIMIT 200
`

type ListIssueEventsRow struct {
	ID        int64
	Kind      string
	Changes   json.RawMessage
	CreatedAt time.Time
	ActorID   *uuid.UUID
	ActorName *string
}

func (q *Queries) ListIssueEvents(ctx context.Context, issueID uuid.UUID) ([]ListIssueEventsRow, error) {
	rows, err := q.db.Query(ctx, listIssueEvents, issueID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []ListIssueEventsRow
	for rows.Next() {
		var i ListIssueEventsRow
		if err := rows.Scan(
			&i.ID,
			&i.Kind,
			&i.Changes,
			&i.CreatedAt,
			&i.ActorID,
			&i.ActorName,
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

const listIssues = `-- name: ListIssues :many
SELECT id, project_id, number, title, description, type, status, priority, assignee_id, reporter_id, team_id, start_date, due_date, points, completed_at, created_at, updated_at, parent_id, sprint_id, fix_version_id, estimate_minutes FROM issues
WHERE project_id = $1
  AND ($2::text IS NULL OR title ILIKE '%' || $2 || '%' OR description ILIKE '%' || $2 || '%')
  AND ($3::issue_status IS NULL OR status = $3)
  AND ($4::uuid IS NULL OR assignee_id = $4)
ORDER BY number DESC
`

type ListIssuesParams struct {
	ProjectID  uuid.UUID
	Q          *string
	Status     NullIssueStatus
	AssigneeID *uuid.UUID
}

func (q *Queries) ListIssues(ctx context.Context, arg ListIssuesParams) ([]Issue, error) {
	rows, err := q.db.Query(ctx, listIssues,
		arg.ProjectID,
		arg.Q,
		arg.Status,
		arg.AssigneeID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []Issue
	for rows.Next() {
		var i Issue
		if err := rows.Scan(
			&i.ID,
			&i.ProjectID,
			&i.Number,
			&i.Title,
			&i.Description,
			&i.Type,
			&i.Status,
			&i.Priority,
			&i.AssigneeID,
			&i.ReporterID,
			&i.TeamID,
			&i.StartDate,
			&i.DueDate,
			&i.Points,
			&i.CompletedAt,
			&i.CreatedAt,
			&i.UpdatedAt,
			&i.ParentID,
			&i.SprintID,
			&i.FixVersionID,
			&i.EstimateMinutes,
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

const listWatcherIDs = `-- name: ListWatcherIDs :many
SELECT user_id FROM issue_watchers WHERE issue_id = $1
`

func (q *Queries) ListWatcherIDs(ctx context.Context, issueID uuid.UUID) ([]uuid.UUID, error) {
	rows, err := q.db.Query(ctx, listWatcherIDs, issueID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []uuid.UUID
	for rows.Next() {
		var user_id uuid.UUID
		if err := rows.Scan(&user_id); err != nil {
			return nil, err
		}
		items = append(items, user_id)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return items, nil
}

const listWatchersByProject = `-- name: ListWatchersByProject :many
SELECT issue_id, user_id FROM issue_watchers WHERE project_id = $1
`

type ListWatchersByProjectRow struct {
	IssueID uuid.UUID
	UserID  uuid.UUID
}

func (q *Queries) ListWatchersByProject(ctx context.Context, projectID uuid.UUID) ([]ListWatchersByProjectRow, error) {
	rows, err := q.db.Query(ctx, listWatchersByProject, projectID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []ListWatchersByProjectRow
	for rows.Next() {
		var i ListWatchersByProjectRow
		if err := rows.Scan(&i.IssueID, &i.UserID); err != nil {
			return nil, err
		}
		items = append(items, i)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return items, nil
}

const spentByIssue = `-- name: SpentByIssue :one
SELECT coalesce(sum(minutes), 0)::int FROM worklogs WHERE issue_id = $1
`

func (q *Queries) SpentByIssue(ctx context.Context, issueID uuid.UUID) (int32, error) {
	row := q.db.QueryRow(ctx, spentByIssue, issueID)
	var column_1 int32
	err := row.Scan(&column_1)
	return column_1, err
}

const spentByProject = `-- name: SpentByProject :many
SELECT w.issue_id, sum(w.minutes)::int AS minutes
FROM worklogs w JOIN issues i ON i.id = w.issue_id
WHERE i.project_id = $1
GROUP BY w.issue_id
`

type SpentByProjectRow struct {
	IssueID uuid.UUID
	Minutes int32
}

func (q *Queries) SpentByProject(ctx context.Context, projectID uuid.UUID) ([]SpentByProjectRow, error) {
	rows, err := q.db.Query(ctx, spentByProject, projectID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []SpentByProjectRow
	for rows.Next() {
		var i SpentByProjectRow
		if err := rows.Scan(&i.IssueID, &i.Minutes); err != nil {
			return nil, err
		}
		items = append(items, i)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return items, nil
}

const touchIssue = `-- name: TouchIssue :exec
UPDATE issues SET updated_at = now() WHERE id = $1
`

func (q *Queries) TouchIssue(ctx context.Context, id uuid.UUID) error {
	_, err := q.db.Exec(ctx, touchIssue, id)
	return err
}

const updateIssue = `-- name: UpdateIssue :one
UPDATE issues SET
  title = $1, description = $2, type = $3, status = $4, priority = $5,
  assignee_id = $6, team_id = $7,
  start_date = $8, due_date = $9,
  points = $10, completed_at = $11,
  parent_id = $12, sprint_id = $13,
  fix_version_id = $14, estimate_minutes = $15
WHERE id = $16 AND project_id = $17
RETURNING id, project_id, number, title, description, type, status, priority, assignee_id, reporter_id, team_id, start_date, due_date, points, completed_at, created_at, updated_at, parent_id, sprint_id, fix_version_id, estimate_minutes
`

type UpdateIssueParams struct {
	Title           string
	Description     string
	Type            IssueType
	Status          IssueStatus
	Priority        IssuePriority
	AssigneeID      *uuid.UUID
	TeamID          *uuid.UUID
	StartDate       *time.Time
	DueDate         *time.Time
	Points          *int16
	CompletedAt     *time.Time
	ParentID        *uuid.UUID
	SprintID        *uuid.UUID
	FixVersionID    *uuid.UUID
	EstimateMinutes *int32
	ID              uuid.UUID
	ProjectID       uuid.UUID
}

func (q *Queries) UpdateIssue(ctx context.Context, arg UpdateIssueParams) (Issue, error) {
	row := q.db.QueryRow(ctx, updateIssue,
		arg.Title,
		arg.Description,
		arg.Type,
		arg.Status,
		arg.Priority,
		arg.AssigneeID,
		arg.TeamID,
		arg.StartDate,
		arg.DueDate,
		arg.Points,
		arg.CompletedAt,
		arg.ParentID,
		arg.SprintID,
		arg.FixVersionID,
		arg.EstimateMinutes,
		arg.ID,
		arg.ProjectID,
	)
	var i Issue
	err := row.Scan(
		&i.ID,
		&i.ProjectID,
		&i.Number,
		&i.Title,
		&i.Description,
		&i.Type,
		&i.Status,
		&i.Priority,
		&i.AssigneeID,
		&i.ReporterID,
		&i.TeamID,
		&i.StartDate,
		&i.DueDate,
		&i.Points,
		&i.CompletedAt,
		&i.CreatedAt,
		&i.UpdatedAt,
		&i.ParentID,
		&i.SprintID,
		&i.FixVersionID,
		&i.EstimateMinutes,
	)
	return i, err
}
