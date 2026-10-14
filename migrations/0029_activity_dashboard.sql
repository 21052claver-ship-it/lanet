-- Bounded telemetry only: no event log, URLs, IPs, tokens or content copies.
CREATE TABLE activity_daily (
  day TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  first_seen INTEGER NOT NULL,
  last_seen INTEGER NOT NULL,
  page TEXT NOT NULL,
  area TEXT NOT NULL,
  pulse_at INTEGER NOT NULL DEFAULT 0,
  action_at INTEGER NOT NULL DEFAULT 0,
  error_at INTEGER NOT NULL DEFAULT 0,
  pulses INTEGER NOT NULL DEFAULT 0,
  actions INTEGER NOT NULL DEFAULT 0,
  errors INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY(day,user_id)
) WITHOUT ROWID;
CREATE INDEX activity_recent ON activity_daily(last_seen DESC);
CREATE TABLE activity_days (
  day TEXT PRIMARY KEY,
  users INTEGER NOT NULL DEFAULT 0,
  pulses INTEGER NOT NULL DEFAULT 0,
  actions INTEGER NOT NULL DEFAULT 0,
  errors INTEGER NOT NULL DEFAULT 0
) WITHOUT ROWID;
CREATE TABLE activity_areas (
  day TEXT NOT NULL,
  area TEXT NOT NULL,
  pulses INTEGER NOT NULL DEFAULT 0,
  actions INTEGER NOT NULL DEFAULT 0,
  errors INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY(day,area)
) WITHOUT ROWID;
CREATE TRIGGER activity_first AFTER INSERT ON activity_daily BEGIN
  INSERT INTO activity_days(day,users,pulses,actions,errors)
    VALUES(NEW.day,1,NEW.pulses,NEW.actions,NEW.errors)
    ON CONFLICT(day) DO UPDATE SET users=users+1,pulses=pulses+NEW.pulses,
      actions=actions+NEW.actions,errors=errors+NEW.errors;
  INSERT INTO activity_areas(day,area,pulses,actions,errors)
    VALUES(NEW.day,NEW.area,NEW.pulses,NEW.actions,NEW.errors)
    ON CONFLICT(day,area) DO UPDATE SET pulses=pulses+NEW.pulses,
      actions=actions+NEW.actions,errors=errors+NEW.errors;
END;
CREATE TRIGGER activity_next AFTER UPDATE ON activity_daily BEGIN
  UPDATE activity_days SET pulses=pulses+NEW.pulses-OLD.pulses,
    actions=actions+NEW.actions-OLD.actions,errors=errors+NEW.errors-OLD.errors WHERE day=NEW.day;
  INSERT INTO activity_areas(day,area,pulses,actions,errors)
    VALUES(NEW.day,NEW.area,NEW.pulses-OLD.pulses,NEW.actions-OLD.actions,NEW.errors-OLD.errors)
    ON CONFLICT(day,area) DO UPDATE SET pulses=pulses+NEW.pulses-OLD.pulses,
      actions=actions+NEW.actions-OLD.actions,errors=errors+NEW.errors-OLD.errors;
END;
-- Inventory is maintained on real data changes, never by listing the R2 bucket.
CREATE TABLE activity_inventory (
  id INTEGER PRIMARY KEY CHECK(id=1),
  users INTEGER NOT NULL, enabled INTEGER NOT NULL,
  files INTEGER NOT NULL, file_bytes INTEGER NOT NULL
);
INSERT INTO activity_inventory SELECT 1,COUNT(*),COALESCE(SUM(disabled=0),0),
  (SELECT COUNT(*) FROM files),(SELECT COALESCE(SUM(size),0) FROM files) FROM users;
CREATE TRIGGER activity_user_added AFTER INSERT ON users BEGIN
  UPDATE activity_inventory SET users=users+1,enabled=enabled+(NEW.disabled=0) WHERE id=1;
END;
CREATE TRIGGER activity_user_removed AFTER DELETE ON users BEGIN
  UPDATE activity_inventory SET users=users-1,enabled=enabled-(OLD.disabled=0) WHERE id=1;
END;
CREATE TRIGGER activity_user_status AFTER UPDATE OF disabled ON users WHEN OLD.disabled!=NEW.disabled BEGIN
  UPDATE activity_inventory SET enabled=enabled+(NEW.disabled=0)-(OLD.disabled=0) WHERE id=1;
END;
CREATE TRIGGER activity_file_added AFTER INSERT ON files BEGIN
  UPDATE activity_inventory SET files=files+1,file_bytes=file_bytes+NEW.size WHERE id=1;
END;
CREATE TRIGGER activity_file_removed AFTER DELETE ON files BEGIN
  UPDATE activity_inventory SET files=files-1,file_bytes=file_bytes-OLD.size WHERE id=1;
END;
CREATE TRIGGER activity_file_resized AFTER UPDATE OF size ON files WHEN OLD.size!=NEW.size BEGIN
  UPDATE activity_inventory SET file_bytes=file_bytes+NEW.size-OLD.size WHERE id=1;
END;
INSERT INTO settings(key,value) VALUES('activity_started_at',strftime('%Y-%m-%dT%H:%M:%SZ','now'));
