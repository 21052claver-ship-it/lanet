CREATE TABLE pau_simulations (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  value TEXT NOT NULL CHECK(json_valid(value) AND json_type(value)='object'),
  revision INTEGER NOT NULL DEFAULT 1 CHECK(revision>=1),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
