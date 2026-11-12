ALTER TABLE user_stamps ADD COLUMN collected_at INTEGER;
ALTER TABLE events ADD COLUMN archived_at INTEGER;
ALTER TABLE events ADD COLUMN archived_stamp_points TEXT;

-- Existing stamps have no collection date and belong to the pre-upgrade set.
UPDATE events
SET archived_at = CAST(strftime('%s','now') AS INTEGER) * 1000
WHERE status='archived';
