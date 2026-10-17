# Mode focus · estudi lliure i Pomodoro

15 d’octubre de 2026 · R108 · F86 · T86-01.

El mode focus permet triar Amb Pomodoro o Estudi lliure. El primer conserva el comptador, les fases i les sessions; el segon mostra només l’espai d’estudi amb fons Clar/Bosc/Nit i música opcional. Passar a lliure pausa el temporitzador i conserva el temps, la fase i la sessió; tornar a Pomodoro requereix prémer Continuar. Obrir lliure amb un temporitzador iniciat des d’Estudi també el pausa. No es generen sessions o recompenses per estar al fons lliure.

Les opcions es desen al mateix registre local per usuari. El rellotge, la continuïtat i les alarmes es configuren només en Pomodoro; ambient, música i pantalla activa serveixen per a tots dos. Els controls musicals són visibles inicialment, amb reproducció explícita. L’alarma del Pomodoro i els sons de la ruleta ja estan activats per defecte; es conserva qualsevol silenci o volum zero desat. L’àudio es desbloqueja amb l’acció de l’usuari segons el navegador.

No calen dependències, consultes, polling, taules ni migracions noves. El rellotge global deixa de tenir un interval quan està pausat. La música comparteix el reproductor existent i no es reinicia en canviar de mode.

Proves previstes: pausa/resum i frontera de fase, persistència/reentrada, preferència de silenci/volum zero, música compartida, accessibilitat i disposició a 320/390/820/1440 px i paisatge en Chromium/Firefox/WebKit. Captures i logs privats a output/free-focus. Cap visita pública; mides emulades sense dispositius físics.

Verificació local completada: 460 unitàries, 60 fluxos focus en Chromium/Firefox/WebKit i 15 regressions de sons de ruleta correctes. Sis casos Web Audio natius de WebKit/Windows no estan disponibles en aquest runtime; es comprova el fallback i la CI Linux prova els tres motors amb àudio. Tipus/lint/build correctes. La configuració oberta podia encongir el rellotge i fer que el SVG cobrís Comença; el contingut conserva l’alçada i el botó funciona amb opcions obertes. Mode lliure compacte en paisatge amb selector i controls visibles. Les proves de mides emulades utilitzen el fallback de finestra perquè la pantalla completa nativa de Firefox substitueix la mida emulada; entrada/sortida nativa té un cas propi. Pendent auditoria de font de l’índex, CI exacta i publicació.

Correcció abans de publicar: el títol lliure heretava el color general fosc en Nit; ara segueix el primer pla del tema. Els camps d’ambient/rellotge embolicaven botons en una etiqueta nativa i canviaven el nom accessible del primer selector; contenidors neutres conserven Clar/Anell. Reproducció local i tres regressions de tema/selectors correctes, total 63 fluxos focus. S’agrupa una correcció de PR43; cal CI exacta del nou head, sense publicació intermèdia.

Publicació completada: [0.6.21](https://github.com/21052claver-ship-it/lanet/releases/tag/v0.6.21) · [PR43](https://github.com/21052claver-ship-it/lanet/pull/43) · [CI de main](https://github.com/21052claver-ship-it/lanet/actions/runs/38676381817) · [Informe](releases/0.6.21.md). T86-01 verificada. Commit 8d2c1aa51c7ac5fc336f15a8dd57c8fc56dcd680; release immutable, digest i desplegament confirmats via proveïdor. Una pujada inicial i una correcció, i una publicació; sense migració, càrrega D1/R2 nova o prova pública.
