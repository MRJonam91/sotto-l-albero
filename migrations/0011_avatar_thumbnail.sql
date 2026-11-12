-- Small finished portraits can use D1 when no private R2 bucket is bound.
ALTER TABLE user_avatars ADD COLUMN thumbnail BLOB
  CHECK (thumbnail IS NULL OR (kind = 'photo' AND length(thumbnail) BETWEEN 1 AND 65536));
