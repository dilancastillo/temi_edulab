CREATE TABLE IF NOT EXISTS missions (
  id                TEXT        PRIMARY KEY,
  teacher_id        TEXT        REFERENCES teachers(id) ON DELETE CASCADE,
  title             TEXT        NOT NULL,
  summary           TEXT        NOT NULL,
  category          TEXT        NOT NULL,
  age_band          TEXT        NOT NULL,
  duration_minutes  INTEGER     NOT NULL CHECK (duration_minutes > 0),
  outcomes          JSONB       NOT NULL DEFAULT '[]',
  steps             JSONB       NOT NULL DEFAULT '[]',
  allowed_categories JSONB      NOT NULL DEFAULT '[]',
  status            TEXT        NOT NULL DEFAULT 'draft',
  cover_tone        TEXT        NOT NULL DEFAULT 'blue',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_missions_teacher_id ON missions(teacher_id);
