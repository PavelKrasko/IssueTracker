CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TYPE project_role   AS ENUM ('owner', 'admin', 'member', 'viewer');
CREATE TYPE issue_type     AS ENUM ('task', 'bug', 'story');
CREATE TYPE issue_status   AS ENUM ('todo', 'in_progress', 'review', 'done');
CREATE TYPE issue_priority AS ENUM ('highest', 'high', 'medium', 'low');
CREATE TYPE doc_kind       AS ENUM ('file', 'link');
CREATE TYPE doc_category   AS ENUM ('requirements', 'architecture', 'api', 'design', 'guides', 'other');
CREATE TYPE oauth_provider AS ENUM ('google', 'github');

CREATE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email         citext      NOT NULL UNIQUE,
  name          text        NOT NULL CHECK (char_length(name) BETWEEN 1 AND 100),
  job_title     text        NOT NULL DEFAULT '' CHECK (char_length(job_title) <= 80),
  about         text        NOT NULL DEFAULT '' CHECK (char_length(about) <= 500),
  password_hash text,
  avatar_url    text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE oauth_accounts (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid           NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  provider         oauth_provider NOT NULL,
  provider_user_id text           NOT NULL,
  email            citext,
  created_at       timestamptz    NOT NULL DEFAULT now(),
  UNIQUE (provider, provider_user_id),
  UNIQUE (user_id, provider)
);

CREATE TABLE sessions (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            uuid        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  refresh_token_hash bytea       NOT NULL UNIQUE,
  user_agent         text        NOT NULL DEFAULT '',
  ip                 text        NOT NULL DEFAULT '',
  created_at         timestamptz NOT NULL DEFAULT now(),
  expires_at         timestamptz NOT NULL,
  revoked_at         timestamptz
);
CREATE INDEX sessions_user_idx ON sessions (user_id);

CREATE TABLE projects (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key           varchar(10) NOT NULL UNIQUE CHECK (key ~ '^[A-Z][A-Z0-9]{1,9}$'),
  name          text        NOT NULL CHECK (char_length(name) BETWEEN 1 AND 80),
  description   text        NOT NULL DEFAULT '' CHECK (char_length(description) <= 500),
  owner_id      uuid        NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
  issue_counter integer     NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE project_members (
  project_id uuid         NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
  user_id    uuid         NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  role       project_role NOT NULL DEFAULT 'member',
  joined_at  timestamptz  NOT NULL DEFAULT now(),
  PRIMARY KEY (project_id, user_id)
);
CREATE INDEX project_members_user_idx ON project_members (user_id);
CREATE UNIQUE INDEX project_one_owner ON project_members (project_id) WHERE role = 'owner';

CREATE TABLE project_invites (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid         NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
  email      citext       NOT NULL,
  role       project_role NOT NULL DEFAULT 'member' CHECK (role <> 'owner'),
  invited_by uuid         REFERENCES users (id) ON DELETE SET NULL,
  created_at timestamptz  NOT NULL DEFAULT now(),
  UNIQUE (project_id, email)
);
CREATE INDEX project_invites_email_idx ON project_invites (email);

CREATE TABLE teams (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  uuid        NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
  name        text        NOT NULL CHECK (char_length(name) BETWEEN 1 AND 60),
  description text        NOT NULL DEFAULT '' CHECK (char_length(description) <= 300),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, project_id)
);
CREATE UNIQUE INDEX teams_project_name_idx ON teams (project_id, lower(name));
CREATE TRIGGER teams_updated_at BEFORE UPDATE ON teams FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE team_members (
  team_id    uuid        NOT NULL,
  project_id uuid        NOT NULL,
  user_id    uuid        NOT NULL,
  role_title text        NOT NULL DEFAULT '' CHECK (char_length(role_title) <= 60),
  added_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (team_id, user_id),
  FOREIGN KEY (team_id, project_id)    REFERENCES teams (id, project_id)                  ON DELETE CASCADE,
  FOREIGN KEY (project_id, user_id)    REFERENCES project_members (project_id, user_id)   ON DELETE CASCADE
);

CREATE TABLE issues (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id   uuid           NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
  number       integer        NOT NULL,
  title        text           NOT NULL CHECK (char_length(title) BETWEEN 1 AND 255),
  description  text           NOT NULL DEFAULT '',
  type         issue_type     NOT NULL DEFAULT 'task',
  status       issue_status   NOT NULL DEFAULT 'todo',
  priority     issue_priority NOT NULL DEFAULT 'medium',
  assignee_id  uuid,
  reporter_id  uuid           REFERENCES users (id) ON DELETE SET NULL,
  team_id      uuid,
  start_date   date,
  due_date     date,
  points       smallint       CHECK (points BETWEEN 0 AND 100),
  completed_at timestamptz,
  created_at   timestamptz    NOT NULL DEFAULT now(),
  updated_at   timestamptz    NOT NULL DEFAULT now(),
  UNIQUE (project_id, number),
  UNIQUE (id, project_id),
  CHECK (start_date IS NULL OR due_date IS NULL OR start_date <= due_date),
  FOREIGN KEY (project_id, assignee_id) REFERENCES project_members (project_id, user_id) ON DELETE SET NULL (assignee_id),
  FOREIGN KEY (team_id, project_id) REFERENCES teams (id, project_id) ON DELETE SET NULL (team_id)
);
CREATE INDEX issues_project_status_idx ON issues (project_id, status);
CREATE INDEX issues_assignee_idx       ON issues (assignee_id);
CREATE INDEX issues_project_due_idx    ON issues (project_id, due_date);
CREATE INDEX issues_title_trgm_idx     ON issues USING gin (title gin_trgm_ops);
CREATE TRIGGER issues_updated_at BEFORE UPDATE ON issues FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE issue_attachments (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id     uuid        NOT NULL REFERENCES issues (id) ON DELETE CASCADE,
  uploaded_by  uuid        REFERENCES users (id) ON DELETE SET NULL,
  file_name    text        NOT NULL CHECK (char_length(file_name) BETWEEN 1 AND 255),
  content_type text        NOT NULL,
  size_bytes   bigint      NOT NULL CHECK (size_bytes > 0),
  storage_key  text        NOT NULL UNIQUE,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX issue_attachments_issue_idx ON issue_attachments (issue_id);

CREATE TABLE issue_events (
  id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  issue_id   uuid        NOT NULL REFERENCES issues (id) ON DELETE CASCADE,
  actor_id   uuid        REFERENCES users (id) ON DELETE SET NULL,
  kind       text        NOT NULL,
  changes    jsonb       NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX issue_events_issue_idx ON issue_events (issue_id, created_at);

CREATE TABLE documents (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id   uuid         NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
  kind         doc_kind     NOT NULL,
  name         text         NOT NULL CHECK (char_length(name) BETWEEN 1 AND 200),
  category     doc_category NOT NULL DEFAULT 'other',
  description  text         NOT NULL DEFAULT '' CHECK (char_length(description) <= 500),
  url          text,
  storage_key  text UNIQUE,
  content_type text,
  size_bytes   bigint,
  issue_id     uuid,
  uploaded_by  uuid         REFERENCES users (id) ON DELETE SET NULL,
  created_at   timestamptz  NOT NULL DEFAULT now(),
  updated_at   timestamptz  NOT NULL DEFAULT now(),
  CHECK (
    (kind = 'file' AND storage_key IS NOT NULL AND url IS NULL AND size_bytes > 0) OR
    (kind = 'link' AND url IS NOT NULL AND storage_key IS NULL)
  ),
  FOREIGN KEY (issue_id, project_id) REFERENCES issues (id, project_id) ON DELETE SET NULL (issue_id)
);
CREATE INDEX documents_project_idx ON documents (project_id, created_at DESC);
CREATE INDEX documents_issue_idx   ON documents (issue_id);
CREATE TRIGGER documents_updated_at BEFORE UPDATE ON documents FOR EACH ROW EXECUTE FUNCTION set_updated_at();
