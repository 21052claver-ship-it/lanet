# Pastís cada minut · R65 / T51-01

Tasca T51-01 completada, posterior a la publicació de Notes. Mode temporal demanat explícitament per Marc.

- [x] Crear una política de prova amb una campanya nova: tots els comptes poden recollir un pastís en activar-la, sense esborrar recollides anteriors.
- [x] Exigir 60 segons reals des de l’última recollida del compte; validar-ho al servidor amb inserció i saldo atòmics, també amb peticions simultànies.
- [x] Mostrar el compte enrere, reactivar el forn i permetre una nova recollida sense recarregar; adaptar els textos i conservar l’animació.
- [x] Verificar el mode diari normal, concorrència, historial, privadesa de comptes, responsive i navegadors locals.
- [x] Publicar, aplicar la migració additiva i activar el mode de prova al servidor; registrar les evidències.

No es visita la web pública, segons la restricció anterior. Google únic, Notes, PAU, moderació, sala secreta i el regal ja acreditat de 50 pastissos es conserven. Canviar la política al mode diari permet desactivar aquesta prova sense esborrar historial.


## Publicació i activació

Pages **2b3f3f67**, política de prova activada a D1 amb campanya test-2026-10-11-minute-v1. Primera recollida reiniciada per a tots els comptes; després cada compte ha d’esperar 60 segons des de la seva última recollida. No és un canvi de minut del rellotge ni un ingrés automàtic. Inserció condicional i trigger de ledger en una sola transacció; dotze peticions simultànies acrediten només una vegada. Cap temps, import o interval enviat pel client canvia el càlcul del servidor.

Migració additiva 0021: taula, índex i trigger de proves. Els saldos, el regal de 50, el ledger i les recollides diàries anteriors es conserven. Reactivar la mateixa política no reinicia els temps de prova; una campanya nova ho faria explícitament. Per desactivar la prova, la configuració bakery_reward_policy pot tornar a {"mode":"daily"}; la recollida diària anterior segueix comptant.

Comptador ancorat a l’hora del servidor i un rellotge monotònic del navegador. Quan s’acaba, el forn prepara un altre pastís sense recarregar. El saldo i el comptador es confirmen immediatament amb la resposta de recollida, encara que falli la posterior lectura general. Textos de portada, moneder, personatge i explicació coherents amb el mode. Animació i sala secreta conservades.

**270 proves unitàries, 52 fluxos API locals i 12 escenaris de pastisseria en Chromium, Firefox i WebKit correctes; tipus, lint i build correctes.** S’ha provat el mode diari normal, reinici després d’una recollida diària, segon pastís sense recarregar, concurrència HTTP, falsificació del rellotge/import del client, anonimat rebutjat, rollback i aïllament de comptes. El salt de 60 segons en navegador s’emula amb Playwright i s’avança també la recollida local; no s’altera el rellotge de producció. Una primera comprovació de text exacte incloïa accidentalment el subtítol a Firefox/WebKit; selector corregit, captures i informe inicial conservats. La repetició passa 12/12.

113 fitxers recompilats coincideixen amb els provats. D1/R2 i moderació privada confirmats al proveïdor. PAU, arrencada mòbil, Notes i assets de la sala secreta conservats. Proves locals, mòbil emulat; visita pública, Google real i mòbil físic no executats.

[Unitàries](../output/bakery-minute/unit.txt), [API](../output/bakery-minute/api.txt), [navegadors](../output/bakery-minute/browser-results.json), [revisió visual](../output/bakery-minute/visual-review.json), [migració](../output/bakery-minute/migration-confirmed.json), [mode actiu](../output/bakery-minute/mode-active.json), [manifest](../output/bakery-minute/tested-build.json), [bindings](../output/bakery-minute/remote-bindings.json), [publicació](../output/bakery-minute/publicacio.json).
