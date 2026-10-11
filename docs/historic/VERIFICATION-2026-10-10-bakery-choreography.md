# Verificació de La Net · pastissera articulada R35

10 d’octubre de 2026. [Pla](PLA-PASTISSERIA-COREOGRAFIA.md), [checklist](CHECKLIST.md), [registre](SEGUIMENT.json), [historial](HISTORIAL-CANVIS.md): **35 requisits, 23 fases i 95 tasques**. Informe R34 preservat íntegre a [historic/VERIFICATION-2026-10-10-banner-identity.md](historic/VERIFICATION-2026-10-10-banner-identity.md).

## Canvi

La pastissera es mou amb un esquelet SVG: cap, espatlles, colzes, cos i safata articulats. Saluda amb la mà, respira, parpelleja, camina amb balanceig suau, mira el forn, comprova la cocció, extreu i presenta el pastís. Ja no es dissolen dues siluetes completes per canviar de pose. Les peces mantenen l’estil 3D de la referència; l’animació es fa amb SVG/CSS, sense una dependència 3D o de vídeo nova.

**Catorze estats en 25,6 segons**, amb trajectes de 2,5 segons i gestos de 1,2–2 segons. La porta s’obre abans de carregar i abans d’extreure. **Vuit segons de cocció** amb llum, flames, massa que puja i calor discreta; el pastís deixa el forn quan passa a les mans. L’entrada dura un segon i l’interior apareix amb una transició de 700 ms. El pastís es presenta més alt i a la dreta del gerro. El botó continua al seu costat, separat de la mà en mòbil, amb almenys 48 px d’alçada.

El mateix recurs del pastís viatja de les mans al saldo, després de confirmar l’API. Preparar no concedeix recompenses. La seqüència conserva el temps restant quan s’oculta la pestanya; també es pausen els moviments en curs. Sortir cancel·la els temporitzadors. Moviment reduït ofereix directament i un pastís ja recollit només saluda. Els avisos de lector de pantalla s’agrupen en preparació, cocció, entrega i disponibilitat.

Art amb ImageGen **integrat**, PNG transparent original conservat byte per byte: [recurs](../public/images/baker-rig-v4.png), [prompt exacte](../design/baker-rig-v4-prompt.txt), [procedència](../design/baker-rig-v4.json), [registre de peces](../src/baker-rig.json). L’atlas v3, l’escenari i la caseta originals es conserven.

## Comprovacions

| Comprovació | Resultat | Evidència |
| --- | --- | --- |
| Proves unitàries i base de dades | **82/82** | [unit.txt](../output/bakery-choreography/unit.txt) |
| Comportament de la pastisseria | Nou proves: cocció, oferta final, pausa, represa, sortida, callbacks tardans i moviment reduït | [proves](../tests/bakery-sequence.test.js) |
| API amb D1/R2 aïllats | **30 fluxos correctes** | [resultat](../output/bakery-choreography/api-result.json), [log](../output/bakery-choreography/api.txt) |
| Tipus i lint | Correctes | [typecheck-final.txt](../output/bakery-choreography/typecheck-final.txt) |
| Build i dry-run | Correctes | [build-final.txt](../output/bakery-choreography/build-final.txt) |
| Components reals offline | 45 combinacions de fase, pausa i moviment reduït; acció només al final | [components](../output/bakery-choreography/components-verificats.json) |
| Art i capes offline | Quinze fotogrames: catorze fases i salutació posterior | [mostra](../output/bakery-choreography/fotogrames-offline.png), [mètode](../output/bakery-choreography/fotogrames.json) |
| Peus darrere del taulell | Mostreig d’alfa i trajecte/balanceig: zero punts fora dels polígons | [geometria](../output/bakery-choreography/oclusio-peus.json) |
| Regressions | **164 fitxers** de la versió R34 idèntics en SHA-256 | [preservació](../output/bakery-choreography/regressions-preservades.json) |

La comprovació inicial del recorregut va detectar tres punts de sabata fora del taulell; s’ha desplaçat sis unitats la parada davant del forn i repetit el mostreig sense incidències. L’evidència inicial es conserva. L’API usa només localhost:8791 i una base/bucket de proves a output/api-tests/, exclosos del paquet. Comprova també recompensa diària idempotent, permisos, notes i anuncis amb nom o anònims. [Informe consolidat](../output/bakery-choreography/verificacio-local.json).

Els renders utilitzen els components de producció amb ReactDOMServer i SVG/Sharp, congelant els gestos per inspeccionar l’art i les capes. **No són captures, reproducció CSS ni proves de focus o layout responsive del navegador.** El bloqueig anterior de localhost:5183 i de la web pública es respecta: cap accés nou ni lectura HTTP alternativa. La fluïdesa real al navegador i la revisió visual pública no s’han pogut repetir. [Límit vigent](../output/view-selectors/navegador-bloquejat.json).

## Publicació i còpia

Versió **10fafa0f-8501-430d-b81c-e1e3a844f275** publicada a [La Net](https://la-net.impossible-goals-research.workers.dev). Wrangler confirma **4 recursos nous/actualitzats**, 47 ja presents i Worker iniciat en 1 ms. [Desplegament](../output/bakery-choreography/cloud-deploy.txt). Cap migració nova, importació de dades locals o recompensa de prova a producció. La API i les vuit migracions anteriors mantenen el SHA-256.

Amb els servidors locals aturats, backups/la-net-local-2026-10-10-bakery-choreography.sql s’ha restaurat en memòria: **38 taules idèntiques, vuit migracions, quick_check correcte i zero errors de referències**. SHA-256 bf3d1e48e5ed30875fbf59383f2b61eaa090900a31341a429c5d85e885dcbbf9. [SQL verificat](../output/bakery-choreography/copia-sql-verificada.json).

Còpia D1/R2 a **backups/state-v3-2026-10-10T13-40-12-953Z/**, amb **14 fitxers** comprovats contra el manifest SHA-256. [Còpia verificada](../output/bakery-choreography/copia-d1-r2-verificada.json). Les còpies anteriors es conserven.

Pla tancat amb **95/95 tasques verificades**, sense feina activa ni pendent. El paquet base s’ha rellegit amb **1143 fitxers** i tots els SHA-256 correctes. El ZIP final incorpora checklist i historial tancats. [Comprovació del paquet base](../output/bakery-choreography/lliurament-base-verificat.json). [Trasllat](../TRASLLAT.md). Manifest i resum del paquet a exports/.
