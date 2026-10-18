-- name: ListDocuments :many
SELECT * FROM documents WHERE project_id = @project_id ORDER BY created_at DESC;

-- name: GetDocument :one
SELECT * FROM documents WHERE id = @id AND project_id = @project_id;

-- name: CreateFileDocument :one
INSERT INTO documents (id, project_id, kind, name, category, description, storage_key, content_type, size_bytes, issue_id, uploaded_by)
VALUES (@id, @project_id, 'file', @name, @category, @description, @storage_key, @content_type, @size_bytes, sqlc.narg('issue_id'), @uploaded_by)
RETURNING *;

-- name: CreateLinkDocument :one
INSERT INTO documents (project_id, kind, name, category, description, url, issue_id, uploaded_by)
VALUES (@project_id, 'link', @name, @category, @description, @url, sqlc.narg('issue_id'), @uploaded_by)
RETURNING *;

-- name: UpdateDocument :one
UPDATE documents SET
  name = @name, category = @category, description = @description,
  url = sqlc.narg('url'), issue_id = sqlc.narg('issue_id')
WHERE id = @id AND project_id = @project_id
RETURNING *;

-- name: DeleteDocument :exec
DELETE FROM documents WHERE id = @id AND project_id = @project_id;
