# La Net · seguretat i compatibilitat

Revisió del 11 d’octubre de 2026 · R54 / T41-01. Objectiu: reforçar els controls de seguretat i comprovar l’accés i les funcions principals en navegadors d’escriptori i pantalles de mòbil. Una sola tasca activa al [seguiment](SEGUIMENT.json); els resultats es registren al [historial](HISTORIAL-CANVIS.md).

## Checklist executada

- [x] Auditar dependències: **0 vulnerabilitats conegudes** segons `npm audit` en aquesta revisió.
- [x] Aplicar CSP, protecció contra marcs externs, `nosniff`, política de permisos, referència i HSTS des del servidor. Cobertura de pàgines, API, errors i redireccions; API sense memòria cau compartida.
- [x] Preservar les dues cookies i la redirecció del callback de Google; conservar les polítiques restrictives dels fitxers.
- [x] Comprovar autenticació, permisos entre usuaris/grups, CSRF, fitxers, límits i comptabilitat amb dades locals de prova.
- [x] Rebutjar peticions d’escriptura d’altres webs encara que no duguin `Origin` quan `Sec-Fetch-Site` o `Referer` revelin l’origen extern.
- [x] Limitar el JSON mentre s’està rebent, també sense `Content-Length`; respondre 400 a noms de fitxer amb codificació malformada.
- [x] Oferir les **17 peces completes en MP3**, amb crèdits i llicències, i comprovar descodificació, durada i integritat al paquet compilat.
- [x] Utilitzar el paquet legacy de PDF.js i verificar que un PDF real es renderitza als tres motors.
- [x] Afegir desplegable natiu de reserva quan el navegador no disposa de Popover API; corregir el focus amb teclat en l’emulació d’iPhone.
- [x] Ajustar viewport, safe areas, alçades dinàmiques i camps a 16 px en mòbil. Mostrar una explicació si JavaScript està desactivat.
- [x] Limitar l’espera de les lectures inicials a 20 segons amb un error comprensible. Les escriptures no s’interrompen ni es repeteixen automàticament per evitar operacions duplicades.
- [x] Executar proves entre motors, mides, navegadors instal·lats i dispositius emulats; comprovar horitzontal i controls simultanis a 320 px.
- [x] Validar tipus, sintaxi, lint, compilació i absència de fitxers privats o patrons de credencials al paquet publicable.
- [x] Publicar i registrar l’identificador del desplegament a [PUBLICACIO.md](PUBLICACIO.md): **d0cebb0c**, 90 recursos i Worker compilat.
- [ ] Comprovar manualment Google i les funcions a la web pública: pendent d’accés del navegador.
- [ ] Provar dispositius iPhone/Android físics i Safari instal·lat en macOS/iOS.

## Resultats reproduïbles

Les proves utilitzen una base D1/R2 local o una base en memòria amb usuaris ficticis. Les proves de navegador serveixen el paquet compilat localment i bloquegen la xarxa externa. No modifiquen comptes ni contingut de producció i no contacten amb Google.

| Control | Resultat | Evidència |
| --- | --- | --- |
| Dependències de producció i desenvolupament | 0 vulnerabilitats conegudes | [npm audit](../output/security-compat/npm-audit.json) |
| Proves unitàries | 174/174 | [registre](../output/security-compat/unit.txt) |
| Fluxos d’API amb D1/R2 local | 41/41 | [registre](../output/security-compat/api.txt) |
| Chromium, Firefox i WebKit | 120/120 controls | [resultats](../output/security-compat/browser-results.json) |
| Chrome i Edge instal·lats; iPhone 13 i Pixel 7 emulats | 4/4 recorreguts | [resultats](../output/security-compat/device-results.json) |
| Tipus, sintaxi i lint | Correctes | [registre](../output/security-compat/typecheck.txt) |
| Compilació Pages i Worker | Correcta | [registre](../output/security-compat/build.txt) |
| 17 MP3: descodificació completa, durada i hash | Correctes | [àudio](../output/security-compat/mp3-verification.json) |
| Paquet: fitxers privats i patrons de credencials | 0 deteccions; recursos i crèdits presents | [comprovació](../output/security-compat/build-verification.json) |

Els 120 controls cobreixen Horari/Agenda, Apunts, Plusos, Notes, Estudi, Comunitat i Pastisseria a **1440×900, 1024×768, 768×1024, 390×844 i 320×640**, més la pantalla d’entrada, els tres espais d’anuncis, música, PDF, desplegables de reserva i emmagatzematge local bloquejat. Es comproven amplades, contingut dels diàlegs, navegació mòbil i absència d’errors JavaScript. La comprovació de PDF també valida que text amb aparença d’HTML es mostra com a text.

Els recorreguts addicionals comproven teclat, introducció d’una nota amb mode discret actiu sense revelar les notes anteriors, persistència de la nota i reproducció amb un gest de l’usuari. En les dues emulacions mòbils també es comprova orientació horitzontal i el header a 320 px amb música i temporitzador actius simultàniament.

Captures locals: [Notes, WebKit 390 px](../output/security-compat/webkit-grades-390.png), [Estudi, Chromium 1440 px](../output/security-compat/chromium-study-1440.png), [controls actius, iPhone emulat 320 px](../output/security-compat/iPhone-active-header-320.png). S’han inspeccionat visualment. Les captures de pàgina completa poden mostrar les barres fixes al punt de desplaçament del viewport.

## Repetir els controls

Amb Node i les dependències instal·lades:

```text
npm audit --json
npm test
npm run test:api
npm run typecheck
npm run pages:build
npx playwright install chromium firefox webkit
npm run test:browser
npm run test:devices
node scripts/verify-security-build.mjs
```

`test:devices` requereix Chrome i Edge instal·lats. Per reconstruir els MP3 des dels Ogg originals: `python scripts/render-compatible-audio.py`; el script requereix FFmpeg i conserva els crèdits. Les proves MP3 i de paquet requereixen els fitxers d’àudio i l’informe de generació.

## Límits i comprovacions pendents

La cobertura executada permet detectar regressions concretes; **no és una certificació ni una auditoria de penetració externa**, i zero avisos de dependències no significa absència de qualsevol vulnerabilitat. La compatibilitat objectiu són navegadors actualitzats amb JavaScript, connexió i cookies de sessió disponibles. Les restriccions de comptes del centre, l’estat de Google, Cloudflare i la connexió també poden afectar l’entrada. No es pot garantir obrir-la sempre des de qualsevol navegador, versió antiga, webview o dispositiu.

WebKit automatitzat i l’emulació d’iPhone no equivalen a provar Safari en un dispositiu Apple físic. No s’han provat telèfons físics, tots els models de dispositiu ni sistemes operatius antics. No s’ha fet una comprovació pública navegada d’aquesta revisió: continua vigent una denegació anterior d’accés a la web pública i no s’ha eludit amb un altre navegador o peticions HTTP. El desplegament i els controls locals es documenten per separat. L’entrada real amb Google, la reproducció i un recorregut en un iPhone i Android físics queden a la checklist manual.

El mode discret evita exposar visualment les notes mentre es comparteix pantalla; les dades continuen disponibles per a l’usuari autenticat que n’és propietari. Cap compte de producció, saldo ni anunci s’ha reinicialitzat durant aquesta revisió.

## Decisions i documentació primària

- Capçaleres al Worker: les regles `_headers` de Pages no cobreixen per si soles les respostes de Functions. [Cloudflare Pages](https://developers.cloudflare.com/pages/configuration/headers/).
- MP3 per ampliar compatibilitat d’àudio; es mantenen els Ogg originals. [MDN: contenidors multimèdia](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Formats/Containers).
- PDF.js legacy per a compatibilitat amb navegadors menys recents. [PDF.js FAQ](https://github.com/mozilla/pdf.js/wiki/frequently-asked-questions).
- Diferència entre motors, navegadors de marca i emulació. [Playwright: browsers](https://playwright.dev/docs/browsers).
- Criteris per a les capçaleres i protecció CSRF. [OWASP HTTP Headers](https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Headers_Cheat_Sheet.html), [OWASP CSRF](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html).
