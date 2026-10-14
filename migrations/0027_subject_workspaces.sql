-- Additive only: existing materials, files, balances, grades and enrollments are preserved.
ALTER TABLE notes ADD COLUMN topic TEXT NOT NULL DEFAULT '';
ALTER TABLE notes ADD COLUMN term INTEGER CHECK(term IS NULL OR term BETWEEN 1 AND 3);
CREATE TABLE subject_threads (
  id TEXT PRIMARY KEY,
  offering_id TEXT NOT NULL REFERENCES offerings(id),
  author_id TEXT NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  note_id TEXT REFERENCES notes(id) ON DELETE SET NULL,
  request_hash TEXT NOT NULL,
  search_text TEXT NOT NULL DEFAULT '',
  resolved INTEGER NOT NULL DEFAULT 0 CHECK(resolved IN(0,1)),
  deleted INTEGER NOT NULL DEFAULT 0 CHECK(deleted IN(0,1)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX subject_threads_room ON subject_threads(offering_id,created_at DESC,id DESC);
CREATE INDEX subject_threads_sequence ON subject_threads(offering_id);
CREATE INDEX subject_threads_duplicate_key ON subject_threads(author_id,request_hash,created_at);
CREATE TABLE subject_replies (
  id TEXT PRIMARY KEY,
  thread_id TEXT NOT NULL REFERENCES subject_threads(id) ON DELETE CASCADE,
  author_id TEXT NOT NULL REFERENCES users(id),
  body TEXT NOT NULL,
  request_hash TEXT NOT NULL,
  deleted INTEGER NOT NULL DEFAULT 0 CHECK(deleted IN(0,1)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX subject_replies_thread ON subject_replies(thread_id,created_at,id);
CREATE INDEX subject_replies_sequence ON subject_replies(thread_id);
CREATE INDEX subject_replies_duplicate_key ON subject_replies(author_id,request_hash,created_at);
-- Atomic duplicate prevention; changing the client UUID cannot bypass it.
CREATE TRIGGER subject_threads_duplicate BEFORE INSERT ON subject_threads
WHEN EXISTS(SELECT 1 FROM subject_threads WHERE author_id=NEW.author_id
 AND request_hash=NEW.request_hash AND id!=NEW.id
 AND created_at>strftime('%Y-%m-%dT%H:%M:%fZ','now','-10 minutes'))
BEGIN SELECT RAISE(ABORT,'discussion_duplicate'); END;
CREATE TRIGGER subject_replies_duplicate BEFORE INSERT ON subject_replies
WHEN EXISTS(SELECT 1 FROM subject_replies WHERE author_id=NEW.author_id
 AND request_hash=NEW.request_hash AND id!=NEW.id
 AND created_at>strftime('%Y-%m-%dT%H:%M:%fZ','now','-10 minutes'))
BEGIN SELECT RAISE(ABORT,'discussion_duplicate'); END;
