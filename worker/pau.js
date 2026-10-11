import { body, fail, json, one, run } from './utils.js';
import { validatePau } from '../shared/pau.js';

export async function pauRoute(request, env, user) {
  if (request.method === 'GET') {
    const row = await one(
      env,
      'SELECT value,revision,updated_at FROM pau_simulations WHERE user_id=?',
      user.id,
    );
    return json(row ? { ...row, value: JSON.parse(row.value) } : { value: null, revision: 0 });
  }
  if (request.method !== 'PUT') fail(405, 'Mètode no vàlid.');
  const b = await body(request);
  if (
    Object.keys(b).some((k) => !['value', 'revision'].includes(k)) ||
    !Number.isInteger(b.revision) ||
    b.revision < 0
  )
    fail(400, 'La simulació no és vàlida.');
  let value;
  try {
    value = validatePau(b.value);
  } catch (e) {
    fail(400, e.message);
  }
  const result =
    b.revision === 0
      ? await run(
          env,
          'INSERT OR IGNORE INTO pau_simulations(user_id,value) VALUES(?,?)',
          user.id,
          JSON.stringify(value),
        )
      : await run(
          env,
          "UPDATE pau_simulations SET value=?,revision=revision+1,updated_at=datetime('now') WHERE user_id=? AND revision=?",
          JSON.stringify(value),
          user.id,
          b.revision,
        );
  if (!result.meta.changes)
    fail(
      409,
      'La simulació ha canviat en una altra pestanya. Recarrega la versió desada abans de tornar a desar.',
    );
  return json({ ok: true, value, revision: b.revision + 1 });
}
