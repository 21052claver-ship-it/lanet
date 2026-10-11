-- Additive: assessment marks, published activities and all existing data stay intact.
CREATE TABLE grade_course_settings (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject_id TEXT NOT NULL REFERENCES subjects(id),
  equal_terms INTEGER NOT NULL DEFAULT 1 CHECK(equal_terms IN (0,1)),
  term1_weight REAL NOT NULL DEFAULT 33.33 CHECK(term1_weight BETWEEN 0 AND 100),
  term2_weight REAL NOT NULL DEFAULT 33.33 CHECK(term2_weight BETWEEN 0 AND 100),
  term3_weight REAL NOT NULL DEFAULT 33.34 CHECK(term3_weight BETWEEN 0 AND 100),
  limit_to_ten INTEGER NOT NULL DEFAULT 1 CHECK(limit_to_ten IN (0,1)),
  CHECK(ABS(term1_weight+term2_weight+term3_weight-100)<0.001),
  PRIMARY KEY(user_id,subject_id)
);
CREATE TABLE grade_bonuses (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject_id TEXT NOT NULL REFERENCES subjects(id),
  plus_id TEXT REFERENCES pluses(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  capacity INTEGER NOT NULL CHECK(capacity IN (1,2)),
  grade REAL CHECK(grade IS NULL OR (grade>=0 AND grade<=capacity*0.25)),
  created_at TEXT NOT NULL DEFAULT(strftime('%Y-%m-%dT%H:%M:%S','now'))
);
CREATE INDEX grade_bonuses_owner_subject ON grade_bonuses(user_id,subject_id);
CREATE UNIQUE INDEX grade_bonuses_source ON grade_bonuses(user_id,subject_id,plus_id) WHERE plus_id IS NOT NULL;
CREATE TRIGGER grade_bonus_capacity_insert BEFORE INSERT ON grade_bonuses
WHEN COALESCE((SELECT SUM(capacity) FROM grade_bonuses WHERE user_id=NEW.user_id AND subject_id=NEW.subject_id),0)+NEW.capacity>2 BEGIN
  SELECT RAISE(ABORT,'grade_bonus_limit');
END;
CREATE TRIGGER grade_bonus_capacity_update BEFORE UPDATE OF capacity,user_id,subject_id ON grade_bonuses
WHEN COALESCE((SELECT SUM(capacity) FROM grade_bonuses WHERE user_id=NEW.user_id AND subject_id=NEW.subject_id AND id!=OLD.id),0)+NEW.capacity>2 BEGIN
  SELECT RAISE(ABORT,'grade_bonus_limit');
END;
