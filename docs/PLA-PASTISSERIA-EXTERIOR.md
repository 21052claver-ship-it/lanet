# Exterior de la pastisseria · R30

Petició del 10 d’octubre de 2026: centrar la caseta de la captura i retirar-ne el fons. Aquesta revisió afecta l’exterior; la seqüència del forn verificada a R29 es conserva.

## Ordre i responsabilitat

Una sola tasca activa. T17-01 → T17-02 → T17-03 → T17-04. Cada pas es tanca amb evidències abans d’obrir el següent. L’històric i la checklist general es generen amb `track-task.mjs`.

- [x] T17-01 · Diagnosi del contenidor, la imatge i la porta.
- [x] T17-02 · Retall transparent sense sobreescriure l’original; centrat i porta sobre el mateix marc.
- [x] T17-03 · Comprovació visual, responsive, entrada, cancel·lació, retorn de focus i interior.
- [x] T17-04 · Publicació comprovada, preservació de dades i ZIP complet verificat.

## Diagnosi

Amb viewport 1280 × 720, el panell fa 700,4 px d’ample però el marc de la imatge es redueix a 561,6 × 374,4 px a causa de `max-height: 52vh` combinat amb `aspect-ratio: 3/2`. El marc no té marges automàtics i queda enganxat a l’esquerra: 69,4 px de descentrament respecte del panell. A més, tant el PNG com dos contenidors tenen un fons verd opac, fet que deixa la franja de la captura.

## Criteris d’acceptació

La caseta i la base de gespa han d’estar completes, centrades i amb alfa real al voltant. S’ha de conservar el llenguatge visual de la caseta, la llum, les textures, la teulada, els detalls i la porta. L’original es manté al projecte. La porta interactiva ha de compartir les coordenades de la imatge. El fons rectangular desapareix i el botó continua centrat. Les amplades de 320 a 1536 px i una finestra baixa no han de retallar ni desplaçar el dibuix. Entrada, cancel·lació, sortida i focus han de funcionar. El forn, la recompensa i les dades no es modifiquen.

## Evidències

Es desen a `output/bakery-exterior/`. La publicació i el ZIP es tanquen quan les comprovacions passen.

## Execució tancada

F17 tancada, 75/75 tasques totals. 67 unitats, tipus/lint, build/dry-run, 13 combinacions responsive, 4 interaccions, alfa real i originals preservats. Publicació amb 47 recursos SHA-256, exterior a mòbil/escriptori, forn previ i saldo intacte. SQL de 38 taules i còpia D1/R2 verificats. ZIP regenerat amb la checklist tancada i verificació íntegra contra manifest.
