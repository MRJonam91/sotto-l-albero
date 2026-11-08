CREATE TABLE user_stamps (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stamp TEXT NOT NULL,
  PRIMARY KEY (user_id, stamp)
);
