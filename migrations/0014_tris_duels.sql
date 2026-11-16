CREATE TABLE tris_duels (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES events(id),
  player_x TEXT NOT NULL REFERENCES users(id),
  player_o TEXT NOT NULL REFERENCES users(id),
  board TEXT NOT NULL,
  turn TEXT CHECK(turn IN ('X','O')),
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','won','draw')),
  winner TEXT CHECK(winner IN ('X','O')),
  revision INTEGER NOT NULL DEFAULT 0,
  expires INTEGER NOT NULL,
  CHECK(player_x != player_o)
);
CREATE INDEX tris_duels_event ON tris_duels(event_id,status,expires);
CREATE INDEX tris_duels_x ON tris_duels(event_id,player_x,expires);
CREATE INDEX tris_duels_o ON tris_duels(event_id,player_o,expires);
