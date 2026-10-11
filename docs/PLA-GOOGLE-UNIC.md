# Google com a única entrada · R45 / F32

Petició vigent: iniciar sessió exclusivament amb Google i utilitzar el nom del compte de Google, sense poder-lo canviar a La Net. Substitueix els accessos temporals de convidat, contrasenya, registre manual i recuperació que s’havien autoritzat abans.

## Ordre de treball i control de solapaments

1. **T32-01 · Auditoria i preservació.** Identificar totes les vies d’accés i edició d’identitat; còpia local abans de canvis. Registre únic a SEGUIMENT.json, una sola tasca activa, dependències obligatòries i evidència per tancar cada pas.
2. **T32-02 · Servidor.** Migració additiva per distingir sessions Google de sessions antigues. Nom, cognoms, correu i foto sincronitzats en cada entrada. Impedir modificacions d’identitat per API. Tancar contrasenyes, convidats, recuperació, invitacions i registre manual. Proves amb comptes i base de dades aïllats.
3. **T32-03 · Interfície.** Una sola acció «Continua amb Google», amb retorn, errors i reintent accessibles. Perfil amb identitat informativa i preferències editables. Retirar controls d’administració que ja no tenen ús. Revisar textos, configuració local i domini del centre.
4. **T32-04 · Verificació i publicació.** Proves de regressió d’autenticació i API amb D1/R2; tipus, lint i compilació. Còpia remota privada abans de migrar. Publicar només a `lanet`, comprovar entrada real i perfil en mòbil/escriptori. Actualitzar historial i lliurar paquet complet amb comprovació de hashes.

## Decisions de migració

- No esborrem usuaris, notes, assignatures, preferències, rols ni saldos. Les sessions anteriors no indiquen el proveïdor: s’exigeix tornar a entrar amb Google una vegada.
- La identitat permanent és el `sub` signat de Google. Un compte antic sense Google només es pot vincular automàticament quan Google verifica el mateix correu educatiu i el claim signat `hd=fje.edu`. Es conserva l’ID i el rol. Un compte desactivat o vinculat a un altre `sub` no es recupera per coincidència de correu.
- Un convidat antic no obté accés al contingut. Si conserva una cookie vàlida, només es pot fer servir per associar el seu espai en una entrada Google vàlida, lligada a estat, cookie i sessió. Mai se sobreescriu un compte Google existent per convertir un convidat.
- No es concedeixen permisos d’administració al primer usuari de Google. Es conserven els rols existents.
- L’adreça anterior `la-net` compartia D1 i conservava el codi antic. Per evitar una via alternativa d’accés, es retira la seva API amb 410 i es redirigeix la web a `lanet`. El Worker antic no tindrà bindings D1, R2 ni OAuth; les versions anteriors continuen disponibles a Cloudflare per recuperació. Aquesta revisió substitueix la conservació temporal de l’API antiga documentada a R43; no es modifica cap aplicació d’ImpossibleGoals.
- Les preferències, la privadesa de notes i la configuració de curs continuen sent editables. La identitat es mostra com a informació del compte Google.
- Les credencials i les còpies de producció queden fora de l’exportació. Cap nota o preferència real es modifica per provar.

La vinculació educativa segueix la verificació d’autoritat del correu documentada per [Google](https://developers.google.com/identity/gsi/web/guides/verify-google-id-token): correu verificat i domini Workspace signat. La comprovació del domini del correu, tota sola, és insuficient.
