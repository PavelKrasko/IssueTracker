package db

import (
	"context"
	"time"

	"github.com/google/uuid"
)

const acceptInvitesForUser = `-- name: AcceptInvitesForUser :exec
WITH accepted AS (
  DELETE FROM project_invites WHERE email = $2 RETURNING project_id, role
)
INSERT INTO project_members (project_id, user_id, role)
SELECT project_id, $1, role FROM accepted
ON CONFLICT (project_id, user_id) DO NOTHING
`

type AcceptInvitesForUserParams struct {
	UserID uuid.UUID
	Email  string
}

func (q *Queries) AcceptInvitesForUser(ctx context.Context, arg AcceptInvitesForUserParams) error {
	_, err := q.db.Exec(ctx, acceptInvitesForUser, arg.UserID, arg.Email)
	return err
}

const addProjectMember = `-- name: AddProjectMember :exec
INSERT INTO project_members (project_id, user_id, role)
VALUES ($1, $2, $3)
ON CONFLICT (project_id, user_id) DO NOTHING
`

type AddProjectMemberParams struct {
	ProjectID uuid.UUID
	UserID    uuid.UUID
	Role      ProjectRole
}

func (q *Queries) AddProjectMember(ctx context.Context, arg AddProjectMemberParams) error {
	_, err := q.db.Exec(ctx, addProjectMember, arg.ProjectID, arg.UserID, arg.Role)
	return err
}

const createProject = `-- name: CreateProject :one
INSERT INTO projects (key, name, description, owner_id)
VALUES ($1, $2, $3, $4)
RETURNING id, key, name, description, owner_id, issue_counter, created_at, updated_at
`

type CreateProjectParams struct {
	Key         string
	Name        string
	Description string
	OwnerID     uuid.UUID
}

func (q *Queries) CreateProject(ctx context.Context, arg CreateProjectParams) (Project, error) {
	row := q.db.QueryRow(ctx, createProject,
		arg.Key,
		arg.Name,
		arg.Description,
		arg.OwnerID,
	)
	var i Project
	err := row.Scan(
		&i.ID,
		&i.Key,
		&i.Name,
		&i.Description,
		&i.OwnerID,
		&i.IssueCounter,
		&i.CreatedAt,
		&i.UpdatedAt,
	)
	return i, err
}

const deleteInvite = `-- name: DeleteInvite :execrows
DELETE FROM project_invites WHERE id = $1 AND project_id = $2
`

type DeleteInviteParams struct {
	ID        uuid.UUID
	ProjectID uuid.UUID
}

func (q *Queries) DeleteInvite(ctx context.Context, arg DeleteInviteParams) (int64, error) {
	result, err := q.db.Exec(ctx, deleteInvite, arg.ID, arg.ProjectID)
	if err != nil {
		return 0, err
	}
	return result.RowsAffected(), nil
}

const deleteProject = `-- name: DeleteProject :exec
DELETE FROM projects WHERE id = $1
`

func (q *Queries) DeleteProject(ctx context.Context, id uuid.UUID) error {
	_, err := q.db.Exec(ctx, deleteProject, id)
	return err
}

const getProjectForUser = `-- name: GetProjectForUser :one
SELECT p.id, p.key, p.name, p.description, p.owner_id, p.issue_counter, p.created_at, p.updated_at, m.role
FROM projects p
JOIN project_members m ON m.project_id = p.id AND m.user_id = $1
WHERE p.id = $2
`

type GetProjectForUserParams struct {
	UserID    uuid.UUID
	ProjectID uuid.UUID
}

type GetProjectForUserRow struct {
	ID           uuid.UUID
	Key          string
	Name         string
	Description  string
	OwnerID      uuid.UUID
	IssueCounter int32
	CreatedAt    time.Time
	UpdatedAt    time.Time
	Role         ProjectRole
}

func (q *Queries) GetProjectForUser(ctx context.Context, arg GetProjectForUserParams) (GetProjectForUserRow, error) {
	row := q.db.QueryRow(ctx, getProjectForUser, arg.UserID, arg.ProjectID)
	var i GetProjectForUserRow
	err := row.Scan(
		&i.ID,
		&i.Key,
		&i.Name,
		&i.Description,
		&i.OwnerID,
		&i.IssueCounter,
		&i.CreatedAt,
		&i.UpdatedAt,
		&i.Role,
	)
	return i, err
}

const getProjectMember = `-- name: GetProjectMember :one
SELECT project_id, user_id, role, joined_at FROM project_members WHERE project_id = $1 AND user_id = $2
`

type GetProjectMemberParams struct {
	ProjectID uuid.UUID
	UserID    uuid.UUID
}

func (q *Queries) GetProjectMember(ctx context.Context, arg GetProjectMemberParams) (ProjectMember, error) {
	row := q.db.QueryRow(ctx, getProjectMember, arg.ProjectID, arg.UserID)
	var i ProjectMember
	err := row.Scan(
		&i.ProjectID,
		&i.UserID,
		&i.Role,
		&i.JoinedAt,
	)
	return i, err
}

const listInvites = `-- name: ListInvites :many
SELECT id, project_id, email, role, invited_by, created_at FROM project_invites WHERE project_id = $1 ORDER BY created_at
`

func (q *Queries) ListInvites(ctx context.Context, projectID uuid.UUID) ([]ProjectInvite, error) {
	rows, err := q.db.Query(ctx, listInvites, projectID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []ProjectInvite
	for rows.Next() {
		var i ProjectInvite
		if err := rows.Scan(
			&i.ID,
			&i.ProjectID,
			&i.Email,
			&i.Role,
			&i.InvitedBy,
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

const listProjectMembers = `-- name: ListProjectMembers :many
SELECT u.id, u.name, u.email, u.avatar_url, u.job_title, m.role, m.joined_at
FROM project_members m
JOIN users u ON u.id = m.user_id
WHERE m.project_id = $1
ORDER BY m.role, u.name
`

type ListProjectMembersRow struct {
	ID        uuid.UUID
	Name      string
	Email     string
	AvatarUrl *string
	JobTitle  string
	Role      ProjectRole
	JoinedAt  time.Time
}

func (q *Queries) ListProjectMembers(ctx context.Context, projectID uuid.UUID) ([]ListProjectMembersRow, error) {
	rows, err := q.db.Query(ctx, listProjectMembers, projectID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []ListProjectMembersRow
	for rows.Next() {
		var i ListProjectMembersRow
		if err := rows.Scan(
			&i.ID,
			&i.Name,
			&i.Email,
			&i.AvatarUrl,
			&i.JobTitle,
			&i.Role,
			&i.JoinedAt,
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

const listProjectsForUser = `-- name: ListProjectsForUser :many
SELECT p.id, p.key, p.name, p.description, p.owner_id, p.issue_counter, p.created_at, p.updated_at, m.role,
       (SELECT count(*) FROM project_members pm WHERE pm.project_id = p.id)::int AS members_count,
       (SELECT count(*) FROM issues i WHERE i.project_id = p.id AND i.status <> 'done')::int AS open_issues
FROM projects p
JOIN project_members m ON m.project_id = p.id AND m.user_id = $1
ORDER BY p.created_at
`

type ListProjectsForUserRow struct {
	ID           uuid.UUID
	Key          string
	Name         string
	Description  string
	OwnerID      uuid.UUID
	IssueCounter int32
	CreatedAt    time.Time
	UpdatedAt    time.Time
	Role         ProjectRole
	MembersCount int32
	OpenIssues   int32
}

func (q *Queries) ListProjectsForUser(ctx context.Context, userID uuid.UUID) ([]ListProjectsForUserRow, error) {
	rows, err := q.db.Query(ctx, listProjectsForUser, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []ListProjectsForUserRow
	for rows.Next() {
		var i ListProjectsForUserRow
		if err := rows.Scan(
			&i.ID,
			&i.Key,
			&i.Name,
			&i.Description,
			&i.OwnerID,
			&i.IssueCounter,
			&i.CreatedAt,
			&i.UpdatedAt,
			&i.Role,
			&i.MembersCount,
			&i.OpenIssues,
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

const listStorageKeysByProject = `-- name: ListStorageKeysByProject :many
SELECT a.storage_key FROM issue_attachments a JOIN issues i ON i.id = a.issue_id WHERE i.project_id = $1
UNION ALL
SELECT d.storage_key FROM documents d WHERE d.project_id = $1 AND d.storage_key IS NOT NULL
`

func (q *Queries) ListStorageKeysByProject(ctx context.Context, projectID uuid.UUID) ([]string, error) {
	rows, err := q.db.Query(ctx, listStorageKeysByProject, projectID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []string
	for rows.Next() {
		var storage_key string
		if err := rows.Scan(&storage_key); err != nil {
			return nil, err
		}
		items = append(items, storage_key)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return items, nil
}

const nextIssueNumber = `-- name: NextIssueNumber :one
UPDATE projects SET issue_counter = issue_counter + 1
WHERE id = $1
RETURNING issue_counter
`

func (q *Queries) NextIssueNumber(ctx context.Context, id uuid.UUID) (int32, error) {
	row := q.db.QueryRow(ctx, nextIssueNumber, id)
	var issue_counter int32
	err := row.Scan(&issue_counter)
	return issue_counter, err
}

const removeProjectMember = `-- name: RemoveProjectMember :execrows
DELETE FROM project_members WHERE project_id = $1 AND user_id = $2 AND role <> 'owner'
`

type RemoveProjectMemberParams struct {
	ProjectID uuid.UUID
	UserID    uuid.UUID
}

func (q *Queries) RemoveProjectMember(ctx context.Context, arg RemoveProjectMemberParams) (int64, error) {
	result, err := q.db.Exec(ctx, removeProjectMember, arg.ProjectID, arg.UserID)
	if err != nil {
		return 0, err
	}
	return result.RowsAffected(), nil
}

const updateMemberRole = `-- name: UpdateMemberRole :exec
UPDATE project_members SET role = $1 WHERE project_id = $2 AND user_id = $3
`

type UpdateMemberRoleParams struct {
	Role      ProjectRole
	ProjectID uuid.UUID
	UserID    uuid.UUID
}

func (q *Queries) UpdateMemberRole(ctx context.Context, arg UpdateMemberRoleParams) error {
	_, err := q.db.Exec(ctx, updateMemberRole, arg.Role, arg.ProjectID, arg.UserID)
	return err
}

const updateProject = `-- name: UpdateProject :one
UPDATE projects SET name = $1, description = $2
WHERE id = $3
RETURNING id, key, name, description, owner_id, issue_counter, created_at, updated_at
`

type UpdateProjectParams struct {
	Name        string
	Description string
	ID          uuid.UUID
}

func (q *Queries) UpdateProject(ctx context.Context, arg UpdateProjectParams) (Project, error) {
	row := q.db.QueryRow(ctx, updateProject, arg.Name, arg.Description, arg.ID)
	var i Project
	err := row.Scan(
		&i.ID,
		&i.Key,
		&i.Name,
		&i.Description,
		&i.OwnerID,
		&i.IssueCounter,
		&i.CreatedAt,
		&i.UpdatedAt,
	)
	return i, err
}

const upsertInvite = `-- name: UpsertInvite :one
INSERT INTO project_invites (project_id, email, role, invited_by)
VALUES ($1, $2, $3, $4)
ON CONFLICT (project_id, email) DO UPDATE SET role = EXCLUDED.role
RETURNING id, project_id, email, role, invited_by, created_at
`

type UpsertInviteParams struct {
	ProjectID uuid.UUID
	Email     string
	Role      ProjectRole
	InvitedBy *uuid.UUID
}

func (q *Queries) UpsertInvite(ctx context.Context, arg UpsertInviteParams) (ProjectInvite, error) {
	row := q.db.QueryRow(ctx, upsertInvite,
		arg.ProjectID,
		arg.Email,
		arg.Role,
		arg.InvitedBy,
	)
	var i ProjectInvite
	err := row.Scan(
		&i.ID,
		&i.ProjectID,
		&i.Email,
		&i.Role,
		&i.InvitedBy,
		&i.CreatedAt,
	)
	return i, err
}
