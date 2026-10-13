# Historial de canvis de La Net

Les entrades d’aquest historial s’afegeixen després de cada tasca verificada. Els estats vigents són a [SEGUIMENT.json](SEGUIMENT.json) i la [checklist](CHECKLIST.md). El [pla mestre](PLA-MESTRE.md) especifica el comportament previst.

## Antecedents

Les revisions de fidelitat i detall del 8 i 9 d’octubre de 2026 consten als plans anteriors i a [VERIFICATION.md](VERIFICATION.md). L’accés sense compte i la comprovació de 32 proves locals i 23 fluxos d’API consten a [ACCES-TEMPORAL.md](ACCES-TEMPORAL.md). Són resultats d’aquelles revisions, no comprovacions noves d’aquest pla.

## Revisió de producte

### H001 Preparació del pla mestre

**Data:** 9 d’octubre de 2026, Europa/Madrid. **Tasques:** T00-01, T00-02, T00-03 i T00-04.

**Abans:** les observacions noves de Marc estaven al xat; la configuració de «preu» era una transcripció ambigua. Hi havia diversos plans de les revisions visuals anteriors.

**Després:** perfil confirmat per Marc; 23 requisits, 12 fases i 51 tasques amb dependències, fitxers, criteris i comprovacions. Un registre d’estat genera la checklist. Un control valida cobertura, dependències, límit d’una tasca activa, evidències i historial. La referència original de fusta es conserva al projecte.

**Fitxers:** `docs/PLA-MESTRE.md`, `docs/SEGUIMENT.json`, `docs/CHECKLIST.md`, aquest historial, `scripts/check-plan.mjs`, `output/planning/`, `design/referencies-v3/cartell-fusta-original.png`, índex de README i enllaços des dels plans antics i DESIGN.

**Comprovacions:** auditoria de codi; hash de la imatge coincident amb l’original; sintaxi/lint del script de seguiment; sincronització i validació del registre; lectura del document i cobertura de les peticions. Resultat desat a `output/planning/seguiment-result.json`.

**Evidències:** [auditoria](../output/planning/auditoria.json), [registre verificat](../output/planning/seguiment-result.json), [referència de fusta](../design/referencies-v3/cartell-fusta-original.png).

**Abast real:** preparació i seguiment. No s’ha modificat el comportament de la plataforma en aquesta passada, ni les dades de D1/R2. El problema d’esdeveniments de Comunitat continua pendent de reproducció. Les millores noves continuen pendents. La següent tasca és T01-01, còpia de codi i dades abans d’implementar.

**Decisió de detall pendent:** confirmar si «mostrar-te o no» al cartell inclou signatura pública opcional a més de mostrar/plegar el cartell. El cartell pot avançar sense dependre d’aquesta opció.

### H002 Fer còpia de codi i dades abans de modificar el producte

**9 d’oct. 2026, 23:13 · T01-01.** Codi comprimit i SQL exportat; còpia consistent de SQLite i blobs de D1/R2 amb manifest SHA-256. Les dades originals es mantenen.

Evidències: [backups/codi-abans-revisio-v3-2026-10-09.zip](../backups/codi-abans-revisio-v3-2026-10-09.zip), [backups/la-net-abans-revisio-v3-2026-10-09.sql](../backups/la-net-abans-revisio-v3-2026-10-09.sql), [backups/state-v3-2026-10-09T21-12-30-835Z/manifest.json](../backups/state-v3-2026-10-09T21-12-30-835Z/manifest.json).

### H003 Corregir la sincronització de durada del Pastisdoro

**9 d’oct. 2026, 23:17 · T01-02.** El temporitzador aplica els minuts immediatament en repòs; les sessions actives permeten conservar el temps o reiniciar amb els minuts nous. Verificat a la interfície, recàrrega i proves de temporitzador.

Evidències: [output/revisio-v3/timer.json](../output/revisio-v3/timer.json), [output/revisio-v3/timer.jpg](../output/revisio-v3/timer.jpg).

### H004 Reproduir el problema d’esdeveniments de Comunitat

**9 d’oct. 2026, 23:19 · T01-03.** Provada una activitat privada amb títol llarg a 1280 i 320 píxels i diàleg centrat. El salt original no es reprodueix en aquest estat; queda documentat amb mesures i captures, i es reforça la contenció de la llista.

Evidències: [output/revisio-v3/community-reproduction.json](../output/revisio-v3/community-reproduction.json), [output/revisio-v3/community-before.jpg](../output/revisio-v3/community-before.jpg), [output/revisio-v3/community-mobile-before.jpg](../output/revisio-v3/community-mobile-before.jpg).

### H005 Corregir el cas reproduït i revisar graelles i diàlegs

**9 d’oct. 2026, 23:20 · T01-04.** La llista té una quadrícula explícita amb columna de text flexible, contenció de títols llargs i separació de les pestanyes. Els canvis de pestanya mantenen els controls visibles. Verificat diàleg i absència de desbordament a 320 píxels; el salt original continua sense reproduir-se.

Evidències: [output/revisio-v3/community-mobile-after.jpg](../output/revisio-v3/community-mobile-after.jpg), [output/revisio-v3/community-reproduction.json](../output/revisio-v3/community-reproduction.json).

### H006 Definir icones, dimensions i capes dels controls

**9 d’oct. 2026, 23:21 · T02-01.** Definits tokens de controls, capes, densitat i moviment; SubjectMark comparteix el color del catàleg i les icones amb volum suau. Conservades les il·lustracions aprovades.

Evidències: [docs/SISTEMA-VISUAL.md](../docs/SISTEMA-VISUAL.md), [src/revision.css](../src/revision.css), [src/ui.jsx](../src/ui.jsx).

### H007 Crear selector únic i selector múltiple d’assignatures

**9 d’oct. 2026, 23:23 · T02-02.** Selector compartit amb icones, teclat, cerca escrivint, marca seleccionada i top layer. Provades fletxes, Enter i Escape dins del diàleg; menú dins de 1280x720. Creat també el selector múltiple amb caselles i selecció del curs.

Evidències: [output/revisio-v3/select.jpg](../output/revisio-v3/select.jpg), [src/components/Select.jsx](../src/components/Select.jsx), [src/components/SubjectPicker.jsx](../src/components/SubjectPicker.jsx).

### H008 Migrar tots els desplegables de pantalles i formularis

**9 d’oct. 2026, 23:25 · T02-03.** Migrats tots els selectors de formularis i pàgines, inclosos gestió, variants, àmbit i trimestres. ESLint i build correctes. Verificada la selecció del tercer trimestre i zero controls select antics a la pantalla.

Evidències: [scripts/migrate-selects.mjs](../scripts/migrate-selects.mjs), [output/revisio-v3/select-term.jpg](../output/revisio-v3/select-term.jpg).

### H009 Definir i desar preferències personals amb migració compatible

**9 d’oct. 2026, 23:27 · T03-01.** Migració additiva de preferències, validació estricta del catàleg i desament atòmic del perfil. Set proves passen, inclosa persistència entre peticions, separació entre usuaris i preservació de matrícula, notes i saldo.

Evidències: [migrations/0006_user_preferences.sql](../migrations/0006_user_preferences.sql), [output/revisio-v3/preferences-tests.txt](../output/revisio-v3/preferences-tests.txt).

### H010 Construir perfil amb curs, assignatures i aparença

**9 d’oct. 2026, 23:29 · T03-02.** Perfil amb pestanyes de dades, assignatures i aparença; selectors múltiples independents per Apunts i Plusos, curs accessible i formulari de contrasenya ocult als convidats. Verificat desament correcte des de la interfície.

Evidències: [output/revisio-v3/profile-subjects.jpg](../output/revisio-v3/profile-subjects.jpg), [src/forms-general.jsx](../src/forms-general.jsx).

### H011 Connectar les preferències als filtres d’Apunts i Plusos

**9 d’oct. 2026, 23:30 · T03-03.** Apunts i Plusos fan servir seleccions múltiples personals amb aplicació i desament. Verificat Apunts amb Matemàtiques i Física, persistència després de recarregar i Plusos independent amb les vuit assignatures del curs.

Evidències: [output/revisio-v3/notes-preferences.jpg](../output/revisio-v3/notes-preferences.jpg), [src/components/SubjectFilter.jsx](../src/components/SubjectFilter.jsx), [src/pages/Notes.jsx](../src/pages/Notes.jsx), [src/pages/Pluses.jsx](../src/pages/Pluses.jsx).

### H012 Afegir barra lateral plegable

**9 d’oct. 2026, 23:32 · T04-01.** Barra lateral plegable de 88 píxels amb totes les destinacions accessibles, etiquetes i títols, perfil i configuració. Preferència desada per usuari; verificats plegat i recàrrega.

Evidències: [output/revisio-v3/sidebar-collapsed.jpg](../output/revisio-v3/sidebar-collapsed.jpg), [src/App.jsx](../src/App.jsx).

### H013 Afegir navegació inferior mòbil i menú Més

**9 d’oct. 2026, 23:32 · T04-02.** Navegació inferior amb Curs, Apunts, Notes, Estudi i Més; menú accessible amb la resta de seccions i perfil. Provat Més a Pastisseria a 390x844, navegació fixada al peu i cap desbordament horitzontal.

Evidències: [output/revisio-v3/mobile-navigation.jpg](../output/revisio-v3/mobile-navigation.jpg), [src/App.jsx](../src/App.jsx).

### H014 Crear densitat compacta i còmoda

**9 d’oct. 2026, 23:33 · T04-03.** Densitat compacta i còmoda amb espaiat, capçalera i títols adaptats sense transformació global. Canviades i desades totes dues des del perfil a mòbil.

Evidències: [output/revisio-v3/density-comfortable.jpg](../output/revisio-v3/density-comfortable.jpg), [output/revisio-v3/density-compact.jpg](../output/revisio-v3/density-compact.jpg), [src/revision.css](../src/revision.css).

### H015 Verificar la navegació combinada amb diàlegs i temporitzador

**9 d’oct. 2026, 23:34 · T04-04.** Comprovades navegació mòbil, accés a seccions del menú, diàleg de perfil i Escape. El temporitzador continua entre Estudi i Apunts amb indicador actiu; sessió de prova pausada al final.

Evidències: [output/revisio-v3/navigation-timer.jpg](../output/revisio-v3/navigation-timer.jpg), [output/revisio-v3/mobile-navigation.jpg](../output/revisio-v3/mobile-navigation.jpg).

### H016 Separar els dos accessos Horari i Agenda

**9 d’oct. 2026, 23:34 · T05-01.** Horari i Agenda són dues pestanyes destacades al mateix lloc, amb títol, descripció i botó per afegir a Agenda. Conservada la vista horària i les dades compartides.

Evidències: [output/revisio-v3/agenda-tabs.jpg](../output/revisio-v3/agenda-tabs.jpg), [src/pages/Schedule.jsx](../src/pages/Schedule.jsx).

### H017 Completar tipus de dates, tasques i origen dels elements

**9 d’oct. 2026, 23:36 · T05-02.** Afegits Prova i Tasca sense reconstruir dades antigues. Progrés de tasques personal amb autorització i origen compartit/privat/Plus. Sis proves passen, inclosa invisibilitat privada i progrés independent entre usuaris.

Evidències: [migrations/0007_agenda.sql](../migrations/0007_agenda.sql), [output/revisio-v3/agenda-tests.txt](../output/revisio-v3/agenda-tests.txt), [shared/agenda.js](../shared/agenda.js).

### H018 Construir Agenda amb llista, calendari i filtres

**9 d’oct. 2026, 23:39 · T05-03.** Agenda amb llista agrupada per dia, setmana i mes, filtres de tipus i assignatura, tasques pendents/fetes i origen. Verificats tasca completada, reinclusió de fetes, 42 dies del mes i vista setmanal.

Evidències: [output/revisio-v3/agenda-list.jpg](../output/revisio-v3/agenda-list.jpg), [output/revisio-v3/agenda-week.jpg](../output/revisio-v3/agenda-week.jpg), [src/components/AgendaList.jsx](../src/components/AgendaList.jsx).

### H019 Verificar que Horari, Agenda i Comunitat comparteixen la font

**9 d’oct. 2026, 23:41 · T05-04.** Els fluxos amb D1 i R2 reals verifiquen esdeveniments privats i permisos, Plus a calendari idempotent i preservació de notes. Agenda reutilitza aquests registres a llista, setmana, mes i detalls.

Evidències: [output/revisio-v3/api-agenda.txt](../output/revisio-v3/api-agenda.txt), [src/pages/Schedule.jsx](../src/pages/Schedule.jsx), [worker/data.js](../worker/data.js).

### H020 Ampliar el servidor i la lectura d’adjunts per a vídeo

**9 d’oct. 2026, 23:42 · T06-01.** MP4 i WebM validats per signatura i servits amb rangs HTTP per avançar la reproducció. Límit de vídeo 25 MB; altres formats 10 MB. Dues proves de rang i 24 fluxos API passen, inclosos permisos abans de publicar, resposta 206, sufixos i 416.

Evidències: [output/revisio-v3/video-unit.txt](../output/revisio-v3/video-unit.txt), [output/revisio-v3/api-video.txt](../output/revisio-v3/api-video.txt), [worker/files.js](../worker/files.js).

### H021 Redissenyar el compositor per formats combinables

**10 d’oct. 2026, 0:02 · T06-02.** Composer amb fotos, MP4/WebM, PDF i documents combinables; mida, ordre, mostres i errors explícits. Pujats foto, PDF i vídeo real de sis segons i desat un esborrany privat. Protecció contra dobles enviaments i preservació dels fitxers ja pujats davant errors posteriors.

Evidències: [output/revisio-v3/composer-formats.jpg](../output/revisio-v3/composer-formats.jpg), [src/form-utils.jsx](../src/form-utils.jsx).

### H022 Completar galeria, lector PDF i reproductor de vídeo

**10 d’oct. 2026, 0:07 · T06-03.** Lector amb galeria, vídeo natiu i PDF.js amb pàgines, zoom, text accessible i descàrrega. Verificats MP4 de sis segons reproduint-se, avanç al final i PDF d’una pàgina amb text i zoom. Corregida la neteja del vídeo en muntatges repetits.

Evidències: [output/revisio-v3/reader-checks.json](../output/revisio-v3/reader-checks.json), [output/revisio-v3/reader-video.jpg](../output/revisio-v3/reader-video.jpg), [output/revisio-v3/reader-pdf.jpg](../output/revisio-v3/reader-pdf.jpg).

### H023 Ajustar filtres personals i estats buits d’Apunts

**10 d’oct. 2026, 0:08 · T06-04.** Filtres d’Apunts amb seguiment automàtic del curs, totes o selecció personalitzada, comptador visible i estat buit explicatiu. Verificats zero assignatures, esborrany propi i recuperació de les vuit assignatures del curs.

Evidències: [output/revisio-v3/notes-empty.jpg](../output/revisio-v3/notes-empty.jpg), [src/components/SubjectFilter.jsx](../src/components/SubjectFilter.jsx), [src/pages/Notes.jsx](../src/pages/Notes.jsx).

### H024 Ajustar filtres personals i plusos multiassignatura

**10 d’oct. 2026, 0:08 · T06-05.** Plusos mostra la unió de les assignatures seleccionades, recompte visible i estats buits; cap filtre per font. Verificades Física i Química amb dues activitats. El flux API multiassignatura confirma calendari sense duplicats.

Evidències: [output/revisio-v3/pluses-preferences.jpg](../output/revisio-v3/pluses-preferences.jpg), [output/revisio-v3/api-video.txt](../output/revisio-v3/api-video.txt), [src/pages/Pluses.jsx](../src/pages/Pluses.jsx).

### H025 Mostrar nota i percentatge junts en cada prova

**10 d’oct. 2026, 0:10 · T07-01.** Cada casella de nota mostra el pes real i una descripció accessible. Els agregats indiquen nombre de proves i pes conjunt, amb accés al detall. Verificada nota zero vàlida i pes de 30% al convidat.

Evidències: [output/revisio-v3/grade-weights.jpg](../output/revisio-v3/grade-weights.jpg), [src/pages/Grades.jsx](../src/pages/Grades.jsx).

### H026 Simplificar editor de proves i pesos amb total visible

**10 d’oct. 2026, 0:12 · T07-02.** Editor amb total fixat, barra de progrés, falta/excés explícit, repartiment igual, ajust proporcional i compleció de l’última prova. No permet desar fora del 100%. Verificats 90% bloquejat, repartiment a 25% i nota zero conservada; dues proves numèriques passen.

Evidències: [output/revisio-v3/weight-editor.jpg](../output/revisio-v3/weight-editor.jpg), [output/revisio-v3/weights-tests.txt](../output/revisio-v3/weights-tests.txt), [src/forms-resources.jsx](../src/forms-resources.jsx).

### H027 Revisar teclat, desfer, trimestre i CSV

**10 d’oct. 2026, 0:13 · T07-03.** Desaments de notes serialitzats per evitar curses i protegir nous esborranys. Verificats Enter, coma decimal, enganxat de quatre caselles i Ctrl+Z que recupera el lot anterior. CSV descarregat i comprovat; setze proves de càlcul, dades i pesos passen.

Evidències: [output/revisio-v3/grades-undo.jpg](../output/revisio-v3/grades-undo.jpg), [output/revisio-v3/grades-export.csv](../output/revisio-v3/grades-export.csv), [output/revisio-v3/grades-tests.txt](../output/revisio-v3/grades-tests.txt).

### H028 Eliminar En què treballes i conservar sessions històriques

**10 d’oct. 2026, 0:14 · T08-01.** Retirat En què treballes i ajustada la columna d’àudio. Les sessions noves no arrosseguen la tasca antiga; l’historial existent es conserva. Verificat que no queda cap task-panel.

Evidències: [output/revisio-v3/study-without-task.jpg](../output/revisio-v3/study-without-task.jpg), [src/pages/Study.jsx](../src/pages/Study.jsx), [src/timer.jsx](../src/timer.jsx).

### H029 Preparar cinc peces lo-fi diferents i revisar-les escoltant

**10 d’oct. 2026, 0:25 · T08-02.** Cinc peces originals CC0 renderitzades en Ogg local, amb nivells, mostres finites i containers comprovats. Mostra de 25 segons disponible. El canal de treball no admet escoltar àudio: la valoració auditiva subjectiva queda expressament pendent, sense atribuir una audició no feta.

Evidències: [public/audio/LICENSE.txt](../public/audio/LICENSE.txt), [shared/lofi-tracks.json](../shared/lofi-tracks.json), [output/revisio-v3/audio/quality.json](../output/revisio-v3/audio/quality.json), [output/revisio-v3/audio/mostra-cinc-lofi.ogg](../output/revisio-v3/audio/mostra-cinc-lofi.ogg).

### H030 Crear cinc opcions amb icona, selecció i control de reproducció

**10 d’oct. 2026, 0:26 · T08-03.** Selector amb cinc opcions sempre visibles, icones pròpies, marca activa, noms i tempos. Pista i volum es desen en preferències; les actualitzacions parcials es fusionen atòmicament. Pantalla i fitxer local de 80 s carregats al navegador.

Evidències: [src/pages/Study.jsx](../src/pages/Study.jsx), [src/timer.jsx](../src/timer.jsx), [worker/preferences.js](../worker/preferences.js), [output/revisio-v3/estudi-cinc-lofi.png](../output/revisio-v3/estudi-cinc-lofi.png).

### H031 Comprovar cicle de vida d’àudio i configuració del temps

**10 d’oct. 2026, 0:27 · T08-04.** Cinc proves de cicle de vida superades. Navegador: reproducció progressa amb readyState 4, canvi ràpid manté un sol element, volum zero amb teclat, continua en navegar i aturada global elimina el reproductor. Sense audició subjectiva disponible; constància a l’evidència.

Evidències: [tests/audio.test.js](../tests/audio.test.js), [output/revisio-v3/audio/navegador.json](../output/revisio-v3/audio/navegador.json).

### H032 Polir propostes, vots i selector de classe/centre

**10 d’oct. 2026, 0:27 · T09-01.** Propostes amb explicació d’abast de centre, recompte i vots propis. Cada petició de vot té bloqueig immediat i estat ocupat; cerca, estat i ordre conserven controls compartits. Disposició revisada al navegador.

Evidències: [src/pages/Community.jsx](../src/pages/Community.jsx), [output/revisio-v3/comunitat-propostes.png](../output/revisio-v3/comunitat-propostes.png).

### H033 Preparar fons de fusta sense deformació i component global

**10 d’oct. 2026, 0:29 · T09-02.** Cartell global reservat sobre el contingut, amb la fusta original sense modificar i proporció conservada. Text accessible, imatge amb proporció i límits de línies. S’ha retirat el bàner duplicat de Comunitat. Comparació visual de l’horari guardada.

Evidències: [src/components/WoodBoard.jsx](../src/components/WoodBoard.jsx), [public/images/references/cartell-fusta-original.png](../public/images/references/cartell-fusta-original.png), [output/revisio-v3/cartell-horari.png](../output/revisio-v3/cartell-horari.png).

### H034 Afegir mostrar, plegar i restaurar el cartell

**10 d’oct. 2026, 0:30 · T09-03.** Amagar i restaurar des de l’accés Cartell funciona entre pàgines i després de recarregar. Preferència pròpia desada al servidor i integrada al perfil; al mòbil el contingut usa una fila desplegable. La fusta conserva els píxels originals amb contorn SVG.

Evidències: [src/components/WoodBoard.jsx](../src/components/WoodBoard.jsx), [worker/preferences.js](../worker/preferences.js).

### H035 Precisar i incorporar si cal la signatura pública opcional

**10 d’oct. 2026, 0:30 · T09-04.** Decisió registrada: mostrar/amagar s’aplica al cartell del lector. Es conserva la signatura i la identitat de moderació; no s’introdueix anonimat no sol·licitat. Aquesta opció condicional no exigeix migració.

Evidències: [docs/PLA-MESTRE.md](../docs/PLA-MESTRE.md), [src/components/WoodBoard.jsx](../src/components/WoodBoard.jsx).

### H036 Fer inequívoca la selecció d’oferta i la previsualització

**10 d’oct. 2026, 0:38 · T09-05.** Ofertes ràpides amb marca i contorn, import seleccionat explícit, cost i saldo resultant. Previsualització amb la fusta original. Navegador: seleccionar 50 actualitza totes les dades i bloqueja publicar amb saldo insuficient; no s’ha fet cap càrrec real.

Evidències: [src/forms-resources.jsx](../src/forms-resources.jsx), [output/revisio-v3/cartell-oferta.png](../output/revisio-v3/cartell-oferta.png).

### H037 Implementar i verificar el mode discret sense perdre l’edició

**10 d’oct. 2026, 0:44 · T12-01.** Mode discret persistent amb toggle i preferència de perfil. Les notes desades no es renderitzen en camps ocults; només es veu la nova entrada mentre s’edita. Mitjanes, aportacions, editor i previsió coherents. CSV amb avís explícit. Navegador: zero, decimal, desfer, camps buits, modal i persistència després de recarregar; 25 fluxos d’API i tres proves de preferències superats. Es bloqueja obrir l’editor durant desaments per evitar capturar notes antigues.

Evidències: [src/components/GradePrivacy.jsx](../src/components/GradePrivacy.jsx), [src/pages/Grades.jsx](../src/pages/Grades.jsx), [src/forms-resources.jsx](../src/forms-resources.jsx), [output/revisio-v3/notes-mode-discret.png](../output/revisio-v3/notes-mode-discret.png), [output/revisio-v3/mode-discret.json](../output/revisio-v3/mode-discret.json), [output/revisio-v3/api-mode-discret.txt](../output/revisio-v3/api-mode-discret.txt).

### H038 Reforçar conflictes i cobrament únic sense canviar l’economia

**10 d’oct. 2026, 0:46 · T09-06.** El formulari detecta canvis del cartell, conserva l’esborrany, refresca el mínim i exigeix revisar l’oferta. Es manté la validació atòmica i l’economia vigent. Sis proves SQLite i 25 fluxos API superats; dues ofertes paral·leles de 10 acrediten exactament un cartell i un càrrec de 10.

Evidències: [src/forms-resources.jsx](../src/forms-resources.jsx), [scripts/test-api.mjs](../scripts/test-api.mjs), [output/revisio-v3/api-ofertes.txt](../output/revisio-v3/api-ofertes.txt), [output/revisio-v3/ofertes-sqlite.txt](../output/revisio-v3/ofertes-sqlite.txt).

### H039 Recuperar l’exterior complet i separar art i controls

**10 d’oct. 2026, 0:47 · T10-01.** Exterior amb recurs complet de 1536×1024, proporció 3:2 i object-fit contain. Botons fora de la imatge i porta interactiva alineada. Captures d’escriptori i mòbil; a 390 px la imatge mesura 357×238, sense scroll exterior.

Evidències: [src/pages/Bakery.jsx](../src/pages/Bakery.jsx), [output/revisio-v3/pastisseria-exterior-complet.png](../output/revisio-v3/pastisseria-exterior-complet.png), [output/revisio-v3/pastisseria-exterior-mobil.png](../output/revisio-v3/pastisseria-exterior-mobil.png).

### H040 Preparar pastissera independent amb gestos recognoscibles

**10 d’oct. 2026, 0:56 · T10-02.** Pastissera en vuit poses RGBA, separada de l’escenari i del taulell del primer pla. Seqüència d’espera, gir, mans cap al forn, agafar, tornar i oferir; la preparació no crida l’API. S’ha revisat l’oferta real en navegador i la coherència amb l’art original. Recursos i prompts guardats al projecte.

Evidències: [src/components/BakerScene.jsx](../src/components/BakerScene.jsx), [public/images/baker-poses-padded-v3.png](../public/images/baker-poses-padded-v3.png), [public/images/bakery-interior-stage-v3.png](../public/images/bakery-interior-stage-v3.png), [design/recursos-pastisseria-v3-final.json](../design/recursos-pastisseria-v3-final.json), [output/revisio-v3/pastissera-ofereix.png](../output/revisio-v3/pastissera-ofereix.png).

### H041 Implementar entrada i escena amb cancel·lació segura

**10 d’oct. 2026, 0:59 · T10-03.** Entrada amb acostament breu a la porta, càrrega prèvia de les dues capes, cancel·lació i retorn de focus. Tres proves cobreixen sortida a mig forn, moviment reduït i oferta només al final. Navegador: entrada, oferta, sortida i cancel·lar entrada deixen l’escena desmuntada. Corregida una invocació de temporitzadors específica del navegador detectada durant la prova.

Evidències: [src/pages/Bakery.jsx](../src/pages/Bakery.jsx), [shared/bakery-sequence.js](../shared/bakery-sequence.js), [tests/bakery-sequence.test.js](../tests/bakery-sequence.test.js), [output/revisio-v3/pastisseria-sequencia.txt](../output/revisio-v3/pastisseria-sequencia.txt).

### H042 Implementar Agafa el pastís i trajecte fins al saldo

**10 d’oct. 2026, 1:05 · T10-04.** Recollida bloquejada fins a l’oferta i confirmada pel servidor abans del vol. Guard immediat contra dobles clics, cancel·lació en sortir, moviment reduït directe, capçalera visible i pols al saldo. Navegador: un únic +1, saldo 24→25, vol creat i eliminat, botó final desactivat i moviment al moneder.

Evidències: [src/pages/Bakery.jsx](../src/pages/Bakery.jsx), [src/components/CakeFlight.jsx](../src/components/CakeFlight.jsx), [output/revisio-v3/pastisseria-recollida.json](../output/revisio-v3/pastisseria-recollida.json), [output/revisio-v3/pastisseria-recollida.png](../output/revisio-v3/pastisseria-recollida.png).

### H043 Eliminar el repte i les seves rutes sense alterar l’historial

**10 d’oct. 2026, 1:07 · T10-05.** Retirats el racó secret, formulari, preguntes, crides i recompenses noves del repte. GET i POST antics retornen 404 i el bootstrap ja no inclou l’estat antic. Taula i assentaments històrics preservats; set proves SQLite i flux API de saldo i moneder intactes.

Evidències: [src/pages/Bakery.jsx](../src/pages/Bakery.jsx), [worker/index.js](../worker/index.js), [worker/data.js](../worker/data.js), [tests/database.test.js](../tests/database.test.js), [output/revisio-v3/historic-moneder.txt](../output/revisio-v3/historic-moneder.txt), [output/revisio-v3/api-sense-repte.txt](../output/revisio-v3/api-sense-repte.txt).

### H044 Verificar escena completa, recollida i dades preservades

**10 d’oct. 2026, 1:08 · T10-06.** Escena final revisada a escriptori i 390 px, proporció completa, sense scroll exterior i sortida amb zero nodes d’escena o vol. Saldo 25 conservat després de recarregar. Eliminat el marge negatiu lateral que solapava el cartell. 26 fluxos API, set proves de moneder i tres de seqüència; moviment reduït verificat amb rellotge aïllat.

Evidències: [output/revisio-v3/pastisseria-final.json](../output/revisio-v3/pastisseria-final.json), [output/revisio-v3/pastisseria-final-mobil.png](../output/revisio-v3/pastisseria-final-mobil.png), [output/revisio-v3/api-sense-repte.txt](../output/revisio-v3/api-sense-repte.txt), [output/revisio-v3/pastisseria-sequencia.txt](../output/revisio-v3/pastisseria-sequencia.txt), [src/revision.css](../src/revision.css).

### H045 Executar recorreguts per rol i comprovar preservació de dades

**10 d’oct. 2026, 1:10 · T11-01.** Recorreguts de convidat i preferències combinades verificats al navegador; 26 fluxos API per estudiant, delegat i administració i set proves de guest. Accés temporal separat de DEMO_MODE, primer administrador encara protegit per token encara que hi hagi convidats. Comparació íntegra de 345 files originals de tres usuaris en 16 taules, totes preservades.

Evidències: [output/revisio-v3/recorreguts-finals.json](../output/revisio-v3/recorreguts-finals.json), [output/revisio-v3/preservacio-dades.json](../output/revisio-v3/preservacio-dades.json), [output/revisio-v3/acces-public-permisos.txt](../output/revisio-v3/acces-public-permisos.txt), [output/revisio-v3/api-sense-repte.txt](../output/revisio-v3/api-sense-repte.txt), [scripts/audit-local-data.mjs](../scripts/audit-local-data.mjs), [worker/auth.js](../worker/auth.js).

### H046 Revisar responsive, accessibilitat i estats combinats

**10 d’oct. 2026, 1:18 · T11-02.** 84 casos responsive en sis amplades i dues densitats sense scroll exterior ni imatges trencades. Corregit el grid lateral de pastisseria a 1024 px. Resum de notes amb columna mòbil estreta i detall per targetes; entrada 8,3, ocultació i desfer comprovats a 320 px. Escape respecta menú/diàleg, focus restaurat i salt al contingut sense alterar la ruta. Contrast dels nous textos mínim 4,77:1.

Evidències: [output/revisio-v3/responsive-matriu.json](../output/revisio-v3/responsive-matriu.json), [output/revisio-v3/responsive-comoda.json](../output/revisio-v3/responsive-comoda.json), [output/revisio-v3/accessibilitat-final.json](../output/revisio-v3/accessibilitat-final.json), [output/revisio-v3/notes-mode-discret-mobil.png](../output/revisio-v3/notes-mode-discret-mobil.png), [output/revisio-v3/notes-mode-discret-final.png](../output/revisio-v3/notes-mode-discret-final.png), [output/revisio-v3/notes-pesos-selector-320.png](../output/revisio-v3/notes-pesos-selector-320.png), [src/revision.css](../src/revision.css), [src/ui.jsx](../src/ui.jsx).

### H047 Completar proves, tipus, lint, build i simulació

**10 d’oct. 2026, 1:21 · T11-03.** Passada integrada final: 46/46 proves unitàries i SQLite, 26/26 fluxos API amb D1/R2 reals aïllats, tipus Workers/TypeScript, sintaxi i ESLint. Build i dry-run de Cloudflare correctes amb 52 recursos estàtics. Corregida una clau inicial redundant del formulari Agenda detectada durant el build; segona compilació sense aquest avís.

Evidències: [output/revisio-v3/unit-final.txt](../output/revisio-v3/unit-final.txt), [output/revisio-v3/api-final.txt](../output/revisio-v3/api-final.txt), [output/revisio-v3/typecheck-final.txt](../output/revisio-v3/typecheck-final.txt), [output/revisio-v3/cf-check-final.txt](../output/revisio-v3/cf-check-final.txt), [output/revisio-v3/format-final.txt](../output/revisio-v3/format-final.txt).

### H048 Actualitzar historial, recursos i informe de diferències

**10 d’oct. 2026, 1:29 · T11-04.** Documentació actualitzada al comportament final: mode discret i edició mòbil, Agenda, formats, perfils, música, cartell i pastissera. Informes anteriors preservats; recursos, prompts exactes, CC0, Apache PDF.js i OFL inclosos. Límits explícits d’audició, reproducció del salt original, xarxa lenta i identitat de píxels. Exportador exclou secrets i eines; publicació i ZIP es registren amb les seves tasques finals.

Evidències: [README.md](../README.md), [DESIGN.md](../DESIGN.md), [TRASLLAT.md](../TRASLLAT.md), [docs/VERIFICATION.md](../docs/VERIFICATION.md), [design/RECURSOS-V3.md](../design/RECURSOS-V3.md), [design/recursos-pastisseria-v3-final.json](../design/recursos-pastisseria-v3-final.json), [public/licenses/PDFJS-Apache-2.0.txt](../public/licenses/PDFJS-Apache-2.0.txt), [scripts/export-project.ps1](../scripts/export-project.ps1).

### H049 Publicar la versió validada i verificar l’accés públic

**10 d’oct. 2026, 1:45 · T11-06.** La Net publicada amb set migracions D1, R2 europeu privat i accés temporal independent de DEMO_MODE. Corregit el parser remot de CASE amb parèntesis; 46 proves i 26 fluxos repetits. Producció: 11 comprovacions, 46 recursos SHA-256, notes ocultes amb inserció i recàrrega, mòbil 320 px i consola sense errors. Secret inicial preservat només a .cloud, exclòs del lliurament.

Evidències: [docs/PUBLICACIO.md](../docs/PUBLICACIO.md), [migrations/0001_initial.sql](../migrations/0001_initial.sql), [output/revisio-v3/cloud-prepare-retry.txt](../output/revisio-v3/cloud-prepare-retry.txt), [output/revisio-v3/cloud-deploy.txt](../output/revisio-v3/cloud-deploy.txt), [output/revisio-v3/cloud-versions.txt](../output/revisio-v3/cloud-versions.txt), [output/revisio-v3/publicacio-api.json](../output/revisio-v3/publicacio-api.json), [output/revisio-v3/publicacio-navegador.json](../output/revisio-v3/publicacio-navegador.json), [output/revisio-v3/publicacio-mode-discret.png](../output/revisio-v3/publicacio-mode-discret.png).

### H050 Exportar i verificar còpia transportable amb manifest

**10 d’oct. 2026, 1:49 · T11-05.** Còpia coherent amb els servidors aturats: SQL restaurat en memòria, 38 taules idèntiques i set migracions; dades originals preservades. Primer ZIP verificat amb 492 fitxers, mida i SHA-256 de totes les entrades i manifest. Es genera el paquet definitiu amb la checklist completa; secrets de producció exclosos.

Evidències: [scripts/export-project.ps1](../scripts/export-project.ps1), [backups/la-net-local-2026-10-10.sql](../backups/la-net-local-2026-10-10.sql), [output/revisio-v3/copia-sql-verificada.json](../output/revisio-v3/copia-sql-verificada.json), [output/revisio-v3/lliurament-base-verificat.json](../output/revisio-v3/lliurament-base-verificat.json), [output/revisio-v3/preservacio-dades.json](../output/revisio-v3/preservacio-dades.json), [TRASLLAT.md](../TRASLLAT.md).

### H051 Redissenyar el cartell i integrar-lo a la barra superior

**10 d’oct. 2026, 2:04 · T13-01.** Cartell reduït a 236 × 44 px a la barra superior i icona de 44 px en pantalles estretes. Foto interpretada com a mostra d’estil; detall complet en diàleg, ocultació persistent i retorn de focus. Miniatura i títol llarg comprovats sense publicar cap anunci de prova.

Evidències: [output/cartell-compacte/interaccions.json](../output/cartell-compacte/interaccions.json), [output/cartell-compacte/cartell-escriptori.png](../output/cartell-compacte/cartell-escriptori.png), [output/cartell-compacte/previsualitzacio-foto.png](../output/cartell-compacte/previsualitzacio-foto.png).

### H052 Verificar les pàgines i actualitzar el contracte del cartell

**10 d’oct. 2026, 2:13 · T13-02.** 84 composicions actuals verificades amb dimensions exactes i botons sense interseccions; corregit el cas 320 px amb música i temporitzador actius, tots els controls de 44 px. Menú Més, detall, privadesa i persistència coherents. 46 proves, tipus, ESLint, build i dry-run superats; documentació actualitzada a la foto com a mostra.

Evidències: [output/cartell-compacte/responsive-compacta.json](../output/cartell-compacte/responsive-compacta.json), [output/cartell-compacte/responsive-comoda.json](../output/cartell-compacte/responsive-comoda.json), [output/cartell-compacte/capcalera-accessible.json](../output/cartell-compacte/capcalera-accessible.json), [output/cartell-compacte/consola.json](../output/cartell-compacte/consola.json), [output/cartell-compacte/unit.txt](../output/cartell-compacte/unit.txt), [output/cartell-compacte/typecheck.txt](../output/cartell-compacte/typecheck.txt), [output/cartell-compacte/cf-check.txt](../output/cartell-compacte/cf-check.txt), [docs/VERIFICATION.md](../docs/VERIFICATION.md).

### H053 Publicar i lliurar el cartell compacte verificat

**10 d’oct. 2026, 2:17 · T13-03.** Cartell compacte publicat a la mateixa URL, versió 27d218c4-bb87-44a0-a8a1-8fac870127e2. 46 recursos SHA-256 coincidents i cinc comprovacions públiques de navegador, sense errors nous ni anuncis de prova. SQL actual restaurat amb 38 taules idèntiques; ZIP verificat fitxer a fitxer amb els servidors aturats. Es genera la còpia final amb les 56 tasques tancades.

Evidències: [output/cartell-compacte/cloud-deploy.txt](../output/cartell-compacte/cloud-deploy.txt), [output/cartell-compacte/publicacio-recursos.json](../output/cartell-compacte/publicacio-recursos.json), [output/cartell-compacte/publicacio-navegador.json](../output/cartell-compacte/publicacio-navegador.json), [output/cartell-compacte/publicacio-escriptori.png](../output/cartell-compacte/publicacio-escriptori.png), [output/cartell-compacte/copia-sql-verificada.json](../output/cartell-compacte/copia-sql-verificada.json), [output/cartell-compacte/lliurament-base-verificat.json](../output/cartell-compacte/lliurament-base-verificat.json), [docs/PUBLICACIO.md](../docs/PUBLICACIO.md).

### H054 Auditar recorreguts i registrar incidències concretes

**10 d’oct. 2026, 2:22 · T14-01.** Nou incidències concretes registrades: respostes antigues, POST confirmat amb recàrrega fallida, privadesa en errors, notes pendents i canvis ràpids, storage, temporitzador, selectors i promeses de reaccions. Pla seqüencial i comprovacions específiques definits; punt de partida local verificat.

Evidències: [output/depuracio-maxima/auditoria.json](../output/depuracio-maxima/auditoria.json), [docs/PLA-DEPURACIO-2026-10-10.md](../docs/PLA-DEPURACIO-2026-10-10.md).

### H055 Corregir sincronització i recuperació després d’errors

**10 d’oct. 2026, 2:28 · T14-02.** Snapshots antics descartats també durant escriptures concurrents; un POST confirmat conserva l’èxit amb recàrrega fallida. Preferències confirmades actualitzen la vista; mode discret conserva l’ocultació si falla revelar. Cinc proves controlades i prova real de navegador amb l’API local aturada: tots els inputs continuen buits i apareix l’error. Reaccions gestionen el rebuig i es desbloquegen.

Evidències: [output/depuracio-maxima/sincronitzacio.txt](../output/depuracio-maxima/sincronitzacio.txt), [output/depuracio-maxima/privadesa-error.json](../output/depuracio-maxima/privadesa-error.json), [output/depuracio-maxima/privadesa-error.png](../output/depuracio-maxima/privadesa-error.png), [shared/async-state.js](../shared/async-state.js).

### H056 Reforçar notes pendents, emmagatzematge i selectors

**10 d’oct. 2026, 2:38 · T14-03.** Notes serialitzades, reintent i Desfer confirmats; entrada pendent conservada durant la navegació sense exposar notes; memòria local i temporitzador toleren dades malmeses; navegació de selectors corregida. 18 proves passen i la interrupció real de l’API s’ha recuperat correctament.

Evidències: [output/depuracio-maxima/notes-emmagatzematge-selectors.txt](../output/depuracio-maxima/notes-emmagatzematge-selectors.txt), [output/depuracio-maxima/notes-reintent.json](../output/depuracio-maxima/notes-reintent.json), [output/depuracio-maxima/notes-pendents.png](../output/depuracio-maxima/notes-pendents.png), [shared/grade-writer.js](../shared/grade-writer.js), [shared/local-state.js](../shared/local-state.js), [shared/select-navigation.js](../shared/select-navigation.js).

### H057 Depurar els detalls visuals i les interaccions de totes les seccions

**10 d’oct. 2026, 2:48 · T14-04.** 84 combinacions de mida i densitat sense desbordaments; 14 rutes finals sense errors; selector en finestra baixa i teclat, esborrany, agenda, minuts, pastisseria i sis controls tàctils verificats. Contextos de desenvolupament preservats durant refresh. Desar i M’agrada recuperen els errors d’API.

Evidències: [output/depuracio-maxima/auditoria.json](../output/depuracio-maxima/auditoria.json), [output/depuracio-maxima/responsive-compacta.json](../output/depuracio-maxima/responsive-compacta.json), [output/depuracio-maxima/responsive-comoda.json](../output/depuracio-maxima/responsive-comoda.json), [output/depuracio-maxima/selector-teclat.json](../output/depuracio-maxima/selector-teclat.json), [output/depuracio-maxima/interaccions.json](../output/depuracio-maxima/interaccions.json), [output/depuracio-maxima/accions-reintent.json](../output/depuracio-maxima/accions-reintent.json), [output/depuracio-maxima/consola-final.json](../output/depuracio-maxima/consola-final.json), [output/depuracio-maxima/capcalera-activa.json](../output/depuracio-maxima/capcalera-activa.json), [output/depuracio-maxima/pastisseria-interior.png](../output/depuracio-maxima/pastisseria-interior.png).

### H058 Completar regressions, preservació i documentació

**10 d’oct. 2026, 2:55 · T14-05.** 66 unitats, 26 fluxos API aïllats, tipus/lint/build/dry-run superats. Restaurat de manera acotada l’únic crèdit del like de prova; auditoria posterior confirma les 345 files originals. Informe actual amb límits reals, arxiu històric i exportador que exigeix totes les evidències verificades.

Evidències: [output/depuracio-maxima/unit.txt](../output/depuracio-maxima/unit.txt), [output/depuracio-maxima/api.txt](../output/depuracio-maxima/api.txt), [output/depuracio-maxima/typecheck.txt](../output/depuracio-maxima/typecheck.txt), [output/depuracio-maxima/cf-check.txt](../output/depuracio-maxima/cf-check.txt), [output/depuracio-maxima/preservacio-dades.json](../output/depuracio-maxima/preservacio-dades.json), [output/depuracio-maxima/restauracio-efecte-prova.json](../output/depuracio-maxima/restauracio-efecte-prova.json), [docs/VERIFICATION.md](../docs/VERIFICATION.md).

### Revisió de T14-06 · publicació i paquet preparats

10 d’octubre de 2026. Publicada la versió b3d1b68e-35dd-474e-81c8-7c343fd355ce; 46 recursos SHA-256 i 14 casos de navegador en lectura correctes. SQL restaurat amb 38 taules idèntiques i set migracions. ZIP base verificat amb totes les evidències de les 61 tasques tancades. La revisió automàtica ha bloquejat restaurar la nota 8,3 i activar el mode discret del convidat tècnic públic; s’ha demanat autorització específica. La tasca continua en revisió i no es marca completada. Vegeu PENDENT-APROVACIO-2026-10-10.md.

### Organització de F15 · UI i UX més netes · 2026-10-10

T14-06 torna a pendent amb totes les evidències conservades, exclusivament a l’espera de l’autorització específica per restaurar el convidat tècnic públic. La nova simplificació s’executa en cinc tasques seqüencials, amb una sola tasca activa, segons PLA-UI-CLEAN.md. No s’interpreta la petició de redisseny com a autorització per a aquella restauració.

### H059 Diagnosticar saturació i fixar els criteris

**10 d’oct. 2026, 3:09 · T15-01.** Diagnosticades les set seccions i definida una seqüència de simplificació amb criteris visuals i funcionals.

Evidències: [docs/PLA-UI-CLEAN.md](../docs/PLA-UI-CLEAN.md), [output/ui-clean/diagnostic.md](../output/ui-clean/diagnostic.md), [output/ui-clean/abans/resum.json](../output/ui-clean/abans/resum.json), [output/ui-clean/abans/notes.png](../output/ui-clean/abans/notes.png), [output/ui-clean/abans/study-mobil.png](../output/ui-clean/abans/study-mobil.png).

### H060 Simplificar estructura comuna i filtres

**10 d’oct. 2026, 3:12 · T15-02.** Simplificades capçalera i barra lateral; franja de filtres compartida amb selecció desplegable, cancel·lació i retorn de focus verificats.

Evidències: [src/clean.css](../src/clean.css), [src/App.jsx](../src/App.jsx), [src/components/SubjectFilter.jsx](../src/components/SubjectFilter.jsx), [output/ui-clean/estructura-comuna.png](../output/ui-clean/estructura-comuna.png), [output/ui-clean/filtres-teclat.json](../output/ui-clean/filtres-teclat.json).

### H061 Depurar jerarquia i accions de les set seccions

**10 d’oct. 2026, 3:22 · T15-03.** Reduïts text duplicat i accions primàries repetides; configuració de notes unificada, biblioteca musical desplegable i comunitat i pastisseria amb menys panells.

Evidències: [src/pages/Notes.jsx](../src/pages/Notes.jsx), [src/pages/Grades.jsx](../src/pages/Grades.jsx), [src/pages/Study.jsx](../src/pages/Study.jsx), [src/components/OptionsMenu.jsx](../src/components/OptionsMenu.jsx), [src/clean.css](../src/clean.css), [output/ui-clean/despres/resum.json](../output/ui-clean/despres/resum.json), [output/ui-clean/despres/notes.png](../output/ui-clean/despres/notes.png), [output/ui-clean/despres/community.png](../output/ui-clean/despres/community.png).

### H062 Verificar visualment i executar regressions

**10 d’oct. 2026, 3:48 · T15-04.** 98 casos responsive, 28 interaccions i 6 finestres baixes superats. Tipus, lint, build, 66 unitats i 26 fluxos API correctes; 345 files originals intactes. Corregits filtre de Plusos a 320 px, focus i posició dels desplegables.

Evidències: [output/ui-clean/verificacio-final.json](../output/ui-clean/verificacio-final.json), [output/ui-clean/responsive.json](../output/ui-clean/responsive.json), [output/ui-clean/interaccions.json](../output/ui-clean/interaccions.json), [output/ui-clean/opcions-finestres-baixes.json](../output/ui-clean/opcions-finestres-baixes.json), [output/ui-clean/consola-final.json](../output/ui-clean/consola-final.json), [output/ui-clean/preservacio-dades.json](../output/ui-clean/preservacio-dades.json), [output/ui-clean/typecheck-final.txt](../output/ui-clean/typecheck-final.txt), [output/ui-clean/cf-check-final.txt](../output/ui-clean/cf-check-final.txt), [docs/VERIFICATION.md](../docs/VERIFICATION.md), [DESIGN.md](../DESIGN.md).

### H063 Publicar i lliurar la simplificació

**10 d’oct. 2026, 3:55 · T15-05.** Simplificació publicada al Worker existent. 46 recursos idèntics i 14 casos públics de lectura superats; SQL restaurat amb 38 taules idèntiques i D1/R2 preservats. Corregit i reproduït el problema EBUSY de Vite en copiar documents. Paquet base verificat per mides/SHA; es regenera el ZIP final amb aquesta checklist tancada. T14-06 continua pendent d’autorització específica.

Evidències: [output/ui-clean/cloud-deploy.txt](../output/ui-clean/cloud-deploy.txt), [output/ui-clean/publicacio-recursos.json](../output/ui-clean/publicacio-recursos.json), [output/ui-clean/publicacio-navegador.json](../output/ui-clean/publicacio-navegador.json), [output/ui-clean/publicacio-escriptori.png](../output/ui-clean/publicacio-escriptori.png), [output/ui-clean/publicacio-mobil.png](../output/ui-clean/publicacio-mobil.png), [output/ui-clean/copia-sql-verificada.json](../output/ui-clean/copia-sql-verificada.json), [output/ui-clean/lliurament-base-verificat.json](../output/ui-clean/lliurament-base-verificat.json), [output/ui-clean/vite-documents.json](../output/ui-clean/vite-documents.json), [vite.config.js](../vite.config.js), [docs/PUBLICACIO.md](../docs/PUBLICACIO.md), [TRASLLAT.md](../TRASLLAT.md).

### H064 Publicar i lliurar la depuració verificada

**10 d’oct. 2026, 10:57 · T14-06.** Amb autorització explícita de Marc, restaurada només la nota sintètica 8,3 del convidat tècnic públic a pendent i activat el mode discret. Persistència comprovada en recarregar, 32 inputs sense valors visibles, altres caselles intactes i saldo 24 conservat. Actualitzats registre i documentació, SQL verificat amb 38 taules idèntiques i 345 files originals intactes; paquet base íntegre. Es regenera el ZIP final amb les 67 tasques verificades.

Evidències: [output/depuracio-maxima/cloud-deploy.txt](../output/depuracio-maxima/cloud-deploy.txt), [output/depuracio-maxima/publicacio-recursos.json](../output/depuracio-maxima/publicacio-recursos.json), [output/depuracio-maxima/publicacio-navegador.json](../output/depuracio-maxima/publicacio-navegador.json), [output/restauracio-publica/restauracio-verificada.json](../output/restauracio-publica/restauracio-verificada.json), [output/restauracio-publica/notes-restaurades.png](../output/restauracio-publica/notes-restaurades.png), [output/restauracio-publica/copia-sql-verificada.json](../output/restauracio-publica/copia-sql-verificada.json), [output/restauracio-publica/preservacio-dades.json](../output/restauracio-publica/preservacio-dades.json), [output/restauracio-publica/lliurament-base-verificat.json](../output/restauracio-publica/lliurament-base-verificat.json), [docs/PENDENT-APROVACIO-2026-10-10.md](../docs/PENDENT-APROVACIO-2026-10-10.md), [docs/PUBLICACIO.md](../docs/PUBLICACIO.md), [TRASLLAT.md](../TRASLLAT.md).

### H065 Diagnosticar el moviment i les capes

**10 d’oct. 2026, 11:09 · T16-01.** Diagnosticats la preparació de 4,4 segons, el forn activat després de recollir, el personatge fora de la màscara i el botó inferior. Pla seqüencial amb cocció prèvia, moviments lents, oclusió i recollida contextual.

Evidències: [docs/PLA-PASTISSERIA-ANIMACIO.md](../docs/PLA-PASTISSERIA-ANIMACIO.md), [output/bakery-motion/diagnostic.md](../output/bakery-motion/diagnostic.md), [output/bakery-motion/abans.png](../output/bakery-motion/abans.png).

### H066 Millorar la seqüència, el forn i la recollida

**10 d’oct. 2026, 11:25 · T16-02.** Preparacio de 20,1 segons, dotze estats, forn abans de recollir, cames tapades i boto contextual. Vol alentit amb origen al pastis i finalitzacio unica.

Evidències: [src/components/BakerScene.jsx](../src/components/BakerScene.jsx), [shared/bakery-sequence.js](../shared/bakery-sequence.js), [src/bakery.css](../src/bakery.css), [src/pages/Bakery.jsx](../src/pages/Bakery.jsx), [output/bakery-motion/forn-porta-oberta.png](../output/bakery-motion/forn-porta-oberta.png), [output/bakery-motion/oferta-desktop.png](../output/bakery-motion/oferta-desktop.png).

### H067 Verificar moviments, responsivitat i regressions

**10 d’oct. 2026, 11:36 · T16-03.** Verificades 67 unitats, 26 API, 14 combinacions de mida i estat, dotze fases visuals i deu interaccions del build amb base aillada. Recollida +1, vol 1,65 s, cancel·lacio, focus, persistencia i art/dades originals comprovats.

Evidències: [output/bakery-motion/verificacio-local.json](../output/bakery-motion/verificacio-local.json), [output/bakery-motion/unit.txt](../output/bakery-motion/unit.txt), [output/bakery-motion/api.txt](../output/bakery-motion/api.txt), [output/bakery-motion/typecheck.txt](../output/bakery-motion/typecheck.txt), [output/bakery-motion/cf-check.txt](../output/bakery-motion/cf-check.txt), [output/bakery-motion/responsive-oferta.json](../output/bakery-motion/responsive-oferta.json), [output/bakery-motion/responsive-recollit.json](../output/bakery-motion/responsive-recollit.json), [output/bakery-motion/seqüencia-visual.json](../output/bakery-motion/seqüencia-visual.json), [output/bakery-motion/integracio-compilada.json](../output/bakery-motion/integracio-compilada.json), [output/bakery-motion/art-preservat.json](../output/bakery-motion/art-preservat.json), [output/bakery-motion/preservacio-dades.json](../output/bakery-motion/preservacio-dades.json), [tests/bakery-sequence.test.js](../tests/bakery-sequence.test.js), [docs/VERIFICATION.md](../docs/VERIFICATION.md), [DESIGN.md](../DESIGN.md).

### H068 Publicar i lliurar la pastisseria revisada

**10 d’oct. 2026, 11:43 · T16-04.** Publicada R29 a72e8f46 al mateix Worker: 46 recursos identics, coccio i oferta publiques comprovades sense recollir. SQL intacte amb 38 taules, nova copia D1/R2 de 14 fitxers i paquet base de 777 fitxers integre. Es regenera el ZIP final amb les 71 tasques tancades.

Evidències: [output/bakery-motion/cloud-deploy.txt](../output/bakery-motion/cloud-deploy.txt), [output/bakery-motion/publicacio-recursos.json](../output/bakery-motion/publicacio-recursos.json), [output/bakery-motion/publicacio-navegador.json](../output/bakery-motion/publicacio-navegador.json), [output/bakery-motion/publicacio-coccio.png](../output/bakery-motion/publicacio-coccio.png), [output/bakery-motion/publicacio-escriptori.png](../output/bakery-motion/publicacio-escriptori.png), [output/bakery-motion/publicacio-mobil.png](../output/bakery-motion/publicacio-mobil.png), [output/bakery-motion/copia-sql-verificada.json](../output/bakery-motion/copia-sql-verificada.json), [output/bakery-motion/copia-d1-r2-verificada.json](../output/bakery-motion/copia-d1-r2-verificada.json), [output/bakery-motion/lliurament-base-verificat.json](../output/bakery-motion/lliurament-base-verificat.json), [docs/PUBLICACIO.md](../docs/PUBLICACIO.md), [TRASLLAT.md](../TRASLLAT.md).

### H069 Diagnosticar el descentrament de la caseta

**10 d’oct. 2026, 11:53 · T17-01.** Diagnosi confirmada: el marc es redueix per max-height i aspect-ratio, queda 69,4 px descentrat i es combina amb fons opacs. Pla R30 seqüencial amb una sola tasca activa.

Evidències: [docs/PLA-PASTISSERIA-EXTERIOR.md](../docs/PLA-PASTISSERIA-EXTERIOR.md), [output/bakery-exterior/diagnosi.json](../output/bakery-exterior/diagnosi.json), [output/bakery-exterior/abans.png](../output/bakery-exterior/abans.png).

### H070 Retirar el fons i centrar l’exterior

**10 d’oct. 2026, 11:56 · T17-02.** Retall PNG amb alfa generat amb imagegen i guardat sense postprocessat. Caseta centrada sobre fons transparent; porta i vapor comparteixen el marc. Original, interior i atlas contrastats amb el ZIP anterior.

Evidències: [public/images/bakery-exterior-transparent-v1.png](../public/images/bakery-exterior-transparent-v1.png), [design/bakery-exterior-transparent-prompt.txt](../design/bakery-exterior-transparent-prompt.txt), [src/pages/Bakery.jsx](../src/pages/Bakery.jsx), [src/bakery.css](../src/bakery.css), [output/bakery-exterior/imatge-verificada.json](../output/bakery-exterior/imatge-verificada.json), [output/bakery-exterior/proposta-escriptori.png](../output/bakery-exterior/proposta-escriptori.png).

### H071 Verificar l’exterior i l’entrada a la pastisseria

**10 d’oct. 2026, 12:05 · T17-03.** Verificades 67 unitats, tipus/lint, build/dry-run, 13 combinacions de mida/barra/alçada i 4 interaccions. Caseta centrada amb proporció completa; porta, cancel·lació per teclat i retorn de focus correctes. Dades originals preservades.

Evidències: [output/bakery-exterior/verificacio-local.json](../output/bakery-exterior/verificacio-local.json), [output/bakery-exterior/responsive-expandida.json](../output/bakery-exterior/responsive-expandida.json), [output/bakery-exterior/responsive-plegada-finestra-baixa.json](../output/bakery-exterior/responsive-plegada-finestra-baixa.json), [output/bakery-exterior/interaccions.json](../output/bakery-exterior/interaccions.json), [output/bakery-exterior/preservacio-dades.json](../output/bakery-exterior/preservacio-dades.json), [docs/VERIFICATION.md](../docs/VERIFICATION.md).

### H072 Publicar i lliurar l’exterior revisat

**10 d’oct. 2026, 12:11 · T17-04.** Publicada la versió e35f2c9a amb 47 recursos SHA-256, exterior centrat a mòbil/escriptori, porta i forn previ correctes i saldo públic intacte. SQL de 38 taules, còpia D1/R2 de 14 fitxers i ZIP base de 829 fitxers verificats. Es regenera el ZIP final amb la checklist tancada.

Evidències: [output/bakery-exterior/publicacio-recursos.json](../output/bakery-exterior/publicacio-recursos.json), [output/bakery-exterior/publicacio-navegador.json](../output/bakery-exterior/publicacio-navegador.json), [output/bakery-exterior/copia-sql-verificada.json](../output/bakery-exterior/copia-sql-verificada.json), [output/bakery-exterior/copia-d1-r2-verificada.json](../output/bakery-exterior/copia-d1-r2-verificada.json), [output/bakery-exterior/lliurament-base-verificat.json](../output/bakery-exterior/lliurament-base-verificat.json), [docs/PUBLICACIO.md](../docs/PUBLICACIO.md), [TRASLLAT.md](../TRASLLAT.md).

### H073 Diagnosticar i definir el cartell visual

**10 d’oct. 2026, 12:20 · T18-01.** Diagnosi confirmada: títol obligatori, miniatura de 30 px i cartell de 236 x 44 px. Definits tres formats, peça moderada de 272 x 56, crop visual i exportació només del retall final, sense migració.

Evidències: [docs/PLA-CARTELL-VISUAL.md](../docs/PLA-CARTELL-VISUAL.md), [output/board-creative/abans.png](../output/board-creative/abans.png).

### H074 Preparar contingut i geometria del retall

**10 d’oct. 2026, 12:21 · T18-02.** Imatge sense titol acceptada i anunci buit rebutjat. Geometria 65:11 limitada amb zoom, pan i nanses. Set proves superades. Integracio API afegida per a T18-04.

Evidències: [shared/banner.js](../shared/banner.js), [worker/index.js](../worker/index.js), [tests/banner.test.js](../tests/banner.test.js), [scripts/test-api.mjs](../scripts/test-api.mjs), [output/board-creative/geometria-unit.txt](../output/board-creative/geometria-unit.txt).

### H075 Implementar el cartell i el retallador visual

**10 d’oct. 2026, 12:36 · T18-03.** Formats de cartell, fusta i editor visual amb retall, zoom, teclat, imatge sencera i vista previa compartida implementats. Primera revisio real a escriptori i mobil sense publicar anuncis.

Evidències: [src/board.css](../src/board.css), [src/components/WoodBoard.jsx](../src/components/WoodBoard.jsx), [src/components/BannerComposer.jsx](../src/components/BannerComposer.jsx), [src/components/BannerImageEditor.jsx](../src/components/BannerImageEditor.jsx), [src/banner-image.js](../src/banner-image.js), [output/board-creative/formulari-text-inicial.png](../output/board-creative/formulari-text-inicial.png), [output/board-creative/editor-inicial.png](../output/board-creative/editor-inicial.png), [output/board-creative/editor-mobil-390.png](../output/board-creative/editor-mobil-390.png).

### H076 Verificar formats, retall i regressions

**10 d’oct. 2026, 13:30 · T18-04.** 74 unitats, 27 fluxos API, 24 interaccions i 112 casos responsive superats. Retall PNG coincident en 15 punts, imatge sencera i conflicte sense doble carrec. Dades i art originals preservats.

Evidències: [output/board-creative/verificacio-local.json](../output/board-creative/verificacio-local.json), [output/board-creative/interaccions.json](../output/board-creative/interaccions.json), [output/board-creative/responsive.json](../output/board-creative/responsive.json), [output/board-creative/responsive-controls-actius.json](../output/board-creative/responsive-controls-actius.json), [output/board-creative/responsive-formulari.json](../output/board-creative/responsive-formulari.json), [output/board-creative/retall-pixels.json](../output/board-creative/retall-pixels.json), [output/board-creative/imatge-sencera-pixels.json](../output/board-creative/imatge-sencera-pixels.json), [output/board-creative/api-result.json](../output/board-creative/api-result.json), [output/board-creative/typecheck.txt](../output/board-creative/typecheck.txt), [output/board-creative/build-final.txt](../output/board-creative/build-final.txt), [output/board-creative/build-formulari-final.txt](../output/board-creative/build-formulari-final.txt).

### H077 Publicar i lliurar el cartell visual

**10 d’oct. 2026, 13:55 · T18-05.** Cartell R31 publicat; 47 recursos i 14 casos publics en lectura verificats. SQL amb 38 taules identiques, copia D1/R2 de 14 fitxers i paquet base de 921 fitxers rellegits amb SHA-256. Limits de permisos del navegador documentats; cap pujada publica de prova.

Evidències: [docs/PUBLICACIO.md](../docs/PUBLICACIO.md), [docs/VERIFICATION.md](../docs/VERIFICATION.md), [TRASLLAT.md](../TRASLLAT.md), [output/board-creative/cloud-deploy-compat.txt](../output/board-creative/cloud-deploy-compat.txt), [output/board-creative/publicacio-recursos.json](../output/board-creative/publicacio-recursos.json), [output/board-creative/publicacio-navegador.json](../output/board-creative/publicacio-navegador.json), [output/board-creative/copia-sql-verificada.json](../output/board-creative/copia-sql-verificada.json), [output/board-creative/copia-d1-r2-verificada.json](../output/board-creative/copia-d1-r2-verificada.json), [output/board-creative/lliurament-base-verificat.json](../output/board-creative/lliurament-base-verificat.json), [output/board-creative/ultima-consulta-local-bloquejada.json](../output/board-creative/ultima-consulta-local-bloquejada.json), [backups/la-net-local-2026-10-10-cartell-visual.sql](../backups/la-net-local-2026-10-10-cartell-visual.sql).

### H078 Implementar selectors agrupats i coherents

**10 d’oct. 2026, 14:02 · T19-01.** Selector agrupat amb base neutra i activa en pressec amb contorn; Horari i Agenda amb icones. Estil del component compartit coherent, tipus button explicit, focus visible, teclat conservat, moviment reduit i colors forcats.

Evidències: [docs/PLA-SELECTORS-VISUALS.md](../docs/PLA-SELECTORS-VISUALS.md), [src/ui.jsx](../src/ui.jsx), [src/pages/Schedule.jsx](../src/pages/Schedule.jsx), [src/tabs.css](../src/tabs.css), [src/main.jsx](../src/main.jsx), [output/view-selectors/referencia-marc.png](../output/view-selectors/referencia-marc.png).

### H079 Verificar estats i regressions dels selectors

**10 d’oct. 2026, 14:07 · T19-02.** 74 unitats, tipus, lint i build/dry-run correctes. Contrast calculat del text 5.155 i 9.274; contorn actiu 3.411 i focus 5.445 o superior. Endpoints, art, migracions i proves mantenen SHA-256. Navegador bloquejat; esquema offline etiquetat i limit visual explicit.

Evidències: [output/view-selectors/unit.txt](../output/view-selectors/unit.txt), [output/view-selectors/typecheck.txt](../output/view-selectors/typecheck.txt), [output/view-selectors/build-final.txt](../output/view-selectors/build-final.txt), [output/view-selectors/contrast.json](../output/view-selectors/contrast.json), [output/view-selectors/regressions-preservades.json](../output/view-selectors/regressions-preservades.json), [output/view-selectors/navegador-bloquejat.json](../output/view-selectors/navegador-bloquejat.json), [output/view-selectors/mostra-estil.png](../output/view-selectors/mostra-estil.png), [docs/PLA-SELECTORS-VISUALS.md](../docs/PLA-SELECTORS-VISUALS.md).

### H080 Publicar i lliurar els selectors

**10 d’oct. 2026, 14:13 · T19-03.** Selectors R32 publicats amb Wrangler, versio 68ca5f45-49ec-4a89-a159-8cab8e80fb59. SQL restaurat amb 38 taules identiques, copia D1/R2 de 14 fitxers i paquet base de 960 fitxers rellegit amb SHA-256. Limit de navegador documentat, sense lectures alternatives ni modificacio de dades publiques.

Evidències: [docs/PUBLICACIO.md](../docs/PUBLICACIO.md), [docs/VERIFICATION.md](../docs/VERIFICATION.md), [TRASLLAT.md](../TRASLLAT.md), [output/view-selectors/cloud-deploy.txt](../output/view-selectors/cloud-deploy.txt), [output/view-selectors/verificacio-local.json](../output/view-selectors/verificacio-local.json), [output/view-selectors/copia-sql-verificada.json](../output/view-selectors/copia-sql-verificada.json), [output/view-selectors/copia-d1-r2-verificada.json](../output/view-selectors/copia-d1-r2-verificada.json), [output/view-selectors/lliurament-base-verificat.json](../output/view-selectors/lliurament-base-verificat.json), [output/view-selectors/navegador-bloquejat.json](../output/view-selectors/navegador-bloquejat.json), [backups/la-net-local-2026-10-10-selectors.sql](../backups/la-net-local-2026-10-10-selectors.sql).

### H081 Diagnosticar i preparar icones transparents

**10 d’oct. 2026, 14:24 · T20-01.** Tres recursos RGBA generats amb ImageGen integrat: pastis, megafon i document. Cantonades transparents, alfa inspeccionat i PNG copiat sense postprocessar. Viewport SVG conserva tot alfa igual o superior a 2/255 amb marge; nomes descarta soroll alfa 1/255 llunya. Originals i prompts conservats.

Evidències: [docs/PLA-ICONES-TRANSPARENTS.md](../docs/PLA-ICONES-TRANSPARENTS.md), [design/ui-alpha/RECURSOS.json](../design/ui-alpha/RECURSOS.json), [design/ui-alpha/cake-prompt.txt](../design/ui-alpha/cake-prompt.txt), [design/ui-alpha/megaphone-prompt.txt](../design/ui-alpha/megaphone-prompt.txt), [design/ui-alpha/document-prompt.txt](../design/ui-alpha/document-prompt.txt), [public/images/ui/cake-alpha-v1.png](../public/images/ui/cake-alpha-v1.png), [public/images/ui/megaphone-alpha-v1.png](../public/images/ui/megaphone-alpha-v1.png), [public/images/ui/document-alpha-v1.png](../public/images/ui/document-alpha-v1.png), [output/icon-alpha/alfa-verificat.json](../output/icon-alpha/alfa-verificat.json), [output/icon-alpha/inspeccio-inicial.json](../output/icon-alpha/inspeccio-inicial.json).

### H082 Integrar els recursos en el component compartit

**10 d’oct. 2026, 14:29 · T20-02.** Integrated transparent cake across balance, prices, wallet, navigation and collection; notice icons share the same alpha treatment. Original outer sizing preserved and alpha icons use normal compositing.

Evidències: [src/art.jsx](../src/art.jsx), [src/art-polish.css](../src/art-polish.css), [src/transparent-art.json](../src/transparent-art.json), [src/main.jsx](../src/main.jsx), [output/icon-alpha/component-verificat.json](../output/icon-alpha/component-verificat.json), [output/icon-alpha/mostra-component.png](../output/icon-alpha/mostra-component.png).

### H083 Verificar alfa, escala i regressions

**10 d’oct. 2026, 14:31 · T20-03.** 74 tests, types and lint, production build and Wrangler dry run passed. Verified 3 PNG alpha channels, actual SVG component at seven sizes on four surfaces, compiled asset hashes and 116 original domain/art files. Browser restrictions respected; no new web visual claim.

Evidències: [output/icon-alpha/verificacio-local.json](../output/icon-alpha/verificacio-local.json), [output/icon-alpha/alfa-verificat.json](../output/icon-alpha/alfa-verificat.json), [output/icon-alpha/component-verificat.json](../output/icon-alpha/component-verificat.json), [output/icon-alpha/integracio-compilada.json](../output/icon-alpha/integracio-compilada.json), [output/icon-alpha/regressions-preservades.json](../output/icon-alpha/regressions-preservades.json), [output/icon-alpha/unit.txt](../output/icon-alpha/unit.txt), [output/icon-alpha/typecheck.txt](../output/icon-alpha/typecheck.txt), [output/icon-alpha/build-final.txt](../output/icon-alpha/build-final.txt), [output/icon-alpha/mostra-component.png](../output/icon-alpha/mostra-component.png).

### H084 Publicar i lliurar la revisio de detalls

**10 d’oct. 2026, 14:36 · T20-04.** Published version c88acd48-cee4-4145-b22c-ecaf15854127 with six updated/new assets. SQL restored with 38 identical tables and seven migrations; 14 D1/R2 backup files verified. Base ZIP reread 1014 files with matching sizes/SHA-256 and all evidence. Final package regenerated after checklist closure; no browser or public HTTP checks attempted.

Evidències: [output/icon-alpha/cloud-deploy.txt](../output/icon-alpha/cloud-deploy.txt), [output/icon-alpha/verificacio-local.json](../output/icon-alpha/verificacio-local.json), [output/icon-alpha/copia-sql-verificada.json](../output/icon-alpha/copia-sql-verificada.json), [output/icon-alpha/copia-d1-r2-verificada.json](../output/icon-alpha/copia-d1-r2-verificada.json), [output/icon-alpha/lliurament-base-verificat.json](../output/icon-alpha/lliurament-base-verificat.json), [docs/PUBLICACIO.md](../docs/PUBLICACIO.md), [docs/VERIFICATION.md](../docs/VERIFICATION.md), [TRASLLAT.md](../TRASLLAT.md), [scripts/export-project.ps1](../scripts/export-project.ps1).

### H085 Persistir i protegir la identitat dels anuncis

**10 d’oct. 2026, 14:42 · T21-01.** Added additive default-named migration and strict boolean validation. Public banner uses explicit safe fields, never account IDs, and omits the name when anonymous. Anonymous image download uses a neutral filename. 17 focused domain/database tests passed including migration preservation and internal billing.

Evidències: [migrations/0008_banner_identity.sql](../migrations/0008_banner_identity.sql), [shared/banner.js](../shared/banner.js), [worker/data.js](../worker/data.js), [worker/index.js](../worker/index.js), [worker/files.js](../worker/files.js), [tests/banner.test.js](../tests/banner.test.js), [tests/database.test.js](../tests/database.test.js), [output/banner-identity/unit-domain.txt](../output/banner-identity/unit-domain.txt).

### H086 Integrar tria i signatura a la UI

**10 d’oct. 2026, 14:46 · T21-02.** Added native radio choice with icons, visible focus and checked state, mobile stacking and forced colors. Preview caption, detail, image alt and image-only button label respect identity in all formats. Offline render of actual components verifies both identities, including stale private names.

Evidències: [src/components/BannerComposer.jsx](../src/components/BannerComposer.jsx), [src/components/WoodBoard.jsx](../src/components/WoodBoard.jsx), [src/board.css](../src/board.css), [output/banner-identity/components-verificats.json](../output/banner-identity/components-verificats.json), [output/banner-identity/components-offline.html](../output/banner-identity/components-offline.html).

### H087 Verificar privadesa i regressions

**10 d’oct. 2026, 14:50 · T21-03.** 77 tests and 30 API flows passed on isolated D1/R2, covering named and anonymous text/image/mixed posts, privacy across accounts, filename protection, invalid flags and single billing under concurrency. Types/lint and production build/dry-run passed. Local additive migration preserves all original data in 38 tables; 8 migrations. Offline actual UI components verified; browser restrictions respected.

Evidències: [output/banner-identity/verificacio-local.json](../output/banner-identity/verificacio-local.json), [output/banner-identity/unit.txt](../output/banner-identity/unit.txt), [output/banner-identity/api.txt](../output/banner-identity/api.txt), [output/banner-identity/api-result.json](../output/banner-identity/api-result.json), [output/banner-identity/typecheck.txt](../output/banner-identity/typecheck.txt), [output/banner-identity/build-final.txt](../output/banner-identity/build-final.txt), [output/banner-identity/components-verificats.json](../output/banner-identity/components-verificats.json), [output/banner-identity/migracio-local-verificada.json](../output/banner-identity/migracio-local-verificada.json), [output/banner-identity/regressions-preservades.json](../output/banner-identity/regressions-preservades.json).

### H088 Publicar i lliurar anuncis amb identitat opcional

**10 d’oct. 2026, 14:57 · T21-04.** Published named/anonymous announcements with additive migration 0008 and final version b67122a3-6b23-442f-a1cb-068c09e97f69. Long profile names wrap in the identity hint; final build/dry-run and deployment confirmed. Existing public announcement not replaced. SQL restored with 38 identical tables/eight migrations; pre/post D1/R2 backups each 14 files SHA-verified. Base ZIP reread 1074 files; final archive regenerated with checklist closed. No browser or public website HTTP access attempted.

Evidències: [output/banner-identity/cloud-deploy.txt](../output/banner-identity/cloud-deploy.txt), [output/banner-identity/migracio-publica.txt](../output/banner-identity/migracio-publica.txt), [output/banner-identity/verificacio-local.json](../output/banner-identity/verificacio-local.json), [output/banner-identity/copia-sql-verificada.json](../output/banner-identity/copia-sql-verificada.json), [output/banner-identity/copia-d1-r2-verificada.json](../output/banner-identity/copia-d1-r2-verificada.json), [output/banner-identity/lliurament-base-verificat.json](../output/banner-identity/lliurament-base-verificat.json), [docs/PUBLICACIO.md](../docs/PUBLICACIO.md), [docs/VERIFICATION.md](../docs/VERIFICATION.md), [TRASLLAT.md](../TRASLLAT.md), [scripts/export-project.ps1](../scripts/export-project.ps1), [scripts/verify-local-snapshot.mjs](../scripts/verify-local-snapshot.mjs).

### H089 Diagnosticar i definir la coreografia

**10 d’oct. 2026, 15:04 · T22-01.** Diagnostic, criteris visuals i pla R35 definits; originals preservats i una sola tasca activa.

Evidències: [docs/PLA-PASTISSERIA-COREOGRAFIA.md](../docs/PLA-PASTISSERIA-COREOGRAFIA.md), [output/bakery-choreography/diagnostic.md](../output/bakery-choreography/diagnostic.md).

### H090 Implementar moviments i forn sincronitzats

**10 d’oct. 2026, 15:28 · T22-02.** Personatge SVG articulat, gestos i 14 fases pausades, forn sincronitzat, mateix pastis en mans i vol, visibilitat i lectura accessible integrades.

Evidències: [src/components/BakerScene.jsx](../src/components/BakerScene.jsx), [src/components/BakerPuppet.jsx](../src/components/BakerPuppet.jsx), [src/components/CakeFlight.jsx](../src/components/CakeFlight.jsx), [shared/bakery-sequence.js](../shared/bakery-sequence.js), [src/bakery.css](../src/bakery.css), [src/baker-rig.json](../src/baker-rig.json), [design/baker-rig-v4.json](../design/baker-rig-v4.json), [design/baker-rig-v4-prompt.txt](../design/baker-rig-v4-prompt.txt), [output/bakery-choreography/fotogrames-offline.png](../output/bakery-choreography/fotogrames-offline.png).

### H091 Verificar seqüencia i integracio

**10 d’oct. 2026, 15:38 · T22-03.** 82 unitats i 30 fluxos API aillats correctes; 45 estats i 15 renders offline; corregit marge del peu i boto mobil, tipus/lint/build/dry-run i originals preservats.

Evidències: [output/bakery-choreography/verificacio-local.json](../output/bakery-choreography/verificacio-local.json), [output/bakery-choreography/components-verificats.json](../output/bakery-choreography/components-verificats.json), [output/bakery-choreography/oclusio-peus.json](../output/bakery-choreography/oclusio-peus.json), [output/bakery-choreography/regressions-preservades.json](../output/bakery-choreography/regressions-preservades.json), [output/bakery-choreography/unit.txt](../output/bakery-choreography/unit.txt), [output/bakery-choreography/api-result.json](../output/bakery-choreography/api-result.json), [output/bakery-choreography/typecheck-final.txt](../output/bakery-choreography/typecheck-final.txt), [output/bakery-choreography/build-final.txt](../output/bakery-choreography/build-final.txt), [output/bakery-choreography/fotogrames.json](../output/bakery-choreography/fotogrames.json).

### H092 Publicar i lliurar la coreografia

**10 d’oct. 2026, 15:47 · T22-04.** Publicada versio 10fafa0f-8501-430d-b81c-e1e3a844f275; SQL identic a R34, 38 taules i 8 migracions restaurades; 14 fitxers D1/R2 i paquet base de 1143 fitxers verificats.

Evidències: [docs/PUBLICACIO.md](../docs/PUBLICACIO.md), [docs/VERIFICATION.md](../docs/VERIFICATION.md), [TRASLLAT.md](../TRASLLAT.md), [output/bakery-choreography/cloud-deploy.txt](../output/bakery-choreography/cloud-deploy.txt), [output/bakery-choreography/copia-sql-verificada.json](../output/bakery-choreography/copia-sql-verificada.json), [output/bakery-choreography/copia-d1-r2-verificada.json](../output/bakery-choreography/copia-d1-r2-verificada.json), [output/bakery-choreography/lliurament-base-verificat.json](../output/bakery-choreography/lliurament-base-verificat.json).

### H093 Inspeccionar unions i recorreguts

**10 d’oct. 2026, 15:59 · T23-01.** Inspeccio ampliada: coll duplicat i tapes dels avantbracos visibles sobre els punys; revisio del solapament i les capes.

Evidències: [docs/PLA-PASTISSERIA-UNIONS.md](../docs/PLA-PASTISSERIA-UNIONS.md), [output/bakery-joints/diagnostic.md](../output/bakery-joints/diagnostic.md), [output/bakery-joints/inicial/renders.json](../output/bakery-joints/inicial/renders.json).

### H094 Corregir articulacions i solapaments

**10 d’oct. 2026, 16:07 · T23-02.** Coll centrat amb mascara corba per retirar nomes el coll duplicat; avantbracos inserits sota els punys, peces originals intactes.

Evidències: [src/components/BakerPuppet.jsx](../src/components/BakerPuppet.jsx), [output/bakery-joints/implementacio.md](../output/bakery-joints/implementacio.md).

### H095 Verificar continuitat i regressions

**10 d’oct. 2026, 16:10 · T23-03.** 82 proves correctes; 75 ampliacions i 15 escenes offline; pivots amb nucli opac compartit, coll sense buits en 1464 configuracions; peus ocults i 175 fitxers preservats.

Evidències: [output/bakery-joints/verificacio-local.json](../output/bakery-joints/verificacio-local.json), [output/bakery-joints/unions-verificades.json](../output/bakery-joints/unions-verificades.json), [output/bakery-joints/final/intermedis.png](../output/bakery-joints/final/intermedis.png), [output/bakery-joints/oclusio-peus.json](../output/bakery-joints/oclusio-peus.json).

### H096 Publicar i lliurar unions corregides

**10 d’oct. 2026, 16:17 · T23-04.** Versio 9e1c053b-862c-4b7c-b76a-c23d870061c2 publicada. SQL identic a R35, 38 taules i 8 migracions; 14 fitxers D1/R2 verificats. ZIP base de 1359 fitxers rellegit; documentacio i checklist tancades abans del paquet final.

Evidències: [output/bakery-joints/cloud-deploy.txt](../output/bakery-joints/cloud-deploy.txt), [output/bakery-joints/copia-sql-verificada.json](../output/bakery-joints/copia-sql-verificada.json), [output/bakery-joints/copia-d1-r2-verificada.json](../output/bakery-joints/copia-d1-r2-verificada.json), [output/bakery-joints/lliurament-base-verificat.json](../output/bakery-joints/lliurament-base-verificat.json), [docs/VERIFICATION.md](../docs/VERIFICATION.md), [docs/PLA-PASTISSERIA-UNIONS.md](../docs/PLA-PASTISSERIA-UNIONS.md).

### H097 Definir un ritme mes agil

**10 d’oct. 2026, 16:23 · T24-01.** Objectiu de 16 segons, cocció visible de quatre, intervals amb marge i gest final estable. Diagnostic del reinici de respiracio en caminar.

Evidències: [docs/PLA-PASTISSERIA-RITME.md](../docs/PLA-PASTISSERIA-RITME.md), [output/bakery-pace/diagnostic.md](../output/bakery-pace/diagnostic.md).

### H098 Implementar ritme i entrega estable

**10 d’oct. 2026, 17:03 · T24-02.** Preparacio de 16 segons amb durades compartides, cocció de quatre, entrada de 650 ms; caminada independent i gest final col·locat abans del boto.

Evidències: [shared/bakery-sequence.js](../shared/bakery-sequence.js), [src/bakery.css](../src/bakery.css), [src/components/BakerPuppet.jsx](../src/components/BakerPuppet.jsx), [src/components/BakerScene.jsx](../src/components/BakerScene.jsx), [src/pages/Bakery.jsx](../src/pages/Bakery.jsx), [output/bakery-pace/implementacio.md](../output/bakery-pace/implementacio.md).

### H099 Verificar sincronitzacio i unions

**10 d’oct. 2026, 17:08 · T24-03.** 82 proves i tipus/lint/build correctes. 15 regles CSS i 11 finestres sincronitzades, entrega amb 200 ms de marge, 75 ampliacions, coll sense buits i peus ocults en 5130 configuracions.

Evidències: [output/bakery-pace/verificacio-local.json](../output/bakery-pace/verificacio-local.json), [output/bakery-pace/temporitzacio-verificada.json](../output/bakery-pace/temporitzacio-verificada.json), [output/bakery-pace/unions-verificades.json](../output/bakery-pace/unions-verificades.json), [output/bakery-pace/final/intermedis.png](../output/bakery-pace/final/intermedis.png), [output/bakery-pace/oclusio-peus.json](../output/bakery-pace/oclusio-peus.json).

### H100 Publicar i lliurar el ritme nou

**10 d’oct. 2026, 17:24 · T24-04.** Versio ea4afab1-b26e-44ca-ae33-f40afa54724b publicada amb 16 segons de preparacio i entrega estable. SQL restaurat, 38 taules i 8 migracions; 14 fitxers D1/R2 i ZIP base de 1499 fitxers verificats. Checklist tancada abans del paquet final.

Evidències: [output/bakery-pace/cloud-deploy.txt](../output/bakery-pace/cloud-deploy.txt), [output/bakery-pace/copia-sql-verificada.json](../output/bakery-pace/copia-sql-verificada.json), [output/bakery-pace/copia-d1-r2-verificada.json](../output/bakery-pace/copia-d1-r2-verificada.json), [output/bakery-pace/lliurament-base-verificat.json](../output/bakery-pace/lliurament-base-verificat.json), [docs/VERIFICATION.md](../docs/VERIFICATION.md), [docs/PLA-PASTISSERIA-RITME.md](../docs/PLA-PASTISSERIA-RITME.md).

### H101 Definir flux i proteccio de comptes

**10 d’oct. 2026, 17:32 · T25-01.** Flux Google i proteccio de comptes definits. Acces extern rebutjat per preferencia desada; client real pendent.

Evidències: [docs/PLA-GOOGLE.md](../docs/PLA-GOOGLE.md), [output/google-auth/diagnostic.md](../output/google-auth/diagnostic.md).

### H102 Implementar autenticacio i perfil Google

**10 d’oct. 2026, 17:48 · T25-02.** OAuth amb PKCE i JWT verificat, altes fje.edu, conversio de convidats, perfil amb noms i foto, connexio segura i configurador sense secrets al codi.

Evidències: [worker/google.js](../worker/google.js), [worker/google-token.js](../worker/google-token.js), [worker/google-config.js](../worker/google-config.js), [migrations/0009_google_auth.sql](../migrations/0009_google_auth.sql), [src/components/GoogleSignIn.jsx](../src/components/GoogleSignIn.jsx), [src/forms-general.jsx](../src/forms-general.jsx), [src/google.css](../src/google.css), [scripts/configure-google.mjs](../scripts/configure-google.mjs), [docs/GOOGLE-OAUTH.md](../docs/GOOGLE-OAUTH.md).

### H103 Verificar seguretat i regressions

**10 d’oct. 2026, 17:56 · T25-03.** 115 proves i 33 fluxos API correctes, tipus/lint/build validats, UI comprovada amb SSR. Acces Google real pendent de credencials; recursos originals preservats.

Evidències: [tests/google-auth.test.js](../tests/google-auth.test.js), [tests/google-token.test.js](../tests/google-token.test.js), [tests/google-configure.test.js](../tests/google-configure.test.js), [output/google-auth/verificacio-local.json](../output/google-auth/verificacio-local.json), [output/google-auth/api-result.json](../output/google-auth/api-result.json), [output/google-auth/ui-verificada.json](../output/google-auth/ui-verificada.json), [output/google-auth/recursos-preservats.json](../output/google-auth/recursos-preservats.json).

### H104 Publicar codi i lliurar paquet verificat

**10 d’oct. 2026, 18:06 · T25-04.** R38 publicat, migracio 0009 aplicada, dades locals preservades, copies verificades i paquet base rellegit amb 1580 fitxers. Activacio real de Google pendent del permis desat del navegador.

Evidències: [output/google-auth/cloud-deploy.txt](../output/google-auth/cloud-deploy.txt), [output/google-auth/publicacio-verificada.json](../output/google-auth/publicacio-verificada.json), [output/google-auth/dades-preservades.json](../output/google-auth/dades-preservades.json), [output/google-auth/copia-sql-verificada.json](../output/google-auth/copia-sql-verificada.json), [output/google-auth/copia-d1-r2-verificada.json](../output/google-auth/copia-d1-r2-verificada.json), [output/google-auth/copia-cloud-verificada.json](../output/google-auth/copia-cloud-verificada.json), [output/google-auth/lliurament-base-verificat.json](../output/google-auth/lliurament-base-verificat.json), [output/google-auth/activacio.json](../output/google-auth/activacio.json), [docs/GOOGLE-OAUTH.md](../docs/GOOGLE-OAUTH.md).

### H105 Aplicar visibilitat fixa i minim inicial

**10 d’oct. 2026, 18:14 · T26-01.** Cartell sempre renderitzat, controls de visibilitat retirats i preferencia antiga normalitzada sense perdre la resta. Minima oferta inicial 1 al domini i trigger D1 nou; formulari amb singular i ofertes rapides 1, 2, 5 i 10.

Evidències: [src/components/WoodBoard.jsx](../src/components/WoodBoard.jsx), [src/forms-general.jsx](../src/forms-general.jsx), [shared/preferences.js](../shared/preferences.js), [shared/domain.js](../shared/domain.js), [migrations/0010_banner_minimum.sql](../migrations/0010_banner_minimum.sql), [src/components/BannerComposer.jsx](../src/components/BannerComposer.jsx), [docs/PLA-CARTELL-FIX.md](../docs/PLA-CARTELL-FIX.md).

### H106 Verificar ofertes, compatibilitat i regressions

**10 d’oct. 2026, 18:19 · T26-02.** 118 proves, 35 fluxos API, tipus/lint/build i 9 casos SSR correctes. Ofertes de 0 i decimals rebutjades sense cobrament, primera oferta 1 i concurrencia amb un sol debit. 177 fitxers de codi, art, animacio i autenticacio identics al paquet anterior.

Evidències: [output/banner-policy/verificacio-local.json](../output/banner-policy/verificacio-local.json), [output/banner-policy/api-result.json](../output/banner-policy/api-result.json), [output/banner-policy/ui-verificada.json](../output/banner-policy/ui-verificada.json), [output/banner-policy/recursos-preservats.json](../output/banner-policy/recursos-preservats.json).

### H107 Publicar i lliurar copia verificada

**10 d’oct. 2026, 18:24 · T26-03.** Publicada la versio 67cfe45e-4db1-4af7-ab94-76e55b071877 amb migracio 0010, 3 recursos actualitzats i inici en 2 ms. Dades locals preservades; SQL i D1/R2 verificats, copia publica privada restaurada. Paquet base de 1644 fitxers rellegit amb SHA-256 correctes. Google real segueix pendent.

Evidències: [output/banner-policy/cloud-deploy.txt](../output/banner-policy/cloud-deploy.txt), [output/banner-policy/publicacio-verificada.json](../output/banner-policy/publicacio-verificada.json), [output/banner-policy/dades-preservades.json](../output/banner-policy/dades-preservades.json), [output/banner-policy/copia-sql-verificada.json](../output/banner-policy/copia-sql-verificada.json), [output/banner-policy/copia-d1-r2-verificada.json](../output/banner-policy/copia-d1-r2-verificada.json), [output/banner-policy/copia-cloud-verificada.json](../output/banner-policy/copia-cloud-verificada.json), [output/banner-policy/lliurament-base-verificat.json](../output/banner-policy/lliurament-base-verificat.json).

### H108 Implementar estructura i migracio conservadora

**10 d’oct. 2026, 18:34 · T27-01.** Model amb tres examens i nou caselles opcionals. Migracio conserva IDs, qualificacions, zeros i dates; fulls amb notes o personalitzacions conserven pesos. API personal i delegat rebutgen participacio, alta de convidats i curs copien els tipus. Restauracio preserva notes addicionals sense atribuir-les al trimestral. Sis proves inicials correctes.

Evidències: [shared/assessments.js](../shared/assessments.js), [worker/assessment-input.js](../worker/assessment-input.js), [migrations/0011_assessment_model.sql](../migrations/0011_assessment_model.sql), [worker/grades.js](../worker/grades.js), [worker/admin.js](../worker/admin.js), [worker/auth.js](../worker/auth.js), [worker/data.js](../worker/data.js), [scripts/seed.mjs](../scripts/seed.mjs), [tests/assessments.test.js](../tests/assessments.test.js).

### H109 Integrar resum i configuracio coherent

**10 d’oct. 2026, 18:45 · T27-02.** Resum amb Parcial 1, Parcial 2 i Trimestral, activitats agregades quan es fan servir i grups opcionals plegats amb tres caselles. Editor compartit per estudiants i delegats, pesos totals visibles, repartiment sense activar caselles buides i mode discret preservat. Conversio segura amb notes nomes als parcials. Set casos SSR correctes.

Evidències: [src/pages/Grades.jsx](../src/pages/Grades.jsx), [src/components/AssessmentEditor.jsx](../src/components/AssessmentEditor.jsx), [src/forms-resources.jsx](../src/forms-resources.jsx), [src/forms-admin.jsx](../src/forms-admin.jsx), [src/assessments.css](../src/assessments.css), [src/pages/Admin.jsx](../src/pages/Admin.jsx), [output/assessment-model/ui-verificada.json](../output/assessment-model/ui-verificada.json), [docs/PLA-AVALUACIO.md](../docs/PLA-AVALUACIO.md).

### H110 Verificar calculs, dades i regressions

**10 d’oct. 2026, 18:48 · T27-03.** 125 proves, 38 fluxos API, tipus/lint/build i 7 casos SSR correctes. Migracio preserva notes, zeros, dates i IDs; proves de fulls personalitzats i assignatures antigues. API comprova pesos, tipus, permisos i recuperacio sense perdre activitats personals. 179 fitxers de codi, art, cartell i animacio preservats.

Evidències: [output/assessment-model/verificacio-local.json](../output/assessment-model/verificacio-local.json), [output/assessment-model/api-result.json](../output/assessment-model/api-result.json), [output/assessment-model/ui-verificada.json](../output/assessment-model/ui-verificada.json), [output/assessment-model/recursos-preservats.json](../output/assessment-model/recursos-preservats.json), [tests/assessments.test.js](../tests/assessments.test.js).

### H111 Publicar i lliurar paquet verificat

**10 d’oct. 2026, 18:59 · T27-04.** Publicada la versio 922c7771-999f-4efc-90a6-8ab3162afa0b amb migracio 0011. Preservades 876 files locals i 1152 files publiques de notes, qualificacions i pesos. Copies SQL i 14 fitxers D1/R2 verificats. Paquet base de 1718 fitxers amb SHA-256 verificat; 125 proves unitaries i 38 fluxos API correctes.

Evidències: [output/assessment-model/cloud-deploy.txt](../output/assessment-model/cloud-deploy.txt), [output/assessment-model/publicacio-verificada.json](../output/assessment-model/publicacio-verificada.json), [output/assessment-model/dades-local-preservades.json](../output/assessment-model/dades-local-preservades.json), [output/assessment-model/dades-cloud-preservades.json](../output/assessment-model/dades-cloud-preservades.json), [output/assessment-model/copia-sql-verificada.json](../output/assessment-model/copia-sql-verificada.json), [output/assessment-model/copia-d1-r2-verificada.json](../output/assessment-model/copia-d1-r2-verificada.json), [output/assessment-model/copia-cloud-before.json](../output/assessment-model/copia-cloud-before.json), [output/assessment-model/copia-cloud-after.json](../output/assessment-model/copia-cloud-after.json), [output/assessment-model/lliurament-base-verificat.json](../output/assessment-model/lliurament-base-verificat.json).

### H112 Definir composicio i criteris de la benvinguda

**10 d’oct. 2026, 19:07 · T28-01.** Definida una nova benvinguda amb marca original, art 3D transparent, formulari prioritari i opcions ordenades. Fixats criteris per a mobil, focus, errors, contrasenya i concurrencia; limits de navegador i Google documentats.

Evidències: [docs/PLA-BENVINGUDA.md](../docs/PLA-BENVINGUDA.md), [design/welcome-study-v1-prompt.txt](../design/welcome-study-v1-prompt.txt).

### H113 Reconstruir pantalla i fluxos de formulari

**10 d’oct. 2026, 19:18 · T28-02.** Reconstruida la benvinguda amb composicio clara, formulari compacte i art 3D transparent optimitzat. Retirades 42 regles CSS antigues; estats de carrega i connexio integrats, inputs accessibles, contrasenya visible i opcions separades. Controlador de sessio exclou accions concurrents; Google informa del seu estat real. Backend sense canvis.

Evidències: [src/Auth.jsx](../src/Auth.jsx), [src/auth-session.js](../src/auth-session.js), [src/welcome.css](../src/welcome.css), [src/App.jsx](../src/App.jsx), [src/main.jsx](../src/main.jsx), [src/components/GoogleSignIn.jsx](../src/components/GoogleSignIn.jsx), [src/styles.css](../src/styles.css), [src/fidelity.css](../src/fidelity.css), [public/images/welcome-study-v1.webp](../public/images/welcome-study-v1.webp), [output/welcome-redesign/art-verificat.json](../output/welcome-redesign/art-verificat.json), [output/welcome-redesign/css-retirat.json](../output/welcome-redesign/css-retirat.json).

### H114 Verificar accions, estats i regressions

**10 d’oct. 2026, 19:28 · T28-03.** 131 proves unitaries, 38 fluxos API amb D1/R2 aillats i 15 casos UI offline correctes. Tipus, lint i compilacio dry-run correctes. Textos, focus i contorns comprovats matematicament; 1739 regles CSS alienes i fonts de backend preservades. SSR no acredita layout, responsive o focus reals al navegador.

Evidències: [output/welcome-redesign/verificacio-local.json](../output/welcome-redesign/verificacio-local.json), [output/welcome-redesign/ui-verificada.json](../output/welcome-redesign/ui-verificada.json), [output/welcome-redesign/estils-verificats.json](../output/welcome-redesign/estils-verificats.json), [output/welcome-redesign/art-verificat.json](../output/welcome-redesign/art-verificat.json), [output/welcome-redesign/recursos-preservats.json](../output/welcome-redesign/recursos-preservats.json), [output/welcome-redesign/api-result.json](../output/welcome-redesign/api-result.json), [tests/auth-session.test.js](../tests/auth-session.test.js).

### H115 Publicar i lliurar la benvinguda

**10 d’oct. 2026, 19:40 · T28-04.** Publicada la benvinguda R41, versio d8c507fe-e478-4b6f-9785-6574e5a20c12, amb avisos Google dins del formulari i objectiu del salt de teclat enfocable. 131 proves, 38 fluxos API i 16 casos UI offline correctes. Fonts publicades, copia SQL de 39 taules i 14 fitxers D1/R2 verificats. Paquet base de 1774 fitxers rellegit amb SHA-256. Sense migracio ni escriptures de dades publiques; navegador i Google extern amb limits documentats.

Evidències: [output/welcome-redesign/cloud-deploy.txt](../output/welcome-redesign/cloud-deploy.txt), [output/welcome-redesign/publicacio-verificada.json](../output/welcome-redesign/publicacio-verificada.json), [output/welcome-redesign/verificacio-local.json](../output/welcome-redesign/verificacio-local.json), [output/welcome-redesign/ui-verificada.json](../output/welcome-redesign/ui-verificada.json), [output/welcome-redesign/copia-sql-verificada.json](../output/welcome-redesign/copia-sql-verificada.json), [output/welcome-redesign/copia-d1-r2-verificada.json](../output/welcome-redesign/copia-d1-r2-verificada.json), [output/welcome-redesign/lliurament-base-verificat.json](../output/welcome-redesign/lliurament-base-verificat.json).

### H116 Definir simplificacio i criteris visuals

**10 d’oct. 2026, 19:48 · T29-01.** Disseny simple seleccionat: postura integrada fixa, taulell net i cocció visible abans de recollir. Seqüència de 7,2 segons i límits de comprovació explícits.

Evidències: [docs/PLA-PASTISSERIA-SIMPLE.md](../docs/PLA-PASTISSERIA-SIMPLE.md), [design/bakery-simple-v1-prompt.txt](../design/bakery-simple-v1-prompt.txt).

### H117 Simplificar escena i seqüència

**10 d’oct. 2026, 19:51 · T29-02.** Pastissera integrada sense articulacions ni salutació; taulell net, cocció de quatre segons i recollida al final dels 7,2 segons. CSS antic retirat; premi i pausa conservats.

Evidències: [src/components/BakerPuppet.jsx](../src/components/BakerPuppet.jsx), [src/components/BakerScene.jsx](../src/components/BakerScene.jsx), [src/bakery.css](../src/bakery.css), [shared/bakery-sequence.js](../shared/bakery-sequence.js), [public/images/bakery-simple-v1.webp](../public/images/bakery-simple-v1.webp), [output/bakery-simple/art-verificat.json](../output/bakery-simple/art-verificat.json), [output/bakery-simple/css-eliminat.json](../output/bakery-simple/css-eliminat.json).

### H118 Verificar fotogrames i comportament

**10 d’oct. 2026, 19:56 · T29-03.** 133 proves, 38 fluxos API, 18 casos SSR i 8 fotogrames correctes. Cos estable, taula neta, cocció i premi verificats; 194 fitxers preservats. Tipus, lint i build correctes.

Evidències: [output/bakery-simple/verificacio-local.json](../output/bakery-simple/verificacio-local.json), [output/bakery-simple/ui-verificada.json](../output/bakery-simple/ui-verificada.json), [output/bakery-simple/fotogrames.json](../output/bakery-simple/fotogrames.json), [output/bakery-simple/fotogrames-offline.png](../output/bakery-simple/fotogrames-offline.png), [output/bakery-simple/estils-verificats.json](../output/bakery-simple/estils-verificats.json), [output/bakery-simple/recursos-preservats.json](../output/bakery-simple/recursos-preservats.json), [output/bakery-simple/api-result.json](../output/bakery-simple/api-result.json), [tests/bakery-sequence.test.js](../tests/bakery-sequence.test.js).

### H119 Publicar i lliurar paquet verificat

**10 d’oct. 2026, 19:59 · T29-04.** Publicació 08140c27 confirmada; fonts i imatges verificades. SQL amb 39 taules intactes, 14 fitxers D1/R2 comprovats i paquet base amb 1835 fitxers verificats. Sense migració ni canvis de dades.

Evidències: [output/bakery-simple/cloud-deploy.txt](../output/bakery-simple/cloud-deploy.txt), [output/bakery-simple/publicacio-verificada.json](../output/bakery-simple/publicacio-verificada.json), [output/bakery-simple/copia-sql-verificada.json](../output/bakery-simple/copia-sql-verificada.json), [output/bakery-simple/copia-d1-r2-verificada.json](../output/bakery-simple/copia-d1-r2-verificada.json), [output/bakery-simple/lliurament-base-verificat.json](../output/bakery-simple/lliurament-base-verificat.json).

### H120 Configurar la destinacio independent i validar Google

**11 d’oct. 2026, 10:42 · T30-01.** Destinacio lanet i compte fixats; callback real validat abans de secrets. 36 proves Google, lint, build i dry-run correctes.

Evidències: [docs/PLA-CLOUDFLARE-LANET.md](../docs/PLA-CLOUDFLARE-LANET.md), [output/cloudflare-lanet/inventari.json](../output/cloudflare-lanet/inventari.json), [output/cloudflare-lanet/comprovacions.json](../output/cloudflare-lanet/comprovacions.json), [output/cloudflare-lanet/google-configure-tests.txt](../output/cloudflare-lanet/google-configure-tests.txt), [wrangler.jsonc](../wrangler.jsonc), [scripts/configure-google.mjs](../scripts/configure-google.mjs), [tests/google-configure.test.js](../tests/google-configure.test.js).

### H121 Crear i verificar la nova aplicacio Cloudflare

**11 d’oct. 2026, 10:49 · T30-02.** Nova aplicacio lanet creada i verificada al compte actual; dades D1/R2 conservades, secret inicial configurat i versio anterior intacta. Google pendent de la seva activacio.

Evidències: [docs/PUBLICACIO.md](../docs/PUBLICACIO.md), [docs/VERIFICATION.md](../docs/VERIFICATION.md), [output/cloudflare-lanet/cloud-deploy.txt](../output/cloudflare-lanet/cloud-deploy.txt), [output/cloudflare-lanet/publicacio-verificada.json](../output/cloudflare-lanet/publicacio-verificada.json), [output/cloudflare-lanet/build-manifest.json](../output/cloudflare-lanet/build-manifest.json), [output/cloudflare-lanet/secret-setup.json](../output/cloudflare-lanet/secret-setup.json).

### H122 Crear client OAuth i activar Google real

**11 d’oct. 2026, 11:13 · T25-05.** Google real configurat a lanet, retorn educatiu i perfil importat comprovats; incompatibilitat workerd corregida; 139 proves, tipus i lint correctes.

Evidències: [output/google-auth/entrada-real-verificada.json](../output/google-auth/entrada-real-verificada.json), [output/google-auth/perfil-google-verificat.jpg](../output/google-auth/perfil-google-verificat.jpg), [output/google-auth/activacio.json](../output/google-auth/activacio.json), [output/google-auth/activacio-deploy.txt](../output/google-auth/activacio-deploy.txt), [output/google-auth/activacio-unit.txt](../output/google-auth/activacio-unit.txt), [output/google-auth/activacio-typecheck.txt](../output/google-auth/activacio-typecheck.txt), [tests/google-runtime.test.js](../tests/google-runtime.test.js), [docs/GOOGLE-OAUTH.md](../docs/GOOGLE-OAUTH.md).

### H123 Retallar i integrar l’interior transparent

**11 d’oct. 2026, 11:16 · T31-01.** Interior amb alfa real i WebP sense perdua; contenidors transparents; art original, coordenades i mecanica preservats.

Evidències: [output/bakery-transparent/art-verificat.json](../output/bakery-transparent/art-verificat.json), [design/bakery-interior-transparent-v1-prompt.txt](../design/bakery-interior-transparent-v1-prompt.txt), [public/images/bakery-interior-transparent-v1.webp](../public/images/bakery-interior-transparent-v1.webp), [src/bakery.css](../src/bakery.css), [src/revision.css](../src/revision.css), [docs/PLA-PASTISSERIA-TRANSPARENT.md](../docs/PLA-PASTISSERIA-TRANSPARENT.md).

### H124 Verificar, publicar i lliurar l’interior transparent

**11 d’oct. 2026, 11:27 · T31-02.** Interior transparent publicat i revisat en mobil i escriptori; Google real actiu; sequencia, art, build, copies i paquet base verificats; dades personals preservades.

Evidències: [output/bakery-transparent/verificacio-final.json](../output/bakery-transparent/verificacio-final.json), [output/bakery-transparent/navegador-verificat.json](../output/bakery-transparent/navegador-verificat.json), [output/bakery-transparent/interior-mobil.jpg](../output/bakery-transparent/interior-mobil.jpg), [output/bakery-transparent/interior-escriptori.jpg](../output/bakery-transparent/interior-escriptori.jpg), [output/bakery-transparent/publicacio-verificada.json](../output/bakery-transparent/publicacio-verificada.json), [output/bakery-transparent/cloud-deploy.txt](../output/bakery-transparent/cloud-deploy.txt), [output/bakery-transparent/copia-sql-verificada.json](../output/bakery-transparent/copia-sql-verificada.json), [output/bakery-transparent/copia-d1-r2-verificada.json](../output/bakery-transparent/copia-d1-r2-verificada.json), [output/bakery-transparent/lliurament-base-verificat.json](../output/bakery-transparent/lliurament-base-verificat.json), [docs/VERIFICATION.md](../docs/VERIFICATION.md).

### H125 Auditar accessos, planificar i preservar les dades

**11 d’oct. 2026, 11:39 · T32-01.** Auditoria de vies antigues, pla sequencial i copia local D1/R2; rols i dades preservats.

Evidències: [docs/PLA-GOOGLE-UNIC.md](../docs/PLA-GOOGLE-UNIC.md), [output/google-only/auditoria.json](../output/google-only/auditoria.json), [backups/state-v3-2026-10-11T09-38-22-910Z/manifest.json](../backups/state-v3-2026-10-11T09-38-22-910Z/manifest.json).

### H126 Aplicar Google únic al servidor i sincronitzar la identitat

**11 d’oct. 2026, 11:43 · T32-02.** Google unic al servidor, sessions amb proveidor, identitat protegida i migracio conservadora; 23 proves de backend superades.

Evidències: [worker/auth.js](../worker/auth.js), [worker/google.js](../worker/google.js), [migrations/0012_google_only_sessions.sql](../migrations/0012_google_only_sessions.sql), [tests/auth-policy.test.js](../tests/auth-policy.test.js), [output/google-only/backend-tests.txt](../output/google-only/backend-tests.txt).

### H127 Simplificar entrada, perfil i administració

**11 d’oct. 2026, 11:47 · T32-03.** Entrada amb una sola accio Google, identitat informativa i preferencies editables; administracio coherent; 6 proves de controlador i 7 comprovacions UI SSR.

Evidències: [src/Auth.jsx](../src/Auth.jsx), [src/forms-general.jsx](../src/forms-general.jsx), [src/components/GoogleSignIn.jsx](../src/components/GoogleSignIn.jsx), [src/auth-session.js](../src/auth-session.js), [output/google-only/login-controller-tests.txt](../output/google-only/login-controller-tests.txt), [output/google-only/ui-preflight.json](../output/google-only/ui-preflight.json).

### H128 Verificar, migrar, publicar i lliurar

**11 d’oct. 2026, 12:20 · T32-04.** Google com a unic acces publicat, identitat protegida i dades conservades. 150 proves, 38 fluxos API, 7 comprovacions UI, tipus, lint i build correctes. Entrada Google real en mobil/escriptori; 58 recursos publics identics. API antiga retirada sense bindings. Copies i paquet base rellegits amb hashes correctes; historial i checklist tancats.

Evidències: [docs/VERIFICATION.md](../docs/VERIFICATION.md), [docs/PUBLICACIO.md](../docs/PUBLICACIO.md), [output/google-only/verificacio-final.json](../output/google-only/verificacio-final.json), [output/google-only/publicacio-verificada.json](../output/google-only/publicacio-verificada.json), [output/google-only/unit.txt](../output/google-only/unit.txt), [output/google-only/api-result.json](../output/google-only/api-result.json), [output/google-only/typecheck.txt](../output/google-only/typecheck.txt), [output/google-only/ui-preflight.json](../output/google-only/ui-preflight.json), [output/google-only/navegador-verificat.json](../output/google-only/navegador-verificat.json), [output/google-only/perfil-mobil.jpg](../output/google-only/perfil-mobil.jpg), [output/google-only/perfil-escriptori.jpg](../output/google-only/perfil-escriptori.jpg), [output/google-only/public-smoke.json](../output/google-only/public-smoke.json), [output/google-only/migracio-local-verificada.json](../output/google-only/migracio-local-verificada.json), [output/google-only/migracio-remota-verificada.json](../output/google-only/migracio-remota-verificada.json), [output/google-only/copia-sql-verificada.json](../output/google-only/copia-sql-verificada.json), [output/google-only/copia-d1-r2-verificada.json](../output/google-only/copia-d1-r2-verificada.json), [output/google-only/lliurament-base-verificat.json](../output/google-only/lliurament-base-verificat.json).

### H129 Auditar marca, adreces i permisos

**11 d’oct. 2026, 12:25 · T33-01.** Origen de les dues marques identificat. Pla per Pages i projecte Google propi; aplicacions compartides i dades preservades. Denegacio de Google Cloud documentada sense evitar el bloqueig.

Evidències: [docs/PLA-MARCA-LANET.md](../docs/PLA-MARCA-LANET.md), [output/brand-lanet/auditoria.json](../output/brand-lanet/auditoria.json).

### H130 Preparar i publicar una adreça pròpia a Pages

**11 d’oct. 2026, 12:49 · T33-02.** Projecte lanet a Pages creat i publicat amb adreca propia, mateix D1/R2 i backend. 58 recursos identics, cap bundle servidor public i cap via alternativa de login. Configuracio principal traslladada a Pages; compte fixat i configuracio anterior arxivada.

Evidències: [docs/PLA-MARCA-LANET.md](../docs/PLA-MARCA-LANET.md), [cloudflare-target.json](../cloudflare-target.json), [wrangler.jsonc](../wrangler.jsonc), [wrangler.worker-archive.jsonc](../wrangler.worker-archive.jsonc), [output/brand-lanet/project-pages-create.txt](../output/brand-lanet/project-pages-create.txt), [output/brand-lanet/stage-deploy.txt](../output/brand-lanet/stage-deploy.txt), [output/brand-lanet/stage-smoke.json](../output/brand-lanet/stage-smoke.json), [output/brand-lanet/configure-tests.txt](../output/brand-lanet/configure-tests.txt).

### H131 Connectar Google existent a l’adreça pròpia

**11 d’oct. 2026, 12:57 · T33-03.** Client Google existent connectat a lanet.pages.dev amb callback confirmat. Entrada real completada; nom complet i foto Google carregats, identitat no editable i sense desbordament en escriptori i mòbil. Marca Impossible Goals conservada per la darrera indicació de Marc; cap canvi a Google Cloud ni preferències desades.

Evidències: [output/brand-lanet/google-configured.txt](../output/brand-lanet/google-configured.txt), [output/brand-lanet/production-deploy.txt](../output/brand-lanet/production-deploy.txt), [output/brand-lanet/public-smoke.json](../output/brand-lanet/public-smoke.json), [output/brand-lanet/navegador-verificat.json](../output/brand-lanet/navegador-verificat.json), [output/brand-lanet/perfil-escriptori.png](../output/brand-lanet/perfil-escriptori.png), [output/brand-lanet/perfil-mobil.png](../output/brand-lanet/perfil-mobil.png).

### H132 Canviar adreces anteriors i lliurar la revisió

**11 d’oct. 2026, 13:09 · T33-04.** La Net publicada a lanet.pages.dev amb Google real comprovat i marca existent conservada per indicació de Marc. Els dos Workers antics només redirigeixen: API 410, sense D1/R2/Assets i versions actives al 100%. 156 unitats, 38 fluxos API, tipus/lint i 58 recursos públics correctes. Preservats 186 fitxers de producte/art/migracions i 30 fitxers d’estat local. Documents actualitzats i R45 arxivat. Paquet base rellegit amb 2.017 fitxers i SHA-256 correctes; exportació final incorpora aquest tancament i totes les evidències, sense secrets.

Evidències: [docs/PLA-MARCA-LANET.md](../docs/PLA-MARCA-LANET.md), [docs/VERIFICATION.md](../docs/VERIFICATION.md), [docs/PUBLICACIO.md](../docs/PUBLICACIO.md), [output/brand-lanet/verificacio-final.json](../output/brand-lanet/verificacio-final.json), [output/brand-lanet/publicacio-verificada.json](../output/brand-lanet/publicacio-verificada.json), [output/brand-lanet/pages-deployments.json](../output/brand-lanet/pages-deployments.json), [output/brand-lanet/redirect-smoke.json](../output/brand-lanet/redirect-smoke.json), [output/brand-lanet/recursos-preservats.json](../output/brand-lanet/recursos-preservats.json), [output/brand-lanet/unit.txt](../output/brand-lanet/unit.txt), [output/brand-lanet/api-result.json](../output/brand-lanet/api-result.json), [output/brand-lanet/typecheck.txt](../output/brand-lanet/typecheck.txt), [output/brand-lanet/public-smoke.json](../output/brand-lanet/public-smoke.json), [output/brand-lanet/redirect-lanet-version.json](../output/brand-lanet/redirect-lanet-version.json), [output/brand-lanet/redirect-la-net-version.json](../output/brand-lanet/redirect-la-net-version.json), [output/brand-lanet/redirect-lanet-active.json](../output/brand-lanet/redirect-lanet-active.json), [output/brand-lanet/redirect-la-net-active.json](../output/brand-lanet/redirect-la-net-active.json), [output/brand-lanet/lliurament-base-verificat.json](../output/brand-lanet/lliurament-base-verificat.json), [output/brand-lanet/lanet-publicada.png](../output/brand-lanet/lanet-publicada.png).

### H133 Implementar i provar la benvinguda única

**11 d’oct. 2026, 13:15 · T34-01.** 5 pastissos amb una unica entrada al ledger per compte Google. Noves altes i primera vinculacio atomiques; reentrada i saldo gastat sense duplicats, benvingudes anteriors preservades. 159 unitats, 39 fluxos API, tipus i lint correctes.

Evidències: [migrations/0013_welcome_cakes.sql](../migrations/0013_welcome_cakes.sql), [tests/welcome-cakes.test.js](../tests/welcome-cakes.test.js), [output/welcome-cakes/unit.txt](../output/welcome-cakes/unit.txt), [output/welcome-cakes/api-result.json](../output/welcome-cakes/api-result.json), [output/welcome-cakes/typecheck.txt](../output/welcome-cakes/typecheck.txt), [output/welcome-cakes/final-lint.txt](../output/welcome-cakes/final-lint.txt).

### H134 Aplicar, verificar i lliurar la benvinguda

**11 d’oct. 2026, 13:22 · T34-02.** Benvinguda de 5 publicada una sola vegada per persona. Migració local i remota amb còpia prèvia: només un compte Google existent rep +5; historial i 36 altres taules preservats. Registre i vinculació atòmics, cap duplicat després de gastar o reentrar. Pages e2438c5a-d94b-4483-8697-fb46f80573ec, moneder públic +5 verificat, 58 recursos intactes. 159 unitats, 39 fluxos API i tipus/lint correctes. Còpies D1/R2 de 14 fitxers abans/després, documents actualitzats i paquet base amb 2075 fitxers rellegits. Paquet final amb aquest tancament, sense secrets ni SQL remot.

Evidències: [docs/PLA-PASTISSOS-BENVINGUDA.md](../docs/PLA-PASTISSOS-BENVINGUDA.md), [docs/VERIFICATION.md](../docs/VERIFICATION.md), [scripts/verify-welcome-migration.mjs](../scripts/verify-welcome-migration.mjs), [output/welcome-cakes/local-migration.json](../output/welcome-cakes/local-migration.json), [output/welcome-cakes/remote-migration.json](../output/welcome-cakes/remote-migration.json), [output/welcome-cakes/publicacio-verificada.json](../output/welcome-cakes/publicacio-verificada.json), [output/welcome-cakes/public-smoke.json](../output/welcome-cakes/public-smoke.json), [output/welcome-cakes/navegador-verificat.json](../output/welcome-cakes/navegador-verificat.json), [output/welcome-cakes/moneder-publicat.png](../output/welcome-cakes/moneder-publicat.png), [output/welcome-cakes/local-backup.txt](../output/welcome-cakes/local-backup.txt), [output/welcome-cakes/local-after-backup.txt](../output/welcome-cakes/local-after-backup.txt), [output/welcome-cakes/final-syntax.txt](../output/welcome-cakes/final-syntax.txt), [output/welcome-cakes/final-lint.txt](../output/welcome-cakes/final-lint.txt), [output/welcome-cakes/lliurament-base-verificat.json](../output/welcome-cakes/lliurament-base-verificat.json), [backups/lanet-before-welcome-2026-10-11.sql](../backups/lanet-before-welcome-2026-10-11.sql), [backups/lanet-after-welcome-2026-10-11.sql](../backups/lanet-after-welcome-2026-10-11.sql).

### H135 Preparar i provar les mostres i el reinici segur

**11 d’oct. 2026, 13:29 · T35-01.** Contingut beta repetible i reinici amb arxiu preservant pagaments i anonimat. 161 proves i tipus/lint correctes.

Evidències: [scripts/beta-content.mjs](../scripts/beta-content.mjs), [migrations/0014_banner_archive.sql](../migrations/0014_banner_archive.sql), [tests/beta-content.test.js](../tests/beta-content.test.js), [output/beta-ready/unit.txt](../output/beta-ready/unit.txt), [output/beta-ready/typecheck.txt](../output/beta-ready/typecheck.txt).

### H136 Aplicar i verificar la beta pública

**11 d’oct. 2026, 13:36 · T35-02.** Beta publicada a lanet.pages.dev (54ac3b71): 8 exàmens, 8 deures, 8 apunts gratuïts, 6 plusos, 3 propostes i un avís ficticis. 2 anuncis arxivats i mínim 1 verificat al navegador, saldo 6 conservat. Comparació de 39 taules amb dades personals intactes. Agenda i exploració accessibles abans de configurar el curs; preferències explícites respectades. 161 unitats, 39 fluxos API, tipus/lint i smoke públic correctes. Còpies locals/remotes abans/després; exportació final amb seguiment tancat.

Evidències: [docs/PLA-BETA.md](../docs/PLA-BETA.md), [docs/VERIFICATION.md](../docs/VERIFICATION.md), [docs/PUBLICACIO.md](../docs/PUBLICACIO.md), [output/beta-ready/unit.txt](../output/beta-ready/unit.txt), [output/beta-ready/api.txt](../output/beta-ready/api.txt), [output/beta-ready/final-typecheck.txt](../output/beta-ready/final-typecheck.txt), [output/beta-ready/final-beta-tests.txt](../output/beta-ready/final-beta-tests.txt), [output/beta-ready/final-lint.txt](../output/beta-ready/final-lint.txt), [output/beta-ready/local-data.json](../output/beta-ready/local-data.json), [output/beta-ready/remote-data.json](../output/beta-ready/remote-data.json), [output/beta-ready/public-smoke.json](../output/beta-ready/public-smoke.json), [output/beta-ready/publicacio-verificada.json](../output/beta-ready/publicacio-verificada.json), [output/beta-ready/navegador-verificat.json](../output/beta-ready/navegador-verificat.json), [output/beta-ready/agenda-publicada.png](../output/beta-ready/agenda-publicada.png), [output/beta-ready/apunts-publicats.png](../output/beta-ready/apunts-publicats.png), [output/beta-ready/plusos-publicats.png](../output/beta-ready/plusos-publicats.png), [output/beta-ready/cartell-reiniciat.png](../output/beta-ready/cartell-reiniciat.png), [backups/lanet-before-beta-2026-10-11.sql](../backups/lanet-before-beta-2026-10-11.sql), [backups/lanet-after-beta-2026-10-11.sql](../backups/lanet-after-beta-2026-10-11.sql).

### H137 Ajustar, comprovar i publicar els anuncis 16:9

**11 d’oct. 2026, 13:49 · T36-01.** Anuncis 16:9 publicats: retallador, PNG 1600×900, cartell compacte amb marc de fusta, previsualització i mòbil coherents. 9 proves, lint, build i 58 recursos verificats. Mesures reals 112×63 i 80×45, sense desbordament mòbil. Imatge de prova només local al retallador; esborrany cancel·lat i dades intactes.

Evidències: [shared/banner.js](../shared/banner.js), [src/banner-image.js](../src/banner-image.js), [src/board.css](../src/board.css), [tests/banner.test.js](../tests/banner.test.js), [output/board-169/tests.txt](../output/board-169/tests.txt), [output/board-169/lint.txt](../output/board-169/lint.txt), [output/board-169/deploy.txt](../output/board-169/deploy.txt), [output/board-169/public-smoke.json](../output/board-169/public-smoke.json), [output/board-169/navegador.json](../output/board-169/navegador.json), [output/board-169/escriptori.png](../output/board-169/escriptori.png), [output/board-169/mobil.png](../output/board-169/mobil.png), [output/board-169/retallador.png](../output/board-169/retallador.png), [docs/VERIFICATION.md](../docs/VERIFICATION.md).

### H138 Crear, revisar i publicar el logo quadrat compartit

**11 d’oct. 2026, 13:51 · T37-01.** Logo LN 1:1 creat en SVG i compartit entre barra plegada i favicon. Mida real 44×44, carregat al navegador, enllaç accessible i focus visible. Lint, build i publicació amb 59 recursos verificats. Pages 0e87e892; dades i preferències intactes.

Evidències: [public/lanet-mark.svg](../public/lanet-mark.svg), [index.html](../index.html), [src/App.jsx](../src/App.jsx), [src/revision.css](../src/revision.css), [output/logo-square/lint.txt](../output/logo-square/lint.txt), [output/logo-square/deploy.txt](../output/logo-square/deploy.txt), [output/logo-square/public-smoke.json](../output/logo-square/public-smoke.json), [output/logo-square/navegador.json](../output/logo-square/navegador.json), [output/logo-square/logo-publicat.png](../output/logo-square/logo-publicat.png), [docs/VERIFICATION.md](../docs/VERIFICATION.md).

### H139 Preparar música, llicències i reproducció per estils

**11 d’oct. 2026, 13:57 · T38-01.** 12 peces completes CC BY afegides: 42,5 minuts i sis estils nous. 17 peces totals, 7 estils, filtres i seqüència automàtica amb volum conservat, cancel·lació i errors provats. Crèdits visibles i fonts oficials. 165 proves, 39 fluxos API i tipus/lint correctes.

Evidències: [shared/music-catalog.js](../shared/music-catalog.js), [shared/music-tracks.json](../shared/music-tracks.json), [public/audio/CREDITS.txt](../public/audio/CREDITS.txt), [docs/PLA-MUSICA.md](../docs/PLA-MUSICA.md), [output/music-library/audio-import.json](../output/music-library/audio-import.json), [output/music-library/unit.txt](../output/music-library/unit.txt), [output/music-library/api.txt](../output/music-library/api.txt), [output/music-library/typecheck.txt](../output/music-library/typecheck.txt), [output/music-library/final-lint.txt](../output/music-library/final-lint.txt).

### Treball en curs · tres anuncis

R52: tres espais independents confirmats per l’usuari. T38-02 queda aparcada amb comprovació pública musical pendent per permisos; no es marca com a verificada. T39-01 és l’única tasca activa.

### H140 Implementar i publicar tres espais independents d’anuncis

**11 d’oct. 2026, 14:07 · T39-01.** Tres espais independents publicats a Pages 9c423d76; mínim inicial d’un pastís per espai, anonimat i retall 16:9 conservats. Migració additiva amb còpia privada prèvia, 168 proves, 40 fluxos API, tipus/lint i renderització local correctes. Comprovació visual pública pendent per permisos, documentada explícitament.

Evidències: [migrations/0015_banner_slots.sql](../migrations/0015_banner_slots.sql), [output/banner-slots/unit.txt](../output/banner-slots/unit.txt), [output/banner-slots/api.txt](../output/banner-slots/api.txt), [output/banner-slots/typecheck.txt](../output/banner-slots/typecheck.txt), [output/banner-slots/ui-structure.json](../output/banner-slots/ui-structure.json), [output/banner-slots/migration.txt](../output/banner-slots/migration.txt), [output/banner-slots/deploy.txt](../output/banner-slots/deploy.txt), [output/banner-slots/publicacio.json](../output/banner-slots/publicacio.json), [docs/PLA-TRES-ANUNCIS.md](../docs/PLA-TRES-ANUNCIS.md), [docs/VERIFICATION.md](../docs/VERIFICATION.md).

### H141 Integrar i publicar la bombeta transparent

**11 d’oct. 2026, 14:10 · T40-01.** Bombeta sense fons creada amb ImageGen i integrada al manifest compartit. Transparència RGBA real, silueta completa dins del viewport i coincidència amb el paquet compilat verificades. Lint i Pages be1b89e2 correctes. Revisió visual pública pendent per permisos; cap canvi de dades.

Evidències: [public/images/ui/bulb-alpha-v1.png](../public/images/ui/bulb-alpha-v1.png), [src/transparent-art.json](../src/transparent-art.json), [design/ui-alpha/bulb-prompt.txt](../design/ui-alpha/bulb-prompt.txt), [output/bulb-alpha/asset-verification.json](../output/bulb-alpha/asset-verification.json), [output/bulb-alpha/lint.txt](../output/bulb-alpha/lint.txt), [output/bulb-alpha/deploy.txt](../output/bulb-alpha/deploy.txt), [output/bulb-alpha/publicacio.json](../output/bulb-alpha/publicacio.json), [docs/VERIFICATION.md](../docs/VERIFICATION.md).

### H142 Reforçar seguretat i verificar compatibilitat entre navegadors

**11 d’oct. 2026, 14:45 · T41-01.** Publicat Pages d0cebb0c: capçaleres al servidor, CSRF reforçat, JSON acotat i errors controlats; MP3 complets, PDF legacy, desplegables de reserva i focus corregit. Zero avisos npm, 174 proves unitàries, 41 fluxos d’API, 120 controls entre motors i quatre recorreguts addicionals correctes. Proves de navegador locals amb dades fictícies; revisió pública, Google real i mòbils físics pendents i documentats. Sense canvis de dades de producció.

Evidències: [docs/PLA-SEGURETAT-COMPATIBILITAT.md](../docs/PLA-SEGURETAT-COMPATIBILITAT.md), [docs/VERIFICATION.md](../docs/VERIFICATION.md), [docs/PUBLICACIO.md](../docs/PUBLICACIO.md), [output/security-compat/npm-audit.json](../output/security-compat/npm-audit.json), [output/security-compat/unit.txt](../output/security-compat/unit.txt), [output/security-compat/api.txt](../output/security-compat/api.txt), [output/security-compat/typecheck.txt](../output/security-compat/typecheck.txt), [output/security-compat/browser-results.json](../output/security-compat/browser-results.json), [output/security-compat/device-results.json](../output/security-compat/device-results.json), [output/security-compat/mp3-verification.json](../output/security-compat/mp3-verification.json), [output/security-compat/build-verification.json](../output/security-compat/build-verification.json), [output/security-compat/deploy.txt](../output/security-compat/deploy.txt), [output/security-compat/publicacio.json](../output/security-compat/publicacio.json).

### H143 Millorar, verificar i publicar el responsive

**11 d’oct. 2026, 15:19 · T42-01.** Publicat Pages 7e51a088: horari per dies, mes amb agenda del dia i detall mòbil en finestra; notes en targetes amb desament i mode discret conservats; barra de tauleta de 88 px i navegació inferior en paisatge. Capçalera amb logo, tres anuncis 16:9 i controls sense encavalcaments; filtres i formularis adaptats a l’espai visible. 48 escenaris de responsive, 120 controls generals, quatre recorreguts addicionals i 174 proves unitàries correctes. Tipus, lint, compilació i integritat del paquet correctes. Captures locals revisades; revisió pública, Google real i dispositius físics pendents, sense canvis de dades de producció.

Evidències: [docs/PLA-RESPONSIVE.md](../docs/PLA-RESPONSIVE.md), [docs/VERIFICATION.md](../docs/VERIFICATION.md), [docs/PUBLICACIO.md](../docs/PUBLICACIO.md), [output/responsive/responsive-results.json](../output/responsive/responsive-results.json), [output/responsive/regression/browser-results.json](../output/responsive/regression/browser-results.json), [output/responsive/regression/device-results.json](../output/responsive/regression/device-results.json), [output/responsive/unit.txt](../output/responsive/unit.txt), [output/responsive/typecheck.txt](../output/responsive/typecheck.txt), [output/responsive/lint.txt](../output/responsive/lint.txt), [output/responsive/build.txt](../output/responsive/build.txt), [output/responsive/after/metrics.json](../output/responsive/after/metrics.json), [output/responsive/tested-build.json](../output/responsive/tested-build.json), [output/responsive/publicacio.json](../output/responsive/publicacio.json), [output/responsive/deploy.txt](../output/responsive/deploy.txt).

### H144 Crear, verificar i publicar el selector de discos i la pausa compartida

**11 d’oct. 2026, 15:46 · T43-01.** Publicat Pages deb83bdc: selector de 17 discos amb cerca sense accents, set filtres d’estil, durades i selecció marcada; vinils amb gir suau i moviment reduït respectat. Control superior persistent amb pausa real, represa al mateix punt i estat sincronitzat entre seccions. Anterior/següent, cancel·lació de càrrega, errors i canvis ràpids comprovats sense reproducció duplicada. 30 escenaris musicals, 48 de responsive, 120 controls generals, quatre recorreguts addicionals i 180 proves unitàries correctes. Tipus, lint, compilació i coincidència dels 93 fitxers correctes. Proves locals i captures revisades; visita pública i dispositius físics pendents. Corregit també un efecte lateral de la utilitat de hashes; la pèrdua del manifest històric anterior queda documentada sense inventar-ne els hashes. Cap canvi de dades de producció.

Evidències: [docs/PLA-DISCOS.md](../docs/PLA-DISCOS.md), [docs/VERIFICATION.md](../docs/VERIFICATION.md), [docs/PUBLICACIO.md](../docs/PUBLICACIO.md), [output/music-records/music-results.json](../output/music-records/music-results.json), [output/music-records/regression/responsive-results.json](../output/music-records/regression/responsive-results.json), [output/music-records/regression/browser-results.json](../output/music-records/regression/browser-results.json), [output/music-records/regression/device-results.json](../output/music-records/regression/device-results.json), [output/music-records/unit.txt](../output/music-records/unit.txt), [output/music-records/typecheck.txt](../output/music-records/typecheck.txt), [output/music-records/lint.txt](../output/music-records/lint.txt), [output/music-records/build.txt](../output/music-records/build.txt), [output/music-records/tested-build.json](../output/music-records/tested-build.json), [output/music-records/publicacio.json](../output/music-records/publicacio.json), [output/music-records/deploy.txt](../output/music-records/deploy.txt).

### H145 Calcular, verificar i publicar la nota final amb plusos personals

**11 d’oct. 2026, 16:41 · T44-01.** Publicat Pages ab981cd3: nota final anual per assignatura amb pesos iguals exactes, acumulatius (16,67%, 33,33%, 50%) o personalitzats. Dos plusos de màxim 0,25 o un de 0,50, amb correcció privada entre zero i el seu màxim; pendent no suma i zero és vàlid. Límit total protegit a D1 amb concurrència, sense alterar cap mitjana trimestral. Registre personal o des de Plusos, mode discret, edició oculta, desament, reintents, desfer i CSV anual amb confirmació visible també en WebKit. 200 proves unitàries, 44 fluxos d’API amb D1/R2 locals, 24 escenaris anuals, 48 de responsive i 120 controls generals correctes. Tipus/lint/build i integritat de 93 fitxers correctes. Única migració 0016 additiva aplicada; cap fila prèvia de producció modificada. Proves locals i captures revisades; visita pública navegada, Google real i mòbils físics pendents.

Evidències: [docs/PLA-NOTA-FINAL.md](../docs/PLA-NOTA-FINAL.md), [docs/VERIFICATION.md](../docs/VERIFICATION.md), [docs/PUBLICACIO.md](../docs/PUBLICACIO.md), [output/course-grades/course-browser-results.json](../output/course-grades/course-browser-results.json), [output/course-grades/regression/responsive-results.json](../output/course-grades/regression/responsive-results.json), [output/course-grades/regression/browser-results.json](../output/course-grades/regression/browser-results.json), [output/course-grades/unit.txt](../output/course-grades/unit.txt), [output/course-grades/api.txt](../output/course-grades/api.txt), [output/course-grades/typecheck.txt](../output/course-grades/typecheck.txt), [output/course-grades/lint.txt](../output/course-grades/lint.txt), [output/course-grades/build.txt](../output/course-grades/build.txt), [output/course-grades/tested-build.json](../output/course-grades/tested-build.json), [output/course-grades/migration-apply.txt](../output/course-grades/migration-apply.txt), [output/course-grades/migration-schema.json](../output/course-grades/migration-schema.json), [output/course-grades/migrations-before.txt](../output/course-grades/migrations-before.txt), [output/course-grades/migrations-after.txt](../output/course-grades/migrations-after.txt), [output/course-grades/publicacio.json](../output/course-grades/publicacio.json), [output/course-grades/deploy.txt](../output/course-grades/deploy.txt).

### H146 Protegir, moderar i publicar les pujades de fitxers

**11 d’oct. 2026, 17:33 · T45-01.** Publicat Pages 5e3a8138 amb servei privat de reconstrucció/moderació visual 1e0e04f1-f87c-4d5b-8834-acf713aef083. Validació de pujades, MIME segur, metadades eliminades, fallada tancada, fitxers antics revisats abans de servir i anuncis protegits. 219 unitàries, 46 API amb D1/R2 locals, 36 escenaris de pujada, 48 responsive, 120 controls generals i 4 controls reals del servei desplegat correctes. Migració 0017 additiva i bindings remots confirmats. Filtre automàtic amb límits documentats; visita pública pendent de permís.

Evidències: [docs/PLA-ADJUNTS-SEGURS.md](../docs/PLA-ADJUNTS-SEGURS.md), [docs/VERIFICATION.md](../docs/VERIFICATION.md), [docs/PUBLICACIO.md](../docs/PUBLICACIO.md), [output/upload-safety/publicacio.json](../output/upload-safety/publicacio.json), [output/upload-safety/tested-build.json](../output/upload-safety/tested-build.json), [output/upload-safety/browser-results.json](../output/upload-safety/browser-results.json), [output/upload-safety/unit.txt](../output/upload-safety/unit.txt), [output/upload-safety/api.txt](../output/upload-safety/api.txt), [output/upload-safety/deployed-provider-contract-results.json](../output/upload-safety/deployed-provider-contract-results.json), [output/upload-safety/remote-bindings.json](../output/upload-safety/remote-bindings.json), [output/upload-safety/migration-schema.json](../output/upload-safety/migration-schema.json), [output/upload-safety/migration-columns.json](../output/upload-safety/migration-columns.json), [output/upload-safety/migration-apply.txt](../output/upload-safety/migration-apply.txt), [output/upload-safety/deploy.txt](../output/upload-safety/deploy.txt), [output/upload-safety/media-deploy.txt](../output/upload-safety/media-deploy.txt), [output/upload-safety/r2-public-access.txt](../output/upload-safety/r2-public-access.txt), [output/upload-safety/r2-custom-domains.txt](../output/upload-safety/r2-custom-domains.txt).

### H147 Implementar, verificar i publicar el sistema PAU

**11 d’oct. 2026, 18:21 · T46-01.** Publicat PAU i universitat, Pages 35d2fa1d. Catàleg oficial de 560 codis, 558 talls de la sisena assignació de juny 2026 i ponderacions 2026/2027; contradiccions i absències explícites. Calculadora per grau, recomanació dins de la carrera, simulació privada, mode discret i revisions concurrents. 235 unitàries, 48 API locals, 39 escenaris PAU, 48 responsive i 135 controls generals correctes. Migració 0018 additiva i bindings conservats confirmats. Dades històriques sense garantia de plaça; visita pública pendent.

Evidències: [docs/PLA-PAU.md](../docs/PLA-PAU.md), [docs/VERIFICATION.md](../docs/VERIFICATION.md), [docs/PUBLICACIO.md](../docs/PUBLICACIO.md), [output/pau/publicacio.json](../output/pau/publicacio.json), [output/pau/tested-build.json](../output/pau/tested-build.json), [output/pau/data-audit.json](../output/pau/data-audit.json), [output/pau/pau-browser-results.json](../output/pau/pau-browser-results.json), [output/pau/unit.txt](../output/pau/unit.txt), [output/pau/api.txt](../output/pau/api.txt), [output/pau/regression/browser-results.json](../output/pau/regression/browser-results.json), [output/pau/regression/responsive-results.json](../output/pau/regression/responsive-results.json), [output/pau/remote-bindings.json](../output/pau/remote-bindings.json), [output/pau/migration-schema.json](../output/pau/migration-schema.json), [output/pau/migration-apply.txt](../output/pau/migration-apply.txt), [output/pau/deploy.txt](../output/pau/deploy.txt).

### H148 Implementar, verificar i publicar Continguts

**11 d’oct. 2026, 18:54 · T47-01.** Publicat Continguts, Pages 7f7848ce: Materials, Formularis de fórmules i Eines i webs. Biblioteca per assignatura i tema, fonts identificades, edició i revisió de delegats/administradors del grup, versions publicades protegides, historial i revisions concurrents. Cinc referències de fórmules i set eines inicials. 244 unitàries, 50 API locals, 33 escenaris Continguts, 48 responsive i 135 controls generals correctes. Migració 0019 additiva; continguts, PAU i moderació visual conservats. Visita pública pendent.

Evidències: [docs/PLA-CONTINGUTS.md](../docs/PLA-CONTINGUTS.md), [docs/VERIFICATION.md](../docs/VERIFICATION.md), [docs/PUBLICACIO.md](../docs/PUBLICACIO.md), [output/contents/publicacio.json](../output/contents/publicacio.json), [output/contents/tested-build.json](../output/contents/tested-build.json), [output/contents/source-audit.json](../output/contents/source-audit.json), [output/contents/contents-browser-results.json](../output/contents/contents-browser-results.json), [output/contents/unit.txt](../output/contents/unit.txt), [output/contents/api.txt](../output/contents/api.txt), [output/contents/regression/browser-results.json](../output/contents/regression/browser-results.json), [output/contents/regression/responsive-results.json](../output/contents/regression/responsive-results.json), [output/contents/visual-review.json](../output/contents/visual-review.json), [output/contents/remote-bindings.json](../output/contents/remote-bindings.json), [output/contents/migration-schema.json](../output/contents/migration-schema.json), [output/contents/migration-apply.txt](../output/contents/migration-apply.txt), [output/contents/deploy.txt](../output/contents/deploy.txt).

### H149 Corregir, provar i publicar l’arrencada mòbil

**11 d’oct. 2026, 19:19 · T48-01.** Publicada correcció de pantalla blanca i arrencada mòbil, Pages 2f009340. Fallada reproduïda a WebKit sense Object.hasOwn, corregida; component arrel protegit, HTML inicial visible, càrrega per apartats, recuperació amb watchdog i reintent, compatibilitat ampliada. Reintent de modulepreload fallit de WebKit corregit. 250 unitàries, 50 API locals, 30 casos d’arrencada, 135 generals, 48 responsive i 4 perfils correctes. Dades, Google únic i moderació visual conservats; cap migració. Pendent de confirmar al telèfon físic de Marc.

Evidències: [docs/PLA-ARRENCADA-MOBIL.md](../docs/PLA-ARRENCADA-MOBIL.md), [docs/VERIFICATION.md](../docs/VERIFICATION.md), [docs/PUBLICACIO.md](../docs/PUBLICACIO.md), [output/mobile-startup/reproduction.json](../output/mobile-startup/reproduction.json), [output/mobile-startup/publicacio.json](../output/mobile-startup/publicacio.json), [output/mobile-startup/tested-build.json](../output/mobile-startup/tested-build.json), [output/mobile-startup/mobile-browser-results.json](../output/mobile-startup/mobile-browser-results.json), [output/mobile-startup/unit.txt](../output/mobile-startup/unit.txt), [output/mobile-startup/api.txt](../output/mobile-startup/api.txt), [output/mobile-startup/general/browser-results.json](../output/mobile-startup/general/browser-results.json), [output/mobile-startup/responsive/responsive-results.json](../output/mobile-startup/responsive/responsive-results.json), [output/mobile-startup/devices-final/device-results.json](../output/mobile-startup/devices-final/device-results.json), [output/mobile-startup/visual-review.json](../output/mobile-startup/visual-review.json), [output/mobile-startup/remote-bindings.json](../output/mobile-startup/remote-bindings.json), [output/mobile-startup/deploy.txt](../output/mobile-startup/deploy.txt).

### H150 Crear, validar i publicar el túnel i la ruleta de pastissos

**11 d’oct. 2026, 20:14 · T49-01.** Publicada sala secreta de la pastisseria, Pages b0e9c6f3. Catifa, trapa i túnel cancel·lable, crupier amb vestuari transparent creat amb imagegen, ruleta europea SVG coherent amb el resultat. Pastissos virtuals: validació estricta, sorteig criptogràfic uniforme, càrrec/premi atòmics i idempotents, historial privat, recuperació de resposta perduda i entre pestanyes. Migració additiva 0020, saldos anteriors conservats. 260 proves unitàries, 52 fluxos API locals D1/R2, 36 escenaris de sala secreta, 135 controls generals, 48 escenaris responsive, 30 d’arrencada mòbil i 4 perfils visuals finals correctes. Proves locals; visita pública, Google real i mòbil físic no executats.

Evidències: [docs/PLA-SALA-SECRETA.md](../docs/PLA-SALA-SECRETA.md), [docs/VERIFICATION.md](../docs/VERIFICATION.md), [docs/PUBLICACIO.md](../docs/PUBLICACIO.md), [output/secret-room/unit.txt](../output/secret-room/unit.txt), [output/secret-room/api.txt](../output/secret-room/api.txt), [output/secret-room/secret-room-browser-results.json](../output/secret-room/secret-room-browser-results.json), [output/secret-room/general-final/browser-results.json](../output/secret-room/general-final/browser-results.json), [output/secret-room/responsive/responsive-results.json](../output/secret-room/responsive/responsive-results.json), [output/secret-room/startup/mobile-browser-results.json](../output/secret-room/startup/mobile-browser-results.json), [output/secret-room/visual-final/layout-results.json](../output/secret-room/visual-final/layout-results.json), [output/secret-room/visual-review.json](../output/secret-room/visual-review.json), [output/secret-room/asset-audit.json](../output/secret-room/asset-audit.json), [output/secret-room/migration-schema.json](../output/secret-room/migration-schema.json), [output/secret-room/tested-build.json](../output/secret-room/tested-build.json), [output/secret-room/remote-bindings.json](../output/secret-room/remote-bindings.json), [output/secret-room/deploy.txt](../output/secret-room/deploy.txt), [output/secret-room/publicacio.json](../output/secret-room/publicacio.json).

### H151 Acreditar el regal i mostrar les activitats individuals a Notes

**11 d’oct. 2026, 20:42 · T50-01.** Acreditats 50 pastissos extra a tots els 17 comptes existents, 850 en total, amb referència única al ledger, totals remots i idempotència local verificats. Publicades quatre columnes d’activitats extra ampliables a Notes, Pages 5dd344ec. Nota individual, nom concret i tipus al costat del percentatge; configuració personal amb quatre espais, conservació de notes zero, IDs, pesos i dates, CSV detallat, mode discret i distribució mòbil en parelles. 265 proves unitàries, 52 fluxos API locals D1/R2, 18 escenaris d’activitats, 48 responsive, 135 controls generals i 24 escenaris de nota final correctes en Chromium, Firefox i WebKit. Backend, PAU, moderació, arrencada mòbil i sala secreta conservats. Sense migració; proves locals, mòbil físic, visita pública i Google real no executats.

Evidències: [docs/PLA-ACTIVITATS-NOTES.md](../docs/PLA-ACTIVITATS-NOTES.md), [docs/VERIFICATION.md](../docs/VERIFICATION.md), [docs/PUBLICACIO.md](../docs/PUBLICACIO.md), [ops/2026-10-11-extra-cakes.sql](../ops/2026-10-11-extra-cakes.sql), [output/grade-activities/gift-before.json](../output/grade-activities/gift-before.json), [output/grade-activities/gift-operation.json](../output/grade-activities/gift-operation.json), [output/grade-activities/gift-after.json](../output/grade-activities/gift-after.json), [output/grade-activities/unit.txt](../output/grade-activities/unit.txt), [output/grade-activities/api.txt](../output/grade-activities/api.txt), [output/grade-activities/typecheck.txt](../output/grade-activities/typecheck.txt), [output/grade-activities/lint.txt](../output/grade-activities/lint.txt), [output/grade-activities/activities-browser-results.json](../output/grade-activities/activities-browser-results.json), [output/grade-activities/responsive/responsive-results.json](../output/grade-activities/responsive/responsive-results.json), [output/grade-activities/general/browser-results.json](../output/grade-activities/general/browser-results.json), [output/grade-activities/course/course-browser-results.json](../output/grade-activities/course/course-browser-results.json), [output/grade-activities/course-final/course-browser-results.json](../output/grade-activities/course-final/course-browser-results.json), [output/grade-activities/visual-review.json](../output/grade-activities/visual-review.json), [output/grade-activities/tested-build.json](../output/grade-activities/tested-build.json), [output/grade-activities/remote-bindings.json](../output/grade-activities/remote-bindings.json), [output/grade-activities/deploy.txt](../output/grade-activities/deploy.txt), [output/grade-activities/publicacio.json](../output/grade-activities/publicacio.json).

### H152 Activar i publicar la recollida de pastissos cada 60 segons

**11 d’oct. 2026, 20:56 · T51-01.** Publicat i activat mode de prova de la pastisseria, Pages 2b3f3f67. Disponibilitat reiniciada per a tots els comptes i després un pastís cada 60 segons reals des de l’última recollida. Comptador, nova fornada sense recarregar, saldo confirmat fins i tot si falla la lectura general. Control atòmic, concurrència i rellotge manipulat verificats. Migració additiva 0021; saldos, regal de 50 i historial conservats. 270 proves unitàries, 52 fluxos API locals i 12 escenaris de pastisseria en Chromium, Firefox i WebKit correctes; tipus, lint i build correctes. Proves locals amb mòbil emulat; visita pública, mòbil físic i Google real no executats.

Evidències: [docs/PLA-PASTIS-MINUT.md](../docs/PLA-PASTIS-MINUT.md), [docs/VERIFICATION.md](../docs/VERIFICATION.md), [docs/PUBLICACIO.md](../docs/PUBLICACIO.md), [output/bakery-minute/unit.txt](../output/bakery-minute/unit.txt), [output/bakery-minute/api.txt](../output/bakery-minute/api.txt), [output/bakery-minute/typecheck.txt](../output/bakery-minute/typecheck.txt), [output/bakery-minute/lint.txt](../output/bakery-minute/lint.txt), [output/bakery-minute/browser-results.json](../output/bakery-minute/browser-results.json), [output/bakery-minute/visual-review.json](../output/bakery-minute/visual-review.json), [output/bakery-minute/tested-build.json](../output/bakery-minute/tested-build.json), [output/bakery-minute/migration-confirmed.json](../output/bakery-minute/migration-confirmed.json), [output/bakery-minute/mode-active.json](../output/bakery-minute/mode-active.json), [output/bakery-minute/remote-bindings.json](../output/bakery-minute/remote-bindings.json), [output/bakery-minute/deploy.txt](../output/bakery-minute/deploy.txt), [output/bakery-minute/publicacio.json](../output/bakery-minute/publicacio.json).

### H153 Accelerar adjunts, missatges i comprovació visual

**11 d’oct. 2026, 21:20 · T52-01.** Publicades pujades i comprovació visual optimitzades, Pages 258065d3, servei privat b6149977-41fc-4998-9923-ba296dd4124f. Tres adjunts simultanis, ordre/progrés i errors parcials recuperables. Inspecció a 1024 amb imatge de lectura preservada, cache d’aprovacions idèntiques i criteri de notes més precís; signatures/descodificació i bloqueig d’executables conservats. Apunts/cartells confirmats abans de sincronitzar; formularis nous protegits. Mostra real desplegada 2403 ms inicial, 345 ms en repetició aprovada; sense garantia universal. 275 proves unitàries, 52 fluxos API locals, 12 escenaris nous de pujades/publicació, 36 controls de seguretat de fitxers, 48 escenaris responsive i 135 controls generals correctes en Chromium, Firefox i WebKit; tipus, lint i build correctes. Pastís cada minut i regal conservats. Proves locals amb mòbil emulat; visita pública, mòbil físic i Google real no executats.

Evidències: [docs/PLA-PUJADES-RAPIDES.md](../docs/PLA-PUJADES-RAPIDES.md), [docs/VERIFICATION.md](../docs/VERIFICATION.md), [docs/PUBLICACIO.md](../docs/PUBLICACIO.md), [output/fast-uploads/unit.txt](../output/fast-uploads/unit.txt), [output/fast-uploads/api.txt](../output/fast-uploads/api.txt), [output/fast-uploads/typecheck.txt](../output/fast-uploads/typecheck.txt), [output/fast-uploads/lint.txt](../output/fast-uploads/lint.txt), [output/fast-uploads/fast-browser-results.json](../output/fast-uploads/fast-browser-results.json), [output/fast-uploads/security-browser/browser-results.json](../output/fast-uploads/security-browser/browser-results.json), [output/fast-uploads/responsive/responsive-results.json](../output/fast-uploads/responsive/responsive-results.json), [output/fast-uploads/general/browser-results.json](../output/fast-uploads/general/browser-results.json), [output/fast-uploads/visual-review.json](../output/fast-uploads/visual-review.json), [output/fast-uploads/tested-build.json](../output/fast-uploads/tested-build.json), [output/fast-uploads/provider-probe.json](../output/fast-uploads/provider-probe.json), [output/fast-uploads/deployed-service-probe.json](../output/fast-uploads/deployed-service-probe.json), [output/fast-uploads/provider-image-audit.json](../output/fast-uploads/provider-image-audit.json), [output/fast-uploads/preserved-state.json](../output/fast-uploads/preserved-state.json), [output/fast-uploads/remote-bindings.json](../output/fast-uploads/remote-bindings.json), [output/fast-uploads/media-deploy.txt](../output/fast-uploads/media-deploy.txt), [output/fast-uploads/deploy.txt](../output/fast-uploads/deploy.txt), [output/fast-uploads/publicacio.json](../output/fast-uploads/publicacio.json).

### H154 Reorientar PAU cap al top 5 i les universitats

**11 d’oct. 2026, 21:52 · T53-01.** Publicat top 5 d’universitats, Pages 12a6da82. Entrada principal de selecció/comparació; llista privada de cinc opcions ordenables sense notes PAU, calculadora secundària i objectius antics preservats. Orientació explicable amb Notes, pesos i plusos: percentatge del tall històric cobert, projecció i marge, mai probabilitat inventada. Sense dades o ponderacions fiables no es puntua. Privadesa, persistència, revisió i mòbil verificats. 284 proves unitàries, 52 fluxos API locals, 24 escenaris nous del top 5, 39 casos de regressió PAU, 48 escenaris responsive i 135 controls generals correctes en Chromium, Firefox i WebKit; tipus, lint i build correctes. Sense migració; catàleg, moderació privada, saldos i pastís cada minut conservats. Proves locals amb mòbil emulat; web pública, mòbil físic i Google real no executats.

Evidències: [docs/PLA-PAU-TOP5.md](../docs/PLA-PAU-TOP5.md), [docs/VERIFICATION.md](../docs/VERIFICATION.md), [docs/PUBLICACIO.md](../docs/PUBLICACIO.md), [output/pau-top5/unit.txt](../output/pau-top5/unit.txt), [output/pau-top5/api.txt](../output/pau-top5/api.txt), [output/pau-top5/typecheck.txt](../output/pau-top5/typecheck.txt), [output/pau-top5/lint.txt](../output/pau-top5/lint.txt), [output/pau-top5/top5-browser-results.json](../output/pau-top5/top5-browser-results.json), [output/pau-top5/pau-regression/pau-browser-results.json](../output/pau-top5/pau-regression/pau-browser-results.json), [output/pau-top5/responsive/responsive-results.json](../output/pau-top5/responsive/responsive-results.json), [output/pau-top5/general/browser-results.json](../output/pau-top5/general/browser-results.json), [output/pau-top5/visual-review.json](../output/pau-top5/visual-review.json), [output/pau-top5/tested-build.json](../output/pau-top5/tested-build.json), [output/pau-top5/preserved-state.json](../output/pau-top5/preserved-state.json), [output/pau-top5/remote-bindings.json](../output/pau-top5/remote-bindings.json), [output/pau-top5/deploy.txt](../output/pau-top5/deploy.txt), [output/pau-top5/publicacio.json](../output/pau-top5/publicacio.json).

### H155 Ampliar els discos amb una selecció Focus

**11 d’oct. 2026, 22:20 · T54-01.** Publicats vuit discos Focus, Pages ecb90035: 131.2 minuts nous; biblioteca de 25 peces en 8 estils. Música instrumental ambient i amb pols suau, peces completes, crèdits CC BY 4.0 i fitxers locals compatibles amb iPhone. Filtre Focus, textures, cerca per estil, càrrega a demanda i controls compartits conservats. 284 proves unitàries, 52 fluxos API, 39 escenaris musicals, 48 responsive i 135 controls generals correctes; tipus, lint, compilació i descodificació completa correctes. Sense migració ni canvis de dades; proves locals amb mòbil emulat, web pública no visitada.

Evidències: [docs/PLA-MUSICA-FOCUS.md](../docs/PLA-MUSICA-FOCUS.md), [docs/VERIFICATION.md](../docs/VERIFICATION.md), [docs/PUBLICACIO.md](../docs/PUBLICACIO.md), [output/focus-music/sources.json](../output/focus-music/sources.json), [output/focus-music/audio-import.json](../output/focus-music/audio-import.json), [output/focus-music/local-verification.json](../output/focus-music/local-verification.json), [output/focus-music/unit.txt](../output/focus-music/unit.txt), [output/focus-music/api.txt](../output/focus-music/api.txt), [output/focus-music/typecheck.txt](../output/focus-music/typecheck.txt), [output/focus-music/lint.txt](../output/focus-music/lint.txt), [output/focus-music/music-results.json](../output/focus-music/music-results.json), [output/focus-music/responsive/responsive-results.json](../output/focus-music/responsive/responsive-results.json), [output/focus-music/general/browser-results.json](../output/focus-music/general/browser-results.json), [output/focus-music/visual-review.json](../output/focus-music/visual-review.json), [output/focus-music/tested-build.json](../output/focus-music/tested-build.json), [output/focus-music/remote-bindings.json](../output/focus-music/remote-bindings.json), [output/focus-music/preserved-state.json](../output/focus-music/preserved-state.json), [output/focus-music/deploy.txt](../output/focus-music/deploy.txt), [output/focus-music/publicacio.json](../output/focus-music/publicacio.json).

### H156 Crear, apostar i resoldre prediccions A/B

**11 d’oct. 2026, 23:17 · T55-01.** Publicada la segona taula de la sala secreta, Prediccions A/B, Pages b625f1b4. Creació amb termini, criteris immutables i responsable que accepta; pastissos virtuals, pot comú proporcional exacte, resolució justificada i retorns. Càrrecs i liquidacions atòmics, permisos SQL, reintents idempotents i recuperació de connexions. 299 proves unitàries, 58 fluxos API D1/R2, 18 escenaris de prediccions, 36 de ruleta, 135 controls generals, 48 responsive i 6 perfils visuals correctes; tipus, lint i compilació correctes. Migració 0022 additiva i còpia prèvia; cap aposta de prova a producció. Vinculacions, regal anterior i forn cada minut preservats. Proves locals, web pública no visitada.

Evidències: [docs/PLA-PREDICCIONS.md](../docs/PLA-PREDICCIONS.md), [docs/VERIFICATION.md](../docs/VERIFICATION.md), [docs/PUBLICACIO.md](../docs/PUBLICACIO.md), [output/predictions/unit.txt](../output/predictions/unit.txt), [output/predictions/api.txt](../output/predictions/api.txt), [output/predictions/typecheck.txt](../output/predictions/typecheck.txt), [output/predictions/lint.txt](../output/predictions/lint.txt), [output/predictions/browser-results.json](../output/predictions/browser-results.json), [output/predictions/visual-layout.json](../output/predictions/visual-layout.json), [output/predictions/visual-review.json](../output/predictions/visual-review.json), [output/predictions/roulette-isolated/secret-room-browser-results.json](../output/predictions/roulette-isolated/secret-room-browser-results.json), [output/predictions/roulette-driver-error.txt](../output/predictions/roulette-driver-error.txt), [output/predictions/general-final/browser-results.json](../output/predictions/general-final/browser-results.json), [output/predictions/responsive-final/responsive-results.json](../output/predictions/responsive-final/responsive-results.json), [output/predictions/backup.json](../output/predictions/backup.json), [output/predictions/migration-applied.txt](../output/predictions/migration-applied.txt), [output/predictions/migration-schema.json](../output/predictions/migration-schema.json), [output/predictions/tested-build.json](../output/predictions/tested-build.json), [output/predictions/remote-bindings.json](../output/predictions/remote-bindings.json), [output/predictions/preserved-state.json](../output/predictions/preserved-state.json), [output/predictions/deploy.txt](../output/predictions/deploy.txt), [output/predictions/publicacio.json](../output/predictions/publicacio.json).

### H157 Eliminar imatges antigues i frenar pujades abusives

**11 d’oct. 2026, 23:58 · T56-01.** Publicat Pages 65c243f2: retirada atòmica i eliminació R2 de les imatges substituïdes, quotes per compte, reserves concurrents, caducitat de nous esborranys i bloqueig temporal d’abús. 5 imatges històriques eliminades, 3 vigents i 348 registres preservats; Worker privat amb cron cada minut i cache de moderació sense píxels. 318 proves unitàries, 62 fluxos API amb D1/R2 locals, 18 escenaris nous, 36 de seguretat d’adjunts, 12 de pujades ràpides, 135 controls generals i 5 comprovacions del servei privat desplegat; tipus, lint i compilació correctes. Migració 0023, còpia privada, gift anterior i forn cada minut preservats. Proves locals i relays privats, web pública no visitada.

Evidències: [docs/PLA-RETENCIO-ANUNCIS.md](../docs/PLA-RETENCIO-ANUNCIS.md), [docs/VERIFICATION.md](../docs/VERIFICATION.md), [docs/PUBLICACIO.md](../docs/PUBLICACIO.md), [output/ad-retention/unit.txt](../output/ad-retention/unit.txt), [output/ad-retention/retention-final-unit.txt](../output/ad-retention/retention-final-unit.txt), [output/ad-retention/api-final.txt](../output/ad-retention/api-final.txt), [output/ad-retention/typecheck.txt](../output/ad-retention/typecheck.txt), [output/ad-retention/lint-final.txt](../output/ad-retention/lint-final.txt), [output/ad-retention/browser/results.json](../output/ad-retention/browser/results.json), [output/ad-retention/upload-regression/browser-results.json](../output/ad-retention/upload-regression/browser-results.json), [output/ad-retention/fast-upload-regression/fast-browser-results.json](../output/ad-retention/fast-upload-regression/fast-browser-results.json), [output/ad-retention/general/browser-results.json](../output/ad-retention/general/browser-results.json), [output/ad-retention/backup.json](../output/ad-retention/backup.json), [output/ad-retention/migration-applied.txt](../output/ad-retention/migration-applied.txt), [output/ad-retention/migration-schema.json](../output/ad-retention/migration-schema.json), [output/ad-retention/tested-build.json](../output/ad-retention/tested-build.json), [output/ad-retention/remote-bindings.json](../output/ad-retention/remote-bindings.json), [output/ad-retention/preserved-state.json](../output/ad-retention/preserved-state.json), [output/ad-retention/remote-cleanup.json](../output/ad-retention/remote-cleanup.json), [output/ad-retention/media-deploy.txt](../output/ad-retention/media-deploy.txt), [output/ad-retention/deployed-service-probe.json](../output/ad-retention/deployed-service-probe.json), [output/ad-retention/maintenance-deploy.txt](../output/ad-retention/maintenance-deploy.txt), [output/ad-retention/maintenance-provider.json](../output/ad-retention/maintenance-provider.json), [output/ad-retention/deploy.txt](../output/ad-retention/deploy.txt), [output/ad-retention/publicacio.json](../output/ad-retention/publicacio.json).

### H158 Navegació mòbil amb Més sobre la barra inferior

**12 d’oct. 2026, 0:24 · T57-01.** Publicada navegació mòbil amb graella sobre la barra inferior, focus i tancament accessibles. 318 unitàries, 9 escenaris nous, 48 responsive i 135 generals correctes; Pages 4cc1feee confirmat, dades preservades, sense visitar el web públic.

Evidències: [docs/PLA-NAVEGACIO-MOBIL.md](../docs/PLA-NAVEGACIO-MOBIL.md), [output/mobile-navigation/results.json](../output/mobile-navigation/results.json), [output/mobile-navigation/typecheck.txt](../output/mobile-navigation/typecheck.txt), [output/mobile-navigation/unit.txt](../output/mobile-navigation/unit.txt), [output/mobile-navigation/responsive/responsive-results.json](../output/mobile-navigation/responsive/responsive-results.json), [output/mobile-navigation/general/browser-results.json](../output/mobile-navigation/general/browser-results.json), [output/mobile-navigation/remote-bindings.json](../output/mobile-navigation/remote-bindings.json), [output/mobile-navigation/preserved-state.json](../output/mobile-navigation/preserved-state.json), [output/mobile-navigation/tested-build.json](../output/mobile-navigation/tested-build.json).

### H159 GitHub públic i registre de versions

**12 d’oct. 2026, 1:27 · T58-01.** Repositori públic 21052claver-ship-it/lanet, autoria 21052.claver@fje.edu, 50 àudios LFS i fonts de test reproduïbles. CI real correcta (324 unitàries, 9 menú, 48 responsive, 135 generals); release immutable 0.2.0 i GitHub Deployment success vinculats al commit 2ee68351833edf9e3ed85f4013ebce76bfe53b78 i Pages 0b889c30. Publicació versionada des de sessions locals; cap secret personal exportat ni visita al web públic. Main i secrets protegits, historial i instruccions futures actualitzats.

Evidències: [docs/PLA-GITHUB.md](../docs/PLA-GITHUB.md), [docs/VERSIONS.md](../docs/VERSIONS.md), [docs/releases/0.2.0.json](../docs/releases/0.2.0.json), [output/github/delivery.json](../output/github/delivery.json), [output/github/ci-success.json](../output/github/ci-success.json), [output/github/ci-success.txt](../output/github/ci-success.txt), [output/github/source-audit.json](../output/github/source-audit.json), [output/github/repository-settings.json](../output/github/repository-settings.json), [output/github/runtime-art.json](../output/github/runtime-art.json), [output/github/remote-bindings.json](../output/github/remote-bindings.json), [output/github/preserved-state.json](../output/github/preserved-state.json), [output/releases/0.2.0/receipt.json](../output/releases/0.2.0/receipt.json).

### H160 Més amb tots els apartats sobre la barra inferior

**12 d’oct. 2026, 1:40 · T59-01.** Publicat selector mòbil complet 0.2.1: vuit apartats en dues files sobre la barra inferior, focus actiu, etiquetes accessibles, perfil/propostes i tancament coherent. 9 escenaris locals i CI completa correcta (324 unitàries, 9 menú, 48 responsive, 135 generals). Pages c5a12609, SHA 2cd7ee3007a0e9c00d5b467fbb78597e4fca99e8, release immutable i proveïdor confirmats; dades preservades, sense visita al web públic.

Evidències: [docs/PLA-MES-COMPLET.md](../docs/PLA-MES-COMPLET.md), [docs/releases/0.2.1.json](../docs/releases/0.2.1.json), [output/mobile-navigation-complete/browser/results.json](../output/mobile-navigation-complete/browser/results.json), [output/mobile-navigation-complete/typecheck.txt](../output/mobile-navigation-complete/typecheck.txt), [output/mobile-navigation-complete/source-audit.json](../output/mobile-navigation-complete/source-audit.json), [output/mobile-navigation-complete/delivery.json](../output/mobile-navigation-complete/delivery.json), [output/mobile-navigation-complete/ci-success.json](../output/mobile-navigation-complete/ci-success.json), [output/mobile-navigation-complete/ci-success.txt](../output/mobile-navigation-complete/ci-success.txt), [output/mobile-navigation-complete/remote-bindings.json](../output/mobile-navigation-complete/remote-bindings.json), [output/mobile-navigation-complete/preserved-state.json](../output/mobile-navigation-complete/preserved-state.json), [output/releases/0.2.1/receipt.json](../output/releases/0.2.1/receipt.json).

### H161 Apostes múltiples i posicions del tapet europeu

**12 d’oct. 2026, 2:13 · T60-01.** Tapet europeu de 157 posicions amb fitxes múltiples per gir, denominacions, desfer i retirada per posició; controls tàctils i de teclat, retorn detallat i recuperació idempotent. Liquidació SQL atòmica i historial antic conservat. Publicada 0.3.0 amb CI, migració additiva i rebut verificats.

Evidències: [docs/PLA-RULETA-FITXES.md](../docs/PLA-RULETA-FITXES.md), [docs/releases/0.3.0.json](../docs/releases/0.3.0.json), [output/roulette-board/browser/results.json](../output/roulette-board/browser/results.json), [output/roulette-board/visual/results.json](../output/roulette-board/visual/results.json), [output/roulette-board/typecheck.txt](../output/roulette-board/typecheck.txt), [output/roulette-board/unit.txt](../output/roulette-board/unit.txt), [output/roulette-board/source-audit.txt](../output/roulette-board/source-audit.txt), [output/roulette-board/backup.json](../output/roulette-board/backup.json), [output/roulette-board/migration-schema.json](../output/roulette-board/migration-schema.json), [output/roulette-board/migration-source.json](../output/roulette-board/migration-source.json), [output/roulette-board/preserved-state.json](../output/roulette-board/preserved-state.json), [output/roulette-board/remote-bindings.json](../output/roulette-board/remote-bindings.json), [output/roulette-board/ci-success.json](../output/roulette-board/ci-success.json), [output/roulette-board/delivery.json](../output/roulette-board/delivery.json), [output/releases/0.3.0/receipt.json](../output/releases/0.3.0/receipt.json).

### H162 Bola sincronitzada i pastissos al final de la celebració

**12 d’oct. 2026, 2:48 · T61-01.** Bola i roda amb rellotge compartit, descens continu i casella final coherent; revelació del premi, celebració segons guany net i pastissos volant al moneder abans d’actualitzar el saldo. Sense avançar resultat per historial o sincronització. Moviment reduït, sortida i recuperació segura. Publicada 0.3.1 amb CI i rebut confirmats.

Evidències: [docs/PLA-RULETA-ANIMACIO.md](../docs/PLA-RULETA-ANIMACIO.md), [docs/releases/0.3.1.json](../docs/releases/0.3.1.json), [output/roulette-animation/results.json](../output/roulette-animation/results.json), [output/roulette-animation/remote-bindings.json](../output/roulette-animation/remote-bindings.json), [output/roulette-animation/ci-success.json](../output/roulette-animation/ci-success.json), [output/roulette-animation/delivery.json](../output/roulette-animation/delivery.json), [output/roulette-animation-unit.log](../output/roulette-animation-unit.log), [output/roulette-animation-typecheck.log](../output/roulette-animation-typecheck.log), [output/roulette-animation-source-audit.log](../output/roulette-animation-source-audit.log), [output/releases/0.3.1/receipt.json](../output/releases/0.3.1/receipt.json).

### H163 Límits per compte, duplicats i bloquejos temporals progressius

**12 d’oct. 2026, 3:18 · T62-01.** Límits atòmics persistents per compte i operació, control concurrent de duplicats i pauses progressives de 60/300/900 segons. Canviar d’IP o afegir camps aleatoris ignorats no reinicia els controls. JSON limitat en mida i complexitat; registres sense contingut ni identificadors en clar. Formularis conservats, lectures i tancament de sessió disponibles, recuperació automàtica després de la pausa. Publicada 0.4.0 amb CI i rebut confirmats.

Evidències: [docs/PLA-SEGURETAT-ANTIABUS.md](../docs/PLA-SEGURETAT-ANTIABUS.md), [docs/releases/0.4.0.json](../docs/releases/0.4.0.json), [output/abuse/unit.log](../output/abuse/unit.log), [output/abuse/typecheck.log](../output/abuse/typecheck.log), [output/abuse/source-audit.log](../output/abuse/source-audit.log), [output/abuse/dependency-audit.json](../output/abuse/dependency-audit.json), [output/abuse/browser/results.json](../output/abuse/browser/results.json), [output/abuse/regression/browser-results.json](../output/abuse/regression/browser-results.json), [output/abuse/remote-bindings.json](../output/abuse/remote-bindings.json), [output/abuse/ci-success.json](../output/abuse/ci-success.json), [output/abuse/delivery.json](../output/abuse/delivery.json), [output/releases/0.4.0/receipt.json](../output/releases/0.4.0/receipt.json).

### H164 Crear aposta sempre accessible i flux d’alumne verificat

**12 d’oct. 2026, 3:43 · T63-01.** Crear aposta sempre visible en la llista i en el detall d’una altra aposta. Formulari i estat buit amb nom coherent. Cancel·lar conserva l’aposta anterior; crear obre el detall de la nova aposta pendent d’acceptació, sense refrescar l’anterior ni iniciar dues lectures de selecció. Flux verificat amb un alumne normal, termini i responsable independent, sense gastar pastissos per crear. Publicada 0.4.1 amb CI i rebut confirmats.

Evidències: [docs/PLA-CREAR-APOSTES.md](../docs/PLA-CREAR-APOSTES.md), [docs/releases/0.4.1.json](../docs/releases/0.4.1.json), [output/create-bets/unit.log](../output/create-bets/unit.log), [output/create-bets/typecheck.log](../output/create-bets/typecheck.log), [output/create-bets/source-audit.log](../output/create-bets/source-audit.log), [output/create-bets/browser/browser-results.json](../output/create-bets/browser/browser-results.json), [output/create-bets/remote-bindings.json](../output/create-bets/remote-bindings.json), [output/create-bets/ci-success.json](../output/create-bets/ci-success.json), [output/create-bets/delivery.json](../output/create-bets/delivery.json), [output/releases/0.4.1/receipt.json](../output/releases/0.4.1/receipt.json).

### H165 Pissarra visual d’apostes amb amfitriona i responsive

**12 d’oct. 2026, 4:23 · T64-01.** Nou escenari de prediccions: senyora sencera i transparent al costat d’una pissarra amb marc i lleixa de fusta. Apostes penjades com papers amb una xinxeta, dades llegibles i filtres. Al mòbil la senyora passa a sobre per deixar tot l’espai al tauler. Creació, detall, teclat i retorn a la ruleta preservats, sense tocar saldos ni liquidació. Publicada 0.5.0 amb CI i rebut confirmats.

Evidències: [docs/PLA-PISSARRA-APOSTES.md](../docs/PLA-PISSARRA-APOSTES.md), [docs/releases/0.5.0.json](../docs/releases/0.5.0.json), [output/prediction-board/unit.log](../output/prediction-board/unit.log), [output/prediction-board/typecheck.log](../output/prediction-board/typecheck.log), [output/prediction-board/source-audit.log](../output/prediction-board/source-audit.log), [output/prediction-board/browser/browser-results.json](../output/prediction-board/browser/browser-results.json), [output/prediction-board/remote-bindings.json](../output/prediction-board/remote-bindings.json), [output/prediction-board/ci-success.json](../output/prediction-board/ci-success.json), [output/prediction-board/delivery.json](../output/prediction-board/delivery.json), [output/releases/0.5.0/receipt.json](../output/releases/0.5.0/receipt.json).

### H166 Evitar text tallat a les targetes d’esdeveniments

**12 d’oct. 2026, 9:39 · T65-01.** Corregida la compressió vertical del text en targetes de l’horari. La informació visible s’adapta a l’alçada i amplada reals: línies senceres, el·lipsi neta i menys informació en esdeveniments curts o simultanis. Eliminada l’alçada mínima heretada que feia sobresortir el botó. Descripció accessible i tooltip amb tipus, assignatura, hores i títol; detall complet en prémer. Publicada 0.5.1 amb CI i rebut confirmats.

Evidències: [docs/PLA-TARGETES-HORARI.md](../docs/PLA-TARGETES-HORARI.md), [docs/releases/0.5.1.json](../docs/releases/0.5.1.json), [output/schedule-cards/before/results.json](../output/schedule-cards/before/results.json), [output/schedule-cards/unit.log](../output/schedule-cards/unit.log), [output/schedule-cards/typecheck.log](../output/schedule-cards/typecheck.log), [output/schedule-cards/source-audit.log](../output/schedule-cards/source-audit.log), [output/schedule-cards/browser/results.json](../output/schedule-cards/browser/results.json), [output/schedule-cards/remote-bindings.json](../output/schedule-cards/remote-bindings.json), [output/schedule-cards/ci-success.json](../output/schedule-cards/ci-success.json), [output/schedule-cards/delivery.json](../output/schedule-cards/delivery.json), [output/releases/0.5.1/receipt.json](../output/releases/0.5.1/receipt.json).

### H167 Crear i confirmar la pròpia aposta

**12 d’oct. 2026, 10:17 · T66-01.** El creador pot ser responsable del resultat. Jo mateix seleccionat per defecte: l’aposta s’obre en crear-la i el creador confirma A/B després del termini amb justificació pública. Opció d’una altra persona preservada amb acceptació prèvia. Responsable visible i sense poder apostar-hi; límits, recuperació, retorns i liquidació única preservats. Publicada 0.6.0 amb migració, CI i rebut confirmats.

Evidències: [docs/PLA-APOSTA-PROPIA.md](../docs/PLA-APOSTA-PROPIA.md), [docs/releases/0.6.0.json](../docs/releases/0.6.0.json), [output/self-resolver/unit.log](../output/self-resolver/unit.log), [output/self-resolver/typecheck.log](../output/self-resolver/typecheck.log), [output/self-resolver/source-audit.log](../output/self-resolver/source-audit.log), [output/self-resolver/browser/browser-results.json](../output/self-resolver/browser/browser-results.json), [output/self-resolver/backup-review.json](../output/self-resolver/backup-review.json), [output/self-resolver/migration-verified.json](../output/self-resolver/migration-verified.json), [output/self-resolver/remote-bindings.json](../output/self-resolver/remote-bindings.json), [output/self-resolver/ci-success.json](../output/self-resolver/ci-success.json), [output/self-resolver/delivery.json](../output/self-resolver/delivery.json), [output/releases/0.6.0/receipt.json](../output/releases/0.6.0/receipt.json).

### H168 Depurar la plataforma amb casos límit i errors de connexió

**12 d’oct. 2026, 11:26 · T67-01.** Corregides icones d’assignatures no seleccionades, cerca sense accents, tancament de diàlegs per respostes antigues, càrrega protegida de l’editor d’apunts i recuperació de connexió/sortida sense peticions duplicades. Gestió del centre amb reintent directe, avís netejat en recuperar-se i protecció contra respostes antigues. Publicada 0.6.1 amb CI i rebut confirmats.

Evidències: [docs/PLA-DEPURACIO-GENERAL.md](../docs/PLA-DEPURACIO-GENERAL.md), [docs/releases/0.6.1.json](../docs/releases/0.6.1.json), [output/debug-pass/before/results.json](../output/debug-pass/before/results.json), [output/debug-pass/before/reproduced.json](../output/debug-pass/before/reproduced.json), [output/debug-pass/before/modal-race.json](../output/debug-pass/before/modal-race.json), [output/debug-pass/before/admin-recovery.json](../output/debug-pass/before/admin-recovery.json), [output/debug-pass/unit.log](../output/debug-pass/unit.log), [output/debug-pass/typecheck.log](../output/debug-pass/typecheck.log), [output/debug-pass/source-audit.log](../output/debug-pass/source-audit.log), [output/debug-pass/dependency-audit-all.json](../output/debug-pass/dependency-audit-all.json), [output/workspace-recovery/results.json](../output/workspace-recovery/results.json), [output/debug-pass/responsive.log](../output/debug-pass/responsive.log), [output/debug-pass/music/music-results.json](../output/debug-pass/music/music-results.json), [output/debug-pass/contents/contents-browser-results.json](../output/debug-pass/contents/contents-browser-results.json), [output/debug-pass/course-grades/course-browser-results.json](../output/debug-pass/course-grades/course-browser-results.json), [output/debug-pass/pau-top5/top5-browser-results.json](../output/debug-pass/pau-top5/top5-browser-results.json), [output/debug-pass/remote-bindings.json](../output/debug-pass/remote-bindings.json), [output/debug-pass/ci-success.json](../output/debug-pass/ci-success.json), [output/debug-pass/delivery.json](../output/debug-pass/delivery.json), [output/releases/0.6.1/receipt.json](../output/releases/0.6.1/receipt.json).

### H169 Protegir main i configurar el flux de contribucions

**12 d’oct. 2026, 11:39 · T68-01.** Rulesets actives a main amb PR, aprovació del propietari i Validate actualitzat sense bypass de CI. Proteccions anteriors conservades i Pages Direct Upload verificat via API. Guia de forks, CODEOWNERS i plantilla preparats a la PR #4, amb CI obligatòria abans de fusionar; sense publicar producte ni transferir secrets.

Evidències: [docs/PLA-PULL-REQUESTS.md](../docs/PLA-PULL-REQUESTS.md), [CONTRIBUTING.md](../CONTRIBUTING.md), [.github/CODEOWNERS](../.github/CODEOWNERS), [.github/pull_request_template.md](../.github/pull_request_template.md), [output/pull-requests/cloudflare-connection.json](../output/pull-requests/cloudflare-connection.json), [output/pull-requests/governance.json](../output/pull-requests/governance.json), [output/pull-requests/setup-pr.json](../output/pull-requests/setup-pr.json).

### H170 Preparar lanet.es a Cloudflare — migració en curs

**12 d’oct. 2026, 12:25 · T69-01, parcial.** Zona Free creada al compte existent, `lanet.es` i `www.lanet.es` vinculats al projecte Pages i dos CNAME amb proxy preparats. Configurats Full (strict), HTTPS obligatori i TLS mínim 1.2. Set proves locals correctes per a l'origen propi, redireccions i protecció dels àlies/OAuth. IONOS requereix login i Google Cloud està bloquejat per un permís desat del navegador. Delegació, certificat i callback pendents; producció 0.6.1 continua a l'origen anterior. La tasca no es dona per verificada i no s'ha publicat la migració.

Evidències: [pla del domini](PLA-DOMINI-LANET-ES.md), [configuració preparada](../output/domain-lanet-es/provider-prepared.json), [DNS](../output/domain-lanet-es/cloudflare-dns.jpg), [proves locals](../output/domain-lanet-es/local-checks.json). Les captures i respostes del proveïdor es conserven localment fora del repositori públic.

### H171 Repartir fitxes directament al tapet complet

**12 d’oct. 2026, 13:36 · T70-01.** Tapet complet amb les 157 posicions actives alhora, sense selectors de tipus. Fitxes sobre números, línies, cantonades, files, zero, columnes i exteriors; cobertura il·luminada i previsualització del retorn. Responsive amb zones separades i navegació per fletxes/Intro. Desfer, límits, animació i recuperació preservats; sense canvis de sorteig, probabilitats o liquidació. Publicada 0.6.2 amb PR/CI i rebut confirmats.

Evidències: [docs/PLA-TAPET-DIRECTE.md](../docs/PLA-TAPET-DIRECTE.md), [docs/releases/0.6.2.json](../docs/releases/0.6.2.json), [output/direct-board/browser/results.json](../output/direct-board/browser/results.json), [output/direct-board/transition/results.json](../output/direct-board/transition/results.json), [output/direct-board/unit.log](../output/direct-board/unit.log), [output/direct-board/typecheck.log](../output/direct-board/typecheck.log), [output/direct-board/build.log](../output/direct-board/build.log), [output/direct-board/source-audit.log](../output/direct-board/source-audit.log), [output/roulette-animation/results.json](../output/roulette-animation/results.json), [output/direct-board/provider-before.json](../output/direct-board/provider-before.json), [output/direct-board/provider-after.json](../output/direct-board/provider-after.json), [output/direct-board/ci-success.json](../output/direct-board/ci-success.json), [output/direct-board/delivery.json](../output/direct-board/delivery.json), [output/releases/0.6.2/receipt.json](../output/releases/0.6.2/receipt.json).

### H172 Afegir accés a la NET oficial amb icona 3D

**12 d’oct. 2026, 14:58 · T71-01.** Accés La NET oficial a sidebar oberta/plegada i menú Més, amb logotip aportat reinterpretat en 3D, transparència i WebP de 13 KB. Enllaç exacte a login.net.fje.edu en pestanya nova, amb nom accessible, noopener/noreferrer i tancament de Més. Disposició i teclat verificats amb fixtures locals. Publicada 0.6.3 amb PR/CI i rebut confirmats.

Evidències: [docs/PLA-NET-OFICIAL.md](../docs/PLA-NET-OFICIAL.md), [docs/releases/0.6.3.json](../docs/releases/0.6.3.json), [public/images/ui/official-net-3d-v1.webp](../public/images/ui/official-net-3d-v1.webp), [output/official-net/local-checks.json](../output/official-net/local-checks.json), [output/official-net/mobile/results.json](../output/official-net/mobile/results.json), [output/official-net/unit.log](../output/official-net/unit.log), [output/official-net/typecheck.log](../output/official-net/typecheck.log), [output/official-net/build.log](../output/official-net/build.log), [output/official-net/source-audit.log](../output/official-net/source-audit.log), [output/official-net/1440.png](../output/official-net/1440.png), [output/official-net/320.png](../output/official-net/320.png), [output/official-net/collapsed.png](../output/official-net/collapsed.png), [output/official-net/provider-before.json](../output/official-net/provider-before.json), [output/official-net/provider-after.json](../output/official-net/provider-after.json), [output/official-net/ci-success.json](../output/official-net/ci-success.json), [output/official-net/delivery.json](../output/official-net/delivery.json), [output/releases/0.6.3/receipt.json](../output/releases/0.6.3/receipt.json).

### H173 Polir navegació, perfil i ponderacions PAU

**12 d’oct. 2026, 16:53 · T72-01.** Publicada 0.6.4: ponderacions visuals, icona NET pastel i logout al perfil, amb CI verda, release immutable i fitxers publicats verificats.

Evidències: [docs/releases/0.6.4.json](../docs/releases/0.6.4.json), [docs/PLA-NET-PASTEL.md](../docs/PLA-NET-PASTEL.md), [output/net-pastel/public-verification.json](../output/net-pastel/public-verification.json), [output/pau-visual-verified/pau-browser-results.json](../output/pau-visual-verified/pau-browser-results.json), [output/profile-logout/results.json](../output/profile-logout/results.json), [output/releases/0.6.4/receipt.json](../output/releases/0.6.4/receipt.json).

### H174 Connectar lanet.es, validar HTTPS i migrar l’origen principal

**12 d’oct. 2026, 16:53 · T69-01.** Domini lanet.es publicat com a principal a 0.6.4, www redirigeix i HTTPS vàlid en ambdós; callback Google, dades i correu preservats. Propagació DNS encara possible en caches antigues.

Evidències: [docs/releases/0.6.4.json](../docs/releases/0.6.4.json), [docs/PLA-DOMINI-LANET-ES.md](../docs/PLA-DOMINI-LANET-ES.md), [output/domain-lanet-es/activation-check.json](../output/domain-lanet-es/activation-check.json), [output/net-pastel/public-verification.json](../output/net-pastel/public-verification.json), [output/net-pastel/cloudflare-domains-active.png](../output/net-pastel/cloudflare-domains-active.png), [output/releases/0.6.4/receipt.json](../output/releases/0.6.4/receipt.json).
