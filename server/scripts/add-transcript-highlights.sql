-- Migration script to add transcript and highlights columns
-- Note: This will fail if columns already exist (duplicate column name error)
-- Use add-transcript-highlights.js instead for safe execution

ALTER TABLE videos ADD COLUMN transcript TEXT;
ALTER TABLE videos ADD COLUMN highlights TEXT;

