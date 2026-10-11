import { rows, sql, fail } from './utils.js';
import { preferencesPatch } from '../shared/preferences.js';
export async function preferenceStatement(env, user, patch) {
  const subjects = (await rows(env, 'SELECT id FROM subjects')).map((s) => s.id);
  let preferences;
  try {
    preferences = preferencesPatch(patch, subjects);
  } catch (e) {
    fail(400, e.message);
  }
  return sql(
    env,
    "INSERT INTO user_preferences(user_id,value) VALUES(?,?) ON CONFLICT(user_id) DO UPDATE SET value=json_patch(user_preferences.value,excluded.value),updated_at=datetime('now')",
    user.id,
    JSON.stringify(preferences),
  );
}
