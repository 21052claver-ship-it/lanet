# Verificació · animació de ruleta

12 d’octubre de 2026. Versió 0.3.1, commit 73f6c5e18d4c38fe34de5154d29d494162fc2c12.

Bola i roda amb rellotge compartit, descens continu i casella final coherent; revelació del premi, celebració segons guany net i pastissos volant al moneder abans d’actualitzar el saldo. Sense avançar resultat per historial o sincronització. Moviment reduït, sortida i recuperació segura.

338 proves unitàries correctes. Geometria de bola i roda als 37 números, rotacions consecutives, continuïtat en la captura i velocitat final. 18 casos específics en Chromium, Firefox i WebKit: guany, pèrdua, moviment reduït, sortida durant gir/celebració i canvi de moviment a mig gir. Saldo retingut durant sincronització i vol dels pastissos, un sol assentament al servidor, historial sense filtració del resultat.

CI completa correcta: auditoria sense secrets, tipus/lint, unitàries, build, àudio real a Firefox, 18 animació, 15 tapet, 36 sala secreta, 9 navegació mòbil, 48 responsive i 135 controls generals.

[CI](https://github.com/21052claver-ship-it/lanet/actions/runs/38188332481) · [Registre](releases/0.3.1.json) · [Pla](PLA-RULETA-ANIMACIO.md).

Revisió visual local a 390 px. No s’ha visitat el web públic ni s’han provat dispositius físics. Liquidació, sorteig, probabilitats i migracions del servidor sense canvis. Cap regal ni reinici nou.

Cloudflare confirma production/main i SHA complet; release immutable, tag, digest del rebut, GitHub Deployment success i D1/R2/MEDIA_SAFETY verificats. Evidències privades a output/roulette-animation.
