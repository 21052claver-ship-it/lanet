ALTER TABLE templates ADD COLUMN assessment_type TEXT NOT NULL DEFAULT 'other_activity'
  CHECK(assessment_type IN('partial1','partial2','term','writing','assignment','presentation','other_exam','other_activity'));
ALTER TABLE grade_entries ADD COLUMN assessment_type TEXT NOT NULL DEFAULT 'other_activity'
  CHECK(assessment_type IN('partial1','partial2','term','writing','assignment','presentation','other_exam','other_activity'));

-- Only blank, unchanged legacy activities transfer their weights to the term exam.
CREATE TABLE _assessment_blank_sheets AS
SELECT user_id,subject_id,term,SUM(CASE WHEN position IN(2,3) THEN weight ELSE 0 END) AS term_weight
FROM grade_entries GROUP BY user_id,subject_id,term
HAVING COUNT(*)=4 AND SUM(CASE WHEN custom=0 AND (
  (position=0 AND category='exam' AND title='Prova 1') OR
  (position=1 AND category='exam' AND title='Prova 2') OR
  (position=2 AND category='activity' AND title='Activitats' AND date IS NULL AND grade IS NULL) OR
  (position=3 AND category='participation' AND title='Participació' AND date IS NULL AND grade IS NULL)
) THEN 1 ELSE 0 END)=4;
CREATE TABLE _assessment_default_templates AS
SELECT offering_id,term,SUM(CASE WHEN position IN(2,3) THEN weight ELSE 0 END) AS term_weight
FROM templates GROUP BY offering_id,term
HAVING COUNT(*)=4 AND SUM(CASE WHEN
  (position=0 AND category='exam' AND title='Prova 1') OR
  (position=1 AND category='exam' AND title='Prova 2') OR
  (position=2 AND category='activity' AND title='Activitats' AND date IS NULL) OR
  (position=3 AND category='participation' AND title='Participació' AND date IS NULL)
THEN 1 ELSE 0 END)=4;

UPDATE grade_entries SET assessment_type=CASE
  WHEN category='exam' AND title IN('Prova 1','Parcial 1') THEN 'partial1'
  WHEN category='exam' AND title IN('Prova 2','Parcial 2') THEN 'partial2'
  WHEN category='exam' AND title IN('Trimestral','Examen trimestral') THEN 'term'
  WHEN category='exam' THEN 'other_exam'
  WHEN title LIKE 'Redacció %' THEN 'writing'
  WHEN title LIKE 'Entrega %' THEN 'assignment'
  WHEN title LIKE 'Presentació %' THEN 'presentation'
  ELSE 'other_activity' END;
UPDATE templates SET assessment_type=CASE
  WHEN category='exam' AND title IN('Prova 1','Parcial 1') THEN 'partial1'
  WHEN category='exam' AND title IN('Prova 2','Parcial 2') THEN 'partial2'
  WHEN category='exam' AND title IN('Trimestral','Examen trimestral') THEN 'term'
  WHEN category='exam' THEN 'other_exam'
  WHEN title LIKE 'Redacció %' THEN 'writing'
  WHEN title LIKE 'Entrega %' THEN 'assignment'
  WHEN title LIKE 'Presentació %' THEN 'presentation'
  ELSE 'other_activity' END;

UPDATE grade_entries SET title=CASE
  WHEN category='exam' AND title='Prova 1' AND custom=0 THEN 'Parcial 1'
  WHEN category='exam' AND title='Prova 2' AND custom=0 THEN 'Parcial 2'
  WHEN category='participation' AND title='Participació' THEN 'Activitat anterior'
  ELSE title END,
  category=CASE WHEN category='participation' THEN 'activity' ELSE category END;
UPDATE templates SET title=CASE
  WHEN category='exam' AND title='Prova 1' THEN 'Parcial 1'
  WHEN category='exam' AND title='Prova 2' THEN 'Parcial 2'
  WHEN category='participation' AND title='Participació' THEN 'Activitat anterior'
  ELSE title END,
  category=CASE WHEN category='participation' THEN 'activity' ELSE category END;

UPDATE grade_entries SET category='exam',assessment_type='term',title='Trimestral',
  weight=(SELECT term_weight FROM _assessment_blank_sheets s WHERE s.user_id=grade_entries.user_id AND s.subject_id=grade_entries.subject_id AND s.term=grade_entries.term)
WHERE position=2 AND EXISTS(SELECT 1 FROM _assessment_blank_sheets s WHERE s.user_id=grade_entries.user_id AND s.subject_id=grade_entries.subject_id AND s.term=grade_entries.term);
UPDATE grade_entries SET category='activity',assessment_type='writing',title='Redacció 1',weight=0
WHERE position=3 AND EXISTS(SELECT 1 FROM _assessment_blank_sheets s WHERE s.user_id=grade_entries.user_id AND s.subject_id=grade_entries.subject_id AND s.term=grade_entries.term);
UPDATE templates SET category='exam',assessment_type='term',title='Trimestral',
  weight=(SELECT term_weight FROM _assessment_default_templates s WHERE s.offering_id=templates.offering_id AND s.term=templates.term)
WHERE position=2 AND EXISTS(SELECT 1 FROM _assessment_default_templates s WHERE s.offering_id=templates.offering_id AND s.term=templates.term);
UPDATE templates SET category='activity',assessment_type='writing',title='Redacció 1',weight=0
WHERE position=3 AND EXISTS(SELECT 1 FROM _assessment_default_templates s WHERE s.offering_id=templates.offering_id AND s.term=templates.term);

WITH slots(assessment_type,n,title,position,category) AS (VALUES
 ('partial1',1,'Parcial 1',0,'exam'),('partial2',1,'Parcial 2',1,'exam'),('term',1,'Trimestral',2,'exam'),
 ('writing',1,'Redacció 1',3,'activity'),('writing',2,'Redacció 2',4,'activity'),('writing',3,'Redacció 3',5,'activity'),
 ('assignment',1,'Entrega 1',6,'activity'),('assignment',2,'Entrega 2',7,'activity'),('assignment',3,'Entrega 3',8,'activity'),
 ('presentation',1,'Presentació 1',9,'activity'),('presentation',2,'Presentació 2',10,'activity'),('presentation',3,'Presentació 3',11,'activity'))
, counts AS MATERIALIZED (SELECT offering_id,term,assessment_type,COUNT(*) AS n FROM templates GROUP BY offering_id,term,assessment_type)
INSERT OR IGNORE INTO templates(id,offering_id,term,category,title,date,weight,position,assessment_type)
SELECT 'assessment:'||s.offering_id||':'||s.term||':'||v.assessment_type||':'||v.n,s.offering_id,s.term,v.category,v.title,NULL,0,v.position,v.assessment_type
FROM (SELECT DISTINCT offering_id,term FROM templates) s CROSS JOIN slots v
WHERE v.n>COALESCE((SELECT n FROM counts t WHERE t.offering_id=s.offering_id AND t.term=s.term AND t.assessment_type=v.assessment_type),0);

WITH slots(assessment_type,n,title,position,category) AS (VALUES
 ('partial1',1,'Parcial 1',0,'exam'),('partial2',1,'Parcial 2',1,'exam'),('term',1,'Trimestral',2,'exam'),
 ('writing',1,'Redacció 1',3,'activity'),('writing',2,'Redacció 2',4,'activity'),('writing',3,'Redacció 3',5,'activity'),
 ('assignment',1,'Entrega 1',6,'activity'),('assignment',2,'Entrega 2',7,'activity'),('assignment',3,'Entrega 3',8,'activity'),
 ('presentation',1,'Presentació 1',9,'activity'),('presentation',2,'Presentació 2',10,'activity'),('presentation',3,'Presentació 3',11,'activity'))
, counts AS MATERIALIZED (SELECT user_id,subject_id,term,assessment_type,COUNT(*) AS n FROM grade_entries GROUP BY user_id,subject_id,term,assessment_type)
INSERT OR IGNORE INTO grade_entries(id,user_id,subject_id,term,category,title,date,grade,weight,position,assessment_type)
SELECT 'assessment:'||s.user_id||':'||s.subject_id||':'||s.term||':'||v.assessment_type||':'||v.n,s.user_id,s.subject_id,s.term,v.category,v.title,NULL,NULL,0,v.position,v.assessment_type
FROM (SELECT DISTINCT g.user_id,g.subject_id,g.term FROM grade_entries g
 JOIN enrollments e ON e.user_id=g.user_id JOIN offerings o ON o.id=e.offering_id AND o.subject_id=g.subject_id) s CROSS JOIN slots v
WHERE v.n>COALESCE((SELECT n FROM counts g WHERE g.user_id=s.user_id AND g.subject_id=s.subject_id AND g.term=s.term AND g.assessment_type=v.assessment_type),0);

DROP TABLE _assessment_blank_sheets;
DROP TABLE _assessment_default_templates;
