# Sistema visual de la revisió

Es conserven les il·lustracions aprovades de `design/pantalles-v1` i `design/pantalles-v2`. La foto `design/referencies-v3/cartell-fusta-original.png` és només una mostra d’estil. El cartell actual és una peça de 236 × 44 px a la barra superior, dibuixada amb CSS; a 1100 px o menys queda una icona de 44 px. Els components nous es defineixen a `src/revision.css`, després de la fidelitat original; cada component té un únic bloc de regles i adaptacions mòbils explícites.

- Controls: alçada mínima 44 px, radi 14 px, espai interior 12 px; objectius tàctils 44 px.
- Assignatures: icona pròpia dins una peça de color amb llum interior i ombra suau, el mateix color del catàleg i text sempre visible.
- Desplegables: peça actual amb icona, llista amb marca de selecció, teclat, escapada, cerca escrivint i contenció dins de la pantalla. Es despleguen sobre els diàlegs amb el top layer del navegador.
- Capes: contingut 0, capçalera amb cartell 25, navegació mòbil 35, menú 50, diàlegs 70/71; els selectors utilitzen el top layer.
- Densitat: còmoda i compacta modifiquen espaiat i mida dels controls de presentació, sense transformar o reduir els objectius tàctils.
- Moviment: breu i amb propòsit; `prefers-reduced-motion` conserva les transicions funcionals amb durada mínima.
- Navegació: barra lateral expandida/plegada a escriptori i cinc accessos inferiors a mòbil. El menú Més conté la resta de destinacions i el perfil.

Les noves preferències són personals. Canviar els filtres de contingut no canvia la matrícula ni l’horari.
