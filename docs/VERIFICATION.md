# Verificació · ruleta amb fitxes

12 d’octubre de 2026. Versió 0.3.0, commit 0df40c02c6d65b43e333653818e26d1d85aee560.

Tapet europeu de 157 posicions amb fitxes múltiples per gir, denominacions, desfer i retirada per posició; controls tàctils i de teclat, retorn detallat i recuperació idempotent. Liquidació SQL atòmica i historial antic conservat.

336 proves unitàries correctes, incloses 5.809 combinacions entre totes les posicions i els 37 resultats; premis, manipulació de dades, saldo insuficient, concurrència i compatibilitat de referències. 15 escenaris del tapet i 36 regressions de la sala secreta en Chromium, Firefox i WebKit. Revisió visual local de colors, punts de 44 px, 320/390 px i orientació horitzontal.

CI completa correcta: auditoria de 527 fitxers sense secrets, tipus/lint, unitàries, build, prova real d’àudio a Firefox, ruleta, sala secreta, 9 escenaris del menú, 48 responsive i 135 controls generals.

[CI](https://github.com/21052claver-ship-it/lanet/actions/runs/38186308179) · [Registre](releases/0.3.0.json) · [Pla](PLA-RULETA-FITXES.md).

Migració 0024 additiva aplicada separadament, amb còpia privada i comprovació de les 54 taules anteriors en un clon local. Guardes SQL i catàleg de 157 posicions confirmats pel proveïdor. D1/R2, moderació, política del forn i regals previs preservats. Cap regal o reinici nou.

Cloudflare confirma production/main amb SHA complet; release immutable, tag, digest del rebut i GitHub Deployment success verificats. Cap visita al web públic ni prova en dispositiu físic. Evidències privades a output/roulette-board; còpia de dades exclosa del repositori.
