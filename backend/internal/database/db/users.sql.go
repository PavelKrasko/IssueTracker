package db

import (
	"context"
	"time"

	"github.com/google/uuid"
)

const createOAuthAccount = `-- name: CreateOAuthAccount :one
INSERT INTO oauth_accounts (user_id, provider, provider_user_id, email)
VALUES ($1, $2, $3, $4)
RETURNING id, user_id, provider, provider_user_id, email, created_at
`

type CreateOAuthAccountParams struct {
	UserID         uuid.UUID
	Provider       OauthProvider
	ProviderUserID string
	Email          *string
}

func (q *Queries) CreateOAuthAccount(ctx context.Context, arg CreateOAuthAccountParams) (OauthAccount, error) {
	row := q.db.QueryRow(ctx, createOAuthAccount,
		arg.UserID,
		arg.Provider,
		arg.ProviderUserID,
		arg.Email,
	)
	var i OauthAccount
	err := row.Scan(
		&i.ID,
		&i.UserID,
		&i.Provider,
		&i.ProviderUserID,
		&i.Email,
		&i.CreatedAt,
	)
	return i, err
}

const createSession = `-- name: CreateSession :one
INSERT INTO sessions (user_id, refresh_token_hash, user_agent, ip, expires_at)
VALUES ($1, $2, $3, $4, $5)
RETURNING id, user_id, refresh_token_hash, user_agent, ip, created_at, expires_at, revoked_at
`

type CreateSessionParams struct {
	UserID           uuid.UUID
	RefreshTokenHash []byte
	UserAgent        string
	Ip               string
	ExpiresAt        time.Time
}

func (q *Queries) CreateSession(ctx context.Context, arg CreateSessionParams) (Session, error) {
	row := q.db.QueryRow(ctx, createSession,
		arg.UserID,
		arg.RefreshTokenHash,
		arg.UserAgent,
		arg.Ip,
		arg.ExpiresAt,
	)
	var i Session
	err := row.Scan(
		&i.ID,
		&i.UserID,
		&i.RefreshTokenHash,
		&i.UserAgent,
		&i.Ip,
		&i.CreatedAt,
		&i.ExpiresAt,
		&i.RevokedAt,
	)
	return i, err
}

const createUser = `-- name: CreateUser :one
INSERT INTO users (email, name, password_hash)
VALUES ($1, $2, $3)
RETURNING id, email, name, job_title, about, password_hash, avatar_url, created_at, updated_at, avatar_key
`

type CreateUserParams struct {
	Email        string
	Name         string
	PasswordHash *string
}

func (q *Queries) CreateUser(ctx context.Context, arg CreateUserParams) (User, error) {
	row := q.db.QueryRow(ctx, createUser, arg.Email, arg.Name, arg.PasswordHash)
	var i User
	err := row.Scan(
		&i.ID,
		&i.Email,
		&i.Name,
		&i.JobTitle,
		&i.About,
		&i.PasswordHash,
		&i.AvatarUrl,
		&i.CreatedAt,
		&i.UpdatedAt,
		&i.AvatarKey,
	)
	return i, err
}

const deleteExpiredSessions = `-- name: DeleteExpiredSessions :exec
DELETE FROM sessions WHERE expires_at < now() - interval '7 days' OR revoked_at < now() - interval '7 days'
`

func (q *Queries) DeleteExpiredSessions(ctx context.Context) error {
	_, err := q.db.Exec(ctx, deleteExpiredSessions)
	return err
}

const deleteOAuthAccount = `-- name: DeleteOAuthAccount :execrows
DELETE FROM oauth_accounts WHERE user_id = $1 AND provider = $2
`

type DeleteOAuthAccountParams struct {
	UserID   uuid.UUID
	Provider OauthProvider
}

func (q *Queries) DeleteOAuthAccount(ctx context.Context, arg DeleteOAuthAccountParams) (int64, error) {
	result, err := q.db.Exec(ctx, deleteOAuthAccount, arg.UserID, arg.Provider)
	if err != nil {
		return 0, err
	}
	return result.RowsAffected(), nil
}

const getActiveSessionByHash = `-- name: GetActiveSessionByHash :one
SELECT id, user_id, refresh_token_hash, user_agent, ip, created_at, expires_at, revoked_at FROM sessions
WHERE refresh_token_hash = $1 AND revoked_at IS NULL AND expires_at > now()
`

func (q *Queries) GetActiveSessionByHash(ctx context.Context, refreshTokenHash []byte) (Session, error) {
	row := q.db.QueryRow(ctx, getActiveSessionByHash, refreshTokenHash)
	var i Session
	err := row.Scan(
		&i.ID,
		&i.UserID,
		&i.RefreshTokenHash,
		&i.UserAgent,
		&i.Ip,
		&i.CreatedAt,
		&i.ExpiresAt,
		&i.RevokedAt,
	)
	return i, err
}

const getOAuthAccount = `-- name: GetOAuthAccount :one
SELECT id, user_id, provider, provider_user_id, email, created_at FROM oauth_accounts WHERE provider = $1 AND provider_user_id = $2
`

type GetOAuthAccountParams struct {
	Provider       OauthProvider
	ProviderUserID string
}

func (q *Queries) GetOAuthAccount(ctx context.Context, arg GetOAuthAccountParams) (OauthAccount, error) {
	row := q.db.QueryRow(ctx, getOAuthAccount, arg.Provider, arg.ProviderUserID)
	var i OauthAccount
	err := row.Scan(
		&i.ID,
		&i.UserID,
		&i.Provider,
		&i.ProviderUserID,
		&i.Email,
		&i.CreatedAt,
	)
	return i, err
}

const getUserByEmail = `-- name: GetUserByEmail :one
SELECT id, email, name, job_title, about, password_hash, avatar_url, created_at, updated_at, avatar_key FROM users WHERE email = $1
`

func (q *Queries) GetUserByEmail(ctx context.Context, email string) (User, error) {
	row := q.db.QueryRow(ctx, getUserByEmail, email)
	var i User
	err := row.Scan(
		&i.ID,
		&i.Email,
		&i.Name,
		&i.JobTitle,
		&i.About,
		&i.PasswordHash,
		&i.AvatarUrl,
		&i.CreatedAt,
		&i.UpdatedAt,
		&i.AvatarKey,
	)
	return i, err
}

const getUserByID = `-- name: GetUserByID :one
SELECT id, email, name, job_title, about, password_hash, avatar_url, created_at, updated_at, avatar_key FROM users WHERE id = $1
`

func (q *Queries) GetUserByID(ctx context.Context, id uuid.UUID) (User, error) {
	row := q.db.QueryRow(ctx, getUserByID, id)
	var i User
	err := row.Scan(
		&i.ID,
		&i.Email,
		&i.Name,
		&i.JobTitle,
		&i.About,
		&i.PasswordHash,
		&i.AvatarUrl,
		&i.CreatedAt,
		&i.UpdatedAt,
		&i.AvatarKey,
	)
	return i, err
}

const listOAuthAccountsByUser = `-- name: ListOAuthAccountsByUser :many
SELECT id, user_id, provider, provider_user_id, email, created_at FROM oauth_accounts WHERE user_id = $1
`

func (q *Queries) ListOAuthAccountsByUser(ctx context.Context, userID uuid.UUID) ([]OauthAccount, error) {
	rows, err := q.db.Query(ctx, listOAuthAccountsByUser, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []OauthAccount
	for rows.Next() {
		var i OauthAccount
		if err := rows.Scan(
			&i.ID,
			&i.UserID,
			&i.Provider,
			&i.ProviderUserID,
			&i.Email,
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

const revokeOtherSessions = `-- name: RevokeOtherSessions :exec
UPDATE sessions SET revoked_at = now() WHERE user_id = $1 AND id <> $2 AND revoked_at IS NULL
`

type RevokeOtherSessionsParams struct {
	UserID uuid.UUID
	KeepID uuid.UUID
}

func (q *Queries) RevokeOtherSessions(ctx context.Context, arg RevokeOtherSessionsParams) error {
	_, err := q.db.Exec(ctx, revokeOtherSessions, arg.UserID, arg.KeepID)
	return err
}

const revokeSession = `-- name: RevokeSession :exec
UPDATE sessions SET revoked_at = now() WHERE id = $1 AND revoked_at IS NULL
`

func (q *Queries) RevokeSession(ctx context.Context, id uuid.UUID) error {
	_, err := q.db.Exec(ctx, revokeSession, id)
	return err
}

const setUserAvatar = `-- name: SetUserAvatar :one
UPDATE users SET avatar_url = $1, avatar_key = $2
WHERE id = $3
RETURNING id, email, name, job_title, about, password_hash, avatar_url, created_at, updated_at, avatar_key
`

type SetUserAvatarParams struct {
	AvatarUrl *string
	AvatarKey *string
	ID        uuid.UUID
}

func (q *Queries) SetUserAvatar(ctx context.Context, arg SetUserAvatarParams) (User, error) {
	row := q.db.QueryRow(ctx, setUserAvatar, arg.AvatarUrl, arg.AvatarKey, arg.ID)
	var i User
	err := row.Scan(
		&i.ID,
		&i.Email,
		&i.Name,
		&i.JobTitle,
		&i.About,
		&i.PasswordHash,
		&i.AvatarUrl,
		&i.CreatedAt,
		&i.UpdatedAt,
		&i.AvatarKey,
	)
	return i, err
}

const updateUserAvatarIfEmpty = `-- name: UpdateUserAvatarIfEmpty :exec
UPDATE users SET avatar_url = $1 WHERE id = $2 AND avatar_url IS NULL
`

type UpdateUserAvatarIfEmptyParams struct {
	AvatarUrl *string
	ID        uuid.UUID
}

func (q *Queries) UpdateUserAvatarIfEmpty(ctx context.Context, arg UpdateUserAvatarIfEmptyParams) error {
	_, err := q.db.Exec(ctx, updateUserAvatarIfEmpty, arg.AvatarUrl, arg.ID)
	return err
}

const updateUserPassword = `-- name: UpdateUserPassword :exec
UPDATE users SET password_hash = $1 WHERE id = $2
`

type UpdateUserPasswordParams struct {
	PasswordHash *string
	ID           uuid.UUID
}

func (q *Queries) UpdateUserPassword(ctx context.Context, arg UpdateUserPasswordParams) error {
	_, err := q.db.Exec(ctx, updateUserPassword, arg.PasswordHash, arg.ID)
	return err
}

const updateUserProfile = `-- name: UpdateUserProfile :one
UPDATE users SET name = $1, job_title = $2, about = $3
WHERE id = $4
RETURNING id, email, name, job_title, about, password_hash, avatar_url, created_at, updated_at, avatar_key
`

type UpdateUserProfileParams struct {
	Name     string
	JobTitle string
	About    string
	ID       uuid.UUID
}

func (q *Queries) UpdateUserProfile(ctx context.Context, arg UpdateUserProfileParams) (User, error) {
	row := q.db.QueryRow(ctx, updateUserProfile,
		arg.Name,
		arg.JobTitle,
		arg.About,
		arg.ID,
	)
	var i User
	err := row.Scan(
		&i.ID,
		&i.Email,
		&i.Name,
		&i.JobTitle,
		&i.About,
		&i.PasswordHash,
		&i.AvatarUrl,
		&i.CreatedAt,
		&i.UpdatedAt,
		&i.AvatarKey,
	)
	return i, err
}
