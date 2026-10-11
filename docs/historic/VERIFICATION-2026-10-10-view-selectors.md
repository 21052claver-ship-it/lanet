# Verificació de La Net · selectors visuals R32

10 d’octubre de 2026. [Pla](PLA-SELECTORS-VISUALS.md), [checklist](CHECKLIST.md), [registre](SEGUIMENT.json) i [historial](HISTORIAL-CANVIS.md): **32 requisits, 20 fases i 83 tasques**. L’informe R31 queda arxivat íntegre a [historic/VERIFICATION-2026-10-10-board-creative.md](historic/VERIFICATION-2026-10-10-board-creative.md).

## Canvi

La captura de Marc mostra el fons de l’opció inactiva en passar-hi el ratolí competint amb el subratllat de l’activa. El selector passa a una base neutra agrupada; només la vista seleccionada té fons préssec, contorn marró i ombra lleu. Horari i Agenda incorporen rellotge i calendari, amb símbol emplenat en seleccionar. Apunts, Plusos, Comunitat, perfil, accés i vistes auxiliars comparteixen el tractament del component Tabs.

Botons d’almenys 44 px, selector principal de 300 px limitat a l’espai disponible, espaiat reduït a 400 px i desplaçament horitzontal intern per als grups llargs. Focus visible dins de cada botó; aria-selected, punt únic de tabulació i fletxes/Inici/Final conservats. Tipus button explícit, moviment reduït i colors forçats contemplats. No s’ha alterat la lògica del canvi de vista ni la persistència.

[Captura aportada](../output/view-selectors/referencia-marc.png), [esquema del nou estil](../output/view-selectors/mostra-estil.png) i [CSS](../src/tabs.css). L’esquema es genera amb SVG, colors locals i les icones existents; **no és una captura del navegador**.

## Comprovacions

| Comprovació | Resultat | Evidència |
| --- | --- | --- |
| Proves existents | 74/74 | [unit.txt](../output/view-selectors/unit.txt) |
| Tipus, sintaxi i ESLint | Superat | [typecheck.txt](../output/view-selectors/typecheck.txt) |
| Compilació i deploy simulat | Superat | [build-final.txt](../output/view-selectors/build-final.txt) |
| Text inactiu / actiu | 5,155:1 / 9,274:1 | [contrast](../output/view-selectors/contrast.json) |
| Contorn actiu / focus | 3,411:1 / almenys 5,445:1 | [contrast](../output/view-selectors/contrast.json) |
| API, domini, migracions, art i proves | 68 SHA-256 idèntics a R31 | [preservació](../output/view-selectors/regressions-preservades.json) |

S’ha reforçat el contorn després de mesurar 2,730:1 inicialment; el càlcul final supera 3:1. Es conserva el [resultat inicial](../output/view-selectors/contrast-inicial.json). No s’han repetit els 27 fluxos API ni els 112 casos responsive de R31: la lògica de domini es conserva i l’accés al navegador està bloquejat. [Informe consolidat](../output/view-selectors/verificacio-local.json).

## Publicació

Versió **`68ca5f45-49ec-4a89-a159-8cab8e80fb59`** publicada a [La Net](https://la-net.impossible-goals-research.workers.dev). Wrangler confirma quatre recursos actualitzats, 43 ja presents i Worker iniciat en 1 ms. No s’han executat migracions ni importat dades locals. [Resultat del desplegament](../output/view-selectors/cloud-deploy.txt).

La política del navegador ha denegat accedir a la web pública; localhost mantenia un bloqueig desat de R31 i no s’ha intentat accedir-hi. No s’ha buscat una superfície alternativa de navegador ni s’ha llegit la web per una via indirecta. **La revisió visual, el teclat en navegador i les comprovacions HTTP públiques no s’han repetit en R32.** El desplegament està confirmat pel CLI; no s’afirma una nova prova visual pública. [Límit registrat](../output/view-selectors/navegador-bloquejat.json).

## Còpia

Servidors locals aturats abans de la instantània. `backups/la-net-local-2026-10-10-selectors.sql` restaurat en memòria amb **38 taules idèntiques, set migracions**, quick_check correcte i zero errors de referències. SHA-256 `1f7e5592428f8b6b73b0849810da12c3edf739fe1ebc0797ebdb3930221d6e15`, idèntic a R31. [SQL verificat](../output/view-selectors/copia-sql-verificada.json).

Còpia D1/R2 nova a `backups/state-v3-2026-10-10T12-09-51-809Z/`: **14 fitxers** contrastats amb el manifest. [Còpia verificada](../output/view-selectors/copia-d1-r2-verificada.json). Les còpies anteriors es conserven.

Les tres tasques F19 estan verificades: **83/83 tasques generals, cap activa ni pendent**. El [paquet base](../output/view-selectors/lliurament-base-verificat.json) acredita 960 fitxers, mides i SHA-256 correctes, totes les evidències incloses i absència de camins privats exclosos. El ZIP final es regenera amb la checklist tancada i contrasta mides i SHA-256 de tots els fitxers. Els manifests i informes `*.verificacio.json` es conserven a `exports/`. [Trasllat](../TRASLLAT.md).
