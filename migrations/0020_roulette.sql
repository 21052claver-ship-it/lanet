-- A single insert settles the full spin. Ledger guards reject insufficient funds
-- and roll back the spin, debit and prize together. Duplicate requests do nothing.
CREATE TABLE roulette_spins(
 id TEXT PRIMARY KEY,
 user_id TEXT NOT NULL REFERENCES users(id),
 request_id TEXT NOT NULL,
 stake INTEGER NOT NULL CHECK(typeof(stake)='integer' AND stake BETWEEN 1 AND 1000),
 kind TEXT NOT NULL CHECK(kind IN('red','black','number')),
 number INTEGER,
 result INTEGER NOT NULL CHECK(typeof(result)='integer' AND result BETWEEN 0 AND 36),
 payout INTEGER NOT NULL,
 day TEXT NOT NULL,
 created_at TEXT NOT NULL DEFAULT(strftime('%Y-%m-%dT%H:%M:%fZ','now')),
 UNIQUE(user_id,request_id),
 CHECK((kind='number' AND typeof(number)='integer' AND number BETWEEN 0 AND 36) OR (kind IN('red','black') AND number IS NULL)),
 CHECK(payout=CASE
   WHEN kind='number' AND number=result THEN stake*36
   WHEN kind='red' AND result IN(1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36) THEN stake*2
   WHEN kind='black' AND result!=0 AND result NOT IN(1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36) THEN stake*2
   ELSE 0 END)
);
CREATE INDEX roulette_user ON roulette_spins(user_id,created_at);
CREATE TRIGGER roulette_settlement AFTER INSERT ON roulette_spins BEGIN
 INSERT INTO ledger(id,user_id,amount,reason,ref,day) VALUES('roulette:stake:'||NEW.id,NEW.user_id,-NEW.stake,'Ruleta · aposta','roulette:stake:'||NEW.id,NEW.day);
 INSERT INTO ledger(id,user_id,amount,reason,ref,day) SELECT 'roulette:prize:'||NEW.id,NEW.user_id,NEW.payout,'Ruleta · premi, número '||NEW.result,'roulette:prize:'||NEW.id,NEW.day WHERE NEW.payout>0;
END;
