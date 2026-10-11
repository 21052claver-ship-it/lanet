# Discos i control musical · R56

Una sola tasca activa: T43-01. La reproducció es resol abans de construir el selector; després es comproven junts i es publica el mateix paquet verificat. Les proves utilitzen dades fictícies locals i bloquegen la xarxa externa.

- [x] Fer que pausar conservi la cançó, la posició i el volum.
- [x] Compartir reproducció, càrrega i errors entre Estudi i la barra superior.
- [x] Representar la música amb vinils i crear una biblioteca amb cerca i filtres d’estil.
- [x] Comprovar selecció, teclat, tacte, retorn de focus i moviment reduït.
- [x] Revisar captures en escriptori, tauleta, mòbil de 320 px i poca alçada.
- [x] Passar proves unitàries, navegadors, responsive, tipus/lint i compilació.
- [x] Publicar, registrar evidències i actualitzar historial.

Es conserven les 17 peces, els set estils, les llicències i els crèdits. No calen migracions ni canvis de dades de producció. La navegació pública, Google real i dispositius físics continuen fora de les comprovacions locals.

## Resultat

Publicat Pages **deb83bdc** a [La Net](https://lanet.pages.dev). Discos de vinil amb etiqueta pròpia per peça, gir suau durant la reproducció i aturat en pausa; el moviment reduït elimina el gir. Biblioteca a demanda amb cerca sense accents, filtre dels set estils, durades i selecció marcada. Triar un disc el reprodueix; tornar a triar el mateix conserva la posició. Anterior/següent respecten la pausa.

La barra superior té un control de 44 px disponible en totes les seccions, també abans d’engegar i durant la pausa. El motor i l’estat són compartits: càrrega, cancel·lació, errors, canvis de disc i reproducció seguida. Pausar conserva el mateix element d’àudio, el temps i el volum; esborrar l’àudio queda reservat als canvis de peça, errors i sortida de la sessió.

**30/30 escenaris musicals, 48/48 de responsive, 120/120 de regressió general, 4/4 recorreguts addicionals i 180/180 proves unitàries correctes.** Tipus, sintaxi, lint i compilació correctes. Chromium, Firefox i WebKit; Chrome/Edge instal·lats; iPhone/Pixel emulats. Les proves de càrrega i errors injecten respostes des del servidor local, incloent les peticions natives de WebKit. La xarxa externa està bloquejada. Els 93 fitxers recompilats per publicar coincideixen amb el paquet provat, sense fitxers privats ni patrons de credencials detectats.

Captures revisades: [col·lecció d’escriptori](../output/music-records/chromium-library-desktop.png), [col·lecció de 320 px](../output/music-records/chromium-library-320.png), [reproductor de 320 px](../output/music-records/chromium-player-320.png), [escriptori en pausa](../output/music-records/chromium-player-desktop.png), [paisatge WebKit](../output/music-records/webkit-library-landscape.png).

[Escenaris musicals](../output/music-records/music-results.json), [responsive](../output/music-records/regression/responsive-results.json), [regressió](../output/music-records/regression/browser-results.json), [Chrome/Edge i emulacions](../output/music-records/regression/device-results.json), [integritat i publicació](../output/music-records/publicacio.json), [registre CLI](../output/music-records/deploy.txt).

Límits: revisió pública navegada, entrada real amb Google i dispositius físics pendents. Les comprovacions locals no certifiquen disponibilitat universal. Cap migració ni canvi de dades de producció.
