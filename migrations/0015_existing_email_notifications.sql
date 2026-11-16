-- One-time activation explicitly requested for all existing accounts.
-- Later changes made in notification preferences remain effective.
UPDATE users SET notify_email = 1 WHERE notify_email = 0;
