# Verificació · La Net 0.6.21

[Informe i límits](releases/0.6.21.md) · [Pla focus](PLA-FOCUS-LLIURE.md) · [Estat](ESTAT-PROJECTE.md).

[CI completa](https://github.com/21052claver-ship-it/lanet/actions/runs/38676381817) verda sobre 8d2c1aa51c7ac5fc336f15a8dd57c8fc56dcd680: 460 unitàries, 63 fluxos focus en Chromium/Firefox/WebKit i 15 regressions locals de so de ruleta correctes. Tipus/lint/build/font/enllaços correctes; tots els 11 jobs i Validate de PR/main verds.

Comprovades pausa/represa, entrada amb temporitzador actiu, preferències/reentrada, volum zero i silenci, so de fase amb acció d’inici, sessions úniques, música compartida, teclat i disposició mòbil/paisatge. Font abans de push: 690 fitxers, cap troballa; 1.483 enllaços locals correctes. Cap càrrega nova D1/R2, migració o manteniment privat.

Fixtures locals i identitats fictícies; mides emulades sense dispositius físics ni login Google real. Les proves de mides utilitzen el fallback de finestra perquè la pantalla completa nativa de Firefox substitueix el viewport emulat; entrada/sortida nativa té un cas propi. Sis casos Web Audio de WebKit/Windows no estan disponibles en aquest runtime; fallback comprovat, i CI Linux verda amb àudio configurat. Cap visita a l’aplicació/API públiques. Tag/release immutable, digest, domini/commit/callback i bindings verificats via proveïdor. [Registre segur](releases/0.6.21.json).
