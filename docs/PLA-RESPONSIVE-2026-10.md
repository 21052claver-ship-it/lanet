# Responsive · mòbil, tauleta i escriptori

15 d’octubre de 2026 · R107 · F85 · T85-01.

La revisió parteix de 0.6.19 i conserva el tancament documental anterior. Una sola tasca activa, fixtures locals i una publicació consolidada, després de CI exacta. No es visita l’aplicació o l’API públiques.

## Incidències reproduïdes

- Les cinc pestanyes de Comunitat i les quatre de Gestió s’estenien horitzontalment: a 320 px, Delegats, Notificacions i Revisions no es veien sense desplaçar la fila.
- Un títol sense espais de 128 caràcters eixamplava Comunitat fins a 1.265 px en una pantalla de 320 px, i fins a 1.453 px a 820 px. Noms llargs i títols de propostes també sortien de la columna.
- La taula de variants tenia una amplada mínima de 710 px: els botons d’edició quedaven a la dreta, fora de la vista mòbil. Els botons del catàleg feien 23 px d’alt.

L’auditoria inicial recorre nou seccions a 320, 390, 600, 768, 820, 1024 i 1440 px. Les mesures distingeixen el desplaçament intencionat d’una taula o pestanya dels desbordaments accidentals. Els elements d’un disclosure tancat no compten com a controls visibles.

## Canvis

Les pestanyes de Comunitat i Gestió es distribueixen en files en disposició compacta, també en paisatge tàctil. Es conserven els mateixos controls, estat seleccionat i navegació amb teclat. PAU, horari i selectors específics mantenen la seva disposició pròpia.

Les variants i els comptes de Gestió es presenten com a targetes fins a 1100 px, amb els mateixos registres, botons i permisos. Professor, franges, grup, rol i estat tenen etiquetes visibles. Editar i Gestionar són accessibles sense desplaçament lateral. A escriptori es conserva la taula. El catàleg ofereix objectius tàctils de 44 px i noms accessibles explícits.

Els títols i noms llargs de Comunitat es poden partir dins de la columna; data i edició tenen espai propi. Els botons compartits poden adaptar el text a l’amplada disponible i conserven la mida de les icones. No s’amaga el desbordament per dissimular contingut inaccessible.

La primera CI va detectar una regressió a 320 px en la capçalera de la sala de joc: el contenidor flex calculava una amplada inferior a la suma dels seus botons. La capçalera i les accions ara poden passar de fila i el grup conserva l’amplada necessària. Es contrasta amb les quinze combinacions de mida/navegador de la prova panoràmica abans d’una única correcció a la mateixa PR.

## Verificació i límits

La regressió responsive comprova també totes les pestanyes mòbils, redimensionat i paisatge, contingut sense espais, les targetes de variants/comptes, el catàleg, l’obertura de formularis i els controls en un viewport curt que simula l’espai reduït d’un teclat. Es prova en Chromium, Firefox i WebKit amb identitats fictícies.

Captures, mesures i logs es conserven privats a `output/responsive-polish`. Les amplades són emulades; no acrediten dispositius físics ni un zoom real del navegador. El canvi és de presentació i etiquetatge: cap consulta, polling, escriptura D1, operació R2 o migració nova, ni canvi de permisos o manteniment privat.

Validació local completada: 458 unitàries, 66 escenaris responsive en tres motors i 30 regressions Chromium (10 de notificacions, 11 de delegats i 9 d’horari) correctes. Tipus/lint/build correctes. Les captures confirmen contingut llarg dins de 320/820 px, pestanyes visibles, targetes i formularis accessibles; pendent PR/CI i publicació.

Correcció de capçalera verificada: 15/15 casos panoràmics en Chromium/Firefox/WebKit correctes. Total de regressions locals: 45, a més dels 66 escenaris responsive i les 458 unitàries. Es conserven el log de la primera CI i el registre de la correcció. La regressió de producte es va corregir abans de repetir la CI; l’error intern posterior de WebKit es documenta per separat a l’informe.

Publicació completada: [0.6.20](https://github.com/21052claver-ship-it/lanet/releases/tag/v0.6.20) · [PR42](https://github.com/21052claver-ship-it/lanet/pull/42) · [CI de main](https://github.com/21052claver-ship-it/lanet/actions/runs/38670864115) · [Informe](releases/0.6.20.md). T85-01 verificada. Commit eeeb5211b4f251da3413aab26f508f99c15099d6; release immutable, digest i desplegament confirmats via proveïdor. Una pujada inicial i una correcció de branca i una publicació; sense backend/permisos/migracions/manteniment nous o prova pública.
