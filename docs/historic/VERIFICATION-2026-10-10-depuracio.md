# Verificació de La Net — depuració del 10 d’octubre de 2026

El [pla de depuració](PLA-DEPURACIO-2026-10-10.md) amplia el projecte a **27 requisits, 15 fases i 62 tasques**. [Registre](SEGUIMENT.json), [checklist](CHECKLIST.md) i [historial](HISTORIAL-CANVIS.md): una sola tasca activa. La revisió anterior es conserva a [historic/VERIFICATION-2026-10-10-cartell.md](historic/VERIFICATION-2026-10-10-cartell.md).

## Resultats actuals

| Comprovació                                                                                         | Resultat                                                              | Evidència                                                                                                                    |
| --------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Unitats, SQLite i regressions de concurrència, privadesa, notes, storage, selectors i temporitzador | **66/66**                                                             | [unit.txt](../output/depuracio-maxima/unit.txt)                                                                              |
| API amb D1 i R2 reals en instància aïllada                                                          | **26/26**                                                             | [api.txt](../output/depuracio-maxima/api.txt)                                                                                |
| Tipus Workers/TypeScript, sintaxi i ESLint                                                          | Superat                                                               | [typecheck.txt](../output/depuracio-maxima/typecheck.txt)                                                                    |
| Build i Wrangler dry-run                                                                            | Superat; 52 entrades de recursos                                      | [cf-check.txt](../output/depuracio-maxima/cf-check.txt)                                                                      |
| Set seccions × sis amplades × dues densitats                                                        | **84 casos**, sense solapaments de capçalera ni desbordament exterior | [compacta](../output/depuracio-maxima/responsive-compacta.json), [còmoda](../output/depuracio-maxima/responsive-comoda.json) |
| Recorregut del codi final a mòbil i escriptori                                                      | **14 casos**, cap error nou de consola                                | [consola-final.json](../output/depuracio-maxima/consola-final.json)                                                          |
| Dades anteriors, només lectura                                                                      | **345 files, 3 usuaris, 16 taules intactes**                          | [preservacio-dades.json](../output/depuracio-maxima/preservacio-dades.json)                                                  |

Les proves API tornen a comprovar permisos, sessions, invitacions, notes, pesos, preferències concurrents, agenda, progrés, likes/consultes, compres, R2 i rangs de vídeo, ofertes simultànies i recuperació. S’executen al port 8791 amb persistència independent. Cap base ni fitxer de prova API es publica o s’inclou al ZIP.

## Correccions i recuperació

[Deu incidències amb causa i evidències](../output/depuracio-maxima/auditoria.json):

- Les lectures antigues o iniciades durant una escriptura no substitueixen un estat més recent. Un POST o DELETE confirmat conserva el resultat si falla la recàrrega posterior; s’avisa que falta sincronitzar la vista.
- Un intent fallit de mostrar les notes les manté ocultes. Prova real amb l’API aturada: **32 inputs sense valors visibles** i preferència segura. [Registre](../output/depuracio-maxima/privadesa-error.json).
- Una cua de notes per sessió conserva entrades fallides durant la navegació, ofereix **Reintentar desament** i consumeix **Desfer** només quan el servidor confirma. La seqüència ràpida A → B → A conserva A. Zero, pendent i enganxat de blocs continuen sent vàlids.
- Prova al navegador: API aturada, entrada 8,3 en una prova pendent, canvi de secció, notes ocultes, connexió restaurada, reintent, comprovació de 8,3 i Desfer a pendent. El 7,5 anterior es conserva. [Registre](../output/depuracio-maxima/notes-reintent.json), [avís pendent](../output/depuracio-maxima/notes-pendents.png).
- Memòria local bloquejada o plena retorna un resultat segur i un avís real. Una memòria de temporitzador corrupta utilitza els minuts configurats; una sessió vàlida conserva la seva durada original. No s’afegeixen esborranys de notes a localStorage.
- El selector salta les opcions desactivades en la direcció correcta, cerca ignorant accents i no obre una llista sense opcions disponibles. Comprovat amb teclat i formulari de 320 × 360 px. [Registre](../output/depuracio-maxima/selector-teclat.json).
- Desar i M’agrada gestionen el rebuig sense deixar una promesa sense capturar. API aturada/restaurada: controls desbloquejats i reintent correcte. [Registre](../output/depuracio-maxima/accions-reintent.json).
- La identitat dels contextos es conserva durant el refresh de Vite. Després de corregir l’error local observat, s’han actualitzat els dos mòduls i recorregut les set seccions sense repetir-lo.

Els errors de l’API provocats i els errors previs de desenvolupament queden distingits del període final de consola. No es presenta el registre històric com si sempre hagués estat buit.

La prova de M’agrada va generar un crèdit local a l’autora d’un apunt. Amb Vite/API aturats i còpia D1/R2 prèvia, una transacció condicionada ha restaurat exclusivament aquesta recompensa i el seu like de prova. Saldo i suma del ledger coincideixen; triggers intactes, quick_check correcte i zero errors de referències. L’auditoria de les 345 files és **posterior** a aquesta restauració. [Restauració acotada](../output/depuracio-maxima/restauracio-efecte-prova.json). No s’ha modificat producció en aquesta prova.

## Coherència visual i interaccions

Amplades **320, 390, 760, 1024, 1280 i 1536 px**, densitats compacta/còmoda, barra plegada. Cartell a la capçalera de **236 × 44 px**, o **44 × 44 px a 1100 px o menys**. La fotografia aportada continua sent una mostra d’estil; el cartell no ocupa una fila de contingut.

Música i temporitzador actius a 320 px: sis controls sense interseccions i amb àrea mínima de 44 × 44 px. [Mesures](../output/depuracio-maxima/capcalera-activa.json), [captura](../output/depuracio-maxima/capcalera-activa-320.png).

Esborrany de proposta recuperat després de tancar/reobrir i cancel·lat sense publicar; filtres i vista de l’Agenda recordats; llista/setmana/mes; durada aplicada 40:00 i restaurada a 45:00. Comunitat mostra correctament l’estat buit d’activitats en els dos àmbits disponibles. Pastisseria completa l’entrada i impedeix repetir la recollida; les vuit poses i l’art original es mantenen. [Interaccions](../output/depuracio-maxima/interaccions.json), [pastisseria](../output/depuracio-maxima/pastisseria-interior.png), [notes finals](../output/depuracio-maxima/notes-final-local.png).

Les comprovacions anteriors de lector foto/PDF/vídeo, cinc pistes, oferta del cartell i recollida del pastís es conserven amb la seva data a [l’informe anterior](historic/VERIFICATION-2026-10-10-cartell.md). No s’atribueixen al recorregut d’aquesta passada.

## Límits comprovats

- Els errors de xarxa s’han comprovat amb l’API local aturada i després restaurada; no s’ha emulat latència variable ni moviment reduït al navegador. La concurrència i el storage bloquejat tenen proves controlades de codi.
- Els canvis de nota pendents es conserven mentre es navega dins de la sessió; una recàrrega completa perd aquests esborranys en memòria. Una nota desada es conserva al servidor.
- L’estat buit de Comunitat s’ha verificat; el salt original en una activitat compartida concreta no s’ha pogut reproduir exactament amb les dades disponibles.
- Les músiques són originals CC0, amb format, bucle i reproducció comprovats; no es reivindica una audició humana. [Recursos i llicències](../design/RECURSOS-V3.md).
- No es reivindica identitat de tots els píxels ni certificació WCAG integral. Es conserven l’art, els colors i el disseny acordats amb els controls nous demanats.
- El catàleg és editable i el responsable del centre l’ha d’adaptar al curs real. Pagaments amb diners fora de l’abast acordat.

## Publicació i còpia

Publicada la versió `b3d1b68e-35dd-474e-81c8-7c343fd355ce` sobre el mateix Worker, D1 i R2: 46 recursos públics coincideixen en SHA-256 i 14 casos de navegador passen sense errors nous. [PUBLICACIO.md](PUBLICACIO.md) descriu les proves i la restauració del convidat tècnic públic pendent d’autorització. Cap importació de dades locals al núvol.

La còpia SQL de la depuració és `backups/la-net-local-2026-10-10-depuracio.sql`, exportada amb els servidors aturats i restaurada en memòria: **38 taules amb totes les files idèntiques, set migracions, quick_check correcte i zero errors de referències**. [Informe SQL](../output/depuracio-maxima/copia-sql-verificada.json). El ZIP inclou D1/R2, codi, recursos, documentació i evidències, amb manifest rellegit de mides/SHA-256; exclou secrets i bases de prova. [Instruccions de trasllat](../TRASLLAT.md).
