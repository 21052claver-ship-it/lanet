import { rows, one, sql, run, fail, id, str, num, integer, day, body } from './utils.js';
import { assessmentInput } from './assessment-input.js';
import { restoreAssessments } from '../shared/assessments.js';
import { courseGradeAction } from './course-grades.js';
export async function gradeRoute(request, env, user, path) {
  if (!path.startsWith('/api/grades')) return null;
  const b = await body(request);
  const course = await courseGradeAction(env, user, path, b);
  if (course !== null) return course;
  if (path === '/api/grades/goal') {
    if (
      !(await one(
        env,
        'SELECT o.id FROM enrollments e JOIN offerings o ON o.id=e.offering_id WHERE e.user_id=? AND o.subject_id=?',
        user.id,
        b.subject_id,
      ))
    )
      fail(400, 'Tria una assignatura del teu curs.');
    await run(
      env,
      'INSERT INTO grade_goals(user_id,subject_id,term,target) VALUES(?,?,?,?) ON CONFLICT(user_id,subject_id,term) DO UPDATE SET target=excluded.target',
      user.id,
      b.subject_id,
      integer(b.term, 1, 3),
      num(b.target, 0, 10),
    );
    return { ok: true };
  }
  if (path === '/api/grades/restore') {
    const enrolled = await one(
      env,
      'SELECT o.* FROM enrollments e JOIN offerings o ON o.id=e.offering_id WHERE e.user_id=? AND o.subject_id=?',
      user.id,
      b.subject_id,
    );
    if (!enrolled) fail(400, 'Aquesta assignatura no és del teu curs.');
    const term = integer(b.term, 1, 3);
    const ts = await rows(
      env,
      'SELECT * FROM templates WHERE offering_id=? AND term=? ORDER BY position',
      enrolled.id,
      term,
    );
    const previous = await rows(
      env,
      'SELECT * FROM grade_entries WHERE user_id=? AND subject_id=? AND term=?',
      user.id,
      b.subject_id,
      term,
    );
    if (!ts.length) fail(400, 'El delegat encara no ha preparat aquesta plantilla.');
    await env.DB.batch([
      sql(
        env,
        'DELETE FROM grade_entries WHERE user_id=? AND subject_id=? AND term=?',
        user.id,
        b.subject_id,
        term,
      ),
      ...restoreAssessments(previous, ts).map((t) =>
        sql(
          env,
          'INSERT INTO grade_entries(id,user_id,subject_id,term,category,title,date,grade,weight,position,template_id,custom,assessment_type) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)',
          t.id || id(),
          user.id,
          b.subject_id,
          term,
          t.category,
          t.title,
          t.date,
          t.grade,
          t.weight,
          t.position,
          t.template_id,
          t.custom,
          t.assessment_type,
        ),
      ),
    ]);
    return { ok: true };
  }
  if (path === '/api/grades/batch') {
    if (!Array.isArray(b.entries) || b.entries.length > 200)
      fail(400, 'Les dades de notes no són vàlides.');
    if (
      b.entries.some((entry) => !entry || typeof entry !== 'object' || typeof entry.id !== 'string')
    )
      fail(400, 'Les dades de notes no són vàlides.');
    const owned = new Map(
      (
        await rows(
          env,
          "SELECT id,'grade_entries' AS source,10 AS maximum FROM grade_entries WHERE user_id=? UNION ALL SELECT id,'grade_bonuses' AS source,capacity*0.25 AS maximum FROM grade_bonuses WHERE user_id=?",
          user.id,
          user.id,
        )
      ).map((r) => [r.id, r]),
    );
    if (b.entries.some((e) => !owned.has(e.id))) fail(403, 'Només pots editar les teves notes.');
    const batch = b.entries.map((e) =>
      sql(
        env,
        `UPDATE ${owned.get(e.id).source} SET grade=? WHERE id=? AND user_id=?`,
        e.grade === null ? null : num(e.grade, 0, owned.get(e.id).maximum),
        e.id,
        user.id,
      ),
    );
    if (batch.length) await env.DB.batch(batch);
    return { ok: true };
  }
  if (path === '/api/grades/sheet') {
    const term = integer(b.term, 1, 3);
    if (
      !(await one(
        env,
        'SELECT o.id FROM enrollments e JOIN offerings o ON o.id=e.offering_id WHERE e.user_id=? AND o.subject_id=?',
        user.id,
        b.subject_id,
      ))
    )
      fail(400, 'Tria una assignatura del teu curs.');
    if (!Array.isArray(b.entries) || b.entries.length < 1 || b.entries.length > 200)
      fail(400, 'El full ha de tenir entre 1 i 200 proves.');
    const existing = new Set(
      (
        await rows(
          env,
          'SELECT id FROM grade_entries WHERE user_id=? AND subject_id=? AND term=?',
          user.id,
          b.subject_id,
          term,
        )
      ).map((r) => r.id),
    );
    const entries = b.entries.map((e, i) => ({
      id: e.id && existing.has(e.id) ? e.id : id(),
      title: str(e.title, 120, true),
      ...assessmentInput(e),
      date: e.date ? day(e.date) : null,
      grade: e.grade === null || e.grade === '' ? null : num(e.grade, 0, 10),
      weight: num(e.weight, 0, 100),
      position: i,
      template_id: e.template_id || null,
    }));
    if (Math.abs(entries.reduce((s, e) => s + e.weight, 0) - 100) > 0.001)
      fail(400, 'Els pesos han de sumar el 100%.');
    await env.DB.batch([
      sql(
        env,
        'DELETE FROM grade_entries WHERE user_id=? AND subject_id=? AND term=?',
        user.id,
        b.subject_id,
        term,
      ),
      ...entries.map((e) =>
        sql(
          env,
          'INSERT INTO grade_entries(id,user_id,subject_id,term,category,title,date,grade,weight,position,template_id,custom,assessment_type) VALUES(?,?,?,?,?,?,?,?,?,?,?,1,?)',
          e.id,
          user.id,
          b.subject_id,
          term,
          e.category,
          e.title,
          e.date,
          e.grade,
          e.weight,
          e.position,
          e.template_id,
          e.assessment_type,
        ),
      ),
    ]);
    return { ok: true };
  }
  fail(404, 'L’acció de notes no existeix.');
}
