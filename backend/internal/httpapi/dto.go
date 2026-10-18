package httpapi

import (
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"

	"issuetracker/internal/database/db"
)

const dateLayout = "2006-01-02"

func fmtDate(t *time.Time) *string {
	if t == nil {
		return nil
	}
	s := t.Format(dateLayout)
	return &s
}

type userDTO struct {
	ID          uuid.UUID       `json:"id"`
	Name        string          `json:"name"`
	Email       string          `json:"email"`
	JobTitle    string          `json:"jobTitle"`
	About       string          `json:"about"`
	AvatarURL   *string         `json:"avatarUrl"`
	HasPassword bool            `json:"hasPassword"`
	Connected   map[string]bool `json:"connected"`
	CreatedAt   time.Time       `json:"createdAt"`
}

func toUser(u db.User, accounts []db.OauthAccount) userDTO {
	connected := map[string]bool{"google": false, "github": false}
	for _, a := range accounts {
		connected[string(a.Provider)] = true
	}
	return userDTO{
		ID: u.ID, Name: u.Name, Email: u.Email, JobTitle: u.JobTitle, About: u.About, AvatarURL: u.AvatarUrl,
		HasPassword: u.PasswordHash != nil, Connected: connected, CreatedAt: u.CreatedAt,
	}
}

type projectDTO struct {
	ID           uuid.UUID `json:"id"`
	Key          string    `json:"key"`
	Name         string    `json:"name"`
	Description  string    `json:"description"`
	Role         string    `json:"role"`
	MembersCount int32     `json:"membersCount"`
	OpenIssues   int32     `json:"openIssues"`
	CreatedAt    time.Time `json:"createdAt"`
}

type memberDTO struct {
	ID        uuid.UUID `json:"id"`
	Name      string    `json:"name"`
	Email     string    `json:"email"`
	AvatarURL *string   `json:"avatarUrl"`
	JobTitle  string    `json:"jobTitle"`
	Role      string    `json:"role"`
	JoinedAt  time.Time `json:"joinedAt"`
}

type inviteDTO struct {
	ID        uuid.UUID `json:"id"`
	Email     string    `json:"email"`
	Role      string    `json:"role"`
	CreatedAt time.Time `json:"createdAt"`
}

func toInvite(i db.ProjectInvite) inviteDTO {
	return inviteDTO{ID: i.ID, Email: i.Email, Role: string(i.Role), CreatedAt: i.CreatedAt}
}

type teamMemberDTO struct {
	ID        uuid.UUID `json:"id"`
	Name      string    `json:"name"`
	Email     string    `json:"email"`
	AvatarURL *string   `json:"avatarUrl"`
	Role      string    `json:"role"`
}

type teamDTO struct {
	ID          uuid.UUID       `json:"id"`
	Name        string          `json:"name"`
	Description string          `json:"description"`
	CreatedAt   time.Time       `json:"createdAt"`
	Members     []teamMemberDTO `json:"members"`
}

type attachmentDTO struct {
	ID        uuid.UUID `json:"id"`
	Name      string    `json:"name"`
	Size      int64     `json:"size"`
	Type      string    `json:"type"`
	URL       string    `json:"url"`
	CreatedAt time.Time `json:"createdAt"`
}

func toAttachment(projectID uuid.UUID, a db.IssueAttachment) attachmentDTO {
	return attachmentDTO{
		ID: a.ID, Name: a.FileName, Size: a.SizeBytes, Type: a.ContentType, CreatedAt: a.CreatedAt,
		URL: fmt.Sprintf("/api/projects/%s/attachments/%s/content", projectID, a.ID),
	}
}

type issueDTO struct {
	ID          uuid.UUID       `json:"id"`
	Key         string          `json:"key"`
	Number      int32           `json:"number"`
	Title       string          `json:"title"`
	Description string          `json:"description"`
	Type        string          `json:"type"`
	Status      string          `json:"status"`
	Priority    string          `json:"priority"`
	AssigneeID  *uuid.UUID      `json:"assigneeId"`
	ReporterID  *uuid.UUID      `json:"reporterId"`
	TeamID      *uuid.UUID      `json:"teamId"`
	StartDate   *string         `json:"startDate"`
	DueDate     *string         `json:"dueDate"`
	Points      *int16          `json:"points"`
	CompletedAt *time.Time      `json:"completedAt"`
	CreatedAt   time.Time       `json:"createdAt"`
	UpdatedAt   time.Time       `json:"updatedAt"`
	Attachments []attachmentDTO `json:"attachments"`

	ParentID        *uuid.UUID  `json:"parentId"`
	SprintID        *uuid.UUID  `json:"sprintId"`
	FixVersionID    *uuid.UUID  `json:"fixVersionId"`
	EstimateMinutes *int32      `json:"estimateMinutes"`
	SpentMinutes    int32       `json:"spentMinutes"`
	Watchers        []uuid.UUID `json:"watchers"`
	CommentsCount   int32       `json:"commentsCount"`
}

type issueExtras struct {
	Attachments []db.IssueAttachment
	Watchers    []uuid.UUID
	Spent       int32
	Comments    int32
}

func toIssue(projectKey string, i db.Issue, x issueExtras) issueDTO {
	out := issueDTO{
		ID: i.ID, Key: fmt.Sprintf("%s-%d", projectKey, i.Number), Number: i.Number,
		Title: i.Title, Description: i.Description,
		Type: string(i.Type), Status: string(i.Status), Priority: string(i.Priority),
		AssigneeID: i.AssigneeID, ReporterID: i.ReporterID, TeamID: i.TeamID,
		StartDate: fmtDate(i.StartDate), DueDate: fmtDate(i.DueDate), Points: i.Points,
		CompletedAt: i.CompletedAt, CreatedAt: i.CreatedAt, UpdatedAt: i.UpdatedAt,
		Attachments: []attachmentDTO{},
		ParentID:    i.ParentID, SprintID: i.SprintID, FixVersionID: i.FixVersionID, EstimateMinutes: i.EstimateMinutes,
		SpentMinutes: x.Spent, Watchers: x.Watchers, CommentsCount: x.Comments,
	}
	if out.Watchers == nil {
		out.Watchers = []uuid.UUID{}
	}
	for _, a := range x.Attachments {
		out.Attachments = append(out.Attachments, toAttachment(i.ProjectID, a))
	}
	return out
}

type eventDTO struct {
	ID        int64           `json:"id"`
	Kind      string          `json:"kind"`
	Changes   json.RawMessage `json:"changes"`
	ActorID   *uuid.UUID      `json:"actorId"`
	ActorName *string         `json:"actorName"`
	CreatedAt time.Time       `json:"createdAt"`
}

type docDTO struct {
	ID          uuid.UUID  `json:"id"`
	Kind        string     `json:"kind"`
	Name        string     `json:"name"`
	Size        *int64     `json:"size"`
	Type        *string    `json:"type"`
	URL         string     `json:"url"`
	Category    string     `json:"category"`
	Description string     `json:"description"`
	IssueID     *uuid.UUID `json:"issueId"`
	UploadedBy  *uuid.UUID `json:"uploadedBy"`
	CreatedAt   time.Time  `json:"createdAt"`
	UpdatedAt   time.Time  `json:"updatedAt"`
}

func toDoc(d db.Document) docDTO {
	out := docDTO{
		ID: d.ID, Kind: string(d.Kind), Name: d.Name, Size: d.SizeBytes, Type: d.ContentType,
		Category: string(d.Category), Description: d.Description, IssueID: d.IssueID,
		UploadedBy: d.UploadedBy, CreatedAt: d.CreatedAt, UpdatedAt: d.UpdatedAt,
	}
	if d.Kind == db.DocKindLink && d.Url != nil {
		out.URL = *d.Url
	} else {
		out.URL = fmt.Sprintf("/api/projects/%s/docs/%s/content", d.ProjectID, d.ID)
	}
	return out
}
