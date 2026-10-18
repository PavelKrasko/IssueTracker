package db

import (
	"context"
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

const addWatcher = `-- name: AddWatcher :exec
INSERT INTO issue_watchers (issue_id, project_id, user_id)
SELECT $1, $2, $3
WHERE EXISTS (SELECT 1 FROM project_members m WHERE m.project_id = $2 AND m.user_id = $3)
ON CONFLICT DO NOTHING
`

type AddWatcherParams struct {
	IssueID   uuid.UUID
	ProjectID uuid.UUID
	UserID    uuid.UUID
}

func (q *Queries) AddWatcher(ctx context.Context, arg AddWatcherParams) error {
	_, err := q.db.Exec(ctx, addWatcher, arg.IssueID, arg.ProjectID, arg.UserID)
	return err
}

const consumeTelegramCode = `-- name: ConsumeTelegramCode :one
DELETE FROM telegram_link_codes WHERE code = $1 AND expires_at > now() RETURNING user_id
`

func (q *Queries) ConsumeTelegramCode(ctx context.Context, code string) (uuid.UUID, error) {
	row := q.db.QueryRow(ctx, consumeTelegramCode, code)
	var user_id uuid.UUID
	err := row.Scan(&user_id)
	return user_id, err
}

const countUnreadNotifications = `-- name: CountUnreadNotifications :one
SELECT count(*)::int FROM notifications WHERE user_id = $1 AND read_at IS NULL
`

func (q *Queries) CountUnreadNotifications(ctx context.Context, userID uuid.UUID) (int32, error) {
	row := q.db.QueryRow(ctx, countUnreadNotifications, userID)
	var column_1 int32
	err := row.Scan(&column_1)
	return column_1, err
}

const createComment = `-- name: CreateComment :one
INSERT INTO issue_comments (issue_id, author_id, body) VALUES ($1, $2, $3) RETURNING id, issue_id, author_id, body, created_at, updated_at
`

type CreateCommentParams struct {
	IssueID  uuid.UUID
	AuthorID *uuid.UUID
	Body     string
}

func (q *Queries) CreateComment(ctx context.Context, arg CreateCommentParams) (IssueComment, error) {
	row := q.db.QueryRow(ctx, createComment, arg.IssueID, arg.AuthorID, arg.Body)
	var i IssueComment
	err := row.Scan(
		&i.ID,
		&i.IssueID,
		&i.AuthorID,
		&i.Body,
		&i.CreatedAt,
		&i.UpdatedAt,
	)
	return i, err
}

const createNotification = `-- name: CreateNotification :one
INSERT INTO notifications (user_id, project_id, issue_id, actor_id, kind, payload)
VALUES ($1, $2, $3, $4, $5, $6)
RETURNING id, user_id, project_id, issue_id, actor_id, kind, payload, read_at, created_at
`

type CreateNotificationParams struct {
	UserID    uuid.UUID
	ProjectID *uuid.UUID
	IssueID   *uuid.UUID
	ActorID   *uuid.UUID
	Kind      string
	Payload   json.RawMessage
}

func (q *Queries) CreateNotification(ctx context.Context, arg CreateNotificationParams) (Notification, error) {
	row := q.db.QueryRow(ctx, createNotification,
		arg.UserID,
		arg.ProjectID,
		arg.IssueID,
		arg.ActorID,
		arg.Kind,
		arg.Payload,
	)
	var i Notification
	err := row.Scan(
		&i.ID,
		&i.UserID,
		&i.ProjectID,
		&i.IssueID,
		&i.ActorID,
		&i.Kind,
		&i.Payload,
		&i.ReadAt,
		&i.CreatedAt,
	)
	return i, err
}

const createTelegramCode = `-- name: CreateTelegramCode :exec
INSERT INTO telegram_link_codes (code, user_id, expires_at) VALUES ($1, $2, $3)
`

type CreateTelegramCodeParams struct {
	Code      string
	UserID    uuid.UUID
	ExpiresAt time.Time
}

func (q *Queries) CreateTelegramCode(ctx context.Context, arg CreateTelegramCodeParams) error {
	_, err := q.db.Exec(ctx, createTelegramCode, arg.Code, arg.UserID, arg.ExpiresAt)
	return err
}

const deleteComment = `-- name: DeleteComment :exec
DELETE FROM issue_comments WHERE id = $1
`

func (q *Queries) DeleteComment(ctx context.Context, id uuid.UUID) error {
	_, err := q.db.Exec(ctx, deleteComment, id)
	return err
}

const deleteOldNotifications = `-- name: DeleteOldNotifications :exec
DELETE FROM notifications WHERE created_at < now() - interval '90 days'
`

func (q *Queries) DeleteOldNotifications(ctx context.Context) error {
	_, err := q.db.Exec(ctx, deleteOldNotifications)
	return err
}

const deleteTelegramCodesByUser = `-- name: DeleteTelegramCodesByUser :exec
DELETE FROM telegram_link_codes WHERE user_id = $1
`

func (q *Queries) DeleteTelegramCodesByUser(ctx context.Context, userID uuid.UUID) error {
	_, err := q.db.Exec(ctx, deleteTelegramCodesByUser, userID)
	return err
}

const deleteTelegramLink = `-- name: DeleteTelegramLink :exec
DELETE FROM telegram_links WHERE user_id = $1
`

func (q *Queries) DeleteTelegramLink(ctx context.Context, userID uuid.UUID) error {
	_, err := q.db.Exec(ctx, deleteTelegramLink, userID)
	return err
}

const deleteTelegramLinkByChat = `-- name: DeleteTelegramLinkByChat :exec
DELETE FROM telegram_links WHERE chat_id = $1
`

func (q *Queries) DeleteTelegramLinkByChat(ctx context.Context, chatID int64) error {
	_, err := q.db.Exec(ctx, deleteTelegramLinkByChat, chatID)
	return err
}

const filterProjectMembers = `-- name: FilterProjectMembers :many
SELECT user_id FROM project_members WHERE project_id = $1 AND user_id = ANY($2::uuid[])
`

type FilterProjectMembersParams struct {
	ProjectID uuid.UUID
	Ids       []uuid.UUID
}

func (q *Queries) FilterProjectMembers(ctx context.Context, arg FilterProjectMembersParams) ([]uuid.UUID, error) {
	rows, err := q.db.Query(ctx, filterProjectMembers, arg.ProjectID, arg.Ids)
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

const getCommentInProject = `-- name: GetCommentInProject :one
SELECT c.id, c.issue_id, c.author_id, c.body, c.created_at, c.updated_at FROM issue_comments c JOIN issues i ON i.id = c.issue_id
WHERE c.id = $1 AND i.project_id = $2
`

type GetCommentInProjectParams struct {
	ID        uuid.UUID
	ProjectID uuid.UUID
}

func (q *Queries) GetCommentInProject(ctx context.Context, arg GetCommentInProjectParams) (IssueComment, error) {
	row := q.db.QueryRow(ctx, getCommentInProject, arg.ID, arg.ProjectID)
	var i IssueComment
	err := row.Scan(
		&i.ID,
		&i.IssueID,
		&i.AuthorID,
		&i.Body,
		&i.CreatedAt,
		&i.UpdatedAt,
	)
	return i, err
}

const getTelegramLink = `-- name: GetTelegramLink :one
SELECT user_id, chat_id, username, enabled, linked_at FROM telegram_links WHERE user_id = $1
`

func (q *Queries) GetTelegramLink(ctx context.Context, userID uuid.UUID) (TelegramLink, error) {
	row := q.db.QueryRow(ctx, getTelegramLink, userID)
	var i TelegramLink
	err := row.Scan(
		&i.UserID,
		&i.ChatID,
		&i.Username,
		&i.Enabled,
		&i.LinkedAt,
	)
	return i, err
}

const getUserNames = `-- name: GetUserNames :many
SELECT id, name FROM users WHERE id = ANY($1::uuid[])
`

type GetUserNamesRow struct {
	ID   uuid.UUID
	Name string
}

func (q *Queries) GetUserNames(ctx context.Context, ids []uuid.UUID) ([]GetUserNamesRow, error) {
	rows, err := q.db.Query(ctx, getUserNames, ids)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []GetUserNamesRow
	for rows.Next() {
		var i GetUserNamesRow
		if err := rows.Scan(&i.ID, &i.Name); err != nil {
			return nil, err
		}
		items = append(items, i)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return items, nil
}

const listComments = `-- name: ListComments :many
SELECT c.id, c.issue_id, c.author_id, c.body, c.created_at, c.updated_at, u.name AS author_name, u.avatar_url AS author_avatar_url
FROM issue_comments c LEFT JOIN users u ON u.id = c.author_id
WHERE c.issue_id = $1
ORDER BY c.created_at, c.id
`

type ListCommentsRow struct {
	ID              uuid.UUID
	IssueID         uuid.UUID
	AuthorID        *uuid.UUID
	Body            string
	CreatedAt       time.Time
	UpdatedAt       time.Time
	AuthorName      *string
	AuthorAvatarUrl *string
}

func (q *Queries) ListComments(ctx context.Context, issueID uuid.UUID) ([]ListCommentsRow, error) {
	rows, err := q.db.Query(ctx, listComments, issueID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []ListCommentsRow
	for rows.Next() {
		var i ListCommentsRow
		if err := rows.Scan(
			&i.ID,
			&i.IssueID,
			&i.AuthorID,
			&i.Body,
			&i.CreatedAt,
			&i.UpdatedAt,
			&i.AuthorName,
			&i.AuthorAvatarUrl,
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

const listNotifications = `-- name: ListNotifications :many
SELECT n.id, n.user_id, n.project_id, n.issue_id, n.actor_id, n.kind, n.payload, n.read_at, n.created_at, a.name AS actor_name, a.avatar_url AS actor_avatar_url
FROM notifications n LEFT JOIN users a ON a.id = n.actor_id
WHERE n.user_id = $1 AND (NOT $2::boolean OR n.read_at IS NULL)
ORDER BY n.created_at DESC, n.id DESC
LIMIT $3
`

type ListNotificationsParams struct {
	UserID     uuid.UUID
	UnreadOnly bool
	Lim        int32
}

type ListNotificationsRow struct {
	ID             int64
	UserID         uuid.UUID
	ProjectID      *uuid.UUID
	IssueID        *uuid.UUID
	ActorID        *uuid.UUID
	Kind           string
	Payload        json.RawMessage
	ReadAt         *time.Time
	CreatedAt      time.Time
	ActorName      *string
	ActorAvatarUrl *string
}

func (q *Queries) ListNotifications(ctx context.Context, arg ListNotificationsParams) ([]ListNotificationsRow, error) {
	rows, err := q.db.Query(ctx, listNotifications, arg.UserID, arg.UnreadOnly, arg.Lim)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []ListNotificationsRow
	for rows.Next() {
		var i ListNotificationsRow
		if err := rows.Scan(
			&i.ID,
			&i.UserID,
			&i.ProjectID,
			&i.IssueID,
			&i.ActorID,
			&i.Kind,
			&i.Payload,
			&i.ReadAt,
			&i.CreatedAt,
			&i.ActorName,
			&i.ActorAvatarUrl,
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

const markNotificationsRead = `-- name: MarkNotificationsRead :exec
UPDATE notifications SET read_at = now()
WHERE user_id = $1 AND read_at IS NULL AND ($2::boolean OR id = ANY($3::bigint[]))
`

type MarkNotificationsReadParams struct {
	UserID   uuid.UUID
	AllItems bool
	Ids      []int64
}

func (q *Queries) MarkNotificationsRead(ctx context.Context, arg MarkNotificationsReadParams) error {
	_, err := q.db.Exec(ctx, markNotificationsRead, arg.UserID, arg.AllItems, arg.Ids)
	return err
}

const removeWatcher = `-- name: RemoveWatcher :exec
DELETE FROM issue_watchers WHERE issue_id = $1 AND user_id = $2
`

type RemoveWatcherParams struct {
	IssueID uuid.UUID
	UserID  uuid.UUID
}

func (q *Queries) RemoveWatcher(ctx context.Context, arg RemoveWatcherParams) error {
	_, err := q.db.Exec(ctx, removeWatcher, arg.IssueID, arg.UserID)
	return err
}

const setTelegramEnabled = `-- name: SetTelegramEnabled :exec
UPDATE telegram_links SET enabled = $1 WHERE user_id = $2
`

type SetTelegramEnabledParams struct {
	Enabled bool
	UserID  uuid.UUID
}

func (q *Queries) SetTelegramEnabled(ctx context.Context, arg SetTelegramEnabledParams) error {
	_, err := q.db.Exec(ctx, setTelegramEnabled, arg.Enabled, arg.UserID)
	return err
}

const updateComment = `-- name: UpdateComment :one
UPDATE issue_comments SET body = $1 WHERE id = $2 RETURNING id, issue_id, author_id, body, created_at, updated_at
`

type UpdateCommentParams struct {
	Body string
	ID   uuid.UUID
}

func (q *Queries) UpdateComment(ctx context.Context, arg UpdateCommentParams) (IssueComment, error) {
	row := q.db.QueryRow(ctx, updateComment, arg.Body, arg.ID)
	var i IssueComment
	err := row.Scan(
		&i.ID,
		&i.IssueID,
		&i.AuthorID,
		&i.Body,
		&i.CreatedAt,
		&i.UpdatedAt,
	)
	return i, err
}

const upsertTelegramLink = `-- name: UpsertTelegramLink :exec
INSERT INTO telegram_links (user_id, chat_id, username)
VALUES ($1, $2, $3)
ON CONFLICT (user_id) DO UPDATE SET chat_id = EXCLUDED.chat_id, username = EXCLUDED.username, enabled = true, linked_at = now()
`

type UpsertTelegramLinkParams struct {
	UserID   uuid.UUID
	ChatID   int64
	Username *string
}

func (q *Queries) UpsertTelegramLink(ctx context.Context, arg UpsertTelegramLinkParams) error {
	_, err := q.db.Exec(ctx, upsertTelegramLink, arg.UserID, arg.ChatID, arg.Username)
	return err
}
