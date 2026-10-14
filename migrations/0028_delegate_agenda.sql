-- Additive only: preserve every existing event, enrollment and account role.
CREATE TABLE delegation_members (
  email TEXT NOT NULL COLLATE NOCASE,
  unit_id TEXT NOT NULL CHECK(unit_id IN('tech1','tech2','science','social')),
  name TEXT NOT NULL,
  position TEXT NOT NULL CHECK(position IN('delegate','subdelegate')),
  active INTEGER NOT NULL DEFAULT 1 CHECK(active IN(0,1)),
  PRIMARY KEY(email,unit_id)
);
ALTER TABLE events ADD COLUMN review_status TEXT NOT NULL DEFAULT 'approved' CHECK(review_status IN('pending','approved','returned','withdrawn'));
ALTER TABLE events ADD COLUMN audience_kind TEXT NOT NULL DEFAULT 'group' CHECK(audience_kind IN('group','class','offering'));
ALTER TABLE events ADD COLUMN unit_id TEXT;
ALTER TABLE events ADD COLUMN revision INTEGER NOT NULL DEFAULT 1;
ALTER TABLE events ADD COLUMN reviewed_by TEXT REFERENCES users(id);
ALTER TABLE events ADD COLUMN reviewed_at TEXT;
ALTER TABLE events ADD COLUMN review_note TEXT NOT NULL DEFAULT '';
ALTER TABLE events ADD COLUMN last_operation TEXT;
ALTER TABLE events ADD COLUMN dedupe_key TEXT;
ALTER TABLE events ADD COLUMN dedupe_scope TEXT;
ALTER TABLE events ADD COLUMN dedupe_identity TEXT;
CREATE UNIQUE INDEX event_active_dedupe ON events(dedupe_key) WHERE review_status IN('pending','approved') AND dedupe_key IS NOT NULL;
CREATE INDEX event_duplicate_scope ON events(date,subject_id,dedupe_scope,review_status);
CREATE TRIGGER agenda_no_duplicate_insert BEFORE INSERT ON events
WHEN NEW.visibility='shared' AND NEW.review_status IN('pending','approved') AND NEW.dedupe_scope IS NOT NULL
BEGIN
  SELECT CASE WHEN EXISTS(SELECT 1 FROM events e WHERE e.visibility='shared' AND e.review_status IN('pending','approved') AND e.date=NEW.date AND e.subject_id IS NEW.subject_id AND e.dedupe_scope=NEW.dedupe_scope AND e.dedupe_identity=NEW.dedupe_identity AND
    (NEW.start IS NULL OR e.start IS NULL OR (time(NEW.start)<COALESCE(time(e.end),time(e.start,'+60 minutes')) AND time(e.start)<COALESCE(time(NEW.end),time(NEW.start,'+60 minutes'))))) THEN RAISE(ABORT,'agenda_duplicate') END;
END;
CREATE TRIGGER agenda_no_duplicate_update BEFORE UPDATE ON events
WHEN NEW.visibility='shared' AND NEW.review_status IN('pending','approved') AND NEW.dedupe_scope IS NOT NULL
BEGIN
  SELECT CASE WHEN EXISTS(SELECT 1 FROM events e WHERE e.id<>NEW.id AND e.visibility='shared' AND e.review_status IN('pending','approved') AND e.date=NEW.date AND e.subject_id IS NEW.subject_id AND e.dedupe_scope=NEW.dedupe_scope AND e.dedupe_identity=NEW.dedupe_identity AND
    (NEW.start IS NULL OR e.start IS NULL OR (time(NEW.start)<COALESCE(time(e.end),time(e.start,'+60 minutes')) AND time(e.start)<COALESCE(time(NEW.end),time(NEW.start,'+60 minutes'))))) THEN RAISE(ABORT,'agenda_duplicate') END;
END;
CREATE TABLE event_targets(event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,offering_id TEXT NOT NULL REFERENCES offerings(id),PRIMARY KEY(event_id,offering_id));
CREATE TABLE event_review_units(event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,unit_id TEXT NOT NULL,PRIMARY KEY(event_id,unit_id));
CREATE TABLE event_review_history(id TEXT PRIMARY KEY,event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,actor_id TEXT NOT NULL REFERENCES users(id),action TEXT NOT NULL,revision INTEGER NOT NULL,note TEXT NOT NULL DEFAULT '',created_at TEXT NOT NULL DEFAULT(strftime('%Y-%m-%dT%H:%M:%fZ','now')));
CREATE TABLE agenda_notifications(id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),event_id TEXT REFERENCES events(id) ON DELETE CASCADE,title TEXT NOT NULL,body TEXT NOT NULL,read_at TEXT,created_at TEXT NOT NULL DEFAULT(strftime('%Y-%m-%dT%H:%M:%fZ','now')));
CREATE INDEX agenda_notifications_user ON agenda_notifications(user_id,created_at);
CREATE INDEX event_review_queue ON events(review_status,date);
