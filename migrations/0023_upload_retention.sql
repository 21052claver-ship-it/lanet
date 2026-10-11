ALTER TABLE files ADD COLUMN deleting_at INTEGER;
ALTER TABLE files ADD COLUMN upload_expires_at INTEGER;
ALTER TABLE files ADD COLUMN upload_purpose TEXT NOT NULL DEFAULT 'content' CHECK(upload_purpose IN('content','banner'));
CREATE INDEX files_unattached ON files(owner_id,upload_purpose,created_at) WHERE note_id IS NULL AND plus_id IS NULL AND proposal_id IS NULL;
CREATE VIEW current_banner_files AS
  SELECT b.file_id FROM banners b WHERE b.archived=0 AND b.file_id IS NOT NULL
  AND b.rowid=(SELECT MAX(c.rowid) FROM banners c WHERE c.archived=0 AND c.slot=b.slot);
CREATE TABLE file_deletions(
  file_id TEXT PRIMARY KEY REFERENCES files(id),
  object_key TEXT NOT NULL,
  original_object_key TEXT,
  queued_at INTEGER NOT NULL DEFAULT(unixepoch()),
  attempts INTEGER NOT NULL DEFAULT 0,
  retry_at INTEGER NOT NULL DEFAULT 0
);
CREATE TRIGGER file_deletion_retire AFTER INSERT ON file_deletions BEGIN
  UPDATE files SET deleting_at=unixepoch() WHERE id=NEW.file_id;
  UPDATE banners SET file_id=NULL WHERE file_id=NEW.file_id;
END;
CREATE TRIGGER banner_file_available BEFORE INSERT ON banners WHEN NEW.file_id IS NOT NULL BEGIN
  SELECT (CASE WHEN NOT EXISTS(SELECT 1 FROM files WHERE id=NEW.file_id AND owner_id=NEW.author_id AND deleting_at IS NULL AND note_id IS NULL AND plus_id IS NULL AND proposal_id IS NULL AND mime LIKE 'image/%') THEN RAISE(ABORT,'file_retired') END);
END;
CREATE TRIGGER file_attachment_available BEFORE UPDATE OF note_id,plus_id,proposal_id ON files WHEN NEW.deleting_at IS NOT NULL AND (NEW.note_id IS NOT NULL OR NEW.plus_id IS NOT NULL OR NEW.proposal_id IS NOT NULL) BEGIN
  SELECT RAISE(ABORT,'file_retired');
END;
CREATE TRIGGER banner_retire_replaced_image AFTER INSERT ON banners BEGIN
  INSERT OR IGNORE INTO file_deletions(file_id,object_key,original_object_key)
    SELECT f.id,f.object_key,f.original_object_key FROM files f
    WHERE f.id IN(SELECT file_id FROM banners WHERE file_id IS NOT NULL)
    AND f.id NOT IN(SELECT file_id FROM current_banner_files)
    AND f.note_id IS NULL AND f.plus_id IS NULL AND f.proposal_id IS NULL;
END;
CREATE TRIGGER banner_retire_archived_image AFTER UPDATE OF archived ON banners BEGIN
  INSERT OR IGNORE INTO file_deletions(file_id,object_key,original_object_key)
    SELECT f.id,f.object_key,f.original_object_key FROM files f
    WHERE f.id IN(SELECT file_id FROM banners WHERE file_id IS NOT NULL)
    AND f.id NOT IN(SELECT file_id FROM current_banner_files)
    AND f.note_id IS NULL AND f.plus_id IS NULL AND f.proposal_id IS NULL;
END;
CREATE TABLE upload_guards(
  user_id TEXT PRIMARY KEY REFERENCES users(id),
  minute_start INTEGER NOT NULL DEFAULT 0,minute_count INTEGER NOT NULL DEFAULT 0,
  hour_start INTEGER NOT NULL DEFAULT 0,hour_count INTEGER NOT NULL DEFAULT 0,
  day_start INTEGER NOT NULL DEFAULT 0,day_count INTEGER NOT NULL DEFAULT 0,day_bytes INTEGER NOT NULL DEFAULT 0,
  invalid_start INTEGER NOT NULL DEFAULT 0,invalid_count INTEGER NOT NULL DEFAULT 0,
  blocked_until INTEGER NOT NULL DEFAULT 0,strikes INTEGER NOT NULL DEFAULT 0,last_strike INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE upload_leases(
  id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),purpose TEXT NOT NULL CHECK(purpose IN('content','banner')),
  reserved_bytes INTEGER NOT NULL,expires INTEGER NOT NULL
);
CREATE INDEX upload_leases_user ON upload_leases(user_id,expires);
CREATE TABLE unclaimed_uploads(object_key TEXT PRIMARY KEY,created_at INTEGER NOT NULL DEFAULT(unixepoch()));
