ALTER TABLE users ADD COLUMN locale TEXT NOT NULL DEFAULT 'it'
  CHECK(locale IN ('it','en','fr','de','es','pt'));
