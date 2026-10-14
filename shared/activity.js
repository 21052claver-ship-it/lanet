export const ACTIVITY_ADMIN_EMAIL = '21052.claver@fje.edu';
export const ACTIVITY_INTERVAL = 120000;
export const ACTIVE_WINDOW = 300000;
export const ACTIVITY_AREAS = {
  schedule: 'Curs i agenda',
  notes: 'Continguts',
  pluses: 'Plusos',
  grades: 'Notes',
  pau: 'PAU',
  study: 'Estudi',
  community: 'Comunitat',
  bakery: 'Pastisseria',
  management: 'Gestió del centre',
  admin: 'Dashboard privat',
  profile: 'Perfil i preferències',
  files: 'Fitxers',
};
export const isActivityAdmin = (user) =>
  user?.email?.toLowerCase() === ACTIVITY_ADMIN_EMAIL &&
  !!(user.google_connected || user.google_sub) &&
  !user.disabled;

// Only known operations are classified. URLs, query strings and payloads are never stored.
export function activityArea(path) {
  const root = path.split('/')[2];
  return (
    {
      events: 'schedule',
      tasks: 'schedule',
      notes: 'notes',
      library: 'notes',
      pluses: 'pluses',
      grades: 'grades',
      pau: 'pau',
      focus: 'study',
      proposals: 'community',
      announcements: 'community',
      banner: 'community',
      predictions: 'community',
      roulette: 'community',
      reports: 'community',
      bakery: 'bakery',
      admin: 'management',
      profile: 'profile',
      preferences: 'profile',
      configure: 'profile',
      files: 'files',
    }[root] || null
  );
}

export function activityDayOffset(day, offset) {
  const date = new Date(day + 'T12:00:00Z');
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}
