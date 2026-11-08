CREATE TABLE competition_entries (
  group_id TEXT NOT NULL REFERENCES groups(id),
  year INTEGER NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id),
  adjustment INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (group_id, year, user_id)
);

CREATE TABLE competition_duels (
  id TEXT PRIMARY KEY,
  group_id TEXT NOT NULL REFERENCES groups(id),
  year INTEGER NOT NULL,
  event_id TEXT NOT NULL REFERENCES events(id),
  sender_id TEXT NOT NULL REFERENCES users(id),
  receiver_id TEXT NOT NULL REFERENCES users(id),
  questions TEXT NOT NULL,
  expires INTEGER NOT NULL,
  CHECK (sender_id != receiver_id)
);

CREATE INDEX competition_duels_group ON competition_duels(group_id, year, expires);

CREATE TABLE competition_attempts (
  id TEXT PRIMARY KEY,
  group_id TEXT NOT NULL REFERENCES groups(id),
  year INTEGER NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id),
  game TEXT NOT NULL,
  duel_id TEXT NOT NULL DEFAULT '',
  ordinal INTEGER NOT NULL,
  revision INTEGER NOT NULL DEFAULT 0,
  state TEXT NOT NULL,
  expires INTEGER NOT NULL,
  raw_score INTEGER,
  score INTEGER,
  UNIQUE (group_id, year, user_id, game, duel_id, ordinal)
);

CREATE INDEX competition_scores ON competition_attempts(group_id, year, user_id, game, score);

CREATE TABLE competition_adjustments (
  id TEXT PRIMARY KEY,
  group_id TEXT NOT NULL REFERENCES groups(id),
  year INTEGER NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id),
  owner_id TEXT NOT NULL REFERENCES users(id),
  action TEXT NOT NULL,
  points INTEGER NOT NULL,
  reason TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
