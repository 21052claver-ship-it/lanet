# Arrencada mòbil · R61 / T48-01

Incidència: Marc comunica pantalla blanca a Chrome en iPhone, https://lanet.pages.dev. Versió d’iOS desconeguda; no s’atribueix al seu dispositiu una versió inferida.

- [x] Reproduir una pantalla blanca local en WebKit quan falta Object.hasOwn: error al primer render de App, fora del Boundary existent. Evidència a output/mobile-startup/reproduction.json.
- [x] Eliminar aquesta dependència al resultat de Google i cobrir el component arrel amb el límit d’errors.
- [x] Mostrar HTML inicial visible abans del bundle i carregar l’aplicació per fases; error recuperable si fallen els scripts o s’excedeix el temps d’espera.
- [x] Ampliar el target de sintaxi i retirar dependències d’APIs recents en la navegació, el temporitzador i el login, sense habilitar accessos antics.
- [x] Documents sense memòria cau i recursos absents amb 404 correcte; conservar CSP, Google únic, dades i pujades segures.
- [x] Proves de compatibilitat antiga simulada, iPhone/Android emulats, connexió lenta, assets/API fallits, càrrega tardana i regressions.
- [x] Publicació, comprovació del proveïdor i historial.

Tasca T48-01 completada. Cap migració de dades prevista. Navegadors locals amb dades aïllades; no visitar la web pública sense revocació explícita de la restricció anterior. La reproducció és una causa demostrada en la simulació, no un diagnòstic confirmat del telèfon físic.


## Correcció publicada

Pages **2f009340**, main, confirmada pel proveïdor. El primer render de App consultava Object.hasOwn abans del Boundary interior. Sense aquesta API, el root quedava buit: reproducció local WebKit registrada. Ara es fa servir hasOwnProperty.call i un Boundary exterior cobreix App. HTML inicial visible abans del bundle, sense fulls d’estil d’aplicació que bloquegin el primer contingut; carregador clàssic ES5 amb recuperació per error de script/CSS, desconnexió o espera superior a 20 segons. El reintent conserva ruta i paràmetres, afegeix una marca temporal i recarrega. Una descàrrega tardana també pot acabar amb normalitat.

Pàgines carregades sota demanda. Sintaxi compilada per ES2020/Safari 14/Chrome 80/Firefox 78; compatibilitat de MediaQueryList i AbortSignal, IDs UUID amb getRandomValues quan falta randomUUID, i retirada d’Array.at/findLastIndex del codi de navegador. Aquest target i les simulacions no equivalen a executar cada versió històrica de navegador.

La prova de reintent va detectar un problema addicional de WebKit amb un modulepreload interromput: desactivar els preloads de JavaScript i mantenir imports natius va resoldre la reproducció. CSS continua carregant-se abans d’executar el mòdul dependent. Documents HTML sense memòria cau i 404 de text quan un recurs JavaScript/CSS absent rebia erròniament el fallback HTML. CSP, nosniff i polítiques de sessió conservats.

## Evidències

**250 proves unitàries, 50 fluxos API locals D1/R2, 30 escenaris d’arrencada, 135 controls generals, 48 escenaris responsive i 4 perfils de navegador/dispositiu correctes.** Chromium, Firefox i WebKit; Chrome i Edge instal·lats, iPhone 13 i Pixel 7 emulats. APIs recents retirades expressament, login i sessió, notes, temporitzador, canvi d’amplada, descàrrega lenta, watchdog, càrrega tardana, API fallida amb reintent, JavaScript desactivat, scripts/CSS interromputs i error de render de App. La primera bateria de dispositius va registrar el tancament de WebKit durant la reproducció de música mentre altres bateries s’executaven; la repetició aïllada va passar 4/4. S’han conservat els dos informes.

110 fitxers publicats coincideixen exactament amb el build provat. Cap credencial ni fitxer privat al build, dades PAU i codi de moderació visual sense canvis. D1, R2 i servei privat de moderació confirmats al proveïdor. Cap migració ni modificació de dades de producció. Google continua sent l’única entrada.

La versió d’iOS de Marc és desconeguda: s’ha corregit una causa demostrada en simulació, pendent de confirmar al seu telèfon. Cap visita a la web pública per respectar la restricció anterior; comprovació amb Cloudflare, navegadors locals i dades aïllades. No s’ha repetit el login real de Google ni s’ha provat un dispositiu físic.

[Reproducció](../output/mobile-startup/reproduction.json), [arrencada](../output/mobile-startup/mobile-browser-results.json), [unitàries](../output/mobile-startup/unit.txt), [API](../output/mobile-startup/api.txt), [navegació](../output/mobile-startup/general/browser-results.json), [responsive](../output/mobile-startup/responsive/responsive-results.json), [dispositius finals](../output/mobile-startup/devices-final/device-results.json), [primera bateria de dispositius](../output/mobile-startup/devices/device-results.json), [reintent interromput](../output/mobile-startup/retry-investigation/mobile-browser-results.json), [reintent corregit](../output/mobile-startup/retry-investigation-2/mobile-browser-results.json), [revisió visual](../output/mobile-startup/visual-review.json), [build](../output/mobile-startup/tested-build.json), [bindings](../output/mobile-startup/remote-bindings.json), [publicació](../output/mobile-startup/publicacio.json), [CLI](../output/mobile-startup/deploy.txt).
