# Verificació de La Net · adreça pròpia R46

11 d’octubre de 2026. **[La Net](https://lanet.pages.dev)**, projecte Cloudflare Pages lanet, desplegament de producció **46d60224-3df8-4d1a-9ed6-002d3cf6dd25**, branca main. La marca de consentiment Google **Impossible Goals es conserva per indicació de Marc**. No s’ha modificat Google Cloud, el subdomini del compte ni l’aplicació ImpossibleGoals.

| Comprovació | Resultat | Evidència |
| --- | --- | --- |
| Unitats | 156/156; OAuth, sessions, host canònic, configuradors i regressions | [log](../output/brand-lanet/unit.txt) |
| API aïllada | 38/38 amb D1/R2 i workerd locals, sense dades de producció | [resultat](../output/brand-lanet/api-result.json), [log](../output/brand-lanet/api.txt) |
| Tipus, sintaxi i lint | Correctes | [log](../output/brand-lanet/typecheck.txt) |
| Build i publicació | Frontend React i backend al mateix origen Pages | [log](../output/brand-lanet/production-deploy.txt), [metadades](../output/brand-lanet/pages-deployments.json) |
| Recursos públics | 58/58 mides i SHA-256 correctes; backend no exposat com a fitxer | [smoke](../output/brand-lanet/public-smoke.json) |
| Entrada Google real | Nom complet i foto carregats; cap camp d’identitat editable | [navegador](../output/brand-lanet/navegador-verificat.json), [escriptori](../output/brand-lanet/perfil-escriptori.png) |
| Mòbil | 390×844, sense desbordament ni camps editables d’identitat | [captura](../output/brand-lanet/perfil-mobil.png) |
| Preservació del producte | 186 fitxers de codi/art/migracions idèntics al paquet anterior | [hashes](../output/brand-lanet/recursos-preservats.json) |
| Preservació local | 30 fitxers d’estat local idèntics al paquet anterior | [hashes](../output/brand-lanet/recursos-preservats.json) |
| Enllaços antics | Dos Workers amb 308 a la web nova, API 410 i sense D1/R2/Assets | [publicació](../output/brand-lanet/publicacio-verificada.json), [proves](../tests/legacy-entry.test.js) |
| Previsualitzacions | Redirecció a l’origen canònic i API 421 abans d’accedir a dades | [smoke](../output/brand-lanet/redirect-smoke.json), [proves](../tests/pages-entry.test.js) |

## Dades i abast

Mateixa base la-net-db i mateix bucket privat europeu la-net-files. Cap migració nova, importació local, canvi de rol, nota o saldo. L’entrada autoritzada actualitza la sessió i sincronitza la identitat Google; el diàleg de curs s’ha tancat sense desar. Cap anunci o recompensa de prova publicats.

Les APIs de contrasenya, registre, convidat, recuperació i inicialització continuen retornant 403. Les dades protegides requereixen sessió Google. La configuració de desplegament fixa compte/projecte/origen i rebutja qualsevol D1/R2 diferent del projecte original. El configurador transmet secrets per stdin, sense imprimir-los.

Workers retirats: lanet versió 45b72faa-aa68-4f40-a8a7-4d7ea8dd965f; la-net versió 6ecd17f9-1a40-4d06-b310-21c6eb1b5167. Les metadades mostren que ja no tenen D1, R2 ni Assets. Cloudflare conserva secrets antics no utilitzats pel codi de redirecció. El domini la-net bloquejat no s’ha visitat: comprovat amb proves i metadades, sense evitar el bloqueig. La redirecció de lanet i el tancament de la seva API s’han comprovat per HTTP a l’origen permès.

L’intent inicial de crear Pages sense l’opció force de Wrangler es va delegar inesperadament al Worker existent i va republicar el mateix codi i recursos. No va modificar dades. Es va corregir creant el projecte Pages real; els scripts actuals exigeixen que existeixi per evitar aquesta delegació. El build/deploy mostra un avís sobre el repositori local sense HEAD; la publicació ha acabat correctament i està comprovada per URL, recursos i login real.

## Lliurament

46 requisits, 34 fases, 135 tasques al registre. Una sola tasca activa; historial i checklist generats des del registre. L’exportador comprova cada entrada del ZIP, mida, SHA-256, manifest i evidències de tasques verificades. Exclou secrets, JSON OAuth, .cloud, .dev.vars, dependències reinstal·lables i dist-pages, que es regenera amb npm run pages:build. Es prepara un paquet base abans de tancar T33-04 i un paquet final amb el seguiment tancat; els informes del mateix nom es desen a exports/.

[Pla executat](PLA-MARCA-LANET.md), [checklist](CHECKLIST.md), [historial](HISTORIAL-CANVIS.md), [verificació R45 conservada](historic/VERIFICATION-2026-10-11-google-only.md).

Paquet base rellegit: **2.017 fitxers**, totes les mides i SHA-256 correctes, 134 tasques verificades amb totes les seves evidències incloses. [Informe](../output/brand-lanet/lliurament-base-verificat.json). El paquet final incorpora el tancament de T33-04 i les 135 tasques verificades; el seu propi informe torna a verificar totes les entrades.

