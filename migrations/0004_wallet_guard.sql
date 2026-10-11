-- RAISE(ABORT) remains effective even inside an INSERT OR IGNORE purchase.
CREATE TRIGGER ledger_funds_guard BEFORE INSERT ON ledger
WHEN (SELECT balance+NEW.amount FROM users WHERE id=NEW.user_id)<0
BEGIN SELECT RAISE(ABORT,'insufficient_balance'); END;
