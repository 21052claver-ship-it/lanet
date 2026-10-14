# Evolució de les notes de tall

14 octubre 2026 · R101 · H194 · ampliació de T80-01.

## Dades i comparabilitat

L’històric cobreix els cinc anys més recents, 2022–2026, per a la convocatòria de juny i via PAU/CFGS. La font 2021–2025 és el [quadre oficial de Canal Universitats](https://universitats.gencat.cat/web/.content/02_preinscripcio/enllac-documents/notes-de-tall/Notes-de-tall-via-PAU-CFGS_2021_2025.pdf), enllaçat a la [pàgina oficial de notes de tall](https://universitats.gencat.cat/ca/preinscripcions/notes-tall/). Es descarta 2021 per mostrar exactament 2022–2026. El document separa inici i final del procés. Cap dada d’altres vies d’accés, setembre o màsters es barreja en aquestes sèries.

2026 conserva les dues fonts ja fixades i contrastades del catàleg actual: primera assignació del 10/07/2026 i sisena del 07/10/2026. Aquesta última és l’última publicada en la revisió, no es presenta com a definitiva. El valor inicial és **primera assignació**, per comparar el mateix moment del procés. L’usuari pot canviar a última publicada; la UI assenyala que la comparació de 2026 continua sent provisional.

561 codis històrics i 560 actuals; 526 coincideixen exactament. La unió té 595 codis. Els 34 codis actuals sense correspondència exacta mantenen els quatre primers anys buits. Els 35 codis antics fora del catàleg actual no es transfereixen a un nom semblant. Si nom complet, universitat i població coincideixen exactament després de retirar únicament el sufix explícit de població del catàleg actual, el detall ofereix comparar el codi antic **com una sèrie separada**. No afirma equivalència, no uneix punts ni modifica el top 5.

Cada cel·la reté la pàgina i la font oficial. Les absències són `null`, amb text «Sense dada» i interrupció de la línia. No es converteixen en 0, 5 o una mitjana. Els imports numèrics s’exigeixen a tres decimals i entre 5 i 14. L’importador comprova capçaleres, nombre de columnes, unicitat i correspondència entre codis del text i taules.

## Experiència

- «Detall i evolució» obre el gràfic de cada grau, la mitjana dels talls disponibles, cobertura X/5, mínim/màxim i variació 2022–2026 si els dos extrems són coneguts. Les ponderacions i càlculs existents continuen disponibles al mateix detall.
- Taula de cinc files amb primera/última, canvi interanual només entre anys consecutius coneguts i enllaços a la pàgina oficial. El gràfic conserva l’escala 5–14 i adapta coordenades i text a l’amplada real. Cada punt té etiqueta, i la taula és accessible amb teclat.
- Comparació desplegable del top 5: fins a cinc sèries, colors i traços diferents, taula de valors, mitjanes amb cobertura i variacions. Els controls són locals i no desen ni sobreescriuen notes o preferències.
- La mitjana és aritmètica dels talls disponibles, arrodonida a tres decimals amb enters de mil·lèsimes. No és la nota mitjana de l’alumnat, una nota personal, una probabilitat o una predicció del curs següent.

## Eficiència i errors

Catàleg separat `public/data/pau-history.json`: 117.550 bytes, 22.620 amb gzip. No s’inclou en el bundle JavaScript ni en bootstrap. Es descarrega només en obrir el detall/comparació, una vegada per sessió de pàgina; tots els consumidors comparteixen la mateixa promesa i dades. Timeout de 20 segons, error visible i reintent explícit. Tancar una vista ignora respostes tardanes. No s’escriu a D1, R2, localStorage ni cap cua de telemetria.

La petició utilitza `cache: no-cache` i la ruta HTTP exigeix `max-age=0, must-revalidate`. Una pàgina nova revalida la còpia per ETag; després d’una nova publicació no reutilitza indefinidament la dada provisional antiga. Dins de la pàgina oberta es conserva el catàleg únic en memòria, sense peticions periòdiques.

Gràfic SVG propi, sense dependència de gràfics nova ni animació contínua. El catàleg PAU existent, les fórmules, l’any d’admissió, les ponderacions i les notes personals no es regeneren ni es modifiquen. No cal migració ni servei privat nou.

## Reproducció i verificació

`scripts/import-pau-history.py` llegeix la font fixada a `tests/fixtures/pau/sources/history-2021-2025.pdf`, les dues fonts 2026 existents i el catàleg actual. `--download` recupera només el PDF públic oficial; cal revisar el hash i l’auditoria abans de substituir la fixture. L’auditoria fixada és `tests/fixtures/pau/history-audit.json`; la privada queda a `output/pau-history/data-audit.json`. S’han inspeccionat la primera i l’última pàgina originals i capçaleres/columnes d’extracció.

`tests/pau-history.test.js` comprova fonts, files representatives, 2026 intacte, absències, mitjanes, segments, pàgines, codis separats, validació i cache/reintents/timeout. `scripts/test-pau-history.mjs` comprova detall, comparació, rondes, cobertura, codi alternatiu, lazy loading, recuperació, preservació del desat privat i geometria en tres motors i 1440/768/390/320 px.

Les proves són exclusivament locals. Per evitar una compilació concurrent amb els altres xats, la prova admet `LANET_TEST_ASSETS` per servir una sortida de Vite aïllada a `output/pau-history/dist`. La integració final farà un únic build fix i les regressions conjuntes, abans de la PR/Validate i publicació agrupada. Evidències privades a `output/pau-history/`.

## Verificació local acabada

37 proves PAU relacionades correctes, incloses 11 específiques de l’històric; tipus/lint correctes. 75 fluxos de navegador correctes en Chromium, Firefox i WebKit: 12 d’històric, 39 de PAU/calculadora i 24 de top 5, amb revisió visual de captures, 320/390/768/1440 px i pantalles horitzontals. Càrrega diferida, cache compartida, reintent, absències, codis separats i notes/preferències privades preservades.

Fonts i regeneració reproduïbles; byte/hash del catàleg i cobertura a `output/pau-history/verification.json`. Aquesta verificació de PAU no substitueix Validate ni les regressions del conjunt final; integració i publicació agrupades pendents del xat coordinador. Cap migració, servei privat ni dada de producció modificada per aquest canvi.
