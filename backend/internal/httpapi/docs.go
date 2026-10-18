package httpapi

import (
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"

	"github.com/google/uuid"

	"issuetracker/internal/database/db"
)

func (s *Server) listDocs(w http.ResponseWriter, r *http.Request) error {
	docs, err := s.q.ListDocuments(r.Context(), project(r).ID)
	if err != nil {
		return err
	}
	out := make([]docDTO, 0, len(docs))
	for _, d := range docs {
		out = append(out, toDoc(d))
	}
	writeJSON(w, http.StatusOK, out)
	return nil
}

func parseCategory(raw string, v validation) db.DocCategory {
	if raw == "" {
		return db.DocCategoryOther
	}
	c := db.DocCategory(raw)
	if !c.Valid() {
		v.add("category", "Неизвестная категория.")
	}
	return c
}

func parseOptionalUUID(raw, field string, v validation) *uuid.UUID {
	raw = strings.TrimSpace(raw)
	if raw == "" || raw == "null" {
		return nil
	}
	id, err := uuid.Parse(raw)
	if err != nil {
		v.add(field, "Некорректный идентификатор.")
		return nil
	}
	return &id
}

func validURL(raw string) bool {
	u, err := url.Parse(raw)
	return err == nil && (u.Scheme == "https" || u.Scheme == "http") && u.Host != ""
}

func docFK(err error) error {
	if isFKViolation(err) {
		return errBadRequest("Задача не найдена в этом проекте.", map[string]string{"issueId": "Выберите задачу этого проекта."})
	}
	return err
}

func (s *Server) uploadDoc(w http.ResponseWriter, r *http.Request) error {
	if err := requireRole(r, db.ProjectRoleMember); err != nil {
		return err
	}
	r.Body = http.MaxBytesReader(w, r.Body, maxDocSize+1<<20)
	if err := r.ParseMultipartForm(8 << 20); err != nil {
		return errBadRequest("Не удалось прочитать файл. Максимальный размер — 20 МБ.", map[string]string{"file": "Файл до 20 МБ."})
	}
	defer r.MultipartForm.RemoveAll()
	file, header, err := r.FormFile("file")
	if err != nil {
		return errBadRequest("Прикрепите файл.", map[string]string{"file": "Прикрепите файл."})
	}
	defer file.Close()

	v := validation{}
	name := cleanFileName(header.Filename, "document")
	if !docExtensions[extOf(name)] {
		v.add("file", "Такой тип файла не поддерживается.")
	}
	if header.Size <= 0 || header.Size > maxDocSize {
		v.add("file", "Файл должен быть от 1 байта до 20 МБ.")
	}
	category := parseCategory(r.FormValue("category"), v)
	description := strings.TrimSpace(r.FormValue("description"))
	if len([]rune(description)) > 500 {
		v.add("description", "Не больше 500 символов.")
	}
	issueID := parseOptionalUUID(r.FormValue("issueId"), "issueId", v)
	if err := v.err(); err != nil {
		return err
	}

	head := make([]byte, 512)
	n, _ := io.ReadFull(file, head)
	if _, err := file.Seek(0, io.SeekStart); err != nil {
		return err
	}
	ct := docContentType(name, head[:n])

	ctx := r.Context()
	pid, uid := project(r).ID, userID(r)
	docID := uuid.New()
	key := fmt.Sprintf("projects/%s/docs/%s", pid, docID)
	if err := s.store.Put(ctx, key, file, header.Size, ct); err != nil {
		return err
	}
	size := header.Size
	d, err := s.q.CreateFileDocument(ctx, db.CreateFileDocumentParams{
		ID: docID, ProjectID: pid, Name: name, Category: category, Description: description,
		StorageKey: &key, ContentType: &ct, SizeBytes: &size, IssueID: issueID, UploadedBy: &uid,
	})
	if err != nil {
		s.deleteObjects(key)
		return docFK(err)
	}
	writeJSON(w, http.StatusCreated, toDoc(d))
	return nil
}

type docInput struct {
	Name        *string `json:"name"`
	URL         *string `json:"url"`
	Category    *string `json:"category"`
	Description *string `json:"description"`
	IssueID     *string `json:"issueId"`
}

func (s *Server) createLinkDoc(w http.ResponseWriter, r *http.Request) error {
	if err := requireRole(r, db.ProjectRoleMember); err != nil {
		return err
	}
	var in docInput
	if err := decodeJSON(w, r, &in); err != nil {
		return err
	}
	v := validation{}
	name, link := strings.TrimSpace(deref(in.Name)), strings.TrimSpace(deref(in.URL))
	if name == "" || len([]rune(name)) > 200 {
		v.add("name", "Введите название (до 200 символов).")
	}
	if !validURL(link) {
		v.add("url", "Ссылка должна начинаться с https:// или http://")
	}
	description := strings.TrimSpace(deref(in.Description))
	if len([]rune(description)) > 500 {
		v.add("description", "Не больше 500 символов.")
	}
	category := parseCategory(deref(in.Category), v)
	issueID := parseOptionalUUID(deref(in.IssueID), "issueId", v)
	if err := v.err(); err != nil {
		return err
	}
	uid := userID(r)
	d, err := s.q.CreateLinkDocument(r.Context(), db.CreateLinkDocumentParams{
		ProjectID: project(r).ID, Name: name, Category: category, Description: description, Url: &link, IssueID: issueID, UploadedBy: &uid,
	})
	if err != nil {
		return docFK(err)
	}
	writeJSON(w, http.StatusCreated, toDoc(d))
	return nil
}

func (s *Server) updateDoc(w http.ResponseWriter, r *http.Request) error {
	if err := requireRole(r, db.ProjectRoleMember); err != nil {
		return err
	}
	id, err := urlUUID(r, "docID", "Документ")
	if err != nil {
		return err
	}
	var in docInput
	if err := decodeJSON(w, r, &in); err != nil {
		return err
	}
	ctx := r.Context()
	cur, err := s.q.GetDocument(ctx, db.GetDocumentParams{ID: id, ProjectID: project(r).ID})
	if err != nil {
		return err
	}
	p := db.UpdateDocumentParams{ID: id, ProjectID: cur.ProjectID, Name: cur.Name, Category: cur.Category, Description: cur.Description, Url: cur.Url, IssueID: cur.IssueID}
	v := validation{}
	if in.Name != nil {
		if p.Name = strings.TrimSpace(*in.Name); p.Name == "" || len([]rune(p.Name)) > 200 {
			v.add("name", "Введите название (до 200 символов).")
		}
	}
	if in.Category != nil {
		p.Category = parseCategory(*in.Category, v)
	}
	if in.Description != nil {
		if p.Description = strings.TrimSpace(*in.Description); len([]rune(p.Description)) > 500 {
			v.add("description", "Не больше 500 символов.")
		}
	}
	if in.IssueID != nil {
		p.IssueID = parseOptionalUUID(*in.IssueID, "issueId", v)
	}
	if in.URL != nil && cur.Kind == db.DocKindLink {
		link := strings.TrimSpace(*in.URL)
		if !validURL(link) {
			v.add("url", "Ссылка должна начинаться с https:// или http://")
		}
		p.Url = &link
	}
	if err := v.err(); err != nil {
		return err
	}
	d, err := s.q.UpdateDocument(ctx, p)
	if err != nil {
		return docFK(err)
	}
	writeJSON(w, http.StatusOK, toDoc(d))
	return nil
}

func (s *Server) deleteDoc(w http.ResponseWriter, r *http.Request) error {
	if err := requireRole(r, db.ProjectRoleMember); err != nil {
		return err
	}
	id, err := urlUUID(r, "docID", "Документ")
	if err != nil {
		return err
	}
	ctx := r.Context()
	d, err := s.q.GetDocument(ctx, db.GetDocumentParams{ID: id, ProjectID: project(r).ID})
	if err != nil {
		return err
	}
	if err := s.q.DeleteDocument(ctx, db.DeleteDocumentParams{ID: id, ProjectID: d.ProjectID}); err != nil {
		return err
	}
	if d.StorageKey != nil {
		s.deleteObjects(*d.StorageKey)
	}
	w.WriteHeader(http.StatusNoContent)
	return nil
}

func (s *Server) docContent(w http.ResponseWriter, r *http.Request) error {
	id, err := urlUUID(r, "docID", "Документ")
	if err != nil {
		return err
	}
	d, err := s.q.GetDocument(r.Context(), db.GetDocumentParams{ID: id, ProjectID: project(r).ID})
	if err != nil {
		return err
	}
	if d.Kind == db.DocKindLink || d.StorageKey == nil {
		http.Redirect(w, r, deref(d.Url), http.StatusFound)
		return nil
	}
	return s.serveObject(w, r, *d.StorageKey, d.Name, deref(d.ContentType), true)
}
