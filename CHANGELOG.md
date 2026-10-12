# Historial de versions

Cada publicació nova té una versió SemVer, un tag Git immutable, una release de GitHub i un registre de desplegament a l’entorn production. No es creen versions retroactives fictícies.

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

