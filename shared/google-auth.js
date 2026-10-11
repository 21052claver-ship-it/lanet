export const GOOGLE_RESULTS = Object.freeze({
  connected: ['success', 'Sessió iniciada amb Google.'],
  cancelled: ['info', 'Has cancel·lat l’accés amb Google. Pots tornar-ho a provar quan vulguis.'],
  expired: ['error', 'L’accés amb Google ha caducat. Torna a prémer el botó per començar.'],
  invalid: ['error', 'No hem pogut verificar l’accés amb Google. Torna-ho a provar.'],
  unavailable: ['error', 'Google no ha pogut completar l’accés. Torna-ho a provar més tard.'],
  existing_account: [
    'error',
    'No hem pogut associar aquest compte. Contacta amb l’administrador del centre.',
  ],
  already_linked: [
    'error',
    'Aquest compte de Google ja està connectat a un perfil. Entra amb aquest compte o tria’n un altre.',
  ],
  different_email: [
    'error',
    'Tria el compte de Google amb el mateix correu que el teu perfil de La Net.',
  ],
  disabled: ['error', 'Aquest compte està desactivat. Contacta amb l’administrador del centre.'],
  school_only: ['error', 'Per crear un compte a La Net, tria el teu compte del centre (@fje.edu).'],
  session_changed: ['error', 'La sessió ha canviat. Torna a iniciar sessió amb Google.'],
});
export function googleResult(url) {
  const key = new URL(url).searchParams.get('auth_result');
  const result = Object.prototype.hasOwnProperty.call(GOOGLE_RESULTS, key)
    ? GOOGLE_RESULTS[key]
    : null;
  return result ? { type: result[0], message: result[1] } : null;
}
