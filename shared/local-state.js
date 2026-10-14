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

// A confirmed older form must not erase a newer draft in this or another tab.
export function removeLocalJSONIfUnchanged(key, expected, storage) {
  try {
    const target = storage ?? globalThis.localStorage;
    if (JSON.stringify(JSON.parse(target.getItem(key))) !== JSON.stringify(expected)) return false;
    target.removeItem(key);
    return true;
  } catch {
    return false;
  }
}
