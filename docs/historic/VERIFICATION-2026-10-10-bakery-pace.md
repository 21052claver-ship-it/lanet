# Verificació de La Net · ritme àgil R37

10 d’octubre de 2026. [Pla](PLA-PASTISSERIA-RITME.md), [checklist](CHECKLIST.md), [registre](SEGUIMENT.json) i [historial](HISTORIAL-CANVIS.md): **37 requisits, 25 fases i 103 tasques**. Informe R36 preservat a [historic/VERIFICATION-2026-10-10-bakery-joints.md](historic/VERIFICATION-2026-10-10-bakery-joints.md).

## Resultat

Preparació de **25,6 a 16 segons, un 37,5% menys d’espera**. Entrada de 1.000 a **650 ms** i interior de 700 a 450 ms. Es mantenen les catorze fases: salutació, porta abans de carregar, **quatre segons de cocció visible**, porta abans d’extreure i presentació final. Els trajectes duren 1,8 segons, les articulacions 800 ms i l’extracció 1,4 segons.

Les durades de seqüència i CSS comparteixen BAKERY_MOTION_MS. Caminada en un pivot propi: dos passos acabats en posició neutra, sense reiniciar la respiració. Salutació inicial més breu i suau; parpelleig, respiració i vapor mantenen el ritme tranquil. Finishing i offering tenen la mateixa postura; safata, mans i inclinació del cap acaben **200 ms abans que aparegui el botó**, evitant el reajustament posterior.

PNG, coll i colzes corregits, taulell, vol del pastís, API i dades preservats. Pausa, cancel·lació i moviment reduït es mantenen. [Diagnòstic](../output/bakery-pace/diagnostic.md), [implementació](../output/bakery-pace/implementacio.md).

## Comprovacions

| Comprovació | Resultat | Evidència |
| --- | --- | --- |
| Proves unitàries | **82/82**, nou de seqüència amb els terminis nous | [log](../output/bakery-pace/unit.txt) |
| Tipus i lint | Correctes | [log](../output/bakery-pace/typecheck.txt) |
| Build i dry-run | Correctes | [log](../output/bakery-pace/build.txt) |
| Sincronització | **15 regles CSS** vinculades als temps compartits i **11 intervals** suficients | [temporització](../output/bakery-pace/temporitzacio-verificada.json) |
| Entrega | Postura final idèntica, marge de 200 ms i caminada neutra | [comprovació](../output/bakery-pace/temporitzacio-verificada.json) |
| Unions | Vuit discs opacs als pivots, coll sense buits en **1.464 configuracions**, zones protegides del cap sense retallades | [alfa i geometria](../output/bakery-pace/unions-verificades.json) |
| Revisió offline | **75 ampliacions**, **15 escenes**, **45 estats** de fase/pausa/moviment reduït | [ampliacions](../output/bakery-pace/final/intermedis.png), [escenes](../output/bakery-pace/fotogrames-offline.png), [components](../output/bakery-pace/components-verificats.json) |
| Peus | 2.688 píxels mostrejats, **5.130 configuracions**, zero fora del taulell | [geometria](../output/bakery-pace/oclusio-peus.json) |
| Regressions | **170 fitxers** de codi, art i proves idèntics a R36 | [SHA-256](../output/bakery-pace/regressions-preservades.json) |

[Informe consolidat](../output/bakery-pace/verificacio-local.json). R35 va superar 30 fluxos API aïllats; no s’atribueixen a una execució nova. Worker, dependències API i migracions idèntics; el mòdul de coreografia és de frontend i les nou proves amb rellotge virtual s’han repetit amb els temps nous.

Els renders mostregen angles i capes offline amb els components reals. **No són reproducció CSS, focus ni layout responsive del navegador.** L’accés anteriorment denegat es respecta: cap intent nou a localhost:5183 o a la web pública, ni lectures HTTP alternatives. La reproducció real i la revisió visual pública continuen sense repetir. [Límit vigent](../output/view-selectors/navegador-bloquejat.json).

## Publicació i còpia

Versió **ea4afab1-b26e-44ca-ae33-f40afa54724b** a [La Net](https://la-net.impossible-goals-research.workers.dev). Wrangler confirma **3 recursos actualitzats**, 48 ja presents i inici en 1 ms. [Desplegament](../output/bakery-pace/cloud-deploy.txt). Sense migracions, importacions locals ni modificacions de dades de producció.

SQL: **backups/la-net-local-2026-10-10-bakery-pace.sql**, restaurat en memòria amb **38 taules idèntiques, 8 migracions, quick_check correcte i zero errors de referències**. SHA-256 **bf3d1e48e5ed30875fbf59383f2b61eaa090900a31341a429c5d85e885dcbbf9**, idèntic a R36. [Comprovació](../output/bakery-pace/copia-sql-verificada.json).

D1/R2: **backups/state-v3-2026-10-10T15-09-36-058Z/**, **14 fitxers** verificats contra el manifest SHA-256. [Comprovació](../output/bakery-pace/copia-d1-r2-verificada.json). Còpies i evidències anteriors conservades.

Pla tancat amb **103/103 tasques verificades**, sense feina activa ni pendent. Paquet base rellegit amb **1499 fitxers** i SHA-256 correctes; el ZIP final inclou checklist i historial tancats. [Comprovació](../output/bakery-pace/lliurament-base-verificat.json). [Trasllat](../TRASLLAT.md). Manifest i resum del ZIP a exports/.
