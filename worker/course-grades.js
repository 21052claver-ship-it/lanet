import { one, run, fail, id, str, num } from './utils.js';
import { bonusMaximum, COURSE_WEIGHTS } from '../shared/course-grades.js';

export async function courseGradeAction(env, user, path, b) {
  if (!['/api/grades/course', '/api/grades/bonus', '/api/grades/bonus/remove'].includes(path))
    return null;
  if (path === '/api/grades/bonus/remove') {
    const bonus = await one(env, 'SELECT user_id FROM grade_bonuses WHERE id=?', b.id);
    if (!bonus || bonus.user_id !== user.id) fail(403, 'Només pots editar els teus plusos.');
    await run(env, 'DELETE FROM grade_bonuses WHERE id=? AND user_id=?', b.id, user.id);
    return { ok: true };
  }
  if (
    !(await one(
      env,
      'SELECT e.user_id FROM enrollments e JOIN offerings o ON o.id=e.offering_id WHERE e.user_id=? AND o.subject_id=?',
      user.id,
      b.subject_id,
    ))
  )
    fail(400, 'Tria una assignatura del teu curs.');
  if (path === '/api/grades/course') {
    if (typeof b.equal_terms !== 'boolean' || typeof b.limit_to_ten !== 'boolean')
      fail(400, 'Revisa la configuració de la nota final.');
    const weights = b.weights ?? COURSE_WEIGHTS;
    if (!Array.isArray(weights) || weights.length !== 3)
      fail(400, 'Indica el pes dels tres trimestres.');
    const values = weights.map((weight) => num(weight, 0, 100));
    if (Math.abs(values.reduce((sum, weight) => sum + weight, 0) - 100) >= 0.001)
      fail(400, 'Els pesos dels trimestres han de sumar el 100%.');
    await run(
      env,
      'INSERT INTO grade_course_settings(user_id,subject_id,equal_terms,term1_weight,term2_weight,term3_weight,limit_to_ten) VALUES(?,?,?,?,?,?,?) ON CONFLICT(user_id,subject_id) DO UPDATE SET equal_terms=excluded.equal_terms,term1_weight=excluded.term1_weight,term2_weight=excluded.term2_weight,term3_weight=excluded.term3_weight,limit_to_ten=excluded.limit_to_ten',
      user.id,
      b.subject_id,
      b.equal_terms ? 1 : 0,
      ...values,
      b.limit_to_ten ? 1 : 0,
    );
    return { ok: true };
  }
  const maximum = bonusMaximum(b.maximum);
  if (typeof b.maximum !== 'number' || maximum === null)
    fail(400, 'Un plus només pot ser de 0,25 o 0,50 punts.');
  const capacity = maximum / 0.25;
  let title = str(b.title, 120, !b.plus_id);
  const source = b.plus_id || null;
  if (source) {
    const activity = await one(
      env,
      "SELECT p.title,ps.bonus FROM pluses p JOIN plus_subjects ps ON ps.plus_id=p.id WHERE p.id=? AND ps.subject_id=? AND (p.status='published' OR p.author_id=?)",
      source,
      b.subject_id,
      user.id,
    );
    if (!activity) fail(400, 'Aquest plus no està disponible per a l’assignatura.');
    if (bonusMaximum(activity.bonus) !== maximum)
      fail(400, 'El màxim indicat no coincideix amb el plus publicat.');
    title = activity.title;
  }
  const key = b.id || `bonus:${id()}`;
  if (
    typeof key !== 'string' ||
    !/^bonus:[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(key)
  )
    fail(400, 'Identificador de plus invàlid.');
  const existing = await one(env, 'SELECT * FROM grade_bonuses WHERE id=?', key);
  if (existing) {
    if (existing.user_id !== user.id) fail(403, 'Només pots editar els teus plusos.');
    if (
      existing.subject_id !== b.subject_id ||
      existing.plus_id !== source ||
      existing.title !== title ||
      existing.capacity !== capacity
    )
      fail(409, 'Aquest registre ja existeix amb altres dades.');
    return { id: key, created: false };
  }
  const grade = b.grade === null || b.grade === undefined ? null : num(b.grade, 0, maximum);
  await run(
    env,
    'INSERT INTO grade_bonuses(id,user_id,subject_id,plus_id,title,capacity,grade) VALUES(?,?,?,?,?,?,?)',
    key,
    user.id,
    b.subject_id,
    source,
    title,
    capacity,
    grade,
  );
  return { id: key, created: true };
}
