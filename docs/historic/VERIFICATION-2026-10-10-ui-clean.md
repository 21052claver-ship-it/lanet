# Verificació de La Net · simplificació de la UI i la UX

Revisió del 10 d’octubre de 2026, corresponent a R28 i al [pla de simplificació](PLA-UI-CLEAN.md). El registre conté 28 requisits, 16 fases i 67 tasques. [Checklist](CHECKLIST.md), [estat](SEGUIMENT.json) i [historial](HISTORIAL-CANVIS.md) mantenen una sola tasca activa. La verificació anterior es conserva a [historic/VERIFICATION-2026-10-10-depuracio.md](historic/VERIFICATION-2026-10-10-depuracio.md).

## Resultat de la simplificació

- Capçalera i barra lateral amb menys elements repetits; curs en una línia, perfil compacte i cartell petit conservat.
- Filtres d’Apunts i Plusos en una sola franja adaptable. Les preferències d’assignatura s’obren dins del contingut i es desen explícitament, amb seleccions independents.
- Apunts de text sense una falsa miniatura que repeteixi títol i resum. Formats, autoria i accions secundàries més discrets. Plusos amb art original més petit i condicions al detall.
- Notes amb un únic selector de full, Configurar avaluació com a acció principal i CSV, objectiu i ajuda dins d’Opcions. Pes sota cada nota, Desfer quan és útil i mode discret preservat.
- Horari amb exportació i personalització a Opcions. Comunitat amb menys panells dins de panells. Pastisdoro centra l’atenció en el temps; la biblioteca de cinc músiques es desplega a petició.
- Pastisseria completa, animació conservada, saldo i estat del dia junts; moviments recents plegables.

La capa comuna és `src/clean.css`. Les opcions compartides gestionen Escape, clic exterior, retorn del focus i posició dins de finestres baixes. Les densitats compacta i còmoda continuen sent diferents. Les icones originals i els recursos de fang es mantenen.

## Comprovacions locals

| Comprovació | Resultat | Evidència |
| --- | --- | --- |
| Unitats i regressions de domini | 66/66 | [unit.txt](../output/ui-clean/unit.txt) |
| API amb D1 i R2 aïllats, sense dades de producció | 26/26 | [api.txt](../output/ui-clean/api.txt) |
| Tipus, sintaxi i ESLint del codi final | Superat | [typecheck-final.txt](../output/ui-clean/typecheck-final.txt) |
| Build i desplegament simulat del codi final | Superat | [cf-check-final.txt](../output/ui-clean/cf-check-final.txt) |
| Set seccions × set amplades × dues densitats | 98/98 | [responsive.json](../output/ui-clean/responsive.json) |
| Interaccions, persistència local i retorn del focus | 28/28 | [interaccions.json](../output/ui-clean/interaccions.json) |
| Menús i avís CSV en finestres de 360 px d’alçada | 6/6 | [opcions-finestres-baixes.json](../output/ui-clean/opcions-finestres-baixes.json) |
| Capçalera de 320 px amb música i temporitzador actius | Sis controls de 44 px; sense solapament | [capcalera-activa-320.json](../output/ui-clean/capcalera-activa-320.json) |
| Dades originals, comprovació només de lectura | 3 usuaris, 345 files i 16 taules intactes | [preservacio-dades.json](../output/ui-clean/preservacio-dades.json) |

Amplades: 320, 390, 760, 820, 1024, 1280 i 1536 px. Les comprovacions mesuren desbordament exterior, límits del contingut, solapament de capçalera, navegació mòbil, imatges trencades i pantalles d’error. Les taules i l’horari poden desplaçar-se dins del seu propi contenidor.

El primer recorregut va detectar el filtre de Plusos massa ample a 320 px. La correcció passa la franja a una columna i el recorregut complet torna a passar. També s’ha corregit el marcador del cercle del temporitzador i el retorn del focus quan el botó original era dins d’un desplegable ja tancat o del menú mòbil ocult.

En copiar l’informe històric s’ha detectat un EBUSY del watcher de Vite a Windows. `vite.config.js` exclou ara també `docs/`, que no conté fonts de l’aplicació. Tipus/lint i build/dry-run s’han repetit després d’aquesta correcció. Els fitxers servits continuen coincidint amb el desplegament.

Les 28 interaccions inclouen selecció i restauració d’assignatures, independència d’Apunts/Plusos, introducció de 8,2 mentre les notes estan ocultes, navegació, comprovació i Desfer a pendent. El convidat local torna a tenir mode discret activat, filtre d’apunts seguint matrícula, música Nit i temporitzador aturat a 45 minuts. No s’ha concedit cap recompensa d’estudi ni modificat dades dels usuaris originals.

L’editor de pesos continua exigint 100%. Es comproven tots els fulls, el bloqueig del CSV discret, previsió privada, les cinc músiques, les vistes de l’agenda, propostes, interior i sortida de pastisseria, cartera i perfil. La consola final local no registra errors ni advertiments.

## Evidència visual

[Diagnòstic](../output/ui-clean/diagnostic.md), [captures inicials](../output/ui-clean/abans/resum.json), [captures després](../output/ui-clean/despres/resum.json), [apunts finals](../output/ui-clean/despres/final-apunts.png), [filtres i teclat](../output/ui-clean/filtres-teclat.json), [CSV discret mòbil](../output/ui-clean/csv-discret-mobil.png), [pastisseria interior mòbil](../output/ui-clean/pastisseria-interior-mobil.png). Les carpetes abans/despres contenen les set seccions a escriptori i les captures mòbils corresponents.

Els recomptes estructurals de controls de les primeres captures poden incloure descendents de desplegables tancats; no es presenten com un recompte fiable de botons visibles. La conclusió visual es basa en les captures i les comprovacions de geometria i interacció.

## Publicació i còpia

Publicada la versió `f18e293d-2f77-49f1-bfa3-6d3393a3fc04` sobre el mateix Worker, D1 i R2: **46 recursos públics idèntics en SHA-256** i **14 casos públics sense incidències ni errors nous de consola**. [Recursos](../output/ui-clean/publicacio-recursos.json), [navegador](../output/ui-clean/publicacio-navegador.json) i [PUBLICACIO.md](PUBLICACIO.md). Les comprovacions públiques d’aquesta revisió són de només lectura; no s’importa la base local al núvol.

La còpia `backups/la-net-local-2026-10-10-clean.sql` s’ha creat amb els servidors aturats i restaurat en memòria: **38 taules amb totes les files idèntiques, set migracions, quick_check correcte i zero errors de referències**. SHA-256: `2203e6d7d9bdac05fc681cb0f3c213606914955e84888a51af297ff514eec85c`. [Verificació SQL](../output/ui-clean/copia-sql-verificada.json). D1 i R2 també es preserven a `backups/state-v3-2026-10-10T01-50-46-663Z/`.

El ZIP es crea amb els servidors locals aturats i es rellegeix contra el manifest de mides i SHA-256. Inclou font, recursos, dades locals, documents i evidències; exclou secrets, dependències reinstal·lables i bases de prova. [Instruccions de trasllat](../TRASLLAT.md).

## Límits i pendent independent

La revisió conserva la identitat de les imatges aprovades i aplica la nova petició de simplificar la interfície. No certifica identitat de cada píxel, totes les combinacions possibles de contingut o una auditoria WCAG completa. Les dades actuals de la vista d’esdeveniments de Comunitat són buides; els fluxos amb actes es cobreixen a l’API. La reproducció musical té comprovacions tècniques, sense una audició humana.

T14-06 continua pendent de l’autorització documentada a [PENDENT-APROVACIO-2026-10-10.md](PENDENT-APROVACIO-2026-10-10.md). La restauració anterior afecta només el convidat públic tècnic propi, però la revisió automàtica la va rebutjar. No s’ha repetit ni substituït per una modificació via API. Aquest pendent no impedeix verificar i publicar la simplificació R28.
