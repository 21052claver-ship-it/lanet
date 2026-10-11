# Pastisseria · moviment i forn

Petició de Marc del 10 d’octubre de 2026: ocultar correctament els peus darrere del taulell, alentir la pastissera, afegir gestos, cuinar abans de permetre recollir i situar el botó al costat del personatge.

## Seqüència i criteris

- Salutació tranquil·la → gir → caminar cap al forn → introduir el pastís → tancar → cocció visible → comprovar → treure amb cura → tornar → presentar → Agafa el pastís.
- Preparació d’uns 20 segons, amb transicions suaus i petits moviments de cos. Les poses i l’escenari originals es conserven.
- Forn amb porta, llum, flames suaus i pastís coent; aquests efectes pertanyen a la preparació, abans de recollir.
- Personatge més endins i centrat darrere del taulell. Les superfícies del primer pla tapen les cames també durant el trajecte.
- Botó integrat a l’escena, a la dreta de la pastissera quan ofereix. En mòbil continua sent tàctil, dins dels límits i sense tapar cara, pastís ni missatge.
- Sortir sempre disponible. Sortir a mig procés cancel·la timers i moviments. Moviment reduït ofereix directament; un pastís ja recollit només saluda.
- Preparar no concedeix saldo. Recollir continua esperant confirmació del servidor, amb una única recompensa diària i vol fins al saldo.

## Execució sense solapaments

1. **T16-01 · Diagnòstic**: captura anterior, causes i criteris.
2. **T16-02 · Escena**: capes, seqüència lenta, forn i botó contextual.
3. **T16-03 · Verificació**: seqüència/cancel·lació/moviment reduït, inspecció de poses, amplades i funció de recollida; tipus, lint, build i regressions pertinents.
4. **T16-04 · Publicació i còpia**: mateix Worker, revisió pública de la preparació sense recollir pastissos de prova, dades locals preservades i ZIP verificat.

`SEGUIMENT.json` continua sent l’únic estat i `HISTORIAL-CANVIS.md` conserva els canvis. Una sola tasca activa; la següent comença després de verificar l’anterior.

## Execució tancada

Les quatre tasques F16 estan verificades; registre total de 71/71. Comprovacions: 67 unitats, 26 API, dotze fases visuals, catorze combinacions d’amplada/estat i deu interaccions amb el build en dades aïllades. Publicació verificada en lectura, art original intacte i còpies SQL/D1/R2 contrastades. El paquet final es regenera amb aquesta checklist tancada i es valida contra el manifest. Evidències a `output/bakery-motion/` i informe actual a [VERIFICATION.md](VERIFICATION.md).
