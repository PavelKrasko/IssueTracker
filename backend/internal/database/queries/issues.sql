-- name: ListIssues :many
SELECT * FROM issues
WHERE project_id = @project_id
  AND (sqlc.narg('q')::text IS NULL OR title ILIKE '%' || sqlc.narg('q') || '%' OR description ILIKE '%' || sqlc.narg('q') || '%')
  AND (sqlc.narg('status')::issue_status IS NULL OR status = sqlc.narg('status'))
  AND (sqlc.narg('assignee_id')::uuid IS NULL OR assignee_id = sqlc.narg('assignee_id'))
ORDER BY number DESC;

-- name: GetIssue :one
SELECT * FROM issues WHERE id = @id AND project_id = @project_id;

-- name: CreateIssue :one
INSERT INTO issues (
  project_id, number, title, description, type, status, priority,
  assignee_id, reporter_id, team_id, start_date, due_date, points, completed_at,
  parent_id, sprint_id, fix_version_id, estimate_minutes
) VALUES (
  @project_id, @number, @title, @description, @type, @status, @priority,
  sqlc.narg('assignee_id'), @reporter_id, sqlc.narg('team_id'), sqlc.narg('start_date'), sqlc.narg('due_date'),
  sqlc.narg('points'), sqlc.narg('completed_at'),
  sqlc.narg('parent_id'), sqlc.narg('sprint_id'), sqlc.narg('fix_version_id'), sqlc.narg('estimate_minutes')
)
RETURNING *;

-- name: UpdateIssue :one
UPDATE issues SET
  title = @title, description = @description, type = @type, status = @status, priority = @priority,
  assignee_id = sqlc.narg('assignee_id'), team_id = sqlc.narg('team_id'),
  start_date = sqlc.narg('start_date'), due_date = sqlc.narg('due_date'),
  points = sqlc.narg('points'), completed_at = sqlc.narg('completed_at'),
  parent_id = sqlc.narg('parent_id'), sprint_id = sqlc.narg('sprint_id'),
  fix_version_id = sqlc.narg('fix_version_id'), estimate_minutes = sqlc.narg('estimate_minutes')
WHERE id = @id AND project_id = @project_id
RETURNING *;

-- name: TouchIssue :exec
UPDATE issues SET updated_at = now() WHERE id = @id;

-- name: DeleteIssue :execrows
DELETE FROM issues WHERE id = @id AND project_id = @project_id;

-- name: CreateIssueEvent :exec
INSERT INTO issue_events (issue_id, actor_id, kind, changes)
VALUES (@issue_id, @actor_id, @kind, @changes);

-- name: ListIssueEvents :many
SELECT e.id, e.kind, e.changes, e.created_at, e.actor_id, u.name AS actor_name
FROM issue_events e
LEFT JOIN users u ON u.id = e.actor_id
WHERE e.issue_id = @issue_id
ORDER BY e.created_at DESC, e.id DESC
LIMIT 200;

-- name: ListAttachmentsByProject :many
SELECT a.* FROM issue_attachments a
JOIN issues i ON i.id = a.issue_id
WHERE i.project_id = @project_id
ORDER BY a.created_at;

-- name: ListAttachmentsByIssue :many
SELECT * FROM issue_attachments WHERE issue_id = @issue_id ORDER BY created_at;

-- name: CountAttachmentsByIssue :one
SELECT count(*)::int FROM issue_attachments WHERE issue_id = @issue_id;

-- name: CreateAttachment :one
INSERT INTO issue_attachments (id, issue_id, uploaded_by, file_name, content_type, size_bytes, storage_key)
VALUES (@id, @issue_id, @uploaded_by, @file_name, @content_type, @size_bytes, @storage_key)
RETURNING *;

-- name: GetAttachmentInProject :one
SELECT a.* FROM issue_attachments a
JOIN issues i ON i.id = a.issue_id
WHERE a.id = @id AND i.project_id = @project_id;

-- name: DeleteAttachment :exec
DELETE FROM issue_attachments WHERE id = @id;

-- name: IssueAncestorIDs :many
WITH RECURSIVE up AS (
  SELECT i.id, i.parent_id, 1 AS depth FROM issues i WHERE i.id = @id
  UNION ALL
  SELECT p.id, p.parent_id, up.depth + 1 FROM issues p JOIN up ON p.id = up.parent_id WHERE up.depth < 50
)
SELECT up.id FROM up;

-- name: ListChildIDs :many
SELECT id FROM issues WHERE parent_id = @parent_id;

-- name: ListWatchersByProject :many
SELECT issue_id, user_id FROM issue_watchers WHERE project_id = @project_id;

-- name: ListWatcherIDs :many
SELECT user_id FROM issue_watchers WHERE issue_id = @issue_id;

-- name: SpentByProject :many
SELECT w.issue_id, sum(w.minutes)::int AS minutes
FROM worklogs w JOIN issues i ON i.id = w.issue_id
WHERE i.project_id = @project_id
GROUP BY w.issue_id;

-- name: SpentByIssue :one
SELECT coalesce(sum(minutes), 0)::int FROM worklogs WHERE issue_id = @issue_id;

-- name: CommentCountsByProject :many
SELECT c.issue_id, count(*)::int AS count
FROM issue_comments c JOIN issues i ON i.id = c.issue_id
WHERE i.project_id = @project_id
GROUP BY c.issue_id;

-- name: CommentCountByIssue :one
SELECT count(*)::int FROM issue_comments WHERE issue_id = @issue_id;
