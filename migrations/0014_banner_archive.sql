ALTER TABLE banners ADD COLUMN archived INTEGER NOT NULL DEFAULT 0 CHECK(archived IN(0,1));
DROP TRIGGER banner_version;
CREATE TRIGGER banner_version BEFORE INSERT ON banners BEGIN
  SELECT (CASE WHEN NEW.archived != 0 THEN RAISE(ABORT,'bid_archived') END);
  SELECT (CASE WHEN COALESCE(NEW.previous_id,'') != COALESCE((SELECT id FROM banners WHERE archived=0 ORDER BY rowid DESC LIMIT 1),'') THEN RAISE(ABORT,'bid_changed') END);
  SELECT (CASE WHEN NEW.amount < COALESCE((SELECT MAX(1,CAST(ceil(amount*pow(0.9,MAX(0,CAST(julianday('now')-julianday(created_at) AS INTEGER)))) AS INTEGER))*2 FROM banners WHERE archived=0 ORDER BY rowid DESC LIMIT 1),1) THEN RAISE(ABORT,'bid_low') END);
END;
