ALTER TABLE users ADD COLUMN phone TEXT;
ALTER TABLE users ADD COLUMN notify_email INTEGER NOT NULL DEFAULT 1;
ALTER TABLE users ADD COLUMN notify_telegram INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN telegram_chat_id TEXT;
CREATE UNIQUE INDEX users_telegram_chat ON users(telegram_chat_id) WHERE telegram_chat_id IS NOT NULL;
ALTER TABLE codes ADD COLUMN phone TEXT;

CREATE TABLE practice_games (
  user_id TEXT NOT NULL REFERENCES users(id),
  game TEXT NOT NULL CHECK (game IN ('quiz','memory')),
  revision TEXT NOT NULL,
  state TEXT NOT NULL,
  done INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id,game)
);
