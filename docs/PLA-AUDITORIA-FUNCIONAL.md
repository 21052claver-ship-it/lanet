# Auditoria funcional integral

La petició de Marc és comprovar tots els botons i totes les funcions de La Net. El punt de partida és la versió 0.6.16 publicada, amb la CI completa verda del commit `7f267bb342ecf6dc27040fbe104cb556db86ad51`.

Tasca verificada: T82-01 · requisit R104 · historial H197.

## Abast

- Inventariar els controls i handlers de totes les pàgines, formularis i components compartits.
- Associar cada família d’accions amb un recorregut provat o una justificació: accés, navegació, agenda, continguts, plusos, notes, estudi, comunitat, PAU, pastisseria, gestió i dashboard privat.
- Comprovar els rols, estats buits, validació, cancel·lació, desament/recàrrega, doble clic, errors i recuperació, exportacions i navegació amb teclat i mòbil.
- Corregir incidències reproduïbles i comprovar les regressions relacionades sobre una compilació fixa.

## Procediment i evidències

Les comprovacions utilitzen exclusivament dades fictícies locals. No s’accedeix a l’aplicació pública ni es carreguen dades o perfils reals. Les evidències de treball es desen a `output/functional-audit-0.6.16/`, ignorat per Git.

S’aprofita la CI exacta ja executada per a la versió publicada i s’afegeixen proves concretes dels buits trobats. Un inventari estàtic de controls no demostra el seu funcionament: cal contrastar-lo amb fluxos, efectes observables i dades desades.

Els resultats, incidències i límits de cobertura s’incorporaran en completar la tasca. Si apareixen errors de producte, els canvis es consolidaran abans de qualsevol pujada o publicació.
## Resultats locals · 15 d’octubre de 2026

Inventari: **614 definicions de controls, 324 definicions de botó i 29 formularis en 51 fitxers**. Les dues aparents absències de handler són adaptadors vàlids de ui.jsx: el tancament gestionat per Radix Dialog.Close i el botó submit de FormFooter. Els destins literals de diàleg tenen una implementació registrada.

S’han executat 39 escenaris nous en Chromium/Firefox/WebKit, més 127 comprovacions addicionals de música, activitats, pujades, retenció, pastisseria i compatibilitat: **166 recorreguts addicionals**, més 13 de WebKit/Linux sobre la correcció d’àudio, i 449 proves unitàries i 62 fluxos sobre D1/R2 locals reals. Chrome i Edge s’han executat amb els navegadors instal·lats; iPhone 13 i Pixel 7 són simulacions. La resta de recorreguts s’ha contrastat amb la CI completa de la branca actualitzada i del commit de main.

Incidència de producte corregida: GoalForm utilitzava target || 8 i substituïa un zero vàlid per 8 en reobrir. Ara utilitza target ?? 8. La regressió va fallar abans de la correcció i passa en els tres motors després de desar, recarregar i reobrir.

També s’han actualitzat proves antigues a l’agenda amb revisió de delegats, l’ocultació dels identificadors privats, el límit de reclamacions/ofertes i el lazy loading. Les proves de taules de validació aïllen els pressupostos temporals entre casos independents; la protecció real continua activa dins de cada escenari i té regressions específiques. La capçalera compacta permet files múltiples i comprova separació bidimensional, el logo complet i àrees tàctils de 44 px. No s’han relaxat els permisos ni els límits del producte per passar proves.

## Correcció de compatibilitat trobada a CI

La PR va detectar un segon error real, reproduït també en Ubuntu 24.04 local: després de saltar a una posició i reprendre música, WebKit/Linux avançava currentTime però mantenia play() pendent i la capçalera continuava carregant. La repetició acotada de CI sobre el mateix commit va confirmar que calia investigar-lo. Sense salt de posició funcionava; esperar seeked tampoc el resolia.

StudyAudio ara accepta avanç real de reproducció, conserva la instància/posició/volum i cancel·la les esperes en pausar, aturar o substituir el disc. Els tres observadors només existeixen mentre s’inicia la reproducció i es retiren en tots els camins; no hi ha timers, polling ni peticions addicionals. Els salts de posició i els elements quiets/pausats no poden simular una confirmació. Tres regressions unitàries noves verifiquen el cas i la neteja; la prova de navegador original es conserva sense relaxar els seus criteris. Referència del contracte multimèdia: [HTML Standard](https://html.spec.whatwg.org/multipage/media.html#dom-media-play).

Evidències privades: linux-music-before.log (fallada reproduïda), linux-music-no-seek.log, linux-music-seek-wait.log, linux-music-fixed.log, music-fixed.log i unit-final.log dins output/functional-audit-0.6.16. Una pujada inicial i una única correcció a la mateixa PR; una sola publicació de producte.

## Mapa de famílies i recorreguts

Aquesta correspondència associa controls amb recorreguts provats; no és una mesura de cobertura de línies ni una prova de totes les combinacions possibles.

| Àmbit | Accions comprovades | Suites locals |
| --- | --- | --- |
| Accés i navegació | Entrada/cancel·lació, configuració, menú, canvi de secció, perfil i sortida; errors i reintents. | `test:onboarding`, `test:mobile-navigation`, `test:responsive`, `test:browser`, `test:workspace-recovery`, `test:functional-controls`, `test:api` |
| Agenda i dates | Setmanes/dies, calendari, guia, alta/edició, privat/públic, delegats, duplicats, tasques, contactes i notificacions. | `test:official-schedule`, `test:schedule-cards`, `test:delegate-agenda`, `test:student-guide`, `test:api` |
| Continguts i adjunts | Filtres, cerca, materials, formularis, eines, publicar/editar/retirar, compra, PDF/vídeo, descàrregues, revisió i esborranys. | `test:contents`, `test:subject-workspaces`, `test:fast-uploads`, `test:uploads`, `test:workspace-recovery`, `test:api` |
| Notes i avaluació | Notes/zeros, pesos, plusos, activitats, nota anual, discret, CSV, desfer, recuperar plantilla i objectiu. | `test:course-grades`, `test:grade-activities`, `test:functional-controls`, `test:preferences`, `test:api` |
| Plusos i comunitat | Publicar/editar/retirar plusos, calendari privat únic, likes/desats, propostes/vots, avisos i denúncies. | `test:reactions`, `test:functional-controls`, `test:delegate-agenda`, `test:api` |
| Gestió i analítica | Catàleg, centre, classes, plantilles, comptes/sessions, revisions, propietari exclusiu, períodes i paginació. | `test:functional-controls`, `test:activity-dashboard`, `test:api` |
| Estudi i música | Temporitzador, continuïtat, alarma, focus, cua offline, biblioteca, transports, volum, final de pista i recuperació. | `test:focus-mode`, `test:music`, `test:preferences`, `test:browser`, `test:devices` |
| PAU i històric | Simulació, desament privat, conflictes, top 5, ordenació, comparació, gràfics/rondes, taula i exportació. | `test:pau`, `test:pau-top5`, `test:pau-history`, `test:api` |
| Pastisseria i jocs | Pastís diari, reclamació idempotent, sala secreta, apostar, desfer fitxes, resultat/cobrament, prediccions i permisos. | `test:bakery-minute`, `test:predictions`, `test:roulette-board`, `test:roulette-animation`, `test:roulette-panorama`, `test:roulette-sound`, `test:secret-room`, `test:abuse`, `test:api` |
| Cartells | Tres espais, text/imatge, retall, anonimat, import, concurrència, cancel·lació i eliminació segura de fitxers. | `test:roulette-board`, `test:ad-retention`, `test:uploads`, `test:abuse`, `test:api` |
| Controls i formularis compartits | Select/teclat, filtres, adjunts, formularis, validació, cancel·lació, focus del diàleg i identificació de la finestra pendent. | `test:functional-controls`, `test:workspace-recovery`, `test:preferences`, `test:browser`, `test:subject-workspaces`, `test:contents`, `test:course-grades`, `test:uploads` |

## Inventari per fitxer

| Fitxer | Botons | Formularis | Família de recorreguts |
| --- | ---: | ---: | --- |
| `src/App.jsx` | 25 | 0 | Accés i navegació |
| `src/art.jsx` | 0 | 0 | Accés i navegació |
| `src/Auth.jsx` | 3 | 0 | Accés i navegació |
| `src/components/AgendaList.jsx` | 2 | 0 | Agenda i dates |
| `src/components/AssessmentEditor.jsx` | 5 | 0 | Notes i avaluació |
| `src/components/BakerScene.jsx` | 1 | 0 | Pastisseria i jocs |
| `src/components/BannerComposer.jsx` | 4 | 1 | Cartells |
| `src/components/BannerImageEditor.jsx` | 6 | 0 | Cartells |
| `src/components/ContentLibrary.jsx` | 19 | 0 | Continguts i adjunts |
| `src/components/CourseGrades.jsx` | 12 | 2 | Notes i avaluació |
| `src/components/CourseSetup.jsx` | 4 | 1 | Accés i navegació |
| `src/components/Delegates.jsx` | 6 | 1 | Agenda i dates |
| `src/components/EventEditor.jsx` | 4 | 1 | Agenda i dates |
| `src/components/FocusMode.jsx` | 7 | 0 | Estudi i música |
| `src/components/GoogleSignIn.jsx` | 1 | 0 | Accés i navegació |
| `src/components/GradePrivacy.jsx` | 1 | 0 | Notes i avaluació |
| `src/components/MusicPlayer.jsx` | 8 | 0 | Estudi i música |
| `src/components/OfficialNetLink.jsx` | 0 | 0 | Accés i navegació |
| `src/components/Onboarding.jsx` | 1 | 0 | Accés i navegació |
| `src/components/OptionsMenu.jsx` | 0 | 0 | Controls i formularis compartits |
| `src/components/PauChoices.jsx` | 6 | 0 | PAU i històric |
| `src/components/PauHistory.jsx` | 2 | 0 | PAU i històric |
| `src/components/PdfAttachment.jsx` | 4 | 0 | Continguts i adjunts |
| `src/components/PredictionRoom.jsx` | 19 | 3 | Pastisseria i jocs |
| `src/components/ResearchGrade.jsx` | 1 | 1 | Notes i avaluació |
| `src/components/RouletteBoard.jsx` | 6 | 0 | Pastisseria i jocs |
| `src/components/SchoolCalendar.jsx` | 1 | 0 | Agenda i dates |
| `src/components/SchoolGuide.jsx` | 0 | 0 | Agenda i dates |
| `src/components/SecretCasino.jsx` | 14 | 1 | Pastisseria i jocs |
| `src/components/Select.jsx` | 2 | 0 | Controls i formularis compartits |
| `src/components/SubjectFilter.jsx` | 3 | 0 | Controls i formularis compartits |
| `src/components/SubjectPicker.jsx` | 3 | 0 | Controls i formularis compartits |
| `src/components/VideoAttachment.jsx` | 0 | 0 | Continguts i adjunts |
| `src/components/WoodBoard.jsx` | 2 | 0 | Cartells |
| `src/form-utils.jsx` | 3 | 0 | Controls i formularis compartits |
| `src/forms-admin.jsx` | 2 | 6 | Gestió i analítica |
| `src/forms-general.jsx` | 4 | 7 | Controls i formularis compartits |
| `src/forms-resources.jsx` | 20 | 5 | Controls i formularis compartits |
| `src/forms.jsx` | 3 | 0 | Controls i formularis compartits |
| `src/pages/Admin.jsx` | 3 | 0 | Gestió i analítica |
| `src/pages/Bakery.jsx` | 9 | 0 | Pastisseria i jocs |
| `src/pages/Community.jsx` | 12 | 0 | Plusos i comunitat |
| `src/pages/Grades.jsx` | 11 | 0 | Notes i avaluació |
| `src/pages/Management.jsx` | 12 | 0 | Gestió i analítica |
| `src/pages/Notes.jsx` | 17 | 0 | Continguts i adjunts |
| `src/pages/Pau.jsx` | 12 | 0 | PAU i històric |
| `src/pages/Pluses.jsx` | 5 | 0 | Plusos i comunitat |
| `src/pages/Schedule.jsx` | 23 | 0 | Agenda i dates |
| `src/pages/Study.jsx` | 5 | 0 | Estudi i música |
| `src/pages/WeekTimeline.jsx` | 2 | 0 | Agenda i dates |
| `src/ui.jsx` | 9 | 0 | Controls i formularis compartits |

## Límits i publicació

No s’ha visitat la web pública ni la seva API. Les identitats, fitxers, sessió Google i servei d’inspecció són fixtures; no s’ha fet un inici de sessió real a Google ni una prova en dispositius físics. Les destinacions externes es revisen com a enllaços i contractes, sense executar accions en serveis externs.

La 0.6.17 consolida la correcció i aquestes regressions en una sola branca/PR. Publicació completada amb Validate verd al commit actualitzat, CI de main i rebut del proveïdor. No requereix migracions, canvis D1/R2, reconfigurar serveis privats, regals o reinicis. Les captures i dades fictícies de proves continuen ignorades per Git.

Evidències privades: output/functional-audit-0.6.16/action-inventory.json, coverage.json, unit-final.log, api-seventh.log i resultats de navegador; output/ad-retention/browser/results.json. Publicació i rebut contrastats a docs/releases/0.6.17.json i output/functional-audit-0.6.16/provider-verification.json.

Publicació completada: [0.6.17](https://github.com/21052claver-ship-it/lanet/releases/tag/v0.6.17) · [PR39](https://github.com/21052claver-ship-it/lanet/pull/39) · [CI de main](https://github.com/21052claver-ship-it/lanet/actions/runs/38652576530) · [Informe](releases/0.6.17.md). Commit 36631c5d37896318f3b38cb27fd2858322cd73a4; proveïdor i rebut immutable verificats. La CI de PR ha requerit una reexecució acotada del grup d’àudio després d’un error reproduït i corregit a WebKit/Linux; 13 escenaris Linux correctes. Una pujada inicial i una correcció de branca i una publicació, sense segon push documental.
