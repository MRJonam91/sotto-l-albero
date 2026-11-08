CREATE TABLE user_avatars_r2 (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK(kind IN ('none','preset','photo')),
  preset TEXT,
  revision TEXT NOT NULL,
  CHECK((kind='preset' AND preset IS NOT NULL) OR (kind IN ('none','photo') AND preset IS NULL))
);

-- Telegram file identifiers are not R2 objects. Those profiles return to initials.
INSERT INTO user_avatars_r2(user_id,kind,preset,revision)
SELECT user_id,kind,preset,revision FROM user_avatars WHERE kind IN ('none','preset');
DROP TABLE user_avatars;
ALTER TABLE user_avatars_r2 RENAME TO user_avatars;

CREATE TABLE avatar_cleanup (
  revision TEXT PRIMARY KEY,
  due_at INTEGER NOT NULL
);
CREATE INDEX avatar_cleanup_due ON avatar_cleanup(due_at);
