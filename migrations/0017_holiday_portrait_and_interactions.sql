ALTER TABLE users ADD COLUMN holiday_profile TEXT NOT NULL DEFAULT '{}';

CREATE TABLE portrait_interactions (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  sender_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK(kind IN ('riddle_guess', 'icon_note')),
  icon TEXT,
  message TEXT NOT NULL,
  correct INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE INDEX portrait_interactions_target
  ON portrait_interactions(event_id, receiver_id, created_at DESC);
