# Tapet directe de ruleta

Tasca T70-01, requisit R84. Una sola tasca activa; T69-01 del domini queda pendent de l'accés IONOS/Google. No es modifica la configuració del domini durant aquesta millora.

- [x] Revisar tapet, catàleg de 157 apostes i proves existents.
- [x] Eliminar els selectors de números/cavalls/cantonades/files/zero.
- [x] Mostrar totes les zones al tapet i col·locar les fitxes al centre, línia o cruïlla corresponent.
- [x] Afegir previsualització de cobertura, indicadors discrets i navegació amb fletxes/Intro.
- [x] Verificar coordenades, zones sense solapament, 320 px, ratolí, tacte, teclat, límits, bloqueig i recuperació.
- [ ] Passar qualitat, actualitzar la PR i publicar una versió amb CI i rebut.

## Decisions

Un únic tapet verd amb números, zero, línies divisòries, files al lateral i exteriors. Cap selector de tipus abans de posar la fitxa. Els punts de línia i cruïlla són zones de joc accessibles, amb indicadors petits i una previsualització clara; els números coberts s'il·luminen. Els imports es veuen a la posició apostada.

Al mòbil el tapet es disposa en tres columnes, amb espai entre els punts de joc per evitar apostes ambigües. A l'escriptori gira a la disposició horitzontal quan hi ha prou amplada. Les zones de cruïlla mantenen una àrea mínima de 24 px i els controls generals 44 px o més.

No canviar el catàleg, probabilitats, sorteig, servidor, saldo o pagaments. Conservar desfer/retirar, tiquet, bloqueig durant gir/premi i recuperació idempotent. Proves exclusivament amb dades locals fictícies.

Qualitat local: 357 unitàries, tipus/lint i build correctes; 24 escenaris del tapet i 18 d’animació en tres motors. Verificades les 157 posicions simultànies, coordenades directes de línies/cruïlles, zones mínimes de 24 px, desfer, límits, bloqueig i recuperació. Captures locals a `output/direct-board/visual`. PR/CI i publicació encara pendents.
