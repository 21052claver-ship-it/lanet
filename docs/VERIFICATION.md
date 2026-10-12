# Verificació · pissarra d’apostes

12 d’octubre de 2026. Versió 0.5.0, commit ee44965605ab7139d4a83fc85094046af6033961.

Nou escenari de prediccions: senyora sencera i transparent al costat d’una pissarra amb marc i lleixa de fusta. Apostes penjades com papers amb una xinxeta, dades llegibles i filtres. Al mòbil la senyora passa a sobre per deixar tot l’espai al tauler. Creació, detall, teclat i retorn a la ruleta preservats, sense tocar saldos ni liquidació.

350 proves unitàries i 33 casos locals de prediccions correctes en Chromium, Firefox i WebKit. Nou control de tauler buit i amb tres apostes a 320, 768 i 1440 px: figura carregada, sense solapament ni desbordament, navegació amb teclat, detall i retorn a ruleta. Captures revisades. Es conserven creació, acceptació, apostes, liquidació, cancel·lació, devolucions i recuperació sense duplicar pastissos.

CI completa correcta: tipus/lint, auditoria, unitàries, build, àudio Firefox, 33 prediccions, 6 antiabús, 18 animació, 15 tapet, 36 sala secreta, 9 navegació mòbil, 48 responsive i 135 controls generals. Auditoria npm de producció: 0 vulnerabilitats reportades.

[CI](https://github.com/21052claver-ship-it/lanet/actions/runs/38194444994) · [Registre](releases/0.5.0.json) · [Pla](PLA-PISSARRA-APOSTES.md).

Sense migració, modificació de dades d’usuaris ni visita al web públic. No s’han provat dispositius físics. Cloudflare confirma production/main i SHA complet; release immutable, tag, digest del rebut, GitHub Deployment success i D1/R2/MEDIA_SAFETY verificats. Evidències privades a output/prediction-board.
