# Verificació · crear apostes

12 d’octubre de 2026. Versió 0.4.1, commit bfdb479f65ce35ff3e9216260ce6a0dc12821d2a.

Crear aposta sempre visible en la llista i en el detall d’una altra aposta. Formulari i estat buit amb nom coherent. Cancel·lar conserva l’aposta anterior; crear obre el detall de la nova aposta pendent d’acceptació, sense refrescar l’anterior ni iniciar dues lectures de selecció. Flux verificat amb un alumne normal, termini i responsable independent, sense gastar pastissos per crear.

350 proves unitàries correctes. 24 casos locals de prediccions en Chromium, Firefox i WebKit: sis casos nous a 320 i 390 px per crear des del detall, cancel·lar i conservar l’aposta anterior. Inclou el flux complet entre creador, responsable i participant, recuperació de resposta perduda en crear/apostar/resoldre, repartiment i retorns sense duplicacions.

CI completa correcta: auditoria sense secrets, tipus/lint, unitàries, build, àudio a Firefox, 24 prediccions, 6 antiabús, 18 animació, 15 tapet, 36 sala secreta, 9 navegació mòbil, 48 responsive i 135 controls generals. Auditoria npm de producció: 0 vulnerabilitats reportades.

[CI](https://github.com/21052claver-ship-it/lanet/actions/runs/38191721369) · [Registre](releases/0.4.1.json) · [Pla](PLA-CREAR-APOSTES.md).

Sense migració ni modificació de dades d’usuaris. Es conserven autenticació Google, quotes antiabús, responsable independent, acceptació i liquidació atòmica. No s’ha visitat el web públic ni s’han provat dispositius físics. Cloudflare confirma production/main i SHA complet; release immutable, tag, digest del rebut, GitHub Deployment success i D1/R2/MEDIA_SAFETY verificats. Evidències privades a output/create-bets.
