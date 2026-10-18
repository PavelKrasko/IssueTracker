-- name: ListComments :many
SELECT c.*, u.name AS author_name, u.avatar_url AS author_avatar_url
FROM issue_comments c LEFT JOIN users u ON u.id = c.author_id
WHERE c.issue_id = @issue_id
ORDER BY c.created_at, c.id;

-- name: CreateComment :one
INSERT INTO issue_comments (issue_id, author_id, body) VALUES (@issue_id, @author_id, @body) RETURNING *;

-- name: GetCommentInProject :one
SELECT c.* FROM issue_comments c JOIN issues i ON i.id = c.issue_id
WHERE c.id = @id AND i.project_id = @project_id;

-- name: UpdateComment :one
UPDATE issue_comments SET body = @body WHERE id = @id RETURNING *;

-- name: DeleteComment :exec
DELETE FROM issue_comments WHERE id = @id;

-- name: AddWatcher :exec
INSERT INTO issue_watchers (issue_id, project_id, user_id)
SELECT @issue_id, @project_id, @user_id
WHERE EXISTS (SELECT 1 FROM project_members m WHERE m.project_id = @project_id AND m.user_id = @user_id)
ON CONFLICT DO NOTHING;

-- name: RemoveWatcher :exec
DELETE FROM issue_watchers WHERE issue_id = @issue_id AND user_id = @user_id;

-- name: CreateNotification :one
INSERT INTO notifications (user_id, project_id, issue_id, actor_id, kind, payload)
VALUES (@user_id, @project_id, @issue_id, @actor_id, @kind, @payload)
RETURNING *;

-- name: ListNotifications :many
SELECT n.*, a.name AS actor_name, a.avatar_url AS actor_avatar_url
FROM notifications n LEFT JOIN users a ON a.id = n.actor_id
WHERE n.user_id = @user_id AND (NOT @unread_only::boolean OR n.read_at IS NULL)
ORDER BY n.created_at DESC, n.id DESC
LIMIT @lim;

-- name: CountUnreadNotifications :one
SELECT count(*)::int FROM notifications WHERE user_id = @user_id AND read_at IS NULL;

-- name: MarkNotificationsRead :exec
UPDATE notifications SET read_at = now()
WHERE user_id = @user_id AND read_at IS NULL AND (@all_items::boolean OR id = ANY(@ids::bigint[]));

-- name: DeleteOldNotifications :exec
DELETE FROM notifications WHERE created_at < now() - interval '90 days';

-- name: FilterProjectMembers :many
SELECT user_id FROM project_members WHERE project_id = @project_id AND user_id = ANY(@ids::uuid[]);

-- name: GetTelegramLink :one
SELECT * FROM telegram_links WHERE user_id = @user_id;

-- name: UpsertTelegramLink :exec
INSERT INTO telegram_links (user_id, chat_id, username)
VALUES (@user_id, @chat_id, sqlc.narg('username'))
ON CONFLICT (user_id) DO UPDATE SET chat_id = EXCLUDED.chat_id, username = EXCLUDED.username, enabled = true, linked_at = now();

-- name: DeleteTelegramLinkByChat :exec
DELETE FROM telegram_links WHERE chat_id = @chat_id;

-- name: DeleteTelegramLink :exec
DELETE FROM telegram_links WHERE user_id = @user_id;

-- name: SetTelegramEnabled :exec
UPDATE telegram_links SET enabled = @enabled WHERE user_id = @user_id;

-- name: CreateTelegramCode :exec
INSERT INTO telegram_link_codes (code, user_id, expires_at) VALUES (@code, @user_id, @expires_at);

-- name: DeleteTelegramCodesByUser :exec
DELETE FROM telegram_link_codes WHERE user_id = @user_id;

-- name: ConsumeTelegramCode :one
DELETE FROM telegram_link_codes WHERE code = @code AND expires_at > now() RETURNING user_id;

-- name: GetUserNames :many
SELECT id, name FROM users WHERE id = ANY(@ids::uuid[]);
