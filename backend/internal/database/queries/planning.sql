-- name: ListSprints :many
SELECT s.*,
  count(i.id)::int                                            AS issues_total,
  count(i.id) FILTER (WHERE i.status = 'done')::int           AS issues_done,
  coalesce(sum(i.points), 0)::int                             AS points_total,
  coalesce(sum(i.points) FILTER (WHERE i.status = 'done'), 0)::int AS points_done
FROM sprints s
LEFT JOIN issues i ON i.sprint_id = s.id
WHERE s.project_id = @project_id
GROUP BY s.id
ORDER BY (s.state = 'closed'), (s.state = 'planned'), s.start_date NULLS LAST, s.created_at;

-- name: GetSprint :one
SELECT * FROM sprints WHERE id = @id AND project_id = @project_id;

-- name: CreateSprint :one
INSERT INTO sprints (project_id, name, goal, start_date, end_date)
VALUES (@project_id, @name, @goal, sqlc.narg('start_date'), sqlc.narg('end_date'))
RETURNING *;

-- name: UpdateSprint :one
UPDATE sprints SET name = @name, goal = @goal, start_date = sqlc.narg('start_date'), end_date = sqlc.narg('end_date')
WHERE id = @id AND project_id = @project_id
RETURNING *;

-- name: StartSprint :one
UPDATE sprints SET state = 'active', start_date = @start_date, end_date = @end_date
WHERE id = @id AND project_id = @project_id AND state = 'planned'
RETURNING *;

-- name: CloseSprint :one
UPDATE sprints SET state = 'closed', closed_at = now()
WHERE id = @id AND project_id = @project_id AND state = 'active'
RETURNING *;

-- name: DeleteSprint :execrows
DELETE FROM sprints WHERE id = @id AND project_id = @project_id AND state <> 'active';

-- name: MoveUnfinishedIssues :execrows
UPDATE issues SET sprint_id = sqlc.narg('to_sprint_id')
WHERE sprint_id = @from_sprint_id AND status <> 'done';

-- name: SprintIssues :many
SELECT id, status, points, completed_at, created_at FROM issues WHERE sprint_id = @sprint_id;

-- name: ListVersions :many
SELECT v.*,
  count(i.id)::int                                  AS issues_total,
  count(i.id) FILTER (WHERE i.status = 'done')::int AS issues_done
FROM versions v
LEFT JOIN issues i ON i.fix_version_id = v.id
WHERE v.project_id = @project_id
GROUP BY v.id
ORDER BY (v.released_at IS NOT NULL), v.release_date NULLS LAST, v.created_at;

-- name: GetVersion :one
SELECT * FROM versions WHERE id = @id AND project_id = @project_id;

-- name: CreateVersion :one
INSERT INTO versions (project_id, name, description, release_date)
VALUES (@project_id, @name, @description, sqlc.narg('release_date'))
RETURNING *;

-- name: UpdateVersion :one
UPDATE versions SET name = @name, description = @description, release_date = sqlc.narg('release_date'),
  released_at = sqlc.narg('released_at')
WHERE id = @id AND project_id = @project_id
RETURNING *;

-- name: DeleteVersion :execrows
DELETE FROM versions WHERE id = @id AND project_id = @project_id;

-- name: ListWorklogs :many
SELECT w.*, u.name AS user_name
FROM worklogs w LEFT JOIN users u ON u.id = w.user_id
WHERE w.issue_id = @issue_id
ORDER BY w.work_date DESC, w.created_at DESC;

-- name: CreateWorklog :one
INSERT INTO worklogs (issue_id, user_id, minutes, work_date, note)
VALUES (@issue_id, @user_id, @minutes, @work_date, @note)
RETURNING *;

-- name: GetWorklogInProject :one
SELECT w.* FROM worklogs w JOIN issues i ON i.id = w.issue_id
WHERE w.id = @id AND i.project_id = @project_id;

-- name: DeleteWorklog :exec
DELETE FROM worklogs WHERE id = @id;

-- name: TimeReport :many
SELECT w.user_id, w.work_date, sum(w.minutes)::int AS minutes
FROM worklogs w JOIN issues i ON i.id = w.issue_id
WHERE i.project_id = @project_id AND w.work_date BETWEEN @date_from AND @date_to
GROUP BY w.user_id, w.work_date
ORDER BY w.work_date;
