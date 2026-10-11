# Verificació de La Net · unions de la pastissera R36

10 d’octubre de 2026. [Pla](PLA-PASTISSERIA-UNIONS.md), [checklist](CHECKLIST.md), [registre](SEGUIMENT.json) i [historial](HISTORIAL-CANVIS.md): **36 requisits, 24 fases i 99 tasques**. Informe anterior preservat a [historic/VERIFICATION-2026-10-10-bakery-choreography.md](historic/VERIFICATION-2026-10-10-bakery-choreography.md).

## Correcció

Canvi de producció limitat a **BakerPuppet.jsx**. El coll queda centrat sobre el tronc; una màscara SVG corba retira el coll de camisa duplicat de la peça del cap. Es conserva el coll de camisa del cos. Les zones protegides de cara, barret i costat del monyo mantenen l’alfa original: **271154 píxels opacs comparats, zero canvis**. Les amplificacions permeten inspeccionar també la forma de la màscara.

Els avantbraços s’insereixen cinc punts més dins les mànigues i es dibuixen abans dels punys. La tapa ovalada de la peça deixa de quedar superposada al puny quan es flexiona el colze. A cada pivot d’espatlla i colze, les dues peces comparteixen un disc opac de radi quatre. Cos, cap i braços continuen en el mateix grup de respiració i gir.

PNG, escenari, taulell, safata, seqüència de 25,6 segons, forn, pausa de pestanya, moviment reduït, recompensa i API idèntics a R35. [Diagnòstic](../output/bakery-joints/diagnostic.md), [correcció seleccionada](../output/bakery-joints/implementacio.md).

## Comprovacions actuals

| Comprovació | Resultat | Evidència |
| --- | --- | --- |
| Proves unitàries | **82/82**, incloses nou de la seqüència | [log](../output/bakery-joints/unit.txt) |
| Tipus i lint | Correctes | [log](../output/bakery-joints/typecheck.txt) |
| Build i dry-run | Correctes | [log](../output/bakery-joints/build.txt) |
| Unions d’espatlles i colzes | Vuit discs opacs, alfa mínim 255; connexió independent de l’angle | [geometria i alfa](../output/bakery-joints/unions-verificades.json) |
| Coll i cap | **1.464 configuracions** de gir, inclinació i alçada, sense buits al nucli de la unió; zones protegides sense retallades | [resultat](../output/bakery-joints/unions-verificades.json) |
| Posicions intermèdies | **75 ampliacions** del component real, pastís amagat per veure el tronc | [mostra](../output/bakery-joints/final/intermedis.png), [mètode](../output/bakery-joints/final/renders.json) |
| Integració de l’escena | **15 fotogrames** i **45 estats** de fase, pausa i moviment reduït | [fotogrames](../output/bakery-joints/fotogrames-offline.png), [components](../output/bakery-joints/components-verificats.json) |
| Peus darrere del taulell | 2.688 píxels mostrejats, 1.710 configuracions del trajecte/balanceig, zero fora | [oclusió](../output/bakery-joints/oclusio-peus.json) |
| Preservació | **175 fitxers** de codi, tests i art idèntics a R35 | [SHA-256](../output/bakery-joints/regressions-preservades.json) |

[Informe consolidat](../output/bakery-joints/verificacio-local.json). R35 va superar 30 fluxos API aïllats; es conserva aquella evidència, **no es presenta com una nova execució R36**. API, migracions i comportament compartit mantenen els seus SHA-256; aquesta correcció només afecta el muntatge SVG.

Els renders ReactDOMServer/SVG/Sharp mostregen angles i capes offline; **no són reproducció CSS, focus ni layout responsive al navegador**. L’accés anteriorment denegat a localhost:5183 i a la web pública es respecta, sense nous intents ni lectures HTTP alternatives. La fluïdesa real al navegador i la revisió visual pública no s’han pogut repetir. [Límit vigent](../output/view-selectors/navegador-bloquejat.json).

## Publicació i còpies

Versió **9e1c053b-862c-4b7c-b76a-c23d870061c2** publicada a [La Net](https://la-net.impossible-goals-research.workers.dev). Wrangler confirma **2 recursos nous/actualitzats**, 49 ja presents i inici en 1 ms. [Desplegament](../output/bakery-joints/cloud-deploy.txt). Cap migració, importació local o modificació de dades de producció.

SQL actual: **backups/la-net-local-2026-10-10-bakery-joints.sql**. Restaurat en memòria: **38 taules idèntiques, 8 migracions, quick_check correcte i zero errors de referències**. SHA-256 **bf3d1e48e5ed30875fbf59383f2b61eaa090900a31341a429c5d85e885dcbbf9**, idèntic al de R35. [Comprovació SQL](../output/bakery-joints/copia-sql-verificada.json).

Còpia D1/R2: **backups/state-v3-2026-10-10T14-11-45-410Z/**, **14 fitxers** comprovats contra el manifest SHA-256. [Comprovació de l’estat](../output/bakery-joints/copia-d1-r2-verificada.json). Originals, evidències i còpies anteriors preservats.

Pla tancat amb **99/99 tasques verificades**, sense feina activa ni pendent. Paquet base rellegit amb **1359 fitxers** i SHA-256 correctes; el paquet final incorpora la checklist i l’historial tancats. [Comprovació](../output/bakery-joints/lliurament-base-verificat.json). [Trasllat](../TRASLLAT.md). Manifest i resum del ZIP a exports/.
