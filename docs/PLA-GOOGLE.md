# Google Sign-In · R38

Una sola tasca activa; cada pas verifica l’anterior. Registre canònic: SEGUIMENT.json; historial append-only.

- [x] T25-01: arquitectura, accés a Google Cloud i protecció dels comptes existents.
- [x] Restricció confirmada per l’usuari: altes noves només @fje.edu, comprovant també el claim signat hd de Workspace.
- [x] T25-02: OAuth al servidor, perfil amb nom/cognoms/foto i botons coherents amb La Net.
- [x] T25-03: signatures, caducitat, CSRF/replay, vinculació, convidats, permisos i regressions.
- [x] T25-04: còpies, migració, publicació i ZIP verificat.
- [ ] T25-05: client real, secrets i comprovació de l’entrada amb Google.

El pas final requereix accés real a Google Cloud. El navegador ha rebutjat dues obertures directes: la segona, després de permís explícit, informa d’una preferència desada que bloqueja el domini. No s’utilitzen vies alternatives per esquivar-la.

Flux previst: POST del mateix origen inicia OAuth; cookie HttpOnly i estat temporal de 10 minuts; codi amb PKCE S256 i nonce; callback al servidor; JWT RS256 verificat amb les claus de Google i biblioteca jose; sessió pròpia HttpOnly. Només scopes openid/email/profile, sense tokens de Google persistits.

Identitat estable: sub de Google, mai el correu com a clau de vinculació. Un compte existent amb el mateix correu requereix iniciar sessió habitual i connectar Google des del perfil. Connectar un convidat conserva el mateix usuari, dades i preferències. Cap compte nou obté permisos d’administrador.

La foto apareix al perfil i a la capçalera amb inicials si falla la càrrega. Nom i cognoms es capturen separadament; el nom visible segueix editable. Cancel·lació, caducitat i configuració absent mostren missatges concrets.
