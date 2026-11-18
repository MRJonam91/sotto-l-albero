-- High-water mark: resetting an exercise or editing wishes never removes progress.
ALTER TABLE users ADD COLUMN festive_progress_score INTEGER NOT NULL DEFAULT 0
  CHECK (festive_progress_score BETWEEN 0 AND 100);
