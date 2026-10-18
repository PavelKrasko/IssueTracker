-- name: ListTeams :many
SELECT * FROM teams WHERE project_id = @project_id ORDER BY created_at;

-- name: ListTeamMembersByProject :many
SELECT tm.team_id, tm.role_title, tm.added_at, u.id AS user_id, u.name, u.email, u.avatar_url
FROM team_members tm
JOIN users u ON u.id = tm.user_id
WHERE tm.project_id = @project_id
ORDER BY tm.added_at;

-- name: GetTeam :one
SELECT * FROM teams WHERE id = @id AND project_id = @project_id;

-- name: CreateTeam :one
INSERT INTO teams (project_id, name, description)
VALUES (@project_id, @name, @description)
RETURNING *;

-- name: UpdateTeam :one
UPDATE teams SET name = @name, description = @description
WHERE id = @id AND project_id = @project_id
RETURNING *;

-- name: DeleteTeam :execrows
DELETE FROM teams WHERE id = @id AND project_id = @project_id;

-- name: AddTeamMember :exec
INSERT INTO team_members (team_id, project_id, user_id, role_title)
VALUES (@team_id, @project_id, @user_id, @role_title);

-- name: RemoveTeamMember :execrows
DELETE FROM team_members WHERE team_id = @team_id AND project_id = @project_id AND user_id = @user_id;
