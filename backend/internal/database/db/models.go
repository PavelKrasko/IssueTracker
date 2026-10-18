package db

import (
	"database/sql/driver"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
)

type DocCategory string

const (
	DocCategoryRequirements DocCategory = "requirements"
	DocCategoryArchitecture DocCategory = "architecture"
	DocCategoryApi          DocCategory = "api"
	DocCategoryDesign       DocCategory = "design"
	DocCategoryGuides       DocCategory = "guides"
	DocCategoryOther        DocCategory = "other"
)

func (e *DocCategory) Scan(src interface{}) error {
	switch s := src.(type) {
	case []byte:
		*e = DocCategory(s)
	case string:
		*e = DocCategory(s)
	default:
		return fmt.Errorf("unsupported scan type for DocCategory: %T", src)
	}
	return nil
}

type NullDocCategory struct {
	DocCategory DocCategory
	Valid       bool
}

func (ns *NullDocCategory) Scan(value interface{}) error {
	if value == nil {
		ns.DocCategory, ns.Valid = "", false
		return nil
	}
	ns.Valid = true
	return ns.DocCategory.Scan(value)
}

func (ns NullDocCategory) Value() (driver.Value, error) {
	if !ns.Valid {
		return nil, nil
	}
	return string(ns.DocCategory), nil
}

func (e DocCategory) Valid() bool {
	switch e {
	case DocCategoryRequirements,
		DocCategoryArchitecture,
		DocCategoryApi,
		DocCategoryDesign,
		DocCategoryGuides,
		DocCategoryOther:
		return true
	}
	return false
}

func AllDocCategoryValues() []DocCategory {
	return []DocCategory{
		DocCategoryRequirements,
		DocCategoryArchitecture,
		DocCategoryApi,
		DocCategoryDesign,
		DocCategoryGuides,
		DocCategoryOther,
	}
}

type DocKind string

const (
	DocKindFile DocKind = "file"
	DocKindLink DocKind = "link"
)

func (e *DocKind) Scan(src interface{}) error {
	switch s := src.(type) {
	case []byte:
		*e = DocKind(s)
	case string:
		*e = DocKind(s)
	default:
		return fmt.Errorf("unsupported scan type for DocKind: %T", src)
	}
	return nil
}

type NullDocKind struct {
	DocKind DocKind
	Valid   bool
}

func (ns *NullDocKind) Scan(value interface{}) error {
	if value == nil {
		ns.DocKind, ns.Valid = "", false
		return nil
	}
	ns.Valid = true
	return ns.DocKind.Scan(value)
}

func (ns NullDocKind) Value() (driver.Value, error) {
	if !ns.Valid {
		return nil, nil
	}
	return string(ns.DocKind), nil
}

func (e DocKind) Valid() bool {
	switch e {
	case DocKindFile,
		DocKindLink:
		return true
	}
	return false
}

func AllDocKindValues() []DocKind {
	return []DocKind{
		DocKindFile,
		DocKindLink,
	}
}

type IssuePriority string

const (
	IssuePriorityHighest IssuePriority = "highest"
	IssuePriorityHigh    IssuePriority = "high"
	IssuePriorityMedium  IssuePriority = "medium"
	IssuePriorityLow     IssuePriority = "low"
)

func (e *IssuePriority) Scan(src interface{}) error {
	switch s := src.(type) {
	case []byte:
		*e = IssuePriority(s)
	case string:
		*e = IssuePriority(s)
	default:
		return fmt.Errorf("unsupported scan type for IssuePriority: %T", src)
	}
	return nil
}

type NullIssuePriority struct {
	IssuePriority IssuePriority
	Valid         bool
}

func (ns *NullIssuePriority) Scan(value interface{}) error {
	if value == nil {
		ns.IssuePriority, ns.Valid = "", false
		return nil
	}
	ns.Valid = true
	return ns.IssuePriority.Scan(value)
}

func (ns NullIssuePriority) Value() (driver.Value, error) {
	if !ns.Valid {
		return nil, nil
	}
	return string(ns.IssuePriority), nil
}

func (e IssuePriority) Valid() bool {
	switch e {
	case IssuePriorityHighest,
		IssuePriorityHigh,
		IssuePriorityMedium,
		IssuePriorityLow:
		return true
	}
	return false
}

func AllIssuePriorityValues() []IssuePriority {
	return []IssuePriority{
		IssuePriorityHighest,
		IssuePriorityHigh,
		IssuePriorityMedium,
		IssuePriorityLow,
	}
}

type IssueStatus string

const (
	IssueStatusTodo       IssueStatus = "todo"
	IssueStatusInProgress IssueStatus = "in_progress"
	IssueStatusReview     IssueStatus = "review"
	IssueStatusDone       IssueStatus = "done"
)

func (e *IssueStatus) Scan(src interface{}) error {
	switch s := src.(type) {
	case []byte:
		*e = IssueStatus(s)
	case string:
		*e = IssueStatus(s)
	default:
		return fmt.Errorf("unsupported scan type for IssueStatus: %T", src)
	}
	return nil
}

type NullIssueStatus struct {
	IssueStatus IssueStatus
	Valid       bool
}

func (ns *NullIssueStatus) Scan(value interface{}) error {
	if value == nil {
		ns.IssueStatus, ns.Valid = "", false
		return nil
	}
	ns.Valid = true
	return ns.IssueStatus.Scan(value)
}

func (ns NullIssueStatus) Value() (driver.Value, error) {
	if !ns.Valid {
		return nil, nil
	}
	return string(ns.IssueStatus), nil
}

func (e IssueStatus) Valid() bool {
	switch e {
	case IssueStatusTodo,
		IssueStatusInProgress,
		IssueStatusReview,
		IssueStatusDone:
		return true
	}
	return false
}

func AllIssueStatusValues() []IssueStatus {
	return []IssueStatus{
		IssueStatusTodo,
		IssueStatusInProgress,
		IssueStatusReview,
		IssueStatusDone,
	}
}

type IssueType string

const (
	IssueTypeTask  IssueType = "task"
	IssueTypeBug   IssueType = "bug"
	IssueTypeStory IssueType = "story"
)

func (e *IssueType) Scan(src interface{}) error {
	switch s := src.(type) {
	case []byte:
		*e = IssueType(s)
	case string:
		*e = IssueType(s)
	default:
		return fmt.Errorf("unsupported scan type for IssueType: %T", src)
	}
	return nil
}

type NullIssueType struct {
	IssueType IssueType
	Valid     bool
}

func (ns *NullIssueType) Scan(value interface{}) error {
	if value == nil {
		ns.IssueType, ns.Valid = "", false
		return nil
	}
	ns.Valid = true
	return ns.IssueType.Scan(value)
}

func (ns NullIssueType) Value() (driver.Value, error) {
	if !ns.Valid {
		return nil, nil
	}
	return string(ns.IssueType), nil
}

func (e IssueType) Valid() bool {
	switch e {
	case IssueTypeTask,
		IssueTypeBug,
		IssueTypeStory:
		return true
	}
	return false
}

func AllIssueTypeValues() []IssueType {
	return []IssueType{
		IssueTypeTask,
		IssueTypeBug,
		IssueTypeStory,
	}
}

type OauthProvider string

const (
	OauthProviderGoogle OauthProvider = "google"
	OauthProviderGithub OauthProvider = "github"
)

func (e *OauthProvider) Scan(src interface{}) error {
	switch s := src.(type) {
	case []byte:
		*e = OauthProvider(s)
	case string:
		*e = OauthProvider(s)
	default:
		return fmt.Errorf("unsupported scan type for OauthProvider: %T", src)
	}
	return nil
}

type NullOauthProvider struct {
	OauthProvider OauthProvider
	Valid         bool
}

func (ns *NullOauthProvider) Scan(value interface{}) error {
	if value == nil {
		ns.OauthProvider, ns.Valid = "", false
		return nil
	}
	ns.Valid = true
	return ns.OauthProvider.Scan(value)
}

func (ns NullOauthProvider) Value() (driver.Value, error) {
	if !ns.Valid {
		return nil, nil
	}
	return string(ns.OauthProvider), nil
}

func (e OauthProvider) Valid() bool {
	switch e {
	case OauthProviderGoogle,
		OauthProviderGithub:
		return true
	}
	return false
}

func AllOauthProviderValues() []OauthProvider {
	return []OauthProvider{
		OauthProviderGoogle,
		OauthProviderGithub,
	}
}

type ProjectRole string

const (
	ProjectRoleOwner  ProjectRole = "owner"
	ProjectRoleAdmin  ProjectRole = "admin"
	ProjectRoleMember ProjectRole = "member"
	ProjectRoleViewer ProjectRole = "viewer"
)

func (e *ProjectRole) Scan(src interface{}) error {
	switch s := src.(type) {
	case []byte:
		*e = ProjectRole(s)
	case string:
		*e = ProjectRole(s)
	default:
		return fmt.Errorf("unsupported scan type for ProjectRole: %T", src)
	}
	return nil
}

type NullProjectRole struct {
	ProjectRole ProjectRole
	Valid       bool
}

func (ns *NullProjectRole) Scan(value interface{}) error {
	if value == nil {
		ns.ProjectRole, ns.Valid = "", false
		return nil
	}
	ns.Valid = true
	return ns.ProjectRole.Scan(value)
}

func (ns NullProjectRole) Value() (driver.Value, error) {
	if !ns.Valid {
		return nil, nil
	}
	return string(ns.ProjectRole), nil
}

func (e ProjectRole) Valid() bool {
	switch e {
	case ProjectRoleOwner,
		ProjectRoleAdmin,
		ProjectRoleMember,
		ProjectRoleViewer:
		return true
	}
	return false
}

func AllProjectRoleValues() []ProjectRole {
	return []ProjectRole{
		ProjectRoleOwner,
		ProjectRoleAdmin,
		ProjectRoleMember,
		ProjectRoleViewer,
	}
}

type SprintState string

const (
	SprintStatePlanned SprintState = "planned"
	SprintStateActive  SprintState = "active"
	SprintStateClosed  SprintState = "closed"
)

func (e *SprintState) Scan(src interface{}) error {
	switch s := src.(type) {
	case []byte:
		*e = SprintState(s)
	case string:
		*e = SprintState(s)
	default:
		return fmt.Errorf("unsupported scan type for SprintState: %T", src)
	}
	return nil
}

type NullSprintState struct {
	SprintState SprintState
	Valid       bool
}

func (ns *NullSprintState) Scan(value interface{}) error {
	if value == nil {
		ns.SprintState, ns.Valid = "", false
		return nil
	}
	ns.Valid = true
	return ns.SprintState.Scan(value)
}

func (ns NullSprintState) Value() (driver.Value, error) {
	if !ns.Valid {
		return nil, nil
	}
	return string(ns.SprintState), nil
}

func (e SprintState) Valid() bool {
	switch e {
	case SprintStatePlanned,
		SprintStateActive,
		SprintStateClosed:
		return true
	}
	return false
}

func AllSprintStateValues() []SprintState {
	return []SprintState{
		SprintStatePlanned,
		SprintStateActive,
		SprintStateClosed,
	}
}

type Document struct {
	ID          uuid.UUID
	ProjectID   uuid.UUID
	Kind        DocKind
	Name        string
	Category    DocCategory
	Description string
	Url         *string
	StorageKey  *string
	ContentType *string
	SizeBytes   *int64
	IssueID     *uuid.UUID
	UploadedBy  *uuid.UUID
	CreatedAt   time.Time
	UpdatedAt   time.Time
}

type Issue struct {
	ID              uuid.UUID
	ProjectID       uuid.UUID
	Number          int32
	Title           string
	Description     string
	Type            IssueType
	Status          IssueStatus
	Priority        IssuePriority
	AssigneeID      *uuid.UUID
	ReporterID      *uuid.UUID
	TeamID          *uuid.UUID
	StartDate       *time.Time
	DueDate         *time.Time
	Points          *int16
	CompletedAt     *time.Time
	CreatedAt       time.Time
	UpdatedAt       time.Time
	ParentID        *uuid.UUID
	SprintID        *uuid.UUID
	FixVersionID    *uuid.UUID
	EstimateMinutes *int32
}

type IssueAttachment struct {
	ID          uuid.UUID
	IssueID     uuid.UUID
	UploadedBy  *uuid.UUID
	FileName    string
	ContentType string
	SizeBytes   int64
	StorageKey  string
	CreatedAt   time.Time
}

type IssueComment struct {
	ID        uuid.UUID
	IssueID   uuid.UUID
	AuthorID  *uuid.UUID
	Body      string
	CreatedAt time.Time
	UpdatedAt time.Time
}

type IssueEvent struct {
	ID        int64
	IssueID   uuid.UUID
	ActorID   *uuid.UUID
	Kind      string
	Changes   json.RawMessage
	CreatedAt time.Time
}

type IssueWatcher struct {
	IssueID   uuid.UUID
	ProjectID uuid.UUID
	UserID    uuid.UUID
	CreatedAt time.Time
}

type Notification struct {
	ID        int64
	UserID    uuid.UUID
	ProjectID *uuid.UUID
	IssueID   *uuid.UUID
	ActorID   *uuid.UUID
	Kind      string
	Payload   json.RawMessage
	ReadAt    *time.Time
	CreatedAt time.Time
}

type OauthAccount struct {
	ID             uuid.UUID
	UserID         uuid.UUID
	Provider       OauthProvider
	ProviderUserID string
	Email          *string
	CreatedAt      time.Time
}

type Project struct {
	ID           uuid.UUID
	Key          string
	Name         string
	Description  string
	OwnerID      uuid.UUID
	IssueCounter int32
	CreatedAt    time.Time
	UpdatedAt    time.Time
}

type ProjectInvite struct {
	ID        uuid.UUID
	ProjectID uuid.UUID
	Email     string
	Role      ProjectRole
	InvitedBy *uuid.UUID
	CreatedAt time.Time
}

type ProjectMember struct {
	ProjectID uuid.UUID
	UserID    uuid.UUID
	Role      ProjectRole
	JoinedAt  time.Time
}

type Session struct {
	ID               uuid.UUID
	UserID           uuid.UUID
	RefreshTokenHash []byte
	UserAgent        string
	Ip               string
	CreatedAt        time.Time
	ExpiresAt        time.Time
	RevokedAt        *time.Time
}

type Sprint struct {
	ID        uuid.UUID
	ProjectID uuid.UUID
	Name      string
	Goal      string
	State     SprintState
	StartDate *time.Time
	EndDate   *time.Time
	ClosedAt  *time.Time
	CreatedAt time.Time
	UpdatedAt time.Time
}

type Team struct {
	ID          uuid.UUID
	ProjectID   uuid.UUID
	Name        string
	Description string
	CreatedAt   time.Time
	UpdatedAt   time.Time
}

type TeamMember struct {
	TeamID    uuid.UUID
	ProjectID uuid.UUID
	UserID    uuid.UUID
	RoleTitle string
	AddedAt   time.Time
}

type TelegramLink struct {
	UserID   uuid.UUID
	ChatID   int64
	Username *string
	Enabled  bool
	LinkedAt time.Time
}

type TelegramLinkCode struct {
	Code      string
	UserID    uuid.UUID
	ExpiresAt time.Time
}

type User struct {
	ID           uuid.UUID
	Email        string
	Name         string
	JobTitle     string
	About        string
	PasswordHash *string
	AvatarUrl    *string
	CreatedAt    time.Time
	UpdatedAt    time.Time
	AvatarKey    *string
}

type Version struct {
	ID          uuid.UUID
	ProjectID   uuid.UUID
	Name        string
	Description string
	ReleaseDate *time.Time
	ReleasedAt  *time.Time
	CreatedAt   time.Time
	UpdatedAt   time.Time
}

type Worklog struct {
	ID        uuid.UUID
	IssueID   uuid.UUID
	UserID    *uuid.UUID
	Minutes   int32
	WorkDate  time.Time
	Note      string
	CreatedAt time.Time
}
