package db

import (
	"context"

	"github.com/google/uuid"
)

const createFileDocument = `-- name: CreateFileDocument :one
INSERT INTO documents (id, project_id, kind, name, category, description, storage_key, content_type, size_bytes, issue_id, uploaded_by)
VALUES ($1, $2, 'file', $3, $4, $5, $6, $7, $8, $9, $10)
RETURNING id, project_id, kind, name, category, description, url, storage_key, content_type, size_bytes, issue_id, uploaded_by, created_at, updated_at
`

type CreateFileDocumentParams struct {
	ID          uuid.UUID
	ProjectID   uuid.UUID
	Name        string
	Category    DocCategory
	Description string
	StorageKey  *string
	ContentType *string
	SizeBytes   *int64
	IssueID     *uuid.UUID
	UploadedBy  *uuid.UUID
}

func (q *Queries) CreateFileDocument(ctx context.Context, arg CreateFileDocumentParams) (Document, error) {
	row := q.db.QueryRow(ctx, createFileDocument,
		arg.ID,
		arg.ProjectID,
		arg.Name,
		arg.Category,
		arg.Description,
		arg.StorageKey,
		arg.ContentType,
		arg.SizeBytes,
		arg.IssueID,
		arg.UploadedBy,
	)
	var i Document
	err := row.Scan(
		&i.ID,
		&i.ProjectID,
		&i.Kind,
		&i.Name,
		&i.Category,
		&i.Description,
		&i.Url,
		&i.StorageKey,
		&i.ContentType,
		&i.SizeBytes,
		&i.IssueID,
		&i.UploadedBy,
		&i.CreatedAt,
		&i.UpdatedAt,
	)
	return i, err
}

const createLinkDocument = `-- name: CreateLinkDocument :one
INSERT INTO documents (project_id, kind, name, category, description, url, issue_id, uploaded_by)
VALUES ($1, 'link', $2, $3, $4, $5, $6, $7)
RETURNING id, project_id, kind, name, category, description, url, storage_key, content_type, size_bytes, issue_id, uploaded_by, created_at, updated_at
`

type CreateLinkDocumentParams struct {
	ProjectID   uuid.UUID
	Name        string
	Category    DocCategory
	Description string
	Url         *string
	IssueID     *uuid.UUID
	UploadedBy  *uuid.UUID
}

func (q *Queries) CreateLinkDocument(ctx context.Context, arg CreateLinkDocumentParams) (Document, error) {
	row := q.db.QueryRow(ctx, createLinkDocument,
		arg.ProjectID,
		arg.Name,
		arg.Category,
		arg.Description,
		arg.Url,
		arg.IssueID,
		arg.UploadedBy,
	)
	var i Document
	err := row.Scan(
		&i.ID,
		&i.ProjectID,
		&i.Kind,
		&i.Name,
		&i.Category,
		&i.Description,
		&i.Url,
		&i.StorageKey,
		&i.ContentType,
		&i.SizeBytes,
		&i.IssueID,
		&i.UploadedBy,
		&i.CreatedAt,
		&i.UpdatedAt,
	)
	return i, err
}

const deleteDocument = `-- name: DeleteDocument :exec
DELETE FROM documents WHERE id = $1 AND project_id = $2
`

type DeleteDocumentParams struct {
	ID        uuid.UUID
	ProjectID uuid.UUID
}

func (q *Queries) DeleteDocument(ctx context.Context, arg DeleteDocumentParams) error {
	_, err := q.db.Exec(ctx, deleteDocument, arg.ID, arg.ProjectID)
	return err
}

const getDocument = `-- name: GetDocument :one
SELECT id, project_id, kind, name, category, description, url, storage_key, content_type, size_bytes, issue_id, uploaded_by, created_at, updated_at FROM documents WHERE id = $1 AND project_id = $2
`

type GetDocumentParams struct {
	ID        uuid.UUID
	ProjectID uuid.UUID
}

func (q *Queries) GetDocument(ctx context.Context, arg GetDocumentParams) (Document, error) {
	row := q.db.QueryRow(ctx, getDocument, arg.ID, arg.ProjectID)
	var i Document
	err := row.Scan(
		&i.ID,
		&i.ProjectID,
		&i.Kind,
		&i.Name,
		&i.Category,
		&i.Description,
		&i.Url,
		&i.StorageKey,
		&i.ContentType,
		&i.SizeBytes,
		&i.IssueID,
		&i.UploadedBy,
		&i.CreatedAt,
		&i.UpdatedAt,
	)
	return i, err
}

const listDocuments = `-- name: ListDocuments :many
SELECT id, project_id, kind, name, category, description, url, storage_key, content_type, size_bytes, issue_id, uploaded_by, created_at, updated_at FROM documents WHERE project_id = $1 ORDER BY created_at DESC
`

func (q *Queries) ListDocuments(ctx context.Context, projectID uuid.UUID) ([]Document, error) {
	rows, err := q.db.Query(ctx, listDocuments, projectID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []Document
	for rows.Next() {
		var i Document
		if err := rows.Scan(
			&i.ID,
			&i.ProjectID,
			&i.Kind,
			&i.Name,
			&i.Category,
			&i.Description,
			&i.Url,
			&i.StorageKey,
			&i.ContentType,
			&i.SizeBytes,
			&i.IssueID,
			&i.UploadedBy,
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

const updateDocument = `-- name: UpdateDocument :one
UPDATE documents SET
  name = $1, category = $2, description = $3,
  url = $4, issue_id = $5
WHERE id = $6 AND project_id = $7
RETURNING id, project_id, kind, name, category, description, url, storage_key, content_type, size_bytes, issue_id, uploaded_by, created_at, updated_at
`

type UpdateDocumentParams struct {
	Name        string
	Category    DocCategory
	Description string
	Url         *string
	IssueID     *uuid.UUID
	ID          uuid.UUID
	ProjectID   uuid.UUID
}

func (q *Queries) UpdateDocument(ctx context.Context, arg UpdateDocumentParams) (Document, error) {
	row := q.db.QueryRow(ctx, updateDocument,
		arg.Name,
		arg.Category,
		arg.Description,
		arg.Url,
		arg.IssueID,
		arg.ID,
		arg.ProjectID,
	)
	var i Document
	err := row.Scan(
		&i.ID,
		&i.ProjectID,
		&i.Kind,
		&i.Name,
		&i.Category,
		&i.Description,
		&i.Url,
		&i.StorageKey,
		&i.ContentType,
		&i.SizeBytes,
		&i.IssueID,
		&i.UploadedBy,
		&i.CreatedAt,
		&i.UpdatedAt,
	)
	return i, err
}
