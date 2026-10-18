package httpapi

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"mime"
	"net/http"
	"path/filepath"
	"strconv"
	"strings"

	"github.com/google/uuid"

	"issuetracker/internal/database/db"
	"issuetracker/internal/storage"
)

const (
	maxImageSize   = 5 << 20
	maxAttachments = 10
	maxDocSize     = 20 << 20
)

var imageTypes = map[string]bool{"image/png": true, "image/jpeg": true, "image/gif": true, "image/webp": true}

var docExtensions = map[string]bool{
	"pdf": true, "doc": true, "docx": true, "odt": true, "rtf": true, "txt": true, "md": true,
	"xls": true, "xlsx": true, "ods": true, "csv": true, "ppt": true, "pptx": true, "odp": true,
	"png": true, "jpg": true, "jpeg": true, "gif": true, "webp": true, "svg": true,
	"zip": true, "json": true, "yaml": true, "yml": true,
}

var inlineTypes = map[string]bool{
	"application/pdf": true, "image/png": true, "image/jpeg": true, "image/gif": true, "image/webp": true,
	"text/plain; charset=utf-8": true,
}

func cleanFileName(name, fallback string) string {
	name = strings.TrimSpace(filepath.Base(strings.ReplaceAll(name, "\\", "/")))
	if name == "" || name == "." || name == "/" {
		name = fallback
	}
	return truncate(name, 200)
}

func extOf(name string) string {
	return strings.ToLower(strings.TrimPrefix(filepath.Ext(name), "."))
}

func docContentType(name string, head []byte) string {
	switch extOf(name) {
	case "txt", "md", "csv", "json", "yaml", "yml":
		return "text/plain; charset=utf-8"
	}
	if t := mime.TypeByExtension("." + extOf(name)); t != "" {
		return t
	}
	return http.DetectContentType(head)
}

func (s *Server) serveObject(w http.ResponseWriter, r *http.Request, key, name, contentType string, inline bool) error {
	obj, err := s.store.Get(r.Context(), key)
	if errors.Is(err, storage.ErrNotFound) {
		return errNotFound("Файл не найден в хранилище.")
	}
	if err != nil {
		return err
	}
	defer obj.Body.Close()

	disposition := "attachment"
	if inline && r.URL.Query().Get("download") == "" && inlineTypes[contentType] {
		disposition = "inline"
	}
	h := w.Header()
	h.Set("Content-Type", contentType)
	h.Set("Content-Length", strconv.FormatInt(obj.Size, 10))
	h.Set("Content-Disposition", mime.FormatMediaType(disposition, map[string]string{"filename": name}))
	h.Set("X-Content-Type-Options", "nosniff")
	h.Set("Content-Security-Policy", "sandbox; default-src 'none'; img-src 'self'; style-src 'unsafe-inline'")
	h.Set("Cache-Control", "private, max-age=3600")
	w.WriteHeader(http.StatusOK)
	_, _ = io.Copy(w, obj.Body)
	return nil
}

func (s *Server) uploadAttachment(w http.ResponseWriter, r *http.Request) error {
	if err := requireRole(r, db.ProjectRoleMember); err != nil {
		return err
	}
	issueID, err := urlUUID(r, "issueID", "Задача")
	if err != nil {
		return err
	}
	ctx := r.Context()
	pid, uid := project(r).ID, userID(r)
	issue, err := s.q.GetIssue(ctx, db.GetIssueParams{ID: issueID, ProjectID: pid})
	if err != nil {
		return err
	}
	if n, err := s.q.CountAttachmentsByIssue(ctx, issueID); err != nil {
		return err
	} else if n >= maxAttachments {
		return errBadRequest(fmt.Sprintf("К задаче можно прикрепить не больше %d изображений.", maxAttachments), nil)
	}

	r.Body = http.MaxBytesReader(w, r.Body, maxImageSize+1<<20)
	file, header, err := r.FormFile("file")
	if err != nil {
		return errBadRequest("Не удалось прочитать файл. Максимальный размер — 5 МБ.", map[string]string{"file": "Прикрепите изображение до 5 МБ."})
	}
	defer file.Close()
	data, err := io.ReadAll(io.LimitReader(file, maxImageSize+1))
	if err != nil {
		return err
	}
	if len(data) == 0 {
		return errBadRequest("Файл пустой.", nil)
	}
	if len(data) > maxImageSize {
		return errBadRequest("Изображение больше 5 МБ.", map[string]string{"file": "Максимум — 5 МБ."})
	}
	ct := http.DetectContentType(data)
	if !imageTypes[ct] {
		return errBadRequest("Это не изображение. Подходят PNG, JPG, GIF и WebP.", map[string]string{"file": "Подходят PNG, JPG, GIF и WebP."})
	}

	attID := uuid.New()
	key := fmt.Sprintf("projects/%s/issues/%s/%s", pid, issueID, attID)
	if err := s.store.Put(ctx, key, bytes.NewReader(data), int64(len(data)), ct); err != nil {
		return err
	}
	name := cleanFileName(header.Filename, "image")
	err = s.inTx(ctx, func(q *db.Queries) error {
		if _, err := q.CreateAttachment(ctx, db.CreateAttachmentParams{
			ID: attID, IssueID: issueID, UploadedBy: &uid, FileName: name, ContentType: ct, SizeBytes: int64(len(data)), StorageKey: key,
		}); err != nil {
			return err
		}
		changes, _ := json.Marshal(map[string]string{"name": name})
		if err := q.CreateIssueEvent(ctx, db.CreateIssueEventParams{IssueID: issueID, ActorID: &uid, Kind: "attachment_added", Changes: changes}); err != nil {
			return err
		}
		return q.TouchIssue(ctx, issueID)
	})
	if err != nil {
		s.deleteObjects(key)
		return err
	}
	issue, err = s.q.GetIssue(ctx, db.GetIssueParams{ID: issueID, ProjectID: pid})
	if err != nil {
		return err
	}
	out, err := s.issueResponse(r, issue)
	if err != nil {
		return err
	}
	writeJSON(w, http.StatusCreated, out)
	return nil
}

func (s *Server) deleteAttachment(w http.ResponseWriter, r *http.Request) error {
	if err := requireRole(r, db.ProjectRoleMember); err != nil {
		return err
	}
	issueID, err := urlUUID(r, "issueID", "Задача")
	if err != nil {
		return err
	}
	attID, err := urlUUID(r, "attachmentID", "Вложение")
	if err != nil {
		return err
	}
	ctx := r.Context()
	pid, uid := project(r).ID, userID(r)
	att, err := s.q.GetAttachmentInProject(ctx, db.GetAttachmentInProjectParams{ID: attID, ProjectID: pid})
	if err != nil {
		return err
	}
	if att.IssueID != issueID {
		return errNotFound("Вложение не найдено.")
	}
	err = s.inTx(ctx, func(q *db.Queries) error {
		if err := q.DeleteAttachment(ctx, attID); err != nil {
			return err
		}
		changes, _ := json.Marshal(map[string]string{"name": att.FileName})
		if err := q.CreateIssueEvent(ctx, db.CreateIssueEventParams{IssueID: issueID, ActorID: &uid, Kind: "attachment_removed", Changes: changes}); err != nil {
			return err
		}
		return q.TouchIssue(ctx, issueID)
	})
	if err != nil {
		return err
	}
	s.deleteObjects(att.StorageKey)
	issue, err := s.q.GetIssue(ctx, db.GetIssueParams{ID: issueID, ProjectID: pid})
	if err != nil {
		return err
	}
	out, err := s.issueResponse(r, issue)
	if err != nil {
		return err
	}
	writeJSON(w, http.StatusOK, out)
	return nil
}

func (s *Server) attachmentContent(w http.ResponseWriter, r *http.Request) error {
	attID, err := urlUUID(r, "attachmentID", "Вложение")
	if err != nil {
		return err
	}
	att, err := s.q.GetAttachmentInProject(r.Context(), db.GetAttachmentInProjectParams{ID: attID, ProjectID: project(r).ID})
	if err != nil {
		return err
	}
	return s.serveObject(w, r, att.StorageKey, att.FileName, att.ContentType, true)
}
