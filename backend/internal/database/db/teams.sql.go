package db

import (
	"context"
	"time"

	"github.com/google/uuid"
)

const addTeamMember = `-- name: AddTeamMember :exec
INSERT INTO team_members (team_id, project_id, user_id, role_title)
VALUES ($1, $2, $3, $4)
`

type AddTeamMemberParams struct {
	TeamID    uuid.UUID
	ProjectID uuid.UUID
	UserID    uuid.UUID
	RoleTitle string
}

func (q *Queries) AddTeamMember(ctx context.Context, arg AddTeamMemberParams) error {
	_, err := q.db.Exec(ctx, addTeamMember,
		arg.TeamID,
		arg.ProjectID,
		arg.UserID,
		arg.RoleTitle,
	)
	return err
}

const createTeam = `-- name: CreateTeam :one
INSERT INTO teams (project_id, name, description)
VALUES ($1, $2, $3)
RETURNING id, project_id, name, description, created_at, updated_at
`

type CreateTeamParams struct {
	ProjectID   uuid.UUID
	Name        string
	Description string
}

func (q *Queries) CreateTeam(ctx context.Context, arg CreateTeamParams) (Team, error) {
	row := q.db.QueryRow(ctx, createTeam, arg.ProjectID, arg.Name, arg.Description)
	var i Team
	err := row.Scan(
		&i.ID,
		&i.ProjectID,
		&i.Name,
		&i.Description,
		&i.CreatedAt,
		&i.UpdatedAt,
	)
	return i, err
}

const deleteTeam = `-- name: DeleteTeam :execrows
DELETE FROM teams WHERE id = $1 AND project_id = $2
`

type DeleteTeamParams struct {
	ID        uuid.UUID
	ProjectID uuid.UUID
}

func (q *Queries) DeleteTeam(ctx context.Context, arg DeleteTeamParams) (int64, error) {
	result, err := q.db.Exec(ctx, deleteTeam, arg.ID, arg.ProjectID)
	if err != nil {
		return 0, err
	}
	return result.RowsAffected(), nil
}

const getTeam = `-- name: GetTeam :one
SELECT id, project_id, name, description, created_at, updated_at FROM teams WHERE id = $1 AND project_id = $2
`

type GetTeamParams struct {
	ID        uuid.UUID
	ProjectID uuid.UUID
}

func (q *Queries) GetTeam(ctx context.Context, arg GetTeamParams) (Team, error) {
	row := q.db.QueryRow(ctx, getTeam, arg.ID, arg.ProjectID)
	var i Team
	err := row.Scan(
		&i.ID,
		&i.ProjectID,
		&i.Name,
		&i.Description,
		&i.CreatedAt,
		&i.UpdatedAt,
	)
	return i, err
}

const listTeamMembersByProject = `-- name: ListTeamMembersByProject :many
SELECT tm.team_id, tm.role_title, tm.added_at, u.id AS user_id, u.name, u.email, u.avatar_url
FROM team_members tm
JOIN users u ON u.id = tm.user_id
WHERE tm.project_id = $1
ORDER BY tm.added_at
`

type ListTeamMembersByProjectRow struct {
	TeamID    uuid.UUID
	RoleTitle string
	AddedAt   time.Time
	UserID    uuid.UUID
	Name      string
	Email     string
	AvatarUrl *string
}

func (q *Queries) ListTeamMembersByProject(ctx context.Context, projectID uuid.UUID) ([]ListTeamMembersByProjectRow, error) {
	rows, err := q.db.Query(ctx, listTeamMembersByProject, projectID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []ListTeamMembersByProjectRow
	for rows.Next() {
		var i ListTeamMembersByProjectRow
		if err := rows.Scan(
			&i.TeamID,
			&i.RoleTitle,
			&i.AddedAt,
			&i.UserID,
			&i.Name,
			&i.Email,
			&i.AvatarUrl,
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

const listTeams = `-- name: ListTeams :many
SELECT id, project_id, name, description, created_at, updated_at FROM teams WHERE project_id = $1 ORDER BY created_at
`

func (q *Queries) ListTeams(ctx context.Context, projectID uuid.UUID) ([]Team, error) {
	rows, err := q.db.Query(ctx, listTeams, projectID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []Team
	for rows.Next() {
		var i Team
		if err := rows.Scan(
			&i.ID,
			&i.ProjectID,
			&i.Name,
			&i.Description,
			&i.CreatedAt,
			&i.UpdatedAt,
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

const removeTeamMember = `-- name: RemoveTeamMember :execrows
DELETE FROM team_members WHERE team_id = $1 AND project_id = $2 AND user_id = $3
`

type RemoveTeamMemberParams struct {
	TeamID    uuid.UUID
	ProjectID uuid.UUID
	UserID    uuid.UUID
}

func (q *Queries) RemoveTeamMember(ctx context.Context, arg RemoveTeamMemberParams) (int64, error) {
	result, err := q.db.Exec(ctx, removeTeamMember, arg.TeamID, arg.ProjectID, arg.UserID)
	if err != nil {
		return 0, err
	}
	return result.RowsAffected(), nil
}

const updateTeam = `-- name: UpdateTeam :one
UPDATE teams SET name = $1, description = $2
WHERE id = $3 AND project_id = $4
RETURNING id, project_id, name, description, created_at, updated_at
`

type UpdateTeamParams struct {
	Name        string
	Description string
	ID          uuid.UUID
	ProjectID   uuid.UUID
}

func (q *Queries) UpdateTeam(ctx context.Context, arg UpdateTeamParams) (Team, error) {
	row := q.db.QueryRow(ctx, updateTeam,
		arg.Name,
		arg.Description,
		arg.ID,
		arg.ProjectID,
	)
	var i Team
	err := row.Scan(
		&i.ID,
		&i.ProjectID,
		&i.Name,
		&i.Description,
		&i.CreatedAt,
		&i.UpdatedAt,
	)
	return i, err
}
