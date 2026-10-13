# Verificació · La Net 0.6.5

Commit 65da6a8506f92edde9ce6fa559cd5d826a3c7750. [CI completa](https://github.com/21052claver-ship-it/lanet/actions/runs/38389023037) correcta sobre main després de PR14: core i quatre grups de navegador, agregació Validate que requereix tots success. Totes les comprovacions prèvies es conserven, sense secrets de producció.

Proves locals en Chromium/Firefox/WebKit: 12 panoràmiques (zero, gir següent, apostes entre números, sense scroll i Escape), 27 tapet/157 objectius, 18 animació/lliurament, 36 sala/recuperació, 39 prediccions i 15 horari. Captures revisades; controls de tipus/lint i compilació correctes. Prova d’horari selecciona explícitament el dia de fixture, sense dependre del dia real. Formularis de prediccions diferenciats de la sala accessible.

Desplegament real confirmat; HTML, main/Bakery JS/CSS i icona publicats coincideixen amb el rebut. HTTPS certificat validat, arrel HTTP200 i www308. Google únic i callback.es correctes; DB/R2 EU i MEDIA_SAFETY preservats. Comprovacions HTTP només GET, sense iniciar compte ni apostar a producció. Dispositius físics no provats.

[Registre públic](releases/0.6.5.json). Evidències privades a output/roulette-panorama i logs output/net-pastel/panorama-*.log.

Actualització 0.6.6 publicada: ruleta ocupa tota la finestra, sense el marc anterior de 12px. [Registre verificat](releases/0.6.6.json).
