# Historial de versions

Cada publicació nova té una versió SemVer, un tag Git immutable, una release de GitHub i un registre de desplegament a l’entorn production.

## [0.6.22] - 2026-10-17

- Horari amb selecció del dia coherent amb Avui, alta contextual i agenda mensual; columnes consistents per a dates solapades, franges curtes fidels i files completes per llegir i obrir dates/classes tapades.
- Exportació de la setmana amb les classes, hores, aules i professorat real per dia; dates entre mesos/anys i calendari ICS amb text UTF-8 ben plegat.
- Accés separat al panell de delegats a la barra lateral i al menú mòbil, visible només per a delegats i subdelegats assignats, amb els permisos existents.
- Tasques amb seguiment personal coherent des de l’agenda i els continguts: bloqueig de clics repetits, recuperació d’errors i estat confirmat conservat si falla la sincronització. Les tasques vençudes fetes tornen a aparèixer quan s’inclouen i deixen de marcar-se com a pendents.
- Plusos del calendari associats a totes les assignatures d’origen, també després de retirar l’activitat, i agenda contextual amb els filtres conservats en recarregar.
- Consultes d’apunts només després de lectura visible: respostes antigues i canvis de pestanya no poden activar comptadors en segon pla ni temporitzadors duplicats.
- Accions del detall separades i adaptables; caselles de tasca amb àrea tàctil de 44 px. Simulacions entre alumnes i delegats, continuïtat d’estudi i regressions als tres motors integrades a CI.
- Reforç dels PDF contra capçaleres/finals falsos, índexs inexistents i contingut afegit al final; noms d’adjunts més estrictes i previsualització amb límits de píxels. Revalidació dels PDF antics una sola vegada, sense còpies R2 ni migracions. Aquestes comprovacions no són un antivirus ni una certificació de contingut innocu.

## [0.6.21] - 2026-10-15

- Mode focus amb selector visible entre Amb Pomodoro i Estudi lliure, només amb fons i música opcional. Canviar a lliure pausa el comptador sense perdre la sessió; reprendre requereix una acció explícita.
- Ambient, elecció i silenci conservats per usuari. Controls musicals visibles inicialment, alarma del Pomodoro i sons de ruleta actius per defecte amb el silenci/volum zero desats respectats.
- Rellotge sense interval mentre està pausat; cap consulta, migració o càrrega D1/R2 nova. Regressions locals de modes, pausa, so, música compartida i accessibilitat en tres motors.

## [0.6.20] - 2026-10-15

- Pestanyes de Comunitat i Gestió visibles en files en mòbil i paisatge tàctil; Delegats, Notificacions i Revisions accessibles sense desplaçar-les lateralment.
- Títols, noms i propostes llargs de Comunitat s’adapten a la columna; data i edició conserven espai propi. Botons amb text adaptable i icones estables.
- Capçalera de la sala de joc amb controls que passen de fila quan falta espai, també a 320 px.
- Variants i comptes de Gestió en targetes llegibles fins a 1100 px, amb etiquetes i accions visibles; taula conservada a escriptori. Edició del catàleg amb objectius tàctils de 44 px i noms accessibles.
- Auditoria local de nou seccions i regressions de redimensionat, paisatge, contingut llarg, formularis i controls curts en tres motors. Cap consulta, polling, operació D1/R2, migració o canvi de permisos nou.

## [0.6.19] - 2026-10-15

- Els delegats i subdelegats publiquen directament exàmens, tasques i altres dates públiques dins del seu àmbit. Les edicions pròpies també es publiquen directament, sense tornar a la cua de revisió.
- El formulari mostra «Publicar ara» i els destinataris segons els permisos comprovats pel servidor. Si canvien els permisos, es revisen abans de desar i el missatge reflecteix l’estat real.
- Administradors coherents amb la seva autoritat; els membres i representants fora d’àmbit continuen enviant propostes. Es conserven privacitat, duplicats, coincidències, control de revisions i auditoria atòmica, sense avisos propis redundants.
- Mateixes taules i consultes: cap migració, polling, operació R2 ni desplegament privat nous.

## [0.6.18] - 2026-10-15

- Les notificacions prioritzen els avisos sense llegir: l’històric recent ja no n’amaga d’antics. Bústia de fins a 100 avisos, amb excés explícit i lots successius sense perdre noves arribades.
- Lectura individual o agrupada amb una sola escriptura D1 idempotent i limitada al compte autenticat. El comptador conserva les lectures confirmades encara que falli la recàrrega.
- Actualització en entrar a la bústia, botó de reintent i errors visibles. Accés a la data, correcció de la proposta i cua de validació dels delegats des dels avisos.
- Comptador accessible que distingeix notificacions sense llegir i propostes per validar. Regressions locals en mòbil/escriptori i D1 real, afegides a CI. Índex parcial additiu 0030 per cercar directament els no llegits sense escanejar l’històric; cap dada modificada, taula, polling ni operació R2 nova.

## [0.6.17] - 2026-10-15

- Un objectiu de nota desat com a zero es conserva en reobrir el formulari, sense substituir-lo pel valor inicial de 8.
- La represa musical reconeix l’avanç real de l’àudio quan WebKit manté `play()` pendent després d’un salt de posició. Es conserven disc, posició i volum, amb observadors limitats a l’inici i cancel·lats en pausar o aturar.
- Auditoria dels controls i formularis de totes les seccions, amb regressions de gestió, permisos, retirada de contingut, propostes, avisos, plusos, recuperació de plantilles i tancament de sessió amb reintent.
- Proves generals de D1/R2 locals actualitzades a l’agenda amb validació de delegats i als límits vigents d’abús; comprovacions de pujades diferides i de controls mòbils sense solapament.
- CI ampliada amb les regressions funcionals i les proves de música, activitats de notes, pujades segures, retenció de cartells i pastisseria. Cap migració ni canvi de retenció, recursos de producció o regals.

## [0.6.16] - 2026-10-14

- Primera entrada a pantalla completa amb presentació visual, itinerari, optatives/professorat i revisió de l’horari oficial. Progrés recuperable per compte, focus per pas, mòbil/horitzontal i moviment reduït.
- Retirat el xat/Dubtes, les preguntes des de materials i l’API de converses. Continguts queda centrat en materials, formularis i eines; enllaços antics restauren Materials i l’històric es conserva.
- Alta de tasques i exàmens des de la classe, audiència privat/públic, propostes revisades per delegats del mateix àmbit, duplicats/solapaments, contactes i notificacions persistents.
- Dashboard privat d’activitat del compte Google autoritzat: presència aproximada, resums diaris, mostreig limitat, detall paginat i inventari incremental sense enumerar R2.
- Polling pausat en inactivitat, retenció limitada de l’analítica i manteniment D1/R2 coordinat amb concessió compartida, estat d’últim èxit i cua de retirades. La gestió acadèmica conserva els permisos a #management.
- Pomodoro amb continuïtat automàtica, alarma original i mode focus amb opcions, cua offline idempotent i dia original conservat.
- Històric oficial de notes de tall 2022–2026, gràfic/mitjana/cobertura, rondes separades i comparació top 5 amb dades absents explícites; càrrega diferida sense alterar notes personals.
- Logo complet a la capçalera mòbil amb proporcions i controls preservats.
- Mostreig d’activitat compatible amb navegadors sense `Object.hasOwn`; regressions de focus/reaccions adaptades a l’interval de sincronització sense alterar la resposta visual immediata.
- Esquemes additius 0028/0029 i roster privat; la publicació requereix còpia privada revisada i aplicació separada. Cap rol global, regal, reinici o contingut acadèmic modificat per les migracions.

## [0.6.15] - 2026-10-14

- Continguts s’organitza en espais visuals per assignatura, amb temes d’un sol nivell, filtre de trimestre i alta de materials contextual.
- Formularis revisats i eines dins de l’assignatura; accés directe a l’agenda, pròximes dates i alta d’examen o tasca amb assignatura seleccionada.
- Dubtes per grup i variant matriculada: fils amb material relacionat, respostes, resolució, informes i retirada; permisos al servidor, paginació, límits i reintents idempotents.
- Esborranys de dates, preguntes i respostes en aquest dispositiu; errors recuperables i protecció contra enviaments duplicats.
- Desats i Els meus continuen accessibles independentment de les assignatures preferides; cerca global de materials i càrrega progressiva.
- Alta de dates amb tipus visual, audiència explícita i opcions secundàries desplegables. Navegació per assignatura restaurable després de recarregar.
- El validador de releases accepta una única correcció documentada i continua rebutjant entrades buides.

Inclou la correcció preparada com a 0.6.14, que no es va arribar a publicar:

- Publicar una proposta des d’una pestanya antiga conserva l’esborrany d’una altra pestanya, encara que ja existís abans de prémer Publicar. La neteja compara el contingut enviat, amb regressió real de dues pestanyes en tres motors.

## [0.6.13] - 2026-10-14

- Els canvis ràpids de volum i disc es desen en ordre; els canvis pendents s’agrupen i conserven l’últim valor de cada preferència.
- El perfil desa només els ajustos editats: no substitueix el mode discret, la música o altres preferències actualitzades mentre estava obert.
- El volum evita peticions duplicades entre teclat, punter i pèrdua de focus, amb possibilitat de tornar a desar després d’un error.
- Els missatges de confirmació es col·loquen per damunt de la navegació mòbil, també en horitzontal, i no intercepten els controls.
- La confirmació d’una proposta conserva els esborranys nous començats mentre s’enviava; editar una proposta existent tampoc esborra una idea pendent.
- Regressions de preferències en tres motors i diagnòstic de frames d’àudio no finits sense relaxar la comprovació de senyal audible.

## [0.6.12] - 2026-10-14

- M’agrada, desats i vots s’actualitzen en prémer, amb confirmació lleugera de l’estat i comptador del servidor sense esperar una recàrrega completa.
- Seguiment compartit entre targetes i detalls, bloqueig de clics duplicats, reversió en errors i resincronització de respostes perdudes; permisos i recompenses idempotents preservats.
- Les recàrregues descartades durant accions simultànies es recuperen en acabar l’última escriptura, perquè una reacció no retardi els altres desaments.
- Estats activats més visibles amb icones plenes, fons i contorns diferenciats, hover, focus de teclat i àrees tàctils accessibles; els controls pendents conserven el contrast.

## [0.6.11] - 2026-10-13

- Classificació acumulativa del centre aplicada a la nota final i a la previsió PAU quan no hi ha pesos personals desats; configuracions existents preservades i pesos orientatius identificats.
- Calendari BAT2 2026–27 amb trimestrals, TR, activitats i PAU/PAP contrastades: rangs complets, dates passades opcionals i exportació ICS.
- Calculadora privada de Treball de Recerca amb pesos 30/42/21/7, mode discret i desament explícit en aquest navegador; guia del curs amb recursos i límit compartit dels plusos acadèmics i de voluntariat.

- Captura immediata dels esborranys de notes, plusos i TR per conservar el text mentre acaben operacions anteriors.

## [0.6.10] - 2026-10-13

- Editar una variant conserva el professorat de cada dia, les indicacions de treball personal i els identificadors de franja, també amb formularis antics.
- L’editor distingeix professorat general, professorat específic i treball personal; modes invàlids, IDs aliens i solapaments no poden modificar altres franges.

## [0.6.9] - 2026-10-13

- Horaris BAT2 2026–27 del document oficial aportat: tres itineraris, hores i pauses reals, professorat i aules per dia, i bloc continu de matemàtiques de divendres.
- Configurador visual en tres passos: itinerari, optatives i professorat, i resum setmanal abans de desar. Selecció amb colors i icones, teclat, perfil connectat i recuperació d’errors.
- Validació de combinacions al servidor i avís als comptes existents per confirmar el nou horari; qualificacions, continguts i referències conservats. Tutoria sense exàmens ni impacte en la previsió PAU.
- Migració de catàleg separada del desplegament, amb còpia privada i comprovació d’integritat; proves exhaustives de les 208 combinacions i fluxos locals en tres navegadors.

## [0.6.8] - 2026-10-13

- Sons suaus de fitxa, bola que s’alenteix i pastissos que arriben al saldo; generats localment sense fitxers ni descàrregues.
- Control accessible per silenciar els sons, amb preferència desada; sense autoplay, repetició en recuperar apostes ni sons pendents en sortir o amagar la pestanya.
- Els efectes respecten la música i el joc continua funcionant si el navegador no permet àudio.

## [0.6.7] - 2026-10-13

- Ruleta integrada a la pàgina, amb barra superior i navegació accessibles; s'elimina la sala que ocupava tota la finestra.
- Disposició del joc adaptada a l'amplada real del contingut, també amb barra lateral desplegada.

## [0.6.6] - 2026-10-13

- La sala de ruleta ocupa tota la finestra, sense marges exteriors ni cantonades que deixin veure la plataforma de sota.
- Comprovació dels quatre límits de pantalla en Chromium, Firefox i WebKit, també en mòbil.

## [0.6.5] - 2026-10-13

- Sala de ruleta panoràmica: roda i crupier al costat del tapet, fitxes i botó de girar, sense scroll del joc a 1280×720 o superior.
- Número i caselles guanyadores ressaltats en acabar el gir, incloses les posicions premiades amb fitxes; zero i neteja de les marques entre girs.
- Regles, historial i detall de fitxes desplegables; sala accessible amb focus contingut i retorn al forn amb Escape.

## [0.6.4] - 2026-10-12

- Domini principal lanet.es, callback Google propi i redireccions web dels àlies; configuració preparada per publicar després de confirmar DNS i HTTPS.

- Ponderacions PAU amb icones i colors per matèria, coeficients destacats, aportació màxima i les dues millors aportacions identificades respectant el mode discret.

- Botó «Tancar sessió» a El meu perfil, amb estat d’espera i reintent segur en cas d’error de connexió.

- Icona de la NET oficial renovada segons la referència de Marc: volum arrodonit, raigs blancs més prominents i blau pastel.
- Asset transparent optimitzat i compartit entre sidebar, barra plegada i menú Més.

## [0.6.3] - 2026-10-12

- Accés «La NET oficial» a la barra lateral i al menú Més del mòbil, amb enllaç al portal FJE en una pestanya nova.
- Logotip aportat reinterpretat en 3D, amb transparència i WebP optimitzat per a les barres oberta i plegada.

## [0.6.2] - 2026-10-12

- Tapet complet amb les 157 posicions actives alhora: números, línies, cantonades, files, zero i exteriors, sense selectors de tipus.
- Fitxes a la posició real, números coberts il·luminats i previsualització del retorn de cada aposta.
- Tapet vertical al mòbil i horitzontal quan hi ha espai, amb navegació per fletxes/Intro i zones accessibles.
- Desfer, límits, bloqueig durant el gir, animació i recuperació preservats; cap canvi de sorteig, probabilitats o saldo.

## [0.6.1] - 2026-10-12

- Corregides les icones i la cerca sense accents de les preferències d’assignatures.
- Les respostes de formularis tancats ja no tanquen un diàleg obert posteriorment.
- Editor d’apunts protegit durant la càrrega; errors de connexió clars i sortida de sessió recuperable sense peticions duplicades.
- Gestió del centre amb reintent de connexió, avís netejat en recuperar-se i protecció contra respostes antigues.
- 21 regressions de recuperació en tres motors afegides a CI.

## [0.6.0] - 2026-10-12

- El creador pot ser el responsable del resultat: Jo mateix seleccionat per defecte, o altra persona opcional.
- Les apostes pròpies s’obren en crear-les; el creador confirma A/B després del tancament amb justificació pública.
- El responsable no hi pot apostar. Terminis, retorns, límits i liquidació única preservats.
- Migració compatible que conserva mercats, rowids, apostes, historial i saldos; proves de preservació i flux en tres motors.

## [0.5.1] - 2026-10-12

- Targetes de l’horari sense lletres comprimides ni línies tallades.
- Contingut adaptat a l’alçada i amplada reals: menys informació en esdeveniments curts o simultanis, amb detall complet accessible.
- Proves de durades de 10 a 120 minuts, esdeveniments simultanis i accés al detall en tres motors i cinc amplades.

## [0.5.0] - 2026-10-12

- Nou escenari de prediccions amb la senyora sencera al costat d’una pissarra emmarcada en fusta.
- Apostes com papers penjats, amb filtres, creació i detall accessibles al mòbil i amb teclat.
- Nou control visual local en tres motors a 320, 768 i 1440 px; fluxos de pastissos preservats.


## [0.4.1] - 2026-10-12

- Botó «Crear aposta» sempre accessible en llista i detall per a qualsevol alumne autenticat.
- Formulari i estat buit amb nom coherent; cancel·lar conserva l’aposta anterior.
- Després de crear des d’una altra aposta, la sincronització conserva el detall de l’aposta nova.
- Proves de creació des del detall a 320 i 390 px i del flux complet en tres motors, incorporades a CI.

## [0.4.0] - 2026-10-12

- Proteccions antiabús persistents per compte i operació, amb límits atòmics que no es reinicien canviant d’IP.
- Publicacions duplicades frenades durant 10 minuts, també amb enviaments concurrents o camps aleatoris ignorats.
- Pauses temporals progressives i espera explícita; consultar dades i tancar sessió continua disponible.
- JSON amb límits de complexitat i claus de prototip rebutjades. Registres antiabús sense contingut ni identificadors en clar.
- Proves de concurrència, recuperació, quotes, permisos i ús normal; formularis conservats davant d’errors en tres motors.

## [0.3.1] - 2026-10-12

- Bola i roda amb una trajectòria contínua compartida, descens a la casella i desacceleració final.
- Premi revelat després del gir: celebració, pastissos volant al moneder i saldo actualitzat al final. L’historial també espera.
- Retorns parcials diferenciats dels guanys nets; moviment reduït, sortida i recuperació sense duplicar liquidacions.
- Proves locals de geometria, saldo durant sincronitzacions, celebració i interrupcions en tres motors.


## [0.3.0] - 2026-10-12

### Afegit
- Tapet de ruleta europea amb 157 posicions: números, cavalls, cantonades, files, zona del zero, columnes, dotzenes i apostes exteriors.
- Repartiment de diverses fitxes per gir, valors 1/5/10/25/100, desfer, retirar i revisió dels retorns.
- Liquidació atòmica del gir complet, recuperació després de reconnexió i historial compatible amb les apostes anteriors.
- Tauler adaptat a mòbil, controls de teclat i bloqueig durant el gir.

## [0.2.1] - 2026-10-12

### Millorat
- Més al mòbil mostra tots els apartats en dues files compactes sobre la barra inferior.
- Noms breus, icones, secció activa i focus contextual; perfil i propostes separats de la navegació.
- Tancament ràpid i compatibilitat amb 320 px, paisatge, teclat i moviment reduït.

## [0.2.0] - 2026-10-12

### Afegit
- Repositori públic 21052claver-ship-it/lanet, amb autoria 21052.claver@fje.edu.
- CI en Node 24, controls de codi i navegadors Chromium, Firefox i WebKit.
- Publicació versionada: commit exacte, CI obligatòria, Cloudflare Pages, GitHub Deployment i release amb rebut verificable.
- Auditoria de fitxers publicables, plantilles i instruccions per mantenir el registre en versions futures.

### Millorat
- Més al mòbil desplega una graella sobre la barra inferior; icones, secció activa, perfil i propostes.
- Tancament amb Més, creu, fons, Escape o canvi de secció, focus accessible i adaptació a paisatge.

- Formulari de plusos llegible a 320 px, amb dates i hores ajustades i selectors sense compressió vertical.
- Música en Vorbis quan el navegador no anuncia suport MP3; codecs de Linux instal·lats explícitament a CI.
- Recuperació a Vorbis si el descodificador rebutja un MP3 anunciat com a compatible, amb reintent limitat i neteja d’errors.
- Sortida virtual PulseAudio a CI i comprovació que la música avança realment, a més de reproducció i pausa.

### Preservat
- Adreça lanet.pages.dev, Google únic @fje.edu, D1/R2 i serveis privats.
- Continguts, PAU, notes, música, anuncis, pastisseria i prediccions de la plataforma existent.

## Historial anterior

L’evolució anterior al primer repositori Git públic es conserva a [HISTORIAL-CANVIS.md](docs/HISTORIAL-CANVIS.md). Aquelles revisions no es presenten com a commits ni tags que no existien.

