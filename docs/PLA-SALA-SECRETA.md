# Sala secreta · R62 / T49-01

Tasca T49-01 completada. Fitxers, proves i historial identificats; cap solapament amb altres tasques.

- [x] Regles: ruleta europea amb 37 números, zero verd; vermell/negre retorna ×2, número retorna ×36, inclosa l’aposta. Mínim 1 pastís enter, màxim 1.000 i sempre limitat pel saldo. Pastissos virtuals gratuïts, sense compra ni canvi per diners.
- [x] Servidor: aleatorietat criptogràfica uniforme, validació estricta, identitat de sessió, càrrec i premi atòmics, clau idempotent i historial privat. Un reintent conserva l’aposta original.
- [x] Catifa: toc/teclat, obertura de la trapa i descens al túnel; cancel·lació i retorn al forn, focus i moviment reduït.
- [x] Sala: pastissera amb vestuari nou, escenografia coherent, roda amb números llegibles i bola que acaba al número exacte, selecció visual, resum d’aposta i resultat accessible.
- [x] Recuperació: persistir una petició pendent per compte abans d’enviar; resoldre-la amb la mateixa clau en cas de desconnexió o recàrrega. Sense aposta automàtica següent.
- [x] Proves: pagaments exhaustius, zero, saldo insuficient, payload manipulat, atòmica, concurrència, repeticions, privadesa i respostes perdudes; navegadors i responsive, sense regressió de l’arrencada mòbil.
- [x] Migració additiva, publicació, comprovació de bindings i historial.

Les proves faran servir comptes locals aïllats. Es manté la restricció anterior de no visitar la web pública; la publicació es comprovarà amb el proveïdor. Google únic, dades PAU, continguts i moderació visual es conserven.


## Implementació publicada

Pages **b0e9c6f3**, main. Entra al forn i toca la catifa: s’aixeca, apareix la trapa i un descens amb arcs porta a la sala secreta. Es pot cancel·lar i tornar al forn amb el focus a la catifa. El moviment reduït omet el descens. Pastissera de cos complet amb armilla verda, corbatí i barret, amb transparència real; el taulell tapa el cos de forma natural. Vestuari creat amb el generador integrat imagegen i optimitzat a WebP de 39.588 bytes. S’ha conservat el prompt i la imatge original.

Ruleta SVG amb ordre europeu real, colors, relleu de fusta i metall, bola i indicador. Cada gir dura 5,6 segons; la rotació final coincideix amb el número liquidat al servidor. Recuperar un gir pendent mostra directament el resultat. Selecció amb teclat i controls de toc; cap gir automàtic. El botó d’agafar el pastís es col·loca més amunt en mòbil perquè no cobreixi la catifa; el missatge del forn apareix sota el diorama. Zona de toc de la catifa d’almenys 44 × 44 px comprovada a 320, 390, 820 i 1440 px.

## Integritat del saldo

Migració additiva 0020: taula de girs, índex i trigger AFTER INSERT. La mateixa sentència insereix l’aposta, el càrrec i el premi; qualsevol error desfà tot el gir. El saldo previ ha de cobrir l’aposta, també quan aquesta seria guanyadora. UNIQUE per usuari i request_id evita duplicats; un reintent conserva el resultat original i un payload diferent amb la mateixa referència rep 409. Aleatorietat criptogràfica amb mostreig per rebuig, sense biaix de mòdul. Historial de 20 girs exclusiu del compte. Les comprovacions SQL de payout són independents del càlcul JavaScript.

La petició pendent es desa abans d’enviar-la. Desconnexió, resposta perduda, recàrrega o una altra pestanya permeten recuperar la mateixa aposta. Sense emmagatzematge local no es crea una aposta que després no es podria recuperar. Controls bloquejats durant l’enviament i el gir, límit de 12 intents nous per minut i límit de saldo del servidor. Un saldo consumit en una altra pestanya es rebutja i s’actualitza. Els pastissos són punts virtuals gratuïts, sense compra ni canvi per diners.

## Verificació i límits

**260 proves unitàries, 52 fluxos API locals D1/R2, 36 escenaris de sala secreta, 135 controls generals, 48 escenaris responsive, 30 d’arrencada mòbil i 4 perfils visuals finals correctes.** Pagaments de totes les 1.443 combinacions de tipus d’aposta/resultat, zero, payloads manipulats, saldo insuficient, rollback, concurrència, repeticions, historial privat i pèrdua de resposta. Chromium, Firefox i WebKit; mòbil emulat, teclat, focus, animació i matriu de rotació real, moviment reduït, cancel·lació i APIs antigues absents.

La primera regressió general va passar 132/135 controls: tres navegacions de Firefox van superar el temps límit mentre altres bateries s’executaven. La repetició completa aïllada va passar 135/135. S’han conservat els informes inicial i final; no s’ha atribuït una causa definitiva als tres temps límit. La revisió visual va detectar solapament del botó de recollida amb la catifa a 320 px; s’ha corregit i verificat també amb hit testing del control.

112 fitxers de l’entrada de publicació coincideixen amb el manifest provat. Cap credencial ni fitxer privat al build. D1, R2 i servei privat de moderació d’imatges comprovats amb el proveïdor. Dades PAU, Google únic i moderació visual conservats. La migració no modifica saldos existents ni crea girs de prova en producció. Les proves utilitzen fixtures locals.

No s’ha visitat la web pública per respectar la restricció anterior. Desplegament confirmat per CLI i estat de Cloudflare; no s’ha repetit el Google real ni s’ha provat un mòbil físic. Les simulacions d’APIs antigues no equivalen a executar totes les versions històriques de navegador.

[Unitàries](../output/secret-room/unit.txt), [API](../output/secret-room/api.txt), [sala secreta](../output/secret-room/secret-room-browser-results.json), [navegació final](../output/secret-room/general-final/browser-results.json), [navegació inicial](../output/secret-room/general/browser-results.json), [responsive](../output/secret-room/responsive/responsive-results.json), [arrencada mòbil](../output/secret-room/startup/mobile-browser-results.json), [perfils finals](../output/secret-room/visual-final/layout-results.json), [revisió visual](../output/secret-room/visual-review.json), [migració](../output/secret-room/migration-schema.json), [build](../output/secret-room/tested-build.json), [bindings](../output/secret-room/remote-bindings.json), [publicació](../output/secret-room/publicacio.json), [CLI](../output/secret-room/deploy.txt), [asset](../public/images/croupier-v1.webp), [prompt i mètode](../design/croupier-v1-prompt.txt).


R69: afegida la segona taula «Prediccions A/B», amb creador, responsable acceptat, termini i pot de pastissos. [Regles, checklist i proves](PLA-PREDICCIONS.md). Pages b625f1b4. Ruleta existent conservada i regressió final 36/36.
