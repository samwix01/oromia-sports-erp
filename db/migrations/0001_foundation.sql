-- Release 1 foundation schema. One schema per module (02-architecture §3).
-- IDs are gen_random_uuid() (v4) until Postgres ships uuidv7(); ordering uses created_at.

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE SCHEMA IF NOT EXISTS ref;
CREATE SCHEMA IF NOT EXISTS territories;
CREATE SCHEMA IF NOT EXISTS institutions;
CREATE SCHEMA IF NOT EXISTS iam;
CREATE SCHEMA IF NOT EXISTS people;
CREATE SCHEMA IF NOT EXISTS workflow;
CREATE SCHEMA IF NOT EXISTS audit;

-- ---------------------------------------------------------------- reference
CREATE TABLE ref.sport (
  code        text PRIMARY KEY,
  family      text NOT NULL CHECK (family IN ('team_match','measured_timed','combat_judged','racket_mind','traditional_para')),
  name_i18n   jsonb NOT NULL,
  status      text NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive'))
);

-- ---------------------------------------------------------------- territories
CREATE TABLE territories.territory (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code        text NOT NULL UNIQUE,
  name_i18n   jsonb NOT NULL,
  level       text NOT NULL CHECK (level IN ('region','zone','woreda','city','sub_city','kebele')),
  parent_id   uuid REFERENCES territories.territory(id),
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------- institutions
CREATE TABLE institutions.organisation (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type                text NOT NULL CHECK (type IN ('bureau','territorial_office','federation','club','academy','school','university','facility_operator','national_body','partner')),
  name                text NOT NULL,
  short_name          text,
  parent_id           uuid REFERENCES institutions.organisation(id),
  territory_id        uuid REFERENCES territories.territory(id),
  sport_code          text REFERENCES ref.sport(code),
  recognition_status  text NOT NULL DEFAULT 'pending' CHECK (recognition_status IN ('unverified','pending','recognised','suspended','dissolved','rejected')),
  contacts            jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at          timestamptz NOT NULL DEFAULT now(),
  created_by          uuid,
  updated_at          timestamptz NOT NULL DEFAULT now(),
  updated_by          uuid,
  version             int NOT NULL DEFAULT 1
);
CREATE INDEX organisation_parent_idx ON institutions.organisation(parent_id);
CREATE INDEX organisation_name_trgm ON institutions.organisation USING gin (name gin_trgm_ops);

-- ---------------------------------------------------------------- iam
CREATE TABLE iam.user_account (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email                 text NOT NULL,
  full_name             text NOT NULL,
  password_hash         text NOT NULL,
  totp_secret           text,
  totp_pending_secret   text,
  locale                text NOT NULL DEFAULT 'om' CHECK (locale IN ('om','am','en')),
  status                text NOT NULL DEFAULT 'active' CHECK (status IN ('active','disabled')),
  failed_logins         int NOT NULL DEFAULT 0,
  locked_until          timestamptz,
  created_at            timestamptz NOT NULL DEFAULT now(),
  created_by            uuid,
  updated_at            timestamptz NOT NULL DEFAULT now(),
  updated_by            uuid,
  version               int NOT NULL DEFAULT 1
);
CREATE UNIQUE INDEX user_account_email_uq ON iam.user_account (lower(email));

CREATE TABLE iam.session (
  token_hash    text PRIMARY KEY,
  user_id       uuid NOT NULL REFERENCES iam.user_account(id) ON DELETE CASCADE,
  created_at    timestamptz NOT NULL DEFAULT now(),
  expires_at    timestamptz NOT NULL,
  last_seen_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX session_user_idx ON iam.session(user_id);

CREATE TABLE iam.role_assignment (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES iam.user_account(id) ON DELETE CASCADE,
  role_key      text NOT NULL,
  org_id        uuid REFERENCES institutions.organisation(id),
  sport_code    text REFERENCES ref.sport(code),
  territory_id  uuid REFERENCES territories.territory(id),
  valid_from    date NOT NULL DEFAULT current_date,
  valid_to      date,
  granted_by    uuid,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX role_assignment_user_idx ON iam.role_assignment(user_id);

-- ---------------------------------------------------------------- people (Athlete 360)
CREATE TABLE people.person (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  given_name        text NOT NULL,
  father_name       text,
  grandfather_name  text,
  full_name         text GENERATED ALWAYS AS (btrim(given_name || ' ' || coalesce(father_name,'') || ' ' || coalesce(grandfather_name,''))) STORED,
  sex               text CHECK (sex IN ('F','M')),
  date_of_birth     date,
  phone             text,
  email             text,
  territory_id      uuid REFERENCES territories.territory(id),
  identity_status   text NOT NULL DEFAULT 'unverified' CHECK (identity_status IN ('unverified','pending','verified','disputed')),
  assisted_registration boolean NOT NULL DEFAULT false,
  merged_into_id    uuid REFERENCES people.person(id),
  created_at        timestamptz NOT NULL DEFAULT now(),
  created_by        uuid,
  updated_at        timestamptz NOT NULL DEFAULT now(),
  updated_by        uuid,
  version           int NOT NULL DEFAULT 1
);
CREATE INDEX person_full_name_trgm ON people.person USING gin (full_name gin_trgm_ops);

-- Rule 2: affiliations are dated and sport-scoped. A person may not hold two overlapping
-- ACTIVE athlete affiliations in the same sport. DECISION: OD-07 (some rule sets may allow it).
CREATE TABLE people.affiliation (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id             uuid NOT NULL REFERENCES people.person(id),
  org_id                uuid NOT NULL REFERENCES institutions.organisation(id),
  sport_code            text NOT NULL REFERENCES ref.sport(code),
  role_type             text NOT NULL CHECK (role_type IN ('athlete','coach','official','staff')),
  start_date            date NOT NULL,
  end_date              date,
  status                text NOT NULL DEFAULT 'requested' CHECK (status IN ('requested','active','ended','suspended','rejected')),
  source_submission_id  uuid,
  created_at            timestamptz NOT NULL DEFAULT now(),
  created_by            uuid,
  updated_at            timestamptz NOT NULL DEFAULT now(),
  updated_by            uuid,
  version               int NOT NULL DEFAULT 1,
  CHECK (end_date IS NULL OR end_date > start_date),
  CONSTRAINT affiliation_no_overlap EXCLUDE USING gist (
    person_id WITH =,
    sport_code WITH =,
    daterange(start_date, end_date, '[)') WITH &&
  ) WHERE (status = 'active' AND role_type = 'athlete')
);
CREATE INDEX affiliation_person_idx ON people.affiliation(person_id);
CREATE INDEX affiliation_org_idx ON people.affiliation(org_id);

CREATE TABLE people.duplicate_candidate (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_a_id  uuid NOT NULL REFERENCES people.person(id),
  person_b_id  uuid NOT NULL REFERENCES people.person(id),
  score        numeric(4,3) NOT NULL,
  signals      jsonb NOT NULL DEFAULT '{}'::jsonb,
  status       text NOT NULL DEFAULT 'open' CHECK (status IN ('open','same_person','different_people','held')),
  decided_by   uuid,
  decided_at   timestamptz,
  reason       text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (person_a_id, person_b_id),
  CHECK (person_a_id <> person_b_id)
);

-- ---------------------------------------------------------------- workflow engine
CREATE TABLE workflow.submission (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  definition_code  text NOT NULL,
  subject_type     text NOT NULL,
  subject_id       uuid NOT NULL,
  title            text NOT NULL,
  org_id           uuid REFERENCES institutions.organisation(id),
  sport_code       text REFERENCES ref.sport(code),
  territory_id     uuid REFERENCES territories.territory(id),
  state            text NOT NULL CHECK (state IN ('submitted','in_review','returned','approved','rejected','withdrawn')),
  current_step     text,
  payload          jsonb NOT NULL DEFAULT '{}'::jsonb,
  version_seq      int NOT NULL DEFAULT 1,
  submitted_by     uuid NOT NULL REFERENCES iam.user_account(id),
  due_at           timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX submission_state_idx ON workflow.submission(state);

CREATE TABLE workflow.submission_version (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id  uuid NOT NULL REFERENCES workflow.submission(id),
  seq            int NOT NULL,
  payload        jsonb NOT NULL,
  created_by     uuid NOT NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (submission_id, seq)
);

CREATE TABLE workflow.step_log (
  id             bigserial PRIMARY KEY,
  submission_id  uuid NOT NULL REFERENCES workflow.submission(id),
  step           text NOT NULL,
  action         text NOT NULL CHECK (action IN ('submit','resubmit','approve','return','reject','withdraw','comment')),
  actor_id       uuid NOT NULL,
  actor_roles    text[] NOT NULL DEFAULT '{}',
  reason         text,
  at             timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX step_log_submission_idx ON workflow.step_log(submission_id);

-- ---------------------------------------------------------------- audit (append-only, hash-chained)
CREATE TABLE audit.event (
  id           bigserial PRIMARY KEY,
  at           timestamptz NOT NULL DEFAULT now(),
  actor_id     uuid,
  action       text NOT NULL,
  entity_type  text NOT NULL,
  entity_id    text NOT NULL,
  data         jsonb NOT NULL DEFAULT '{}'::jsonb,
  prev_hash    text,
  hash         text NOT NULL
);
CREATE INDEX audit_entity_idx ON audit.event(entity_type, entity_id);

CREATE FUNCTION audit.forbid_change() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'audit.event is append-only';
END $$;
CREATE TRIGGER audit_event_append_only BEFORE UPDATE OR DELETE ON audit.event
  FOR EACH ROW EXECUTE FUNCTION audit.forbid_change();
CREATE TRIGGER audit_event_no_truncate BEFORE TRUNCATE ON audit.event
  FOR EACH STATEMENT EXECUTE FUNCTION audit.forbid_change();
