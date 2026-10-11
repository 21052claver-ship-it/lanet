export function readLocalJSON(key, fallback, storage) {
  try {
    return JSON.parse((storage ?? globalThis.localStorage).getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}
export function writeLocalJSON(key, value, storage) {
  try {
    (storage ?? globalThis.localStorage).setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
export function removeLocalValue(key, storage) {
  try {
    (storage ?? globalThis.localStorage).removeItem(key);
    return true;
  } catch {
    return false;
  }
}
