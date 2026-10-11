# Verificació de La Net · anuncis amb nom o anònims R34

10 d’octubre de 2026. [Pla](PLA-ANUNCIS-IDENTITAT.md), [checklist](CHECKLIST.md), [registre](SEGUIMENT.json), [historial](HISTORIAL-CANVIS.md): **34 requisits, 22 fases i 91 tasques**. Informe R33 conservat íntegre a [historic/VERIFICATION-2026-10-10-icon-alpha.md](historic/VERIFICATION-2026-10-10-icon-alpha.md).

## Canvi

«Publicar com» permet triar **Amb el meu nom / Anònim**, amb ràdios natives, icones, focus visible i la selecció préssec del sistema. La previsualització indica la signatura fora del text o de la foto. L’opció es conserva mentre es canvia de format, es retalla o es revisa una oferta. Detall, text alternatiu i etiqueta del botó d’imatge respecten l’opció. Adaptació estreta i colors forçats inclosos.

Migració additiva 0008: anonymous=0 per als anuncis existents. L’API valida un booleà estricte; ometre’l conserva el comportament anterior amb nom. La resposta pública del cartell té camps explícits, sense author_id; en mode anònim author és null. La identitat interna es conserva per al cobrament i la moderació. Les imatges anònimes es descarreguen amb un nom neutre. El contingut escrit o fotografiat per l’autor es publica tal com l’ha triat.

## Comprovacions

| Comprovació | Resultat | Evidència |
| --- | --- | --- |
| Proves unitàries i base de dades | 77/77 | [unit.txt](../output/banner-identity/unit.txt) |
| API real amb D1/R2 temporals | 30 fluxos | [resultat](../output/banner-identity/api-result.json), [registre](../output/banner-identity/api.txt) |
| Tipus, sintaxi i ESLint | Correctes | [typecheck.txt](../output/banner-identity/typecheck.txt) |
| Compilació i dry-run | Correctes | [build-final.txt](../output/banner-identity/build-final.txt) |
| Components reals renderitzats offline | Dues identitats i tres formats; sense nom privat al marcatge anònim | [components](../output/banner-identity/components-verificats.json) |
| Migració local | Totes les dades originals de 38 taules preservades; vuit migracions | [migració](../output/banner-identity/migracio-local-verificada.json) |
| Art, recursos i migracions anteriors | 87 fitxers SHA-256 idèntics a R33 | [preservació](../output/banner-identity/regressions-preservades.json) |

L’API aïllada usa exclusivament localhost:8791 i output/api-tests/. Comprova publicació amb nom i anònima en text, imatge i combinació; persistència entre comptes, dades d’autor omeses, nom de fitxer protegit, set valors ambigus rebutjats sense cobrar i doble oferta concurrent amb un únic cobrament. Cap anunci de prova publicat a producció. [Informe consolidat](../output/banner-identity/verificacio-local.json).

Els components s’han renderitzat amb ReactDOMServer i un context fictici: **no és una captura ni una prova de layout/interacció del navegador**. Es respecta el bloqueig anterior de localhost:5183 i de la web pública. No s’ha intentat accedir a aquestes webs ni llegir-les per una altra via; no s’ha repetit la revisió visual pública. [Límit vigent](../output/view-selectors/navegador-bloquejat.json).

## Publicació i còpia

Versió **b67122a3-6b23-442f-a1cb-068c09e97f69** publicada a [La Net](https://la-net.impossible-goals-research.workers.dev). Wrangler confirma 0008 aplicada, 2 recursos nous/actualitzats, 48 ja presents i Worker iniciat en 1 ms. [Migració remota](../output/banner-identity/migracio-publica.txt), [desplegament](../output/banner-identity/cloud-deploy.txt). No s’ha substituït l’anunci vigent ni importat dades locals a producció.

Servidors locals aturats abans de la còpia. SQL backups/la-net-local-2026-10-10-banner-identity.sql restaurat en memòria: **38 taules idèntiques, vuit migracions, quick_check correcte i zero errors de referències**. SHA-256 bf3d1e48e5ed30875fbf59383f2b61eaa090900a31341a429c5d85e885dcbbf9. [SQL verificat](../output/banner-identity/copia-sql-verificada.json).

Còpia prèvia a backups/state-v3-2026-10-10T12-48-37-463Z/ i còpia actual a backups/state-v3-2026-10-10T12-51-41-000Z/: **14 fitxers cadascuna**, contrastats amb els manifests. [D1/R2 verificat](../output/banner-identity/copia-d1-r2-verificada.json). Les còpies anteriors es conserven.

**91/91 tasques verificades**, cap activa ni pendent. El [paquet base](../output/banner-identity/lliurament-base-verificat.json) acredita 1074 fitxers rellegits amb mida i SHA-256 correctes. El ZIP final es regenera amb la checklist i l’historial tancats i verifica tots els fitxers. [Trasllat](../TRASLLAT.md). Manifest i resum de verificació del paquet a exports/.
