# Verificació de La Net · Pastisseria simple R42

10 d’octubre de 2026. **42 requisits, 30 fases, 122/123 tasques verificades.** [Pla](PLA-PASTISSERIA-SIMPLE.md), [checklist](CHECKLIST.md), [historial](HISTORIAL-CANVIS.md), [informe anterior R41](historic/VERIFICATION-2026-10-10-welcome-redesign.md).

## Resultat

Pastissera integrada en una sola il·lustració, mans relaxades i taulell central net. Cap salutació, braç articulat, caminada, balanceig o retall de cos per capes. El pastís recolza al taulell, al costat de les mans. Animació limitada a escalfor, creixement dins del forn i aparició final suau.

Preparació de **7,2 segons**: escalfar 0,8 s, coure 4 s, reposar 1,4 s i presentar 1 s. El botó només apareix després. Un cop recollit, escena quieta. Moviment reduït ofereix directament. Pausa per visibilitat, cancel·lació, focus d’entrada/sortida, recollida i vol al saldo preservats en el codi existent.

## Comprovacions

| Comprovació | Resultat | Evidència |
| --- | --- | --- |
| Proves unitàries | 133/133, incloses 11 de pastisseria | [log](../output/bakery-simple/unit.txt), [proves](../tests/bakery-sequence.test.js) |
| API D1/R2 aïllada | 38 fluxos; premi diari, saldo, convidat, notes, cartell i permisos | [resultat](../output/bakery-simple/api-result.json) |
| Tipus, sintaxi i lint | Correctes | [log](../output/bakery-simple/typecheck.txt) |
| Compilació i desplegament simulat | Correctes | [log](../output/bakery-simple/build.txt) |
| Components reals | 18 casos SSR, botó només al final i estat accessible | [informe](../output/bakery-simple/ui-verificada.json) |
| Fotogrames | Vuit mostres SVG/raster inspeccionades; regió del cos idèntica en totes | [mostra](../output/bakery-simple/fotogrames-offline.png), [metodologia](../output/bakery-simple/fotogrames.json) |
| Estils | 18 regles antigues eliminades; 275 regles alienes idèntiques; cap animació de braços o girs | [informe](../output/bakery-simple/estils-verificats.json) |
| Imatge | 1536×1024; WebP sense pèrdua, 1285864 bytes | [informe](../output/bakery-simple/art-verificat.json), [prompt](../design/bakery-simple-v1-prompt.txt) |
| Regressions | 194 fitxers idèntics; benvinguda, backend, migracions, recollida i vol preservats | [hashes](../output/bakery-simple/recursos-preservats.json) |
| Còpia SQL | 39 taules idèntiques, onze migracions, integritat i claus foranes correctes | [informe](../output/bakery-simple/copia-sql-verificada.json) |
| Còpia D1/R2 | 14 fitxers amb SHA-256 comprovat | [informe](../output/bakery-simple/copia-d1-r2-verificada.json) |

## Publicació i límits

Versió **08140c27-c7bf-4374-b4f4-dbe6df91d49c**, [La Net](https://la-net.impossible-goals-research.workers.dev). Wrangler confirma 5 recursos nous/actualitzats, 51 reutilitzats i inici del Worker en 2 ms. Fonts publicades idèntiques a les comprovades. Cap canvi de dades o migració. [Log](../output/bakery-simple/cloud-deploy.txt), [verificació](../output/bakery-simple/publicacio-verificada.json).

Els permisos desats continuen denegant la navegació local i pública. Les comprovacions són de rellotge virtual, API aïllada, SSR, CSS i SVG/raster offline: no acrediten reproducció real en navegador, interacció, focus o responsive observat. Per rasteritzar s’incrusta el PNG amb els mateixos píxels que el WebP servit. No es declara perfecció visual comprovada en navegador.

T25-05 continua pendent: client OAuth, secrets i entrada Google real. [Estat](../output/google-auth/activacio.json).

T29-04 verificada. Paquet base rellegit amb tots els hashes correctes; el ZIP final incorpora checklist i historial actualitzats. [Paquet base](../output/bakery-simple/lliurament-base-verificat.json).
