-- name: CreateUser :one
INSERT INTO users (email, name, password_hash)
VALUES (@email, @name, sqlc.narg('password_hash'))
RETURNING *;

-- name: GetUserByID :one
SELECT * FROM users WHERE id = @id;

-- name: GetUserByEmail :one
SELECT * FROM users WHERE email = @email;

-- name: UpdateUserProfile :one
UPDATE users SET name = @name, job_title = @job_title, about = @about
WHERE id = @id
RETURNING *;

-- name: UpdateUserPassword :exec
UPDATE users SET password_hash = @password_hash WHERE id = @id;

-- name: UpdateUserAvatarIfEmpty :exec
UPDATE users SET avatar_url = @avatar_url WHERE id = @id AND avatar_url IS NULL;

-- name: ListOAuthAccountsByUser :many
SELECT * FROM oauth_accounts WHERE user_id = @user_id;

-- name: GetOAuthAccount :one
SELECT * FROM oauth_accounts WHERE provider = @provider AND provider_user_id = @provider_user_id;

-- name: CreateOAuthAccount :one
INSERT INTO oauth_accounts (user_id, provider, provider_user_id, email)
VALUES (@user_id, @provider, @provider_user_id, sqlc.narg('email'))
RETURNING *;

-- name: DeleteOAuthAccount :execrows
DELETE FROM oauth_accounts WHERE user_id = @user_id AND provider = @provider;

-- name: CreateSession :one
INSERT INTO sessions (user_id, refresh_token_hash, user_agent, ip, expires_at)
VALUES (@user_id, @refresh_token_hash, @user_agent, @ip, @expires_at)
RETURNING *;

-- name: GetActiveSessionByHash :one
SELECT * FROM sessions
WHERE refresh_token_hash = @refresh_token_hash AND revoked_at IS NULL AND expires_at > now();

-- name: RevokeSession :exec
UPDATE sessions SET revoked_at = now() WHERE id = @id AND revoked_at IS NULL;

-- name: RevokeOtherSessions :exec
UPDATE sessions SET revoked_at = now() WHERE user_id = @user_id AND id <> @keep_id AND revoked_at IS NULL;

-- name: DeleteExpiredSessions :exec
DELETE FROM sessions WHERE expires_at < now() - interval '7 days' OR revoked_at < now() - interval '7 days';

-- name: SetUserAvatar :one
UPDATE users SET avatar_url = sqlc.narg('avatar_url'), avatar_key = sqlc.narg('avatar_key')
WHERE id = @id
RETURNING *;
