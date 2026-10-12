-- Rebuild only the market table, preserving rowids, data and related tables.
-- Apply transactionally after a verified private backup.
PRAGMA defer_foreign_keys=on;
DROP TRIGGER prediction_creation_guard;
DROP TRIGGER prediction_market_guard;
DROP TRIGGER prediction_bet_guard;
DROP TRIGGER prediction_bet_debit;
DROP TRIGGER prediction_action_guard;
DROP TRIGGER prediction_action_apply;
DROP TRIGGER prediction_market_settle;
DROP TRIGGER prediction_bets_no_update;
DROP TRIGGER prediction_bets_no_delete;
DROP TRIGGER prediction_markets_no_delete;
DROP TRIGGER prediction_actions_no_update;
DROP TRIGGER prediction_actions_no_delete;
DROP TRIGGER prediction_settlements_no_update;
DROP TRIGGER prediction_settlements_no_delete;
CREATE TABLE prediction_markets_new (
 id TEXT PRIMARY KEY, creator_id TEXT NOT NULL REFERENCES users(id),
 request_id TEXT NOT NULL, resolver_id TEXT NOT NULL REFERENCES users(id),
 title TEXT NOT NULL CHECK(length(title) BETWEEN 8 AND 140),
 option_a TEXT NOT NULL CHECK(length(option_a) BETWEEN 1 AND 60),
 option_b TEXT NOT NULL CHECK(length(option_b) BETWEEN 1 AND 60),
 rules TEXT NOT NULL CHECK(length(rules) BETWEEN 20 AND 1200),
 closes_at INTEGER NOT NULL, resolve_by INTEGER NOT NULL CHECK(resolve_by=closes_at+604800),
 state TEXT NOT NULL DEFAULT 'pending' CHECK(state IN('pending','open','resolved','cancelled')),
 result TEXT CHECK(result IN('A','B')), reason TEXT NOT NULL DEFAULT '',
 settled_at INTEGER, created_at INTEGER NOT NULL DEFAULT(unixepoch()),
 UNIQUE(creator_id,request_id),
 CHECK((state='resolved' AND result IS NOT NULL) OR (state<>'resolved' AND result IS NULL)),
 CHECK((state IN('resolved','cancelled') AND settled_at IS NOT NULL) OR (state IN('pending','open') AND settled_at IS NULL))
);
INSERT INTO prediction_markets_new(rowid,id,creator_id,request_id,resolver_id,title,option_a,option_b,rules,closes_at,resolve_by,state,result,reason,settled_at,created_at) SELECT rowid,id,creator_id,request_id,resolver_id,title,option_a,option_b,rules,closes_at,resolve_by,state,result,reason,settled_at,created_at FROM prediction_markets;
DROP TABLE prediction_markets;
ALTER TABLE prediction_markets_new RENAME TO prediction_markets;
CREATE INDEX prediction_deadlines ON prediction_markets(state,resolve_by,closes_at);
CREATE INDEX prediction_creator ON prediction_markets(creator_id,state);
CREATE INDEX prediction_resolver ON prediction_markets(resolver_id,state);
CREATE TRIGGER prediction_creation_guard BEFORE INSERT ON prediction_markets BEGIN
 SELECT (CASE WHEN NEW.closes_at<unixepoch()+300 OR NEW.closes_at>unixepoch()+15552000
 OR NEW.state<>(CASE WHEN NEW.creator_id=NEW.resolver_id THEN 'open' ELSE 'pending' END) OR NEW.result IS NOT NULL OR NEW.reason<>'' OR NEW.settled_at IS NOT NULL
 OR lower(NEW.option_a)=lower(NEW.option_b)
 OR NOT EXISTS(SELECT 1 FROM users WHERE id=NEW.resolver_id AND disabled=0 AND google_sub IS NOT NULL)
 THEN RAISE(ABORT,'prediction_invalid_creation') END);
 SELECT (CASE WHEN (SELECT COUNT(*) FROM prediction_markets WHERE creator_id=NEW.creator_id AND state IN('pending','open'))>=10 THEN RAISE(ABORT,'prediction_market_limit') END);
 SELECT (CASE WHEN (SELECT COUNT(*) FROM prediction_markets WHERE creator_id=NEW.creator_id AND created_at>unixepoch()-3600)>=5 THEN RAISE(ABORT,'prediction_create_rate') END);
END;
CREATE TRIGGER prediction_market_guard BEFORE UPDATE ON prediction_markets BEGIN
 SELECT (CASE WHEN NEW.id<>OLD.id OR NEW.creator_id<>OLD.creator_id OR NEW.resolver_id<>OLD.resolver_id
 OR NEW.request_id<>OLD.request_id OR NEW.title<>OLD.title OR NEW.option_a<>OLD.option_a OR NEW.option_b<>OLD.option_b
 OR NEW.rules<>OLD.rules OR NEW.closes_at<>OLD.closes_at OR NEW.resolve_by<>OLD.resolve_by OR NEW.created_at<>OLD.created_at
 OR OLD.state IN('resolved','cancelled')
 OR NOT ((OLD.state='pending' AND NEW.state IN('open','cancelled')) OR (OLD.state='open' AND NEW.state IN('resolved','cancelled')))
 THEN RAISE(ABORT,'prediction_immutable') END);
END;
CREATE TRIGGER prediction_bet_guard BEFORE INSERT ON prediction_bets BEGIN
 SELECT (CASE WHEN NOT EXISTS(SELECT 1 FROM prediction_markets WHERE id=NEW.market_id AND state='open' AND closes_at>unixepoch() AND resolver_id<>NEW.user_id)
 THEN RAISE(ABORT,'prediction_betting_closed') END);
 SELECT (CASE WHEN EXISTS(SELECT 1 FROM prediction_bets WHERE market_id=NEW.market_id AND user_id=NEW.user_id AND choice<>NEW.choice)
 THEN RAISE(ABORT,'prediction_side_locked') END);
 SELECT (CASE WHEN NEW.stake+COALESCE((SELECT SUM(stake) FROM prediction_bets WHERE market_id=NEW.market_id),0)>1000000
 THEN RAISE(ABORT,'prediction_pool_limit') END);
END;
CREATE TRIGGER prediction_bet_debit AFTER INSERT ON prediction_bets BEGIN
 INSERT INTO ledger(id,user_id,amount,reason,ref,day)
 VALUES('prediction:bet:'||NEW.id,NEW.user_id,-NEW.stake,'Prediccions · aposta','prediction:bet:'||NEW.id,NEW.day);
END;
CREATE TRIGGER prediction_action_guard BEFORE INSERT ON prediction_actions BEGIN
 SELECT (CASE WHEN NOT EXISTS(
 SELECT 1 FROM prediction_markets m WHERE m.id=NEW.market_id AND (
 (NEW.kind='accept' AND m.state='pending' AND m.resolver_id=NEW.actor_id AND m.closes_at>unixepoch()) OR
 (NEW.kind='reject' AND m.state='pending' AND m.resolver_id=NEW.actor_id) OR
 (NEW.kind='resolve' AND m.state='open' AND m.resolver_id=NEW.actor_id AND m.closes_at<=unixepoch() AND m.resolve_by>unixepoch()) OR
 (NEW.kind='cancel' AND m.state IN('pending','open') AND (
 m.resolver_id=NEW.actor_id OR EXISTS(SELECT 1 FROM users WHERE id=NEW.actor_id AND role='admin') OR
 (m.creator_id=NEW.actor_id AND NOT EXISTS(SELECT 1 FROM prediction_bets WHERE market_id=m.id))))
 )) THEN RAISE(ABORT,'prediction_action_unavailable') END);
END;
CREATE TRIGGER prediction_action_apply AFTER INSERT ON prediction_actions BEGIN
 UPDATE prediction_markets SET state=(CASE NEW.kind WHEN 'accept' THEN 'open' WHEN 'resolve' THEN 'resolved' ELSE 'cancelled' END),
 result=NEW.choice,reason=NEW.reason,settled_at=(CASE WHEN NEW.kind='accept' THEN NULL ELSE unixepoch() END) WHERE id=NEW.market_id;
END;
CREATE TRIGGER prediction_market_settle AFTER UPDATE OF state ON prediction_markets WHEN NEW.state IN('resolved','cancelled') BEGIN
 INSERT INTO prediction_settlements(market_id,user_id,stake,payout)
 SELECT * FROM (
 WITH positions AS (
 SELECT user_id,choice,SUM(stake) stake FROM prediction_bets WHERE market_id=NEW.id GROUP BY user_id,choice
 ), totals AS (
 SELECT COALESCE(SUM(stake),0) pot,COALESCE(SUM((CASE WHEN choice=NEW.result THEN stake ELSE 0 END)),0) winning FROM positions
 ), winners AS (
 SELECT p.user_id,p.stake*t.pot/t.winning base,(p.stake*t.pot)%t.winning remainder,t.pot
 FROM positions p CROSS JOIN totals t WHERE NEW.state='resolved' AND t.winning>0 AND p.choice=NEW.result
 ), ranked AS (
 SELECT *,ROW_NUMBER() OVER(ORDER BY remainder DESC,user_id COLLATE BINARY) rank,pot-SUM(base) OVER() leftover FROM winners
 )
 SELECT NEW.id,p.user_id,p.stake,(CASE WHEN NEW.state='cancelled' OR t.winning=0 THEN p.stake
 ELSE COALESCE(r.base+(CASE WHEN r.rank<=r.leftover THEN 1 ELSE 0 END),0) END) payout
 FROM positions p CROSS JOIN totals t LEFT JOIN ranked r ON r.user_id=p.user_id
 );
 INSERT INTO ledger(id,user_id,amount,reason,ref,day)
 SELECT 'prediction:settle:'||NEW.id||':'||s.user_id,s.user_id,s.payout,
 (CASE WHEN NEW.state='cancelled' OR NOT EXISTS(SELECT 1 FROM prediction_bets WHERE market_id=NEW.id AND choice=NEW.result)
 THEN 'Prediccions · retorn' ELSE 'Prediccions · repartiment' END),
 'prediction:settle:'||NEW.id||':'||s.user_id,date('now')
 FROM prediction_settlements s WHERE s.market_id=NEW.id AND s.payout>0;
END;
CREATE TRIGGER prediction_bets_no_update BEFORE UPDATE ON prediction_bets BEGIN SELECT RAISE(ABORT,'prediction_immutable'); END;
CREATE TRIGGER prediction_bets_no_delete BEFORE DELETE ON prediction_bets BEGIN SELECT RAISE(ABORT,'prediction_immutable'); END;
CREATE TRIGGER prediction_markets_no_delete BEFORE DELETE ON prediction_markets BEGIN SELECT RAISE(ABORT,'prediction_immutable'); END;
CREATE TRIGGER prediction_actions_no_update BEFORE UPDATE ON prediction_actions BEGIN SELECT RAISE(ABORT,'prediction_immutable'); END;
CREATE TRIGGER prediction_actions_no_delete BEFORE DELETE ON prediction_actions BEGIN SELECT RAISE(ABORT,'prediction_immutable'); END;
CREATE TRIGGER prediction_settlements_no_update BEFORE UPDATE ON prediction_settlements BEGIN SELECT RAISE(ABORT,'prediction_immutable'); END;
CREATE TRIGGER prediction_settlements_no_delete BEFORE DELETE ON prediction_settlements BEGIN SELECT RAISE(ABORT,'prediction_immutable'); END;

-- Clear deferred drop bookkeeping after restoring the same parent keys.
PRAGMA defer_foreign_keys=off;
