# Ruleta panoràmica · 0.6.5

T73-01: una sola sala amb roda, crupier, tapet i botó de girar. El càlcul, l’atzar del servidor i el moment del lliurament del saldo es conserven.

- [x] Sala amb focus contingut, scroll del fons bloquejat i retorn al forn amb Escape.
- [x] A 1280×720, 1366×768 i 1920×1080, roda/crupier/tapet/fitxes/girar visibles sense scroll, abans i després del resultat.
- [x] Disposició mòbil desplaçable amb controls llegibles; no reduir tot el tapet a objectius impossibles de tocar.
- [x] Regles i historial en desplegable; detall de fitxes consultable sense desplaçar el joc panoràmic.
- [x] Número guanyador i categories exteriors ressaltats en acabar; posicions amb fitxes premiades identificades. Zero no ressalta cap aposta exterior.
- [x] Sense pistes durant el gir; neteja de marques a l’aposta següent i número visible per sobre del ressaltat.
- [ ] Completar regressions locals, PR/CI i publicació versionada.

Icones i imatges existents, verd fosc, crema i fusta coherents amb la sala. Sense crear ni alterar dades de producció. Les proves creen moneders i resultats deterministes exclusivament en bases de dades locals aïllades.

Evidències privades: output/roulette-panorama, output/roulette-board, output/roulette-animation i output/secret-room. Els resums locals comproven tots els 157 objectius del tapet, límits, recuperació idempotent, animació, saldo i retorn del focus.

## Publicació més ràpida

Les mateixes proves de navegador s’executen en quatre grups independents: navegació, tapet/apostes, sala/animació i compatibilitat. Tots executen sobre el mateix commit amb una compilació local nova i sense secrets. El job final Validate depèn dels controls bàsics i de tota la matriu: qualsevol error, cancel·lació o grup incomplet impedeix l’èxit. Es conserven totes les proves anteriors, el smoke d’àudio Firefox i els artefactes d’evidència, més la nova prova panoràmica. No hi ha desplegament automàtic ni secrets nous a GitHub.
