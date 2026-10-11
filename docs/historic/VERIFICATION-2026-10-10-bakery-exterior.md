# Verificació de La Net · exterior de la pastisseria R30

10 d’octubre de 2026. [Pla de l’exterior](PLA-PASTISSERIA-EXTERIOR.md), [checklist](CHECKLIST.md), [registre](SEGUIMENT.json) i [historial](HISTORIAL-CANVIS.md): 30 requisits, 18 fases i 75 tasques, una sola tasca activa. L’informe R29 es conserva íntegre a [historic/VERIFICATION-2026-10-10-bakery-motion.md](historic/VERIFICATION-2026-10-10-bakery-motion.md).

## Resultat

El marc anterior quedava 69,4 px desplaçat a l’esquerra a 1280 × 720 perquè la proporció reservada combinada amb l’alçada màxima n’encongia l’amplada. Ara un marc 3:2 amb marges automàtics centra la caseta i limita la mida amb l’amplada i l’alçada de la finestra. La imatge, la porta interactiva i el vapor comparteixen el mateix marc. Es retira el fons verd de la imatge i dels contenidors; el botó queda centrat a sota. [Diagnosi](../output/bakery-exterior/diagnosi.json), [abans](../output/bakery-exterior/abans.png) i [després](../output/bakery-exterior/proposta-escriptori.png).

El retall s’ha generat amb l’eina integrada **imagegen**, mantenint el canal alfa sense postprocessar el bitmap. PNG RGBA de 1536 × 1024, 834.052 píxels amb alfa zero i 687.696 amb alfa almenys 250. Les cantonades tenen alfa 0, 0, 1 i 0 sobre 255; no hi ha un fons opac ni un rectangle visible. La base de gespa i els detalls de la casa queden complets. L’original opac, l’interior i l’atlas mantenen el SHA-256 del lliurament R29. La variant transparent és una edició generada; no s’afirma identitat de cada píxel amb l’original. [PNG](../public/images/bakery-exterior-transparent-v1.png), [prompt exacte](../design/bakery-exterior-transparent-prompt.txt) i [inspecció](../output/bakery-exterior/imatge-verificada.json).

## Comprovacions locals

| Comprovació | Resultat | Evidència |
| --- | --- | --- |
| Unitats i regressions de domini | 67/67 | [unit.txt](../output/bakery-exterior/unit.txt) |
| Tipus, sintaxi i ESLint | Superat | [typecheck.txt](../output/bakery-exterior/typecheck.txt) |
| Build i desplegament simulat | Superat | [cf-check.txt](../output/bakery-exterior/cf-check.txt) |
| Set amplades amb barra desplegada | 7/7 | [responsive](../output/bakery-exterior/responsive-expandida.json) |
| Barra plegada i finestres de 360 px d’alçada | 6/6 | [responsive addicional](../output/bakery-exterior/responsive-plegada-finestra-baixa.json) |
| Entrada, porta, cancel·lació i retorn de focus | 4/4 | [interaccions](../output/bakery-exterior/interaccions.json) |
| Dades originals en lectura | 3 usuaris, 345 files i 16 taules intactes | [auditoria](../output/bakery-exterior/preservacio-dades.json) |

Amplades de 320, 390, 760, 820, 1024, 1280 i 1536 px. El descentrament mesurat és inferior a 0,01 px. Proporció conservada, imatge carregada, cap desbordament exterior i botó d’almenys 44 px. La porta manté la posició relativa 54%/40%. [Mòbil](../output/bakery-exterior/centrada-390.png), [escriptori ample](../output/bakery-exterior/centrada-1536.png), [interior](../output/bakery-exterior/interior-preservat.png) i [informe consolidat](../output/bakery-exterior/verificacio-local.json).

La cancel·lació es comprova amb teclat dins de la transició de 650 ms i s’espera després per descartar una entrada tardana. La captura automàtica seguida de clic superava aquesta transició; no s’ha alterat la durada d’entrada. Porta i botó principal s’han activat amb clic, i sortir retorna el focus. L’estat recollit i el saldo local de 25 es conserven. Cap error o advertiment de consola en el recorregut local.

## Publicació i còpia

Publicada la versió `e35f2c9a-1921-4c38-90b8-015f580d4aa8` al mateix Worker. Quatre recursos actualitzats i cap migració pendent. **47 recursos idèntics en SHA-256**, salut i accés temporal correctes. La caseta queda centrada a 1280 i 390 px; porta, cocció abans de l’oferta i retorn de focus comprovats a producció. El saldo es conserva a 24, sense recollir pastissos ni modificar notes/perfil. Cap error ni advertiment de consola. [Desplegament](../output/bakery-exterior/cloud-deploy.txt), [recursos](../output/bakery-exterior/publicacio-recursos.json), [navegador](../output/bakery-exterior/publicacio-navegador.json) i [captura pública](../output/bakery-exterior/publicacio-escriptori.png).

Amb els servidors aturats s’ha exportat `backups/la-net-local-2026-10-10-exterior.sql`, que coincideix en totes les files de **38 taules**, incloses les set migracions, amb quick_check correcte i zero errors de referències. La còpia anterior es conserva: les lectures de verificació actualitzen els límits de peticions, per això s’ha generat una instantània nova. SHA-256: `1f7e5592428f8b6b73b0849810da12c3edf739fe1ebc0797ebdb3930221d6e15`. [SQL verificat](../output/bakery-exterior/copia-sql-verificada.json). Còpia D1/R2 a `backups/state-v3-2026-10-10T10-07-24-204Z/`, 14 fitxers contrastats amb el manifest. [Còpia verificada](../output/bakery-exterior/copia-d1-r2-verificada.json).

El [paquet base](../output/bakery-exterior/lliurament-base-verificat.json) acredita 829 fitxers, mides/SHA-256, totes les evidències i absència de camins privats exclosos. Les quatre tasques F17 estan verificades: **75/75 tasques totals, cap activa ni pendent**. El ZIP final es regenera amb la checklist tancada i es rellegeix íntegrament; manifest i informe `*.verificacio.json` a `exports/`. [Instruccions de trasllat](../TRASLLAT.md).

## Abast

Aquesta revisió modifica el PNG exterior i el seu marc de coordenades. La seqüència interior, els endpoints i les regles de recompensa es conserven. R29 documenta 26 fluxos API, 12 fases visuals, 14 combinacions d’oferta/recollit i 10 interaccions del build amb recollida en una base aïllada; no s’han repetit aquestes proves perquè aquesta correcció no en canvia la implementació. La revisió pública s’ha fet en lectura sense recollir pastissos ni modificar notes o perfil.
