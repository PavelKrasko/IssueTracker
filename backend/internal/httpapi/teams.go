package httpapi

import (
	"net/http"
	"strings"

	"github.com/google/uuid"

	"issuetracker/internal/database/db"
)

func (s *Server) loadTeams(r *http.Request) ([]teamDTO, error) {
	ctx := r.Context()
	pid := project(r).ID
	teams, err := s.q.ListTeams(ctx, pid)
	if err != nil {
		return nil, err
	}
	members, err := s.q.ListTeamMembersByProject(ctx, pid)
	if err != nil {
		return nil, err
	}
	byTeam := map[uuid.UUID][]teamMemberDTO{}
	for _, m := range members {
		byTeam[m.TeamID] = append(byTeam[m.TeamID], teamMemberDTO{ID: m.UserID, Name: m.Name, Email: m.Email, AvatarURL: m.AvatarUrl, Role: m.RoleTitle})
	}
	out := make([]teamDTO, 0, len(teams))
	for _, t := range teams {
		ms := byTeam[t.ID]
		if ms == nil {
			ms = []teamMemberDTO{}
		}
		out = append(out, teamDTO{ID: t.ID, Name: t.Name, Description: t.Description, CreatedAt: t.CreatedAt, Members: ms})
	}
	return out, nil
}

func (s *Server) teamResponse(w http.ResponseWriter, r *http.Request, status int, id uuid.UUID) error {
	teams, err := s.loadTeams(r)
	if err != nil {
		return err
	}
	for _, t := range teams {
		if t.ID == id {
			writeJSON(w, status, t)
			return nil
		}
	}
	return errNotFound("Команда не найдена.")
}

func (s *Server) listTeams(w http.ResponseWriter, r *http.Request) error {
	teams, err := s.loadTeams(r)
	if err != nil {
		return err
	}
	writeJSON(w, http.StatusOK, teams)
	return nil
}

type teamInput struct {
	Name        string `json:"name"`
	Description string `json:"description"`
}

func (in *teamInput) validate() error {
	in.Name, in.Description = strings.TrimSpace(in.Name), strings.TrimSpace(in.Description)
	v := validation{}
	if in.Name == "" || len([]rune(in.Name)) > 60 {
		v.add("name", "Введите название команды (до 60 символов).")
	}
	if len([]rune(in.Description)) > 300 {
		v.add("description", "Не больше 300 символов.")
	}
	return v.err()
}

var errTeamNameTaken = errConflict("TEAM_NAME_TAKEN", "Команда с таким названием уже есть.", map[string]string{"name": "Команда с таким названием уже есть."})

func (s *Server) createTeam(w http.ResponseWriter, r *http.Request) error {
	if err := requireRole(r, db.ProjectRoleAdmin); err != nil {
		return err
	}
	var in teamInput
	if err := decodeJSON(w, r, &in); err != nil {
		return err
	}
	if err := in.validate(); err != nil {
		return err
	}
	t, err := s.q.CreateTeam(r.Context(), db.CreateTeamParams{ProjectID: project(r).ID, Name: in.Name, Description: in.Description})
	if isUniqueViolation(err) {
		return errTeamNameTaken
	}
	if err != nil {
		return err
	}
	writeJSON(w, http.StatusCreated, teamDTO{ID: t.ID, Name: t.Name, Description: t.Description, CreatedAt: t.CreatedAt, Members: []teamMemberDTO{}})
	return nil
}

func (s *Server) updateTeam(w http.ResponseWriter, r *http.Request) error {
	if err := requireRole(r, db.ProjectRoleAdmin); err != nil {
		return err
	}
	id, err := urlUUID(r, "teamID", "Команда")
	if err != nil {
		return err
	}
	var in teamInput
	if err := decodeJSON(w, r, &in); err != nil {
		return err
	}
	if err := in.validate(); err != nil {
		return err
	}
	_, err = s.q.UpdateTeam(r.Context(), db.UpdateTeamParams{ID: id, ProjectID: project(r).ID, Name: in.Name, Description: in.Description})
	if isUniqueViolation(err) {
		return errTeamNameTaken
	}
	if err != nil {
		return err
	}
	return s.teamResponse(w, r, http.StatusOK, id)
}

func (s *Server) deleteTeam(w http.ResponseWriter, r *http.Request) error {
	if err := requireRole(r, db.ProjectRoleAdmin); err != nil {
		return err
	}
	id, err := urlUUID(r, "teamID", "Команда")
	if err != nil {
		return err
	}
	if _, err := s.q.DeleteTeam(r.Context(), db.DeleteTeamParams{ID: id, ProjectID: project(r).ID}); err != nil {
		return err
	}
	w.WriteHeader(http.StatusNoContent)
	return nil
}

func (s *Server) addTeamMember(w http.ResponseWriter, r *http.Request) error {
	if err := requireRole(r, db.ProjectRoleAdmin); err != nil {
		return err
	}
	id, err := urlUUID(r, "teamID", "Команда")
	if err != nil {
		return err
	}
	var in struct {
		UserID uuid.UUID `json:"userId"`
		Role   string    `json:"role"`
	}
	if err := decodeJSON(w, r, &in); err != nil {
		return err
	}
	in.Role = strings.TrimSpace(in.Role)
	if len([]rune(in.Role)) > 60 {
		return errBadRequest("Проверьте заполнение полей.", map[string]string{"role": "Не больше 60 символов."})
	}
	err = s.q.AddTeamMember(r.Context(), db.AddTeamMemberParams{TeamID: id, ProjectID: project(r).ID, UserID: in.UserID, RoleTitle: in.Role})
	if isUniqueViolation(err) {
		return errConflict("ALREADY_IN_TEAM", "Этот участник уже в команде.", map[string]string{"userId": "Уже в команде."})
	}
	if isFKViolation(err) {
		return errBadRequest("Добавить в команду можно только участника проекта.", map[string]string{"userId": "Сначала пригласите человека в проект."})
	}
	if err != nil {
		return err
	}
	return s.teamResponse(w, r, http.StatusOK, id)
}

func (s *Server) removeTeamMember(w http.ResponseWriter, r *http.Request) error {
	if err := requireRole(r, db.ProjectRoleAdmin); err != nil {
		return err
	}
	id, err := urlUUID(r, "teamID", "Команда")
	if err != nil {
		return err
	}
	uid, err := urlUUID(r, "userID", "Участник")
	if err != nil {
		return err
	}
	if _, err := s.q.RemoveTeamMember(r.Context(), db.RemoveTeamMemberParams{TeamID: id, ProjectID: project(r).ID, UserID: uid}); err != nil {
		return err
	}
	return s.teamResponse(w, r, http.StatusOK, id)
}
