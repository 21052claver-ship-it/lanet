ALTER TABLE events ADD COLUMN display_kind TEXT NOT NULL DEFAULT '' CHECK(display_kind IN ('','exam','test','task','deadline','reminder','event'));
CREATE TABLE IF NOT EXISTS event_progress (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  done INTEGER NOT NULL DEFAULT 0 CHECK(done IN (0,1)),
  PRIMARY KEY(user_id,event_id)
);
