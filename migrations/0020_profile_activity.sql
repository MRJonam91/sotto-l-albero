-- Participation reported by the local Curling client. No score or ranking data.
CREATE TABLE profile_activity (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  game TEXT NOT NULL CHECK (game = 'curling'),
  day TEXT NOT NULL,
  PRIMARY KEY (user_id, game, day)
);
