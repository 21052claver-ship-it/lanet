# Tapet directe de ruleta

Tasca T70-01, requisit R84. Una sola tasca activa; T69-01 del domini queda pendent de l'accés IONOS/Google. No es modifica la configuració del domini durant aquesta millora.

- [x] Revisar tapet, catàleg de 157 apostes i proves existents.
- [x] Eliminar els selectors de números/cavalls/cantonades/files/zero.
- [x] Mostrar totes les zones al tapet i col·locar les fitxes al centre, línia o cruïlla corresponent.
- [x] Afegir previsualització de cobertura, indicadors discrets i navegació amb fletxes/Intro.
- [x] Verificar coordenades, zones sense solapament, 320 px, ratolí, tacte, teclat, límits, bloqueig i recuperació.
- [x] Passar qualitat, actualitzar la PR i publicar una versió amb CI i rebut.

## Decisions

Un únic tapet verd amb números, zero, línies divisòries, files al lateral i exteriors. Cap selector de tipus abans de posar la fitxa. Els punts de línia i cruïlla són zones de joc accessibles, amb indicadors petits i una previsualització clara; els números coberts s'il·luminen. Els imports es veuen a la posició apostada.

Al mòbil el tapet es disposa en tres columnes, amb espai entre els punts de joc per evitar apostes ambigües. A l'escriptori gira a la disposició horitzontal quan hi ha prou amplada. Les zones de cruïlla mantenen una àrea mínima de 24 px i els controls generals 44 px o més.

No canviar el catàleg, probabilitats, sorteig, servidor, saldo o pagaments. Conservar desfer/retirar, tiquet, bloqueig durant gir/premi i recuperació idempotent. Proves exclusivament amb dades locals fictícies.

Qualitat local: 357 unitàries, tipus/lint i build correctes; 27 escenaris del tapet (24 fluxos i 3 transicions responsive) i 18 d’animació en tres motors. Verificades les 157 posicions simultànies, coordenades directes de línies/cruïlles, zones mínimes de 24 px, desfer, límits, bloqueig i recuperació. Captures locals a `output/direct-board/visual`. PR/CI correctes i publicació confirmada amb rebut.

La transició horitzontal requereix almenys 720 px al contenidor. Comprovats mínims de 24 px i absència d’interseccions entre zones en nou amplades de finestra, en els tres motors.

Publicació confirmada: [0.6.2](https://github.com/21052claver-ship-it/lanet/releases/tag/v0.6.2), commit ad51f36ea84669c3edadff4e400d4febec56cccf, [CI](https://github.com/21052claver-ship-it/lanet/actions/runs/38241359257), Pages d05c9fa0.
