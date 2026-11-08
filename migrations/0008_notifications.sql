CREATE TABLE user_avatars (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK(kind IN ('none','preset','photo')),
  preset TEXT,
  file_id TEXT,
  message_id INTEGER,
  revision TEXT NOT NULL,
  CHECK((kind='photo' AND file_id IS NOT NULL AND message_id IS NOT NULL AND preset IS NULL)
     OR (kind='preset' AND preset IS NOT NULL AND file_id IS NULL AND message_id IS NULL)
     OR (kind='none' AND preset IS NULL AND file_id IS NULL AND message_id IS NULL))
);

CREATE TABLE telegram_links (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  digest TEXT NOT NULL UNIQUE,
  expires_at INTEGER NOT NULL
);
CREATE INDEX telegram_links_expiry ON telegram_links(expires_at);

CREATE TABLE media_upload_limits (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  purpose TEXT NOT NULL,
  bucket INTEGER NOT NULL,
  count INTEGER NOT NULL,
  PRIMARY KEY(user_id,purpose,bucket)
);
CREATE INDEX media_upload_expiry ON media_upload_limits(bucket);

CREATE TABLE notification_jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK(channel IN ('email','telegram')),
  kind TEXT NOT NULL CHECK(kind IN ('announce','reminder','weekly','challenge','draw','duel')),
  source_key TEXT NOT NULL,
  payload TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'queued' CHECK(state IN ('queued','sending','sent','skipped','failed')),
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  next_at INTEGER NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  claim TEXT,
  lease_until INTEGER,
  UNIQUE(event_id,user_id,channel,kind,source_key)
);
CREATE INDEX notification_jobs_due ON notification_jobs(state,next_at,lease_until);
CREATE INDEX notification_jobs_expiry ON notification_jobs(expires_at);
CREATE UNIQUE INDEX notification_weekly_group ON notification_jobs(user_id,channel,source_key) WHERE kind='weekly';
CREATE INDEX notification_draw_audit ON audit(action,created_at,event_id);
