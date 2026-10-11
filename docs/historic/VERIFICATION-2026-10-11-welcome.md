# Verificació de La Net · pastissos de benvinguda R47

11 d’octubre de 2026. [La Net](https://lanet.pages.dev), Pages lanet, desplegament **e2438c5a-d94b-4483-8697-fb46f80573ec**. Cada persona rep **5 pastissos de benvinguda, una sola vegada**, en crear o vincular Google. Els membres actuals sense benvinguda anterior també reben +5. El saldo antic es conserva, mai es reinicia. Mateixa marca Google i altres aplicacions intactes.

| Comprovació | Resultat | Evidència |
| --- | --- | --- |
| Unitats | 159/159; registre, vinculació, reentrada, saldo gastat i benvingudes prèvies | [log](../output/welcome-cakes/unit.txt), [casos](../tests/welcome-cakes.test.js) |
| API amb D1/R2 aïllats | 39/39, incloent moneder inicial i recàrregues sense duplicats | [resultat](../output/welcome-cakes/api-result.json), [log](../output/welcome-cakes/api.txt) |
| Tipus/sintaxi/lint | Correctes | [tipus](../output/welcome-cakes/typecheck.txt), [lint final](../output/welcome-cakes/final-lint.txt) |
| Migració local | 0 comptes elegibles; dades preservades, integritat i claus correctes | [comparació](../output/welcome-cakes/local-migration.json) |
| Migració pública | 1 compte elegible, un moviment +5, només increment esperat de saldo; historial i 36 altres taules intactes | [comparació](../output/welcome-cakes/remote-migration.json) |
| Publicació | Pages producció, mateix D1/R2 | [metadades](../output/welcome-cakes/publicacio-verificada.json), [log](../output/welcome-cakes/deploy.txt) |
| Frontend | 58 recursos idèntics al build, Google únic, dades protegides | [smoke](../output/welcome-cakes/public-smoke.json) |
| Moneder real | +5 Benvinguda i +1 previ visibles, saldo 6; cap desbordament | [navegador](../output/welcome-cakes/navegador-verificat.json), [captura](../output/welcome-cakes/moneder-publicat.png) |

## Implementació i preservació

Migració additiva 0013. Triggers dins de la transacció de creació/vinculació Google; el ledger actualitza el saldo. Referència única welcome-ID compartida amb benvingudes antigues: cap doble regal en reentrar, tornar a vincular o després de gastar-lo. Les benvingudes de demostració prèvies es conserven i no se’n concedeix una altra. Perfils sense Google no reben crèdit fins a la vinculació verificada.

El compte vinculat es rellegeix després del trigger per retornar el saldo correcte immediatament; UPDATE RETURNING s’avalua abans del trigger AFTER. No s’afegeixen botons de reclamar ni popups. Mateixes regles de pastís diari, compra, saldo i ofertes.

Còpies prèvies locals i de producció abans de migrar. El verificador carrega els SQL anterior/posterior i comprova totes les taules, moviments antics, increments exactes, integritat i claus foranes. SQL de producció i URLs privades de descàrrega exclosos del paquet a .cloud. Estat local actual restaurable a backups/lanet-after-welcome-2026-10-11.sql; còpies D1/R2 abans i després amb 14 fitxers cadascuna. Cap nota, preferència, rol o anunci modificat; la prova pública és només de lectura després del regal autoritzat.

Les proves API gasten explícitament els 5 de les fixtures que necessiten saldo zero per continuar comprovant compres insuficients; un compte intacte separat verifica la benvinguda real. No s’ha simulat el resultat a producció.

## Lliurament

47 requisits, 35 fases, 137 tasques; una sola tasca activa. Exportador amb manifest, mides i SHA-256 de cada entrada. Secrets i dades privades remotes exclosos. Paquet base abans del tancament i paquet final amb checklist/historial tancats. Informes del mateix nom a exports/.

[Pla](PLA-PASTISSOS-BENVINGUDA.md), [checklist](CHECKLIST.md), [historial](HISTORIAL-CANVIS.md), [R46 conservat](historic/VERIFICATION-2026-10-11-own-address.md).
