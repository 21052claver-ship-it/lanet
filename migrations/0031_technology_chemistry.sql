-- Add Chemistry to the technological route; periods confirmed by Marc on 2026-10-17.

-- Monday/Tuesday 09:10; Wednesday/Thursday 08:10. Alternatives to Drawing/Business.

-- Additive catalog only. Preserve all existing users, enrollments, grades and templates.

INSERT INTO offerings(id,subject_id,group_id,teacher,variant,path,block,active,schedule_version) VALUES
('2B-chem-biosca','chem','2B','Mireia Biosca','Aula 3','science','speciality',1,'BAT2-2026-27-v1'),
('2B-chem-solsona','chem','2B','Kiko Solsona','Aula 6','science','speciality',1,'BAT2-2026-27-v1')
ON CONFLICT(id) DO UPDATE SET subject_id=excluded.subject_id,group_id=excluded.group_id,teacher=excluded.teacher,variant=excluded.variant,path=excluded.path,block=excluded.block,active=excluded.active,schedule_version=excluded.schedule_version;

INSERT INTO slots(id,offering_id,day,start,end,room,teacher,note) VALUES
('2B-chem-biosca-0-1','2B-chem-biosca',0,'09:10','10:10','3','Mireia Biosca',''),
('2B-chem-biosca-1-1','2B-chem-biosca',1,'09:10','10:10','3','Mireia Biosca',''),
('2B-chem-biosca-2-0','2B-chem-biosca',2,'08:10','09:10','3','Mireia Biosca',''),
('2B-chem-biosca-3-0','2B-chem-biosca',3,'08:10','09:10','3','Mireia Biosca',''),
('2B-chem-solsona-0-1','2B-chem-solsona',0,'09:10','10:10','6','Kiko Solsona',''),
('2B-chem-solsona-1-1','2B-chem-solsona',1,'09:10','10:10','6','Kiko Solsona',''),
('2B-chem-solsona-2-0','2B-chem-solsona',2,'08:10','09:10','6','Kiko Solsona',''),
('2B-chem-solsona-3-0','2B-chem-solsona',3,'08:10','09:10','6','Kiko Solsona','')
ON CONFLICT(id) DO UPDATE SET offering_id=excluded.offering_id,day=excluded.day,start=excluded.start,end=excluded.end,room=excluded.room,teacher=excluded.teacher,note=excluded.note;

WITH defaults(id,offering_id,term,category,title,date,weight,position,assessment_type) AS (
VALUES ('2B-chem-biosca-1-0','2B-chem-biosca',1,'exam','Parcial 1',NULL,30,0,'partial1'),
('2B-chem-biosca-1-1','2B-chem-biosca',1,'exam','Parcial 2',NULL,40,1,'partial2'),
('2B-chem-biosca-1-2','2B-chem-biosca',1,'exam','Trimestral',NULL,30,2,'term'),
('2B-chem-biosca-1-3','2B-chem-biosca',1,'activity','Redacció 1',NULL,0,3,'writing'),
('2B-chem-biosca-1-4','2B-chem-biosca',1,'activity','Redacció 2',NULL,0,4,'writing'),
('2B-chem-biosca-1-5','2B-chem-biosca',1,'activity','Redacció 3',NULL,0,5,'writing'),
('2B-chem-biosca-1-6','2B-chem-biosca',1,'activity','Entrega 1',NULL,0,6,'assignment'),
('2B-chem-biosca-1-7','2B-chem-biosca',1,'activity','Entrega 2',NULL,0,7,'assignment'),
('2B-chem-biosca-1-8','2B-chem-biosca',1,'activity','Entrega 3',NULL,0,8,'assignment'),
('2B-chem-biosca-1-9','2B-chem-biosca',1,'activity','Presentació 1',NULL,0,9,'presentation'),
('2B-chem-biosca-1-10','2B-chem-biosca',1,'activity','Presentació 2',NULL,0,10,'presentation'),
('2B-chem-biosca-1-11','2B-chem-biosca',1,'activity','Presentació 3',NULL,0,11,'presentation'),
('2B-chem-biosca-2-0','2B-chem-biosca',2,'exam','Parcial 1',NULL,30,0,'partial1'),
('2B-chem-biosca-2-1','2B-chem-biosca',2,'exam','Parcial 2',NULL,40,1,'partial2'),
('2B-chem-biosca-2-2','2B-chem-biosca',2,'exam','Trimestral',NULL,30,2,'term'),
('2B-chem-biosca-2-3','2B-chem-biosca',2,'activity','Redacció 1',NULL,0,3,'writing'),
('2B-chem-biosca-2-4','2B-chem-biosca',2,'activity','Redacció 2',NULL,0,4,'writing'),
('2B-chem-biosca-2-5','2B-chem-biosca',2,'activity','Redacció 3',NULL,0,5,'writing'),
('2B-chem-biosca-2-6','2B-chem-biosca',2,'activity','Entrega 1',NULL,0,6,'assignment'),
('2B-chem-biosca-2-7','2B-chem-biosca',2,'activity','Entrega 2',NULL,0,7,'assignment'),
('2B-chem-biosca-2-8','2B-chem-biosca',2,'activity','Entrega 3',NULL,0,8,'assignment'),
('2B-chem-biosca-2-9','2B-chem-biosca',2,'activity','Presentació 1',NULL,0,9,'presentation'),
('2B-chem-biosca-2-10','2B-chem-biosca',2,'activity','Presentació 2',NULL,0,10,'presentation'),
('2B-chem-biosca-2-11','2B-chem-biosca',2,'activity','Presentació 3',NULL,0,11,'presentation'),
('2B-chem-biosca-3-0','2B-chem-biosca',3,'exam','Parcial 1',NULL,30,0,'partial1'),
('2B-chem-biosca-3-1','2B-chem-biosca',3,'exam','Parcial 2',NULL,40,1,'partial2'),
('2B-chem-biosca-3-2','2B-chem-biosca',3,'exam','Trimestral',NULL,30,2,'term'),
('2B-chem-biosca-3-3','2B-chem-biosca',3,'activity','Redacció 1',NULL,0,3,'writing'),
('2B-chem-biosca-3-4','2B-chem-biosca',3,'activity','Redacció 2',NULL,0,4,'writing'),
('2B-chem-biosca-3-5','2B-chem-biosca',3,'activity','Redacció 3',NULL,0,5,'writing'),
('2B-chem-biosca-3-6','2B-chem-biosca',3,'activity','Entrega 1',NULL,0,6,'assignment'),
('2B-chem-biosca-3-7','2B-chem-biosca',3,'activity','Entrega 2',NULL,0,7,'assignment'),
('2B-chem-biosca-3-8','2B-chem-biosca',3,'activity','Entrega 3',NULL,0,8,'assignment'),
('2B-chem-biosca-3-9','2B-chem-biosca',3,'activity','Presentació 1',NULL,0,9,'presentation'),
('2B-chem-biosca-3-10','2B-chem-biosca',3,'activity','Presentació 2',NULL,0,10,'presentation'),
('2B-chem-biosca-3-11','2B-chem-biosca',3,'activity','Presentació 3',NULL,0,11,'presentation')
)
INSERT OR IGNORE INTO templates(id,offering_id,term,category,title,date,weight,position,assessment_type)
SELECT * FROM defaults WHERE NOT EXISTS(SELECT 1 FROM templates WHERE offering_id='2B-chem-biosca');

WITH defaults(id,offering_id,term,category,title,date,weight,position,assessment_type) AS (
VALUES ('2B-chem-solsona-1-0','2B-chem-solsona',1,'exam','Parcial 1',NULL,30,0,'partial1'),
('2B-chem-solsona-1-1','2B-chem-solsona',1,'exam','Parcial 2',NULL,40,1,'partial2'),
('2B-chem-solsona-1-2','2B-chem-solsona',1,'exam','Trimestral',NULL,30,2,'term'),
('2B-chem-solsona-1-3','2B-chem-solsona',1,'activity','Redacció 1',NULL,0,3,'writing'),
('2B-chem-solsona-1-4','2B-chem-solsona',1,'activity','Redacció 2',NULL,0,4,'writing'),
('2B-chem-solsona-1-5','2B-chem-solsona',1,'activity','Redacció 3',NULL,0,5,'writing'),
('2B-chem-solsona-1-6','2B-chem-solsona',1,'activity','Entrega 1',NULL,0,6,'assignment'),
('2B-chem-solsona-1-7','2B-chem-solsona',1,'activity','Entrega 2',NULL,0,7,'assignment'),
('2B-chem-solsona-1-8','2B-chem-solsona',1,'activity','Entrega 3',NULL,0,8,'assignment'),
('2B-chem-solsona-1-9','2B-chem-solsona',1,'activity','Presentació 1',NULL,0,9,'presentation'),
('2B-chem-solsona-1-10','2B-chem-solsona',1,'activity','Presentació 2',NULL,0,10,'presentation'),
('2B-chem-solsona-1-11','2B-chem-solsona',1,'activity','Presentació 3',NULL,0,11,'presentation'),
('2B-chem-solsona-2-0','2B-chem-solsona',2,'exam','Parcial 1',NULL,30,0,'partial1'),
('2B-chem-solsona-2-1','2B-chem-solsona',2,'exam','Parcial 2',NULL,40,1,'partial2'),
('2B-chem-solsona-2-2','2B-chem-solsona',2,'exam','Trimestral',NULL,30,2,'term'),
('2B-chem-solsona-2-3','2B-chem-solsona',2,'activity','Redacció 1',NULL,0,3,'writing'),
('2B-chem-solsona-2-4','2B-chem-solsona',2,'activity','Redacció 2',NULL,0,4,'writing'),
('2B-chem-solsona-2-5','2B-chem-solsona',2,'activity','Redacció 3',NULL,0,5,'writing'),
('2B-chem-solsona-2-6','2B-chem-solsona',2,'activity','Entrega 1',NULL,0,6,'assignment'),
('2B-chem-solsona-2-7','2B-chem-solsona',2,'activity','Entrega 2',NULL,0,7,'assignment'),
('2B-chem-solsona-2-8','2B-chem-solsona',2,'activity','Entrega 3',NULL,0,8,'assignment'),
('2B-chem-solsona-2-9','2B-chem-solsona',2,'activity','Presentació 1',NULL,0,9,'presentation'),
('2B-chem-solsona-2-10','2B-chem-solsona',2,'activity','Presentació 2',NULL,0,10,'presentation'),
('2B-chem-solsona-2-11','2B-chem-solsona',2,'activity','Presentació 3',NULL,0,11,'presentation'),
('2B-chem-solsona-3-0','2B-chem-solsona',3,'exam','Parcial 1',NULL,30,0,'partial1'),
('2B-chem-solsona-3-1','2B-chem-solsona',3,'exam','Parcial 2',NULL,40,1,'partial2'),
('2B-chem-solsona-3-2','2B-chem-solsona',3,'exam','Trimestral',NULL,30,2,'term'),
('2B-chem-solsona-3-3','2B-chem-solsona',3,'activity','Redacció 1',NULL,0,3,'writing'),
('2B-chem-solsona-3-4','2B-chem-solsona',3,'activity','Redacció 2',NULL,0,4,'writing'),
('2B-chem-solsona-3-5','2B-chem-solsona',3,'activity','Redacció 3',NULL,0,5,'writing'),
('2B-chem-solsona-3-6','2B-chem-solsona',3,'activity','Entrega 1',NULL,0,6,'assignment'),
('2B-chem-solsona-3-7','2B-chem-solsona',3,'activity','Entrega 2',NULL,0,7,'assignment'),
('2B-chem-solsona-3-8','2B-chem-solsona',3,'activity','Entrega 3',NULL,0,8,'assignment'),
('2B-chem-solsona-3-9','2B-chem-solsona',3,'activity','Presentació 1',NULL,0,9,'presentation'),
('2B-chem-solsona-3-10','2B-chem-solsona',3,'activity','Presentació 2',NULL,0,10,'presentation'),
('2B-chem-solsona-3-11','2B-chem-solsona',3,'activity','Presentació 3',NULL,0,11,'presentation')
)
INSERT OR IGNORE INTO templates(id,offering_id,term,category,title,date,weight,position,assessment_type)
SELECT * FROM defaults WHERE NOT EXISTS(SELECT 1 FROM templates WHERE offering_id='2B-chem-solsona');
