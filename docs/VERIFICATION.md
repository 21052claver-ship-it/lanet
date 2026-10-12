# Verificació · seguretat i antiabús

12 d’octubre de 2026. Versió 0.4.0, commit 7c531808f56c1f8015aa9054024c09e206344bb4.

Límits atòmics persistents per compte i operació, control concurrent de duplicats i pauses progressives de 60/300/900 segons. Canviar d’IP o afegir camps aleatoris ignorats no reinicia els controls. JSON limitat en mida i complexitat; registres sense contingut ni identificadors en clar. Formularis conservats, lectures i tancament de sessió disponibles, recuperació automàtica després de la pausa.

Auditoria npm de dependències de producció: 0 vulnerabilitats reportades. 350 proves unitàries correctes, incloses 12 específiques d’abús: concurrència, canvi d’IP, quotes, duplicats, camps aleatoris, escalada, expiració, permisos, lectures i logout, complexitat JSON, neteja i ús normal. 45 cicles de preferències, notes i refresc amb ritme d’ús humà. Sis casos antiabús en Chromium, Firefox i WebKit: errors visibles, formularis preservats, recuperació i una sola publicació. 135 controls generals locals correctes.

CI completa correcta: auditoria sense secrets, tipus/lint, unitàries, build, àudio real a Firefox, 6 antiabús, 18 animació, 15 tapet, 36 sala secreta, 9 navegació mòbil, 48 responsive i 135 controls generals.

[CI](https://github.com/21052claver-ship-it/lanet/actions/runs/38190189682) · [Registre](releases/0.4.0.json) · [Pla i límits](PLA-SEGURETAT-ANTIABUS.md).

Sense migració ni canvis de dades d’usuaris. Es conserven moderació i reconstrucció de fitxers, origen de peticions, autenticació Google i liquidació atòmica. No s’ha visitat el web públic ni s’han provat dispositius físics. Cloudflare confirma production/main i SHA complet; release immutable, tag, digest del rebut, GitHub Deployment success i D1/R2/MEDIA_SAFETY verificats. Evidències privades a output/abuse.
