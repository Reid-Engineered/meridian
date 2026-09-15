PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS works (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL CHECK(length(trim(title)) > 0),
  subtitle TEXT,
  description TEXT,
  original_publication_year INTEGER CHECK(original_publication_year IS NULL OR original_publication_year BETWEEN 0 AND 3000),
  series TEXT,
  series_position REAL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS authors (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL COLLATE NOCASE UNIQUE CHECK(length(trim(name)) > 0));
CREATE TABLE IF NOT EXISTS work_authors (work_id INTEGER NOT NULL REFERENCES works(id) ON DELETE CASCADE, author_id INTEGER NOT NULL REFERENCES authors(id) ON DELETE RESTRICT, position INTEGER NOT NULL DEFAULT 0, PRIMARY KEY(work_id,author_id));
CREATE TABLE IF NOT EXISTS editions (
  id INTEGER PRIMARY KEY AUTOINCREMENT, work_id INTEGER NOT NULL REFERENCES works(id) ON DELETE CASCADE,
  isbn10 TEXT UNIQUE, isbn13 TEXT UNIQUE, publisher TEXT, publication_year INTEGER,
  page_count INTEGER CHECK(page_count IS NULL OR page_count >= 0), language TEXT,
  format TEXT NOT NULL DEFAULT 'Other' CHECK(format IN ('Hardcover','Paperback','Mass Market Paperback','Ebook','Audiobook','Other')),
  cover_url TEXT
);
CREATE TABLE IF NOT EXISTS library_copies (
  id INTEGER PRIMARY KEY AUTOINCREMENT, edition_id INTEGER NOT NULL REFERENCES editions(id) ON DELETE CASCADE,
  ownership_status TEXT NOT NULL DEFAULT 'Owned', physical_location TEXT, date_acquired TEXT,
  condition TEXT, notes TEXT, date_added TEXT NOT NULL DEFAULT CURRENT_DATE
);
CREATE TABLE IF NOT EXISTS reading_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT, copy_id INTEGER NOT NULL REFERENCES library_copies(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'Unread' CHECK(status IN ('Want to Read','Unread','Reading','Finished','Did Not Finish')),
  current_page INTEGER CHECK(current_page IS NULL OR current_page >= 0), date_started TEXT, date_finished TEXT,
  rating INTEGER CHECK(rating IS NULL OR rating BETWEEN 1 AND 5), review TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS tags (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL COLLATE NOCASE UNIQUE CHECK(length(trim(name)) > 0));
CREATE TABLE IF NOT EXISTS copy_tags (copy_id INTEGER NOT NULL REFERENCES library_copies(id) ON DELETE CASCADE, tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE, PRIMARY KEY(copy_id,tag_id));
CREATE TABLE IF NOT EXISTS collections (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL COLLATE NOCASE UNIQUE CHECK(length(trim(name)) > 0), description TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS collection_copies (collection_id INTEGER NOT NULL REFERENCES collections(id) ON DELETE CASCADE, copy_id INTEGER NOT NULL REFERENCES library_copies(id) ON DELETE CASCADE, position INTEGER NOT NULL DEFAULT 0, PRIMARY KEY(collection_id,copy_id));
CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);

CREATE INDEX IF NOT EXISTS idx_works_title ON works(title COLLATE NOCASE);
CREATE INDEX IF NOT EXISTS idx_authors_name ON authors(name COLLATE NOCASE);
CREATE INDEX IF NOT EXISTS idx_editions_work ON editions(work_id);
CREATE INDEX IF NOT EXISTS idx_copies_edition ON library_copies(edition_id);
CREATE INDEX IF NOT EXISTS idx_reading_copy ON reading_records(copy_id, id DESC);
CREATE INDEX IF NOT EXISTS idx_copy_tags_tag ON copy_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_collection_copies_copy ON collection_copies(copy_id);
