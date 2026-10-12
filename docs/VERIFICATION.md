# Verificació · depuració general

Versió 0.6.1, commit 53ebb7f7d0d5d5c18e3fb3ed3ca2f5ea1fbc8ecd.

Corregides icones d’assignatures no seleccionades, cerca sense accents, tancament de diàlegs per respostes antigues, càrrega protegida de l’editor d’apunts i recuperació de connexió/sortida sense peticions duplicades. Gestió del centre amb reintent directe, avís netejat en recuperar-se i protecció contra respostes antigues.

Exploració local de les vuit seccions i formularis a 320, 390 i 1440 px amb noms i textos llargs. 21 regressions de recuperació en Chromium, Firefox i WebKit: selecció i cerca, resposta antiga després d’obrir un altre diàleg, càrrega i reintent d’editor, text conservat després de fallar un enviament i sortida de sessió recuperable. Captures revisades; icones uniformes a 34 px.

354 unitàries correctes i 342 casos de navegador a CI: 21 recuperació, 15 targetes d’horari, 39 prediccions, 6 antiabús, 18 animació, 15 tapet, 36 sala secreta, 9 navegació mòbil, 48 responsive i 135 controls generals. 120 casos locals addicionals correctes: 39 de música, 33 de continguts, 24 de nota final/plusos i 24 de top 5 PAU. Total: 462 casos de navegador, sense comptar dues vegades els responsive locals. Tipus, lint, build i auditoria de codi públic correctes. Auditoria npm de producció: 0 vulnerabilitats reportades.

[CI](https://github.com/21052claver-ship-it/lanet/actions/runs/38227341981) · [Registre](releases/0.6.1.json) · [Pla](PLA-DEPURACIO-GENERAL.md).

Cloudflare confirma production/main i SHA complet; release immutable, tag, digest del rebut, GitHub Deployment success i D1/R2/MEDIA_SAFETY verificats. Cap migració, regal, reinici ni modificació de dades d’usuaris. Cap visita al web públic ni prova de dispositius físics. Evidències privades a output/debug-pass i output/workspace-recovery.
