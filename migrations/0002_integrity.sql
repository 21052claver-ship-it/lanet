CREATE TABLE reading_sessions(user_id TEXT NOT NULL REFERENCES users(id),note_id TEXT NOT NULL REFERENCES notes(id),started INTEGER NOT NULL,PRIMARY KEY(user_id,note_id));
CREATE TRIGGER recovery_single_use BEFORE UPDATE OF used ON recovery_tokens WHEN OLD.used=1 BEGIN SELECT RAISE(ABORT,'recovery_used'); END;
CREATE TRIGGER grade_insert_enrolled BEFORE INSERT ON grade_entries WHEN NOT EXISTS(SELECT 1 FROM enrollments e JOIN offerings o ON o.id=e.offering_id WHERE e.user_id=NEW.user_id AND o.subject_id=NEW.subject_id) BEGIN SELECT RAISE(ABORT,'grade_not_enrolled'); END;
