CREATE TABLE practice_games_catalog (
  user_id TEXT NOT NULL REFERENCES users(id),
  game TEXT NOT NULL CHECK (game IN ('quiz','memory','pacchi','slitta','cartolina','addobbi','tris')),
  revision TEXT NOT NULL,
  state TEXT NOT NULL,
  done INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id,game)
);

INSERT INTO practice_games_catalog(user_id,game,revision,state,done)
SELECT user_id,game,revision,state,done FROM practice_games;

DROP TABLE practice_games;
ALTER TABLE practice_games_catalog RENAME TO practice_games;
