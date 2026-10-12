# Ruleta · repartiment de fitxes

- [x] Revisar el gir actual, saldo, recuperació i historial.
- [x] Catàleg legal del tapet europeu amb zero únic i retorn incloent aposta.
- [x] Tauler amb fitxes, desfer, retirar i múltiples posicions per gir.
- [x] Liquidació atòmica i validació també a SQLite; conservar girs antics.
- [x] Proves exhaustives i revisió visual local en tres motors.
- [x] Còpia privada i migració additiva revisada; publicació amb CI i rebut.

Abast: apostes interiors i exteriors estàndard; no variants amb doble zero ni regles franceses de mitja devolució.

## Posicions i interacció

El mode Repartir fitxes és el principal. Cada toc afegeix la denominació seleccionada; Desfer reverteix una acció, Retirar totes buida el tapet i el desplegable permet retirar una quantitat o una posició completa. El canvi a aposta ràpida queda desactivat mentre hi ha fitxes al tapet per evitar descartar-les accidentalment.

Els modes Entre dos i Cantonades mostren punts diferenciats entre les caselles; una sola capa activa evita confondre objectius petits. Les fitxes col·locades continuen visibles quan es canvia de mode. En pantalles estretes el tapet es disposa en tres columnes; quan hi ha espai passa a l’orientació horitzontal. Els punts d’interacció tenen un mínim de 44 px, etiquetes de cobertura i retorn, focus visible i controls de teclat.

| Posició | Números | Retorn inclosa l’aposta |
| --- | ---: | ---: |
| Número | 1 | ×36 |
| Cavall | 2 | ×18 |
| Fila o trio del zero | 3 | ×12 |
| Cantonada o primers quatre | 4 | ×9 |
| Dues files | 6 | ×6 |
| Columna o dotzena | 12 | ×3 |
| Exteriors | 18 | ×2 |

Contrast de geometria i premis amb les [regles oficials Euro Roulette, pàgines 1–3](https://cms.rationalcdn.com/v3/assets/blteecf9626d9a38b03/bltdb91e068a66e930d/65d5c20c0b928c2cd77d0ab3/GameRules_EuroRoulette_En.pdf). El zero únic perd a les apostes exteriors. Els retorns de les posicions que encerten se sumen; un retorn positiu pot ser inferior a l’aposta total.

## Integritat i compatibilitat

El client envia només identificadors de posició i quantitats senceres. El servidor valida el catàleg fix, ordena les posicions i limita el total del gir a 1.000 pastissos. Una inserció SQL valida també cobertura, quantitats i retorn; el dèbit es fa abans del premi i qualsevol fallada desfà el gir sencer. Una UUID identifica tot el gir i els reintents recuperen el resultat, sense tornar a apostar.

La migració 0024 és additiva. Conserva roulette_spins, moneders i moviments anteriors; afegeix catàleg, tickets, índex i triggers. Les referències no es poden reutilitzar entre girs antics i tickets nous. L’historial combina ambdós formats. No concedeix pastissos ni reinicia el forn.

Còpia privada de D1 verificada: la migració, dividida amb el parser de Wrangler, conserva exactament les files de les 54 taules prèvies en un clon local privat. Cap contingut de la còpia es publica al repositori.

## Verificació abans de publicar

336 proves unitàries correctes, incloses 5.809 combinacions de posició/resultat i validacions SQL. 15 escenaris del tapet i 36 regressions de la sala secreta en Chromium, Firefox i WebKit. Revisió visual addicional dels colors i objectius de 44 px en els tres motors. Tipus/lint i compilació correctes.

Migració 0024 confirmada pel proveïdor després de corregir la delimitació de CASE per al parser remot de D1. Primer intent desfet completament i verificat abans de reintentar. Catàleg de 157 posicions i liquidació atòmica instal·lats; política del forn i regals previs preservats. La interfície 0.3.0 s’ha publicat després de CI correcta del commit exacte.

## Publicació confirmada

[Versió 0.3.0](https://github.com/21052claver-ship-it/lanet/releases/tag/v0.3.0), commit 0df40c02c6d65b43e333653818e26d1d85aee560, Pages 6d25ad9c i GitHub Deployment 7003778055. CI correcta i configuració del proveïdor verificada sense accedir a la web pública.
