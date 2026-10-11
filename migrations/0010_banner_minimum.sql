-- Only the opening minimum changes. Keep version locking and the existing debit trigger.
DROP TRIGGER banner_version;
CREATE TRIGGER banner_version BEFORE INSERT ON banners BEGIN
  SELECT (CASE
    WHEN COALESCE(NEW.previous_id,'') != COALESCE((SELECT id FROM banners ORDER BY rowid DESC LIMIT 1),'')
    THEN RAISE(ABORT,'bid_changed')
  END);
  SELECT (CASE
    WHEN NEW.amount < COALESCE((
      SELECT MAX(1,CAST(ceil(amount*pow(0.9,MAX(0,CAST(julianday('now')-julianday(created_at) AS INTEGER)))) AS INTEGER))*2
      FROM banners ORDER BY rowid DESC LIMIT 1
    ),1)
    THEN RAISE(ABORT,'bid_low')
  END);
END;
