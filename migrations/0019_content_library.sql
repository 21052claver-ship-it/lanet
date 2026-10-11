CREATE TABLE content_library (
  id TEXT PRIMARY KEY,
  group_id TEXT NOT NULL REFERENCES groups(id),
  draft TEXT NOT NULL CHECK(json_valid(draft) AND json_type(draft)='object'),
  published TEXT CHECK(published IS NULL OR (json_valid(published) AND json_type(published)='object')),
  state TEXT NOT NULL DEFAULT 'draft' CHECK(state IN('draft','pending','published')),
  revision INTEGER NOT NULL DEFAULT 1 CHECK(revision>=1),
  created_by TEXT NOT NULL REFERENCES users(id),
  updated_by TEXT NOT NULL REFERENCES users(id),
  reviewed_by TEXT REFERENCES users(id),
  reviewed_at TEXT,
  updated_at TEXT NOT NULL DEFAULT(strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  last_operation TEXT NOT NULL,
  CHECK((published IS NULL AND reviewed_by IS NULL AND reviewed_at IS NULL) OR
    (published IS NOT NULL AND reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL)),
  CHECK(state!='published' OR (published IS NOT NULL AND draft=published))
);
CREATE INDEX content_library_group ON content_library(group_id,state);
CREATE TABLE content_library_history (
  id TEXT PRIMARY KEY,
  entry_id TEXT NOT NULL REFERENCES content_library(id),
  revision INTEGER NOT NULL,
  actor_id TEXT NOT NULL REFERENCES users(id),
  action TEXT NOT NULL CHECK(action IN('create','draft','submit','approve','return','withdraw')),
  created_at TEXT NOT NULL DEFAULT(strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE(entry_id,revision)
);
