-- name: CreateProject :one
INSERT INTO projects (key, name, description, owner_id)
VALUES (@key, @name, @description, @owner_id)
RETURNING *;

-- name: ListProjectsForUser :many
SELECT p.*, m.role,
       (SELECT count(*) FROM project_members pm WHERE pm.project_id = p.id)::int AS members_count,
       (SELECT count(*) FROM issues i WHERE i.project_id = p.id AND i.status <> 'done')::int AS open_issues
FROM projects p
JOIN project_members m ON m.project_id = p.id AND m.user_id = @user_id
ORDER BY p.created_at;

-- name: GetProjectForUser :one
SELECT p.*, m.role
FROM projects p
JOIN project_members m ON m.project_id = p.id AND m.user_id = @user_id
WHERE p.id = @project_id;

-- name: UpdateProject :one
UPDATE projects SET name = @name, description = @description
WHERE id = @id
RETURNING *;

-- name: DeleteProject :exec
DELETE FROM projects WHERE id = @id;

-- name: NextIssueNumber :one
UPDATE projects SET issue_counter = issue_counter + 1
WHERE id = @id
RETURNING issue_counter;

-- name: ListStorageKeysByProject :many
SELECT a.storage_key FROM issue_attachments a JOIN issues i ON i.id = a.issue_id WHERE i.project_id = @project_id
UNION ALL
SELECT d.storage_key FROM documents d WHERE d.project_id = @project_id AND d.storage_key IS NOT NULL;

-- name: AddProjectMember :exec
INSERT INTO project_members (project_id, user_id, role)
VALUES (@project_id, @user_id, @role)
ON CONFLICT (project_id, user_id) DO NOTHING;

-- name: ListProjectMembers :many
SELECT u.id, u.name, u.email, u.avatar_url, u.job_title, m.role, m.joined_at
FROM project_members m
JOIN users u ON u.id = m.user_id
WHERE m.project_id = @project_id
ORDER BY m.role, u.name;

-- name: GetProjectMember :one
SELECT * FROM project_members WHERE project_id = @project_id AND user_id = @user_id;

-- name: UpdateMemberRole :exec
UPDATE project_members SET role = @role WHERE project_id = @project_id AND user_id = @user_id;

-- name: RemoveProjectMember :execrows
DELETE FROM project_members WHERE project_id = @project_id AND user_id = @user_id AND role <> 'owner';

-- name: UpsertInvite :one
INSERT INTO project_invites (project_id, email, role, invited_by)
VALUES (@project_id, @email, @role, @invited_by)
ON CONFLICT (project_id, email) DO UPDATE SET role = EXCLUDED.role
RETURNING *;

-- name: ListInvites :many
SELECT * FROM project_invites WHERE project_id = @project_id ORDER BY created_at;

-- name: DeleteInvite :execrows
DELETE FROM project_invites WHERE id = @id AND project_id = @project_id;

-- name: AcceptInvitesForUser :exec
WITH accepted AS (
  DELETE FROM project_invites WHERE email = @email RETURNING project_id, role
)
INSERT INTO project_members (project_id, user_id, role)
SELECT project_id, @user_id, role FROM accepted
ON CONFLICT (project_id, user_id) DO NOTHING;
