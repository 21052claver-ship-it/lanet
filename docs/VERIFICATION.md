# Verificació · targetes de l’horari

12 d’octubre de 2026. Versió 0.5.1, commit 753ff13976ed05c55d69266208358cc27f04c36b.

Corregida la compressió vertical del text en targetes de l’horari. La informació visible s’adapta a l’alçada i amplada reals: línies senceres, el·lipsi neta i menys informació en esdeveniments curts o simultanis. Eliminada l’alçada mínima heretada que feia sobresortir el botó. Descripció accessible i tooltip amb tipus, assignatura, hores i títol; detall complet en prémer.

Defecte reproduït localment abans de corregir: una línia de 20,25 px comprimida a 11,64 px en una targeta de 63 px. Després: 15 casos locals correctes en Chromium, Firefox i WebKit a 320, 390, 768, 1024 i 1440 px. Durades de 10, 15, 30, 60 i 120 minuts i esdeveniments simultanis. Mesura real de línies i contenció dins del requadre, captures revisades, sense desbordament de pàgina i detall complet accessible.

350 unitàries correctes. CI completa correcta: auditoria, tipus/lint, build, àudio Firefox, 15 targetes, 33 prediccions, 6 antiabús, 18 animació, 15 tapet, 36 sala secreta, 9 navegació mòbil, 48 responsive i 135 controls generals. Auditoria npm de producció: 0 vulnerabilitats reportades.

[CI](https://github.com/21052claver-ship-it/lanet/actions/runs/38217178693) · [Registre](releases/0.5.1.json) · [Pla](PLA-TARGETES-HORARI.md).

Sense migració ni modificació de dades d’usuaris. Cap visita al web públic ni prova de dispositius físics. Cloudflare confirma production/main i SHA complet; release immutable, tag, digest del rebut, GitHub Deployment success i D1/R2/MEDIA_SAFETY verificats. Evidències privades a output/schedule-cards.
