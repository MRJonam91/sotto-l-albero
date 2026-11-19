-- Preserve the bonus earned when an edition closes, independently of older
-- snapshots that contain only individual stamp points.
ALTER TABLE events ADD COLUMN archived_stamp_completions TEXT;
