package httpapi

import (
	"context"
	"errors"
	"net/http"
	"regexp"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5"

	"issuetracker/internal/database/db"
)

var projectKeyRe = regexp.MustCompile(`^[A-Z][A-Z0-9]{1,9}$`)

func (s *Server) listProjects(w http.ResponseWriter, r *http.Request) error {
	rows, err := s.q.ListProjectsForUser(r.Context(), userID(r))
	if err != nil {
		return err
	}
	out := make([]projectDTO, 0, len(rows))
	for _, p := range rows {
		out = append(out, projectDTO{ID: p.ID, Key: p.Key, Name: p.Name, Description: p.Description, Role: string(p.Role), MembersCount: p.MembersCount, OpenIssues: p.OpenIssues, CreatedAt: p.CreatedAt})
	}
	writeJSON(w, http.StatusOK, out)
	return nil
}

type projectInput struct {
	Key         string  `json:"key"`
	Name        *string `json:"name"`
	Description *string `json:"description"`
}

func (s *Server) createProject(w http.ResponseWriter, r *http.Request) error {
	var in projectInput
	if err := decodeJSON(w, r, &in); err != nil {
		return err
	}
	key := strings.ToUpper(strings.TrimSpace(in.Key))
	name, desc := strings.TrimSpace(deref(in.Name)), strings.TrimSpace(deref(in.Description))
	v := validation{}
	if !projectKeyRe.MatchString(key) {
		v.add("key", "Ключ — от 2 до 10 латинских букв и цифр, начинается с буквы. Например: IT, WEB, API2.")
	}
	if name == "" || len([]rune(name)) > 80 {
		v.add("name", "Введите название проекта (до 80 символов).")
	}
	if len([]rune(desc)) > 500 {
		v.add("description", "Не больше 500 символов.")
	}
	if err := v.err(); err != nil {
		return err
	}

	uid := userID(r)
	var p db.Project
	err := s.inTx(r.Context(), func(q *db.Queries) error {
		var err error
		p, err = q.CreateProject(r.Context(), db.CreateProjectParams{Key: key, Name: name, Description: desc, OwnerID: uid})
		if err != nil {
			return err
		}
		return q.AddProjectMember(r.Context(), db.AddProjectMemberParams{ProjectID: p.ID, UserID: uid, Role: db.ProjectRoleOwner})
	})
	if isUniqueViolation(err) {
		return errConflict("KEY_TAKEN", "Проект с таким ключом уже существует.", map[string]string{"key": "Ключ уже занят — выберите другой."})
	}
	if err != nil {
		return err
	}
	writeJSON(w, http.StatusCreated, projectDTO{ID: p.ID, Key: p.Key, Name: p.Name, Description: p.Description, Role: string(db.ProjectRoleOwner), MembersCount: 1, CreatedAt: p.CreatedAt})
	return nil
}

func (s *Server) getProject(w http.ResponseWriter, r *http.Request) error {
	p := project(r)
	writeJSON(w, http.StatusOK, projectDTO{ID: p.ID, Key: p.Key, Name: p.Name, Description: p.Description, Role: string(p.Role), CreatedAt: p.CreatedAt})
	return nil
}

func (s *Server) updateProject(w http.ResponseWriter, r *http.Request) error {
	if err := requireRole(r, db.ProjectRoleAdmin); err != nil {
		return err
	}
	var in projectInput
	if err := decodeJSON(w, r, &in); err != nil {
		return err
	}
	cur := project(r)
	name, desc := cur.Name, cur.Description
	if in.Name != nil {
		name = strings.TrimSpace(*in.Name)
	}
	if in.Description != nil {
		desc = strings.TrimSpace(*in.Description)
	}
	if name == "" || len([]rune(name)) > 80 {
		return errBadRequest("Проверьте заполнение полей.", map[string]string{"name": "Введите название проекта (до 80 символов)."})
	}
	p, err := s.q.UpdateProject(r.Context(), db.UpdateProjectParams{ID: cur.ID, Name: name, Description: desc})
	if err != nil {
		return err
	}
	writeJSON(w, http.StatusOK, projectDTO{ID: p.ID, Key: p.Key, Name: p.Name, Description: p.Description, Role: string(cur.Role), CreatedAt: p.CreatedAt})
	return nil
}

func (s *Server) deleteProject(w http.ResponseWriter, r *http.Request) error {
	if err := requireRole(r, db.ProjectRoleOwner); err != nil {
		return err
	}
	ctx := r.Context()
	keys, err := s.q.ListStorageKeysByProject(ctx, project(r).ID)
	if err != nil {
		return err
	}
	if err := s.q.DeleteProject(ctx, project(r).ID); err != nil {
		return err
	}
	s.deleteObjects(keys...)
	w.WriteHeader(http.StatusNoContent)
	return nil
}

func (s *Server) listMembers(w http.ResponseWriter, r *http.Request) error {
	ctx := r.Context()
	pid := project(r).ID
	rows, err := s.q.ListProjectMembers(ctx, pid)
	if err != nil {
		return err
	}
	members := make([]memberDTO, 0, len(rows))
	for _, m := range rows {
		members = append(members, memberDTO{ID: m.ID, Name: m.Name, Email: m.Email, AvatarURL: m.AvatarUrl, JobTitle: m.JobTitle, Role: string(m.Role), JoinedAt: m.JoinedAt})
	}
	invites := []inviteDTO{}
	if roleRank[project(r).Role] >= roleRank[db.ProjectRoleAdmin] {
		rows, err := s.q.ListInvites(ctx, pid)
		if err != nil {
			return err
		}
		for _, i := range rows {
			invites = append(invites, toInvite(i))
		}
	}
	writeJSON(w, http.StatusOK, map[string]any{"members": members, "invites": invites})
	return nil
}

func assignableRole(r *http.Request, role db.ProjectRole) error {
	if !role.Valid() || role == db.ProjectRoleOwner {
		return errBadRequest("Недопустимая роль.", map[string]string{"role": "Выберите роль: администратор, участник или наблюдатель."})
	}
	if role == db.ProjectRoleAdmin && project(r).Role != db.ProjectRoleOwner {
		return errForbidden("Назначать администраторов может только владелец проекта.")
	}
	return nil
}

func (s *Server) addMember(w http.ResponseWriter, r *http.Request) error {
	if err := requireRole(r, db.ProjectRoleAdmin); err != nil {
		return err
	}
	var in struct {
		Email string         `json:"email"`
		Role  db.ProjectRole `json:"role"`
	}
	if err := decodeJSON(w, r, &in); err != nil {
		return err
	}
	if in.Role == "" {
		in.Role = db.ProjectRoleMember
	}
	email, ok := normalizeEmail(in.Email)
	if !ok {
		return errBadRequest("Проверьте email.", map[string]string{"email": "Введите email в формате name@example.com."})
	}
	if err := assignableRole(r, in.Role); err != nil {
		return err
	}
	ctx := r.Context()
	pid := project(r).ID
	uid := userID(r)

	u, err := s.q.GetUserByEmail(ctx, email)
	if errors.Is(err, pgx.ErrNoRows) {
		inv, err := s.q.UpsertInvite(ctx, db.UpsertInviteParams{ProjectID: pid, Email: email, Role: in.Role, InvitedBy: &uid})
		if err != nil {
			return err
		}
		writeJSON(w, http.StatusCreated, map[string]any{"status": "invited", "invite": toInvite(inv)})
		return nil
	}
	if err != nil {
		return err
	}
	if _, err := s.q.GetProjectMember(ctx, db.GetProjectMemberParams{ProjectID: pid, UserID: u.ID}); err == nil {
		return errConflict("ALREADY_MEMBER", "Этот человек уже участник проекта.", map[string]string{"email": "Уже в проекте."})
	}
	if err := s.q.AddProjectMember(ctx, db.AddProjectMemberParams{ProjectID: pid, UserID: u.ID, Role: in.Role}); err != nil {
		return err
	}
	m, err := s.q.GetProjectMember(ctx, db.GetProjectMemberParams{ProjectID: pid, UserID: u.ID})
	if err != nil {
		return err
	}
	writeJSON(w, http.StatusCreated, map[string]any{"status": "added", "member": memberDTO{
		ID: u.ID, Name: u.Name, Email: u.Email, AvatarURL: u.AvatarUrl, JobTitle: u.JobTitle, Role: string(m.Role), JoinedAt: m.JoinedAt,
	}})
	return nil
}

func (s *Server) updateMember(w http.ResponseWriter, r *http.Request) error {
	if err := requireRole(r, db.ProjectRoleAdmin); err != nil {
		return err
	}
	target, err := urlUUID(r, "userID", "Участник")
	if err != nil {
		return err
	}
	var in struct {
		Role db.ProjectRole `json:"role"`
	}
	if err := decodeJSON(w, r, &in); err != nil {
		return err
	}
	if err := assignableRole(r, in.Role); err != nil {
		return err
	}
	ctx := r.Context()
	pid := project(r).ID
	m, err := s.q.GetProjectMember(ctx, db.GetProjectMemberParams{ProjectID: pid, UserID: target})
	if err != nil {
		return err
	}
	if m.Role == db.ProjectRoleOwner {
		return errForbidden("Роль владельца проекта изменить нельзя.")
	}
	if m.Role == db.ProjectRoleAdmin && project(r).Role != db.ProjectRoleOwner {
		return errForbidden("Менять роль администратора может только владелец проекта.")
	}
	if err := s.q.UpdateMemberRole(ctx, db.UpdateMemberRoleParams{ProjectID: pid, UserID: target, Role: in.Role}); err != nil {
		return err
	}
	w.WriteHeader(http.StatusNoContent)
	return nil
}

func (s *Server) removeMember(w http.ResponseWriter, r *http.Request) error {
	ctx := r.Context()
	pid := project(r).ID
	uid := userID(r)
	target := uid
	if raw := chi.URLParam(r, "userID"); raw != "me" {
		var err error
		if target, err = urlUUID(r, "userID", "Участник"); err != nil {
			return err
		}
	}
	if target != uid {
		if err := requireRole(r, db.ProjectRoleAdmin); err != nil {
			return err
		}
		m, err := s.q.GetProjectMember(ctx, db.GetProjectMemberParams{ProjectID: pid, UserID: target})
		if err != nil {
			return err
		}
		if m.Role == db.ProjectRoleAdmin && project(r).Role != db.ProjectRoleOwner {
			return errForbidden("Исключить администратора может только владелец проекта.")
		}
	}
	n, err := s.q.RemoveProjectMember(ctx, db.RemoveProjectMemberParams{ProjectID: pid, UserID: target})
	if err != nil {
		return err
	}
	if n == 0 {
		return errForbidden("Владельца нельзя исключить из проекта.")
	}
	w.WriteHeader(http.StatusNoContent)
	return nil
}

func (s *Server) deleteInvite(w http.ResponseWriter, r *http.Request) error {
	if err := requireRole(r, db.ProjectRoleAdmin); err != nil {
		return err
	}
	id, err := urlUUID(r, "inviteID", "Приглашение")
	if err != nil {
		return err
	}
	if _, err := s.q.DeleteInvite(r.Context(), db.DeleteInviteParams{ID: id, ProjectID: project(r).ID}); err != nil {
		return err
	}
	w.WriteHeader(http.StatusNoContent)
	return nil
}

func (s *Server) inTx(ctx context.Context, fn func(q *db.Queries) error) error {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	if err := fn(s.q.WithTx(tx)); err != nil {
		return err
	}
	return tx.Commit(ctx)
}

func (s *Server) deleteObjects(keys ...string) {
	if len(keys) == 0 {
		return
	}
	go func() {
		for _, k := range keys {
			if err := s.store.Delete(context.Background(), k); err != nil {
				s.log.Warn("не удалось удалить файл из хранилища", "key", k, "error", err)
			}
		}
	}()
}

func deref(p *string) string {
	if p == nil {
		return ""
	}
	return *p
}
