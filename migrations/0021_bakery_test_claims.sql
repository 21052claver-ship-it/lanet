-- Additive test rewards; existing daily claims and ledger entries stay intact.
CREATE TABLE bakery_test_claims(
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  campaign TEXT NOT NULL,
  claimed_at INTEGER NOT NULL CHECK(claimed_at>=0),
  day TEXT NOT NULL
);
CREATE INDEX bakery_test_claim_lookup ON bakery_test_claims(user_id,campaign,claimed_at DESC);
CREATE TRIGGER bakery_test_credit AFTER INSERT ON bakery_test_claims BEGIN
  INSERT INTO ledger(id,user_id,amount,reason,ref,day)
  VALUES('bakery-test:'||NEW.id,NEW.user_id,1,'Pastís de prova · cada minut','bakery-test:'||NEW.id,NEW.day);
END;
