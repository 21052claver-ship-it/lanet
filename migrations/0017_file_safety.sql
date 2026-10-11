-- Legacy records remain intact. Images are rebuilt and moderated on authorized access.
ALTER TABLE files ADD COLUMN safety_state TEXT NOT NULL DEFAULT 'legacy' CHECK(safety_state IN ('legacy','validated','approved','blocked'));
ALTER TABLE files ADD COLUMN safety_policy TEXT;
ALTER TABLE files ADD COLUMN safety_checked_at TEXT;
ALTER TABLE files ADD COLUMN original_object_key TEXT;
CREATE INDEX files_safety_state ON files(safety_state);
CREATE TRIGGER files_image_association_guard
BEFORE UPDATE OF note_id,plus_id,proposal_id ON files
WHEN NEW.mime LIKE 'image/%' AND (NEW.note_id IS NOT NULL OR NEW.plus_id IS NOT NULL OR NEW.proposal_id IS NOT NULL)
 AND (NEW.safety_state <> 'approved' OR COALESCE(NEW.safety_policy,'') <> 'lanet-image-v1')
BEGIN SELECT RAISE(ABORT,'La imatge encara no està verificada.'); END;
CREATE TRIGGER banners_image_safety_guard
BEFORE INSERT ON banners
WHEN NEW.file_id IS NOT NULL AND NOT EXISTS(
 SELECT 1 FROM files WHERE id=NEW.file_id AND mime='image/webp' AND safety_state='approved' AND safety_policy='lanet-image-v1'
)
BEGIN SELECT RAISE(ABORT,'La imatge encara no està verificada.'); END;
