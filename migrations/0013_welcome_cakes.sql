-- The ledger is the sole authority for balances. One stable reference per person
-- also recognises earlier demonstration welcome credits without adding another.
CREATE TRIGGER welcome_google_insert AFTER INSERT ON users
WHEN NEW.google_sub IS NOT NULL
BEGIN
  INSERT INTO ledger(id,user_id,amount,reason,ref,day)
  VALUES('welcome-'||NEW.id,NEW.id,5,'Pastissos de benvinguda','welcome-'||NEW.id,date('now'))
  ON CONFLICT(ref) DO NOTHING;
END;

CREATE TRIGGER welcome_google_link AFTER UPDATE OF google_sub ON users
WHEN OLD.google_sub IS NULL AND NEW.google_sub IS NOT NULL
BEGIN
  INSERT INTO ledger(id,user_id,amount,reason,ref,day)
  VALUES('welcome-'||NEW.id,NEW.id,5,'Pastissos de benvinguda','welcome-'||NEW.id,date('now'))
  ON CONFLICT(ref) DO NOTHING;
END;

-- Existing Google members receive the same one-time gift; keep previous earnings.
INSERT INTO ledger(id,user_id,amount,reason,ref,day)
SELECT 'welcome-'||id,id,5,'Pastissos de benvinguda','welcome-'||id,date('now')
FROM users WHERE google_sub IS NOT NULL
ON CONFLICT(ref) DO NOTHING;
