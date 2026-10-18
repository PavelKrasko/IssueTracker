CREATE TABLE versions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id   uuid        NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
  name         text        NOT NULL CHECK (char_length(name) BETWEEN 1 AND 60),
  description  text        NOT NULL DEFAULT '',
  release_date date,
  released_at  timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, project_id)
);
CREATE UNIQUE INDEX versions_project_name_uniq ON versions (project_id, lower(name));
CREATE TRIGGER versions_updated_at BEFORE UPDATE ON versions FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TYPE sprint_state AS ENUM ('planned', 'active', 'closed');

CREATE TABLE sprints (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  uuid         NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
  name        text         NOT NULL CHECK (char_length(name) BETWEEN 1 AND 80),
  goal        text         NOT NULL DEFAULT '',
  state       sprint_state NOT NULL DEFAULT 'planned',
  start_date  date,
  end_date    date,
  closed_at   timestamptz,
  created_at  timestamptz  NOT NULL DEFAULT now(),
  updated_at  timestamptz  NOT NULL DEFAULT now(),
  UNIQUE (id, project_id),
  CHECK (start_date IS NULL OR end_date IS NULL OR start_date <= end_date),
  CHECK (state <> 'active' OR (start_date IS NOT NULL AND end_date IS NOT NULL))
);
CREATE UNIQUE INDEX sprints_one_active ON sprints (project_id) WHERE state = 'active';
CREATE INDEX sprints_project_idx ON sprints (project_id, created_at);
CREATE TRIGGER sprints_updated_at BEFORE UPDATE ON sprints FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE issues
  ADD COLUMN parent_id        uuid,
  ADD COLUMN sprint_id        uuid,
  ADD COLUMN fix_version_id   uuid,
  ADD COLUMN estimate_minutes integer CHECK (estimate_minutes BETWEEN 0 AND 100000),
  ADD CONSTRAINT issues_not_own_parent CHECK (parent_id <> id),
  ADD CONSTRAINT issues_parent_fk FOREIGN KEY (parent_id, project_id) REFERENCES issues (id, project_id) ON DELETE SET NULL (parent_id),
  ADD CONSTRAINT issues_sprint_fk FOREIGN KEY (sprint_id, project_id) REFERENCES sprints (id, project_id) ON DELETE SET NULL (sprint_id),
  ADD CONSTRAINT issues_version_fk FOREIGN KEY (fix_version_id, project_id) REFERENCES versions (id, project_id) ON DELETE SET NULL (fix_version_id);
CREATE INDEX issues_parent_idx  ON issues (parent_id);
CREATE INDEX issues_sprint_idx  ON issues (sprint_id);
CREATE INDEX issues_version_idx ON issues (fix_version_id);

CREATE TABLE worklogs (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id   uuid        NOT NULL REFERENCES issues (id) ON DELETE CASCADE,
  user_id    uuid        REFERENCES users (id) ON DELETE SET NULL,
  minutes    integer     NOT NULL CHECK (minutes BETWEEN 1 AND 1440),
  work_date  date        NOT NULL DEFAULT current_date,
  note       text        NOT NULL DEFAULT '' CHECK (char_length(note) <= 500),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX worklogs_issue_idx ON worklogs (issue_id);
CREATE INDEX worklogs_user_date_idx ON worklogs (user_id, work_date);

CREATE TABLE issue_comments (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id   uuid        NOT NULL REFERENCES issues (id) ON DELETE CASCADE,
  author_id  uuid        REFERENCES users (id) ON DELETE SET NULL,
  body       text        NOT NULL CHECK (char_length(body) BETWEEN 1 AND 10000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX issue_comments_issue_idx ON issue_comments (issue_id, created_at);
CREATE TRIGGER issue_comments_updated_at BEFORE UPDATE ON issue_comments FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE issue_watchers (
  issue_id   uuid        NOT NULL,
  project_id uuid        NOT NULL,
  user_id    uuid        NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (issue_id, user_id),
  FOREIGN KEY (issue_id, project_id) REFERENCES issues (id, project_id) ON DELETE CASCADE,
  FOREIGN KEY (project_id, user_id) REFERENCES project_members (project_id, user_id) ON DELETE CASCADE
);
CREATE INDEX issue_watchers_user_idx ON issue_watchers (user_id);

CREATE TABLE notifications (
  id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id    uuid        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  project_id uuid        REFERENCES projects (id) ON DELETE CASCADE,
  issue_id   uuid        REFERENCES issues (id) ON DELETE CASCADE,
  actor_id   uuid        REFERENCES users (id) ON DELETE SET NULL,
  kind       text        NOT NULL,
  payload    jsonb       NOT NULL DEFAULT '{}'::jsonb,
  read_at    timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX notifications_user_idx   ON notifications (user_id, created_at DESC);
CREATE INDEX notifications_unread_idx ON notifications (user_id) WHERE read_at IS NULL;

CREATE TABLE telegram_links (
  user_id   uuid PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
  chat_id   bigint      NOT NULL UNIQUE,
  username  text,
  enabled   boolean     NOT NULL DEFAULT true,
  linked_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE telegram_link_codes (
  code       text PRIMARY KEY,
  user_id    uuid        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL
);
CREATE INDEX telegram_link_codes_user_idx ON telegram_link_codes (user_id);
