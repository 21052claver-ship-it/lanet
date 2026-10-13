# Historial de versions

Cada publicació nova té una versió SemVer, un tag Git immutable, una release de GitHub i un registre de desplegament a l’entorn production. No es creen versions retroactives fictícies.

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

