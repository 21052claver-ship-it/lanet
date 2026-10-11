# Verificació de La Net · icones transparents R33

10 d’octubre de 2026. [Pla](PLA-ICONES-TRANSPARENTS.md), [checklist](CHECKLIST.md), [registre](SEGUIMENT.json) i [historial](HISTORIAL-CANVIS.md): **33 requisits, 21 fases i 87 tasques**. Informe R32 íntegre a [historic/VERIFICATION-2026-10-10-view-selectors.md](historic/VERIFICATION-2026-10-10-view-selectors.md).

## Canvi

La captura de Marc mostra el pastís del saldo sobre un requadre préssec heretat del mockup. El pastís ara té alfa real i es comparteix al saldo, preus, moneder, menú de Pastisseria i recollida. Megàfon i document dels avisos també eliminen les plaques de fons. El botó del saldo i les dimensions dels controls es conserven.

Tres variants creades amb ImageGen integrat a partir de les referències, sense postprocessar el bitmap. Originals i prompts conservats; no s’afirma identitat de píxels de les variants. [Procedència i prompts](../design/ui-alpha/RECURSOS.json). El viewport SVG enquadra tot el contingut amb alfa ≥ 2/255 i marge del 4,5%; només descarta punts aïllats d’alfa 1/255. Composició normal per conservar els blancs sobre qualsevol superfície. La marca, retrats, escenes i art daurat del Pastisdoro conserven els recursos anteriors.

## Comprovacions

| Comprovació | Resultat | Evidència |
| --- | --- | --- |
| Proves existents | 74/74 | [unit.txt](../output/icon-alpha/unit.txt) |
| Tipus, sintaxi i ESLint | Superat | [typecheck.txt](../output/icon-alpha/typecheck.txt) |
| Compilació i dry-run | Superat | [build-final.txt](../output/icon-alpha/build-final.txt) |
| PNG amb alfa, contorns i SHA-256 | 3 RGBA, cantons transparents, mateixos bytes que ImageGen | [alfa](../output/icon-alpha/alfa-verificat.json) |
| Recursos del build | 3 PNG idèntics, URLs i CSS presents | [integració](../output/icon-alpha/integracio-compilada.json) |
| Dimensions i art anterior | 60 observacions del component, 116 fitxers originals idèntics a R32 | [component](../output/icon-alpha/component-verificat.json), [SHA-256](../output/icon-alpha/regressions-preservades.json) |

[Mostra local del component SVG](../output/icon-alpha/mostra-component.png), inspeccionada a 20, 25, 30, 35, 54, 60 i 64 px sobre blanc, ivori, sàlvia i préssec. Render de ReferenceArt amb ReactDOMServer i SVG/Sharp: **no és una captura ni una prova de layout del navegador**. Els PNG finals no s’han editat. Els 27 fluxos API de R31 no es repeteixen en aquest canvi visual; API, domini, migracions i proves mantenen els SHA-256 anteriors. [Informe consolidat](../output/icon-alpha/verificacio-local.json).

## Publicació i límit

Versió **c88acd48-cee4-4145-b22c-ecaf15854127** publicada a [La Net](https://la-net.impossible-goals-research.workers.dev). Wrangler confirma sis recursos nous/actualitzats, 44 ja presents i inici del Worker en 1 ms. [Desplegament](../output/icon-alpha/cloud-deploy.txt). Cap migració nova, importació de dades locals ni canvi de notes, saldos o perfil.

Es respecten els bloquejos d’accés a localhost i a la web pública registrats en R31/R32. En R33 no s’ha intentat accedir al navegador ni llegir la web per una altra via. **La revisió visual pública, teclat en navegador i les comprovacions HTTP públiques no s’han repetit.** La publicació està confirmada pel CLI. [Límit anterior vigent](../output/view-selectors/navegador-bloquejat.json).

## Còpia

Servidors locals aturats abans de la instantània. SQL actual: backups/la-net-local-2026-10-10-icon-alpha.sql, restaurat en memòria amb **38 taules idèntiques, 7 migracions**, quick_check correcte i zero errors de referències. SHA-256 1f7e5592428f8b6b73b0849810da12c3edf739fe1ebc0797ebdb3930221d6e15, idèntic al de R32. [SQL verificat](../output/icon-alpha/copia-sql-verificada.json).

Còpia D1/R2 a backups/state-v3-2026-10-10T12-33-01-106Z/: **14 fitxers** contrastats amb el manifest. [Còpia verificada](../output/icon-alpha/copia-d1-r2-verificada.json). Totes les còpies anteriors es conserven.

**87/87 tasques verificades**, cap activa ni pendent. El [paquet base](../output/icon-alpha/lliurament-base-verificat.json) acredita 1014 fitxers rellegits amb mida i SHA-256 correctes. El ZIP final es regenera amb checklist i historial tancats i comprova tots els fitxers. Manifest i informe del mateix nom a exports/. [Trasllat](../TRASLLAT.md).
