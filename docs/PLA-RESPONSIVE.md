# La Net · responsive i experiència mòbil

11 d’octubre de 2026 · R55 / T42-01. Una sola tasca activa, amb [registre](SEGUIMENT.json), [checklist general](CHECKLIST.md) i [historial](HISTORIAL-CANVIS.md).

## Pla i checklist

- [x] Capturar les set seccions i el perfil a 390, 820 i 844 px en horitzontal; identificar encavalcaments i espai desaprofitat.
- [x] Afegir el logo quadrat a mòbil, mantenir els tres anuncis 16:9 i deixar que la capçalera es desplaci amb el contingut. La navegació inferior continua disponible.
- [x] Adaptar la capçalera a noms llargs, saldos grans i música/temporitzador simultanis, sense controls encavalcats.
- [x] Utilitzar una barra lateral d’icones de 88 px en tauleta. Les etiquetes accessibles i els títols dels botons es conserven.
- [x] Conservar navegació inferior en mòbil horitzontal i disposar la capçalera en una fila quan hi ha amplada suficient.
- [x] Mostrar l’horari per dies en mòbil, amb cinc selectors accessibles amb teclat. La setmana completa es conserva en pantalles grans.
- [x] Adaptar el mes a una quadrícula compacta: seleccionar un dia mostra la seva agenda a sota. Els detalls dels esdeveniments s’obren en una finestra en mòbil, amb les accions existents.
- [x] Convertir el resum de notes en targetes per assignatura fins a 1200 px: Parcial 1, Parcial 2, Trimestral, pesos, mitjana i activitats. S’utilitzen els mateixos inputs i identificadors, amb mode discret, desament i navegació amb teclat conservats.
- [x] Separar el cercador i el filtre de Plusos i adaptar els filtres d’Apunts perquè no s’encavalquin.
- [x] Adaptar finestres i desplegables a l’espai visible, amb `visualViewport` i reserva CSS; botó de tancar accessible durant el desplaçament i accions finals assolibles en poca alçada.
- [x] Comprovar redimensionament del menú, desbloqueig del scroll i retorn del focus.
- [x] Tancar les proves de regressió sobre l’última compilació i revisar les captures finals: 48/48 escenaris específics, 120/120 controls generals, quatre recorreguts addicionals i 174/174 proves unitàries.
- [x] Publicar i registrar el desplegament: **7e51a088**, 90 recursos; els 93 fitxers d’entrada coincideixen amb el paquet provat.
- [ ] Revisar navegant a la web pública: pendent de permisos del navegador.
- [ ] Provar mòbils físics i teclats virtuals reals.

## Decisions d’experiència d’ús

Les taules amples impedien veure alhora els dies de classe i les tres proves principals en mòbil. L’horari ara permet canviar de dia sense arrossegar una setmana sencera; les notes es presenten per assignatura i tots tres camps principals caben a 320 px. El resum pot distribuir dues targetes per fila en tauleta. La vista de full es conserva en escriptori gran.

Al mes, el text dels esdeveniments deixa de competir dins de caselles petites: un indicador assenyala els dies amb contingut i l’agenda del dia seleccionat en mostra els detalls. L’acció d’afegir una data continua disponible. Obrir un esdeveniment en mòbil mostra una finestra; editar-lo tanca primer el detall per evitar dos diàlegs superposats.

La capçalera mòbil es desplaça amb la pàgina per deixar més espai de lectura. Els tres anuncis continuen apareixent a cada secció i no s’ha afegit cap opció d’amagar-los. La barra inferior permet navegar sense tornar al principi. En horitzontal, els botons es disposen amb icona i text en una fila i la capçalera es compacta.

En les captures locals a 820 px, l’amplada del contingut passa de **626 a 732 px** i la capçalera baixa de **112 a 76 px**. En paisatge de 844×390, la capçalera passa de **112 a 62 px** i la pàgina recupera l’amplada que ocupava la barra lateral. Són mesures de la configuració local de prova, no de tots els dispositius.

El mateix criteri de layout controla JavaScript i CSS, incloent telèfons girats. Els formularis segueixen l’alçada visible i els desplegables tenen en compte els límits de la finestra. Les etiquetes, els valors i les accions continuen disponibles amb desplaçament vertical quan no hi cap tot.

## Comprovacions i evidències

Totes les proves de navegador serveixen el paquet compilat localment amb dades fictícies. Es bloqueja la xarxa externa; no s’ha provat ni modificat cap compte de producció.

| Control | Evidència |
| --- | --- |
| Captures inicials, set seccions i perfil | [abans](../output/responsive/before/metrics.json) |
| Captures finals i mesures | [després](../output/responsive/after/metrics.json) |
| 48 escenaris funcionals en Chromium, Firefox i WebKit | [resultats](../output/responsive/responsive-results.json), [registre](../output/responsive/responsive.txt) |
| 120 controls generals entre motors i mides | [resultats](../output/responsive/regression/browser-results.json), [registre](../output/responsive/browsers.txt) |
| Chrome, Edge i emulacions d’iPhone 13 / Pixel 7 | [resultats](../output/responsive/regression/device-results.json), [registre](../output/responsive/devices.txt) |
| 174 proves unitàries | [registre](../output/responsive/unit.txt) |
| Tipus, sintaxi i lint | [tipus](../output/responsive/typecheck.txt), [lint final](../output/responsive/lint.txt) |
| Compilació | [registre](../output/responsive/build.txt) |
| Publicació | [metadades](../output/responsive/publicacio.json), [registre](../output/responsive/deploy.txt) |

Els escenaris específics cobreixen 320, 390 i 430 px; tauletes de 820 i 1024 px; paisatge de 844×390; finestres de formulari de 320×320 i 360 px d’alçada; capçaleres de 320 a 1440 px amb dades llargues. Es comproven canvi de dia, classe, mes i esdeveniment, edició sense diàlegs duplicats, nota oculta desada, teclat, activitats addicionals, filtres i formularis, retall 16:9, menú amb canvi d’amplada, controls simultanis i entrada amb Google visible. La música i el PDF es verifiquen també en la regressió general.

Captures representatives finals: [horari en mòbil](../output/responsive/after/schedule-390.png), [notes en mòbil](../output/responsive/after/grades-390.png), [filtres de Plusos](../output/responsive/after/pluses-390.png), [horari en tauleta](../output/responsive/after/schedule-820.png), [paisatge](../output/responsive/chromium-landscape.png), [retallador](../output/responsive/chromium-crop-320.png), [finestra curta](../output/responsive/webkit-short-dialog.png).

La pastisseria també s’ha inspeccionat localment amb les imatges descodificades: [exterior complet](../output/responsive/after/bakery-loaded-390.png), [interior i botó d’agafar el pastís](../output/responsive/after/bakery-inside-390.png). Les captures inicials ràpides podien precedir la descodificació de la imatge; les captures finals esperen les imatges.

## Reproducció

```text
npm run pages:build
npm run test:responsive
npm run test:browser
npm run test:devices
npm test
npm run typecheck
```

Playwright requereix els seus motors instal·lats; la comprovació de navegadors de marca requereix Chrome i Edge. `LANET_TEST_OUTPUT` permet desar la regressió general en una carpeta separada per conservar l’evidència de revisions anteriors. `LANET_BROWSER_ENGINES` permet limitar una passada de diagnòstic a un motor.

## Límits

Les emulacions i les finestres curtes no substitueixen un telèfon físic amb el seu teclat virtual, Safari real o les particularitats d’un webview. La prova pública navegada i Google real continuen pendents pels permisos del navegador. El desplegament s’acredita per la CLI de Cloudflare, separat dels controls locals. No es reivindica compatibilitat universal amb totes les versions i dispositius.

El login, els permisos, les cookies, els saldos, els anuncis i els registres de producció no s’han canviat en aquesta revisió. Es conserven els reforços de la [revisió de seguretat anterior](PLA-SEGURETAT-COMPATIBILITAT.md).
