# Pull requests i protecció de main

> Registre històric de T68-01. El 17 d’octubre de 2026 Marc substitueix l’obligació de PR per als canvis propis per [incorporació directa del propietari amb CI obligatòria](FLUX-PROPIETARI.md). Les PR i revisions de contribucions externes es conserven. El contingut següent documenta la configuració anterior.

Tasca única T68-01. Configuració del repositori; no canvia la versió publicada.

- [x] Confirmar el compte propietari, col·laboradors i proteccions anteriors.
- [x] Confirmar via API que Pages conserva `lanet.pages.dev`, `main` i el desplegament 0.6.1.
- [x] Preparar guia de forks, plantilla de PR i Marc com a CODEOWNER de tots els fitxers.
- [x] Exigir PR, aprovació del propietari i invalidació d'aprovacions quan canvia el codi.
- [x] Exigir Validate de GitHub Actions amb la branca actualitzada, sense excepció de CI.
- [x] Conservar converses resoltes, bloqueig d'esborrats i force push; verificar regles efectives.
- [x] Auditar fitxers públics i obrir la PR de configuració, amb CI obligatòria per fusionar-la.

## Connexió comprovada

Repositori públic: [21052claver-ship-it/lanet](https://github.com/21052claver-ship-it/lanet). Únic col·laborador amb permisos: el propietari `21052claver-ship-it`.

La lectura de l'API de Cloudflare confirma Pages `lanet`, `lanet.pages.dev`, branca `main`, sense font Git nativa: **Direct Upload**. Desplegament de producció correcte `a4e10a9c-518e-4da0-93f5-d4125364a19a`, commit `53ebb7f7d0d5d5c18e3fb3ed3ca2f5ea1fbc8ecd`. GitHub Deployment `7010689710` vincula aquest commit a la versió 0.6.1 i a la seva CI.

Es conserva la publicació versionada amb `npm run release` després de CI. Acceptar una PR no desplega automàticament; no es transfereixen credencials de Cloudflare a GitHub. No s'ha visitat la web pública per fer proves.

## Disseny de les regles

Dues rulesets actives per a `refs/heads/main`: una exigeix PR i revisió; l'altra exigeix `Validate`, de l'app GitHub Actions, i la branca actualitzada. La segona no té bypass. La primera només permet al propietari una excepció **a través d'una PR**, per evitar que les PR pròpies quedin bloquejades per la impossibilitat d'autoaprovació. Les proteccions anteriors contra esborrat, force push i converses obertes es conserven.

Qualsevol persona pot proposar canvis amb un fork, sense rebre permisos d'escriptura ni accés a producció. `CODEOWNERS` cobreix també els workflows i el mateix fitxer de propietaris. La CI de PR continua amb permisos de lectura i dades locals.

Lectura de retorn de GitHub: [regla de PR i revisió](https://github.com/21052claver-ship-it/lanet/rules/24919513) i [regla de CI obligatòria](https://github.com/21052claver-ship-it/lanet/rules/24919535) actives. L'endpoint de regles efectives de `main` retorna les dues exigències. Comprovació `Validate` restringida a GitHub Actions, app `15368`; cap actor pot ometre aquesta regla. Protecció clàssica anterior comparada i conservada sense canvis. Evidència privada a `output/pull-requests/governance.json`.

Guia, plantilla i propietaris preparats a la [PR #4](https://github.com/21052claver-ship-it/lanet/pull/4). Auditoria local de fitxers públics sense troballes; registre i checklist coherents. La fusió exigeix CI verda i no produeix un desplegament de producte. Els resultats i l'estat de fusió es poden consultar a la mateixa PR.

Referències de configuració: [rulesets de GitHub](https://docs.github.com/en/rest/repos/rules#create-a-repository-ruleset), [bypass només per PR](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/creating-rulesets-for-a-repository#granting-bypass-permissions-for-your-branch-or-tag-ruleset) i [CODEOWNERS](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners).
