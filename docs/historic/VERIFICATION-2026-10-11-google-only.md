# Verificació de La Net · Google com a únic accés R45

11 d’octubre de 2026. [Aplicació publicada](https://lanet.impossible-goals-research.workers.dev), versió **72f20d3d-ee19-43a2-836a-0306176e741a**, activa al 100%. Google és l’única forma d’entrar. Nom, cognoms, correu i foto sincronitzats amb Google i protegits a la interfície i l’API. [Pla](PLA-GOOGLE-UNIC.md), [checklist](CHECKLIST.md), [historial](HISTORIAL-CANVIS.md).

| Comprovació | Resultat | Evidència |
| --- | --- | --- |
| Suite unitària | 150/150; OAuth, sessió, identitat, denegació de vies antigues, controlador i regressions | [log](../output/google-only/unit.txt) |
| API real aïllada | 38/38 fluxos amb D1, R2 i workerd; sense xarxa Google | [resultat](../output/google-only/api-result.json), [log](../output/google-only/api.txt) |
| Interfície React | 7 comprovacions; únic botó Google, sense camps de contrasenya ni identitat editable, preferències disponibles | [resultat](../output/google-only/ui-preflight.json) |
| Tipus, sintaxi i lint | Correctes | [tipus](../output/google-only/typecheck.txt), [lint final](../output/google-only/final-lint.txt) |
| Compilació i recursos públics | Build correcte; 58 fitxers idèntics en SHA-256, cap prova de dades a producció | [build](../output/google-only/build.txt), [smoke](../output/google-only/public-smoke.json) |
| Entrada Google real | Dues entrades verificades; nom i foto carregats, cap camp editable d’identitat | [navegador](../output/google-only/navegador-verificat.json) |
| Mòbil i escriptori | 390×844 i 1440×900; sense desbordament, perfil accessible i confirmació antiga retirada | [mòbil](../output/google-only/perfil-mobil.jpg), [escriptori](../output/google-only/perfil-escriptori.jpg) |
| Migració local | 38 taules de dades conservades; només nova columna de proveïdor de sessió i registre de migració | [comparació](../output/google-only/migracio-local-verificada.json) |
| Migració de producció | Còpia abans i després; dades i columnes prèvies de sessions idèntiques | [comparació](../output/google-only/migracio-remota-verificada.json) |
| Còpies locals D1/R2 | 14 fitxers amb hashes correctes; SQL restaurable, 39 taules, 12 migracions, integritat i claus foranes correctes | [fitxers](../output/google-only/copia-d1-r2-verificada.json), [SQL](../output/google-only/copia-sql-verificada.json) |
| Publicació | Worker propi, Google configurat, D1/R2 europeus conservats, versió activa al 100% | [metadades](../output/google-only/publicacio-verificada.json), [log](../output/google-only/cloud-deploy.txt) |
| Adreça antiga | Redirecció 308; API 410; sense D1, R2, Assets ni OAuth | [metadades](../output/google-only/legacy-version.json), [log](../output/google-only/legacy-deploy.txt), [proves](../tests/legacy-entry.test.js) |
| Regressions de producte | Fonts de pastisseria, notes, avaluació i adjunts idèntiques al paquet anterior | [invariants](../output/google-only/verificacio-final.json) |

## Política comprovada

Les rutes antigues de login, registre, convidat, recuperació i inicialització retornen 403 i no creen sessions, encara amb les variables antigues activades. L’autenticació requereix una sessió Google vigent i un compte amb Google enllaçat. Sortir de sessió també funciona amb galetes antigues o caducades. No hi ha recuperació alternativa amb contrasenya.

La signatura, emissor, destinatari, caducitat, domini, nonce, PKCE, estat d’un sol ús i redireccions d’OAuth tenen proves. El controlador impedeix dobles clics, limita l’espera, cancel·la peticions i no navega amb respostes obsoletes o adreces de proveïdor inesperades. La identificació es basa en el `sub` verificat de Google; el nom complet del proveïdor es conserva, també amb noms compostos llargs.

Canviar qualsevol camp d’identitat per l’API rebutja la petició completa abans de desar preferències. Assignatures, curs i aparença continuen sent configurables. Els comptes del centre anteriors s’enllacen només amb la identitat Google verificada; un compte deshabilitat no pot entrar, no se sobreescriu un altre compte ni es fusionen dades. Cap usuari ha rebut privilegis nous.

## Dades i límits de la revisió

Les comparacions de migració es van fer abans de les entrades reals, que actualitzen legítimament la sessió i les dades de Google del compte autoritzat. No s’han afegit notes, recollit pastissos ni desat preferències durant la revisió pública. La còpia SQL remota i els logs de descàrrega es conserven privadament a `.cloud/`, exclosos del lliurament; els informes només contenen resultats agregats. Les dades locals i els seus adjunts s’inclouen a la còpia del projecte.

La marca de consentiment del client Google aportat continua sent «Impossible Goals»; no s’ha modificat el projecte Google compartit. El Worker `lanet` és una aplicació separada. El domini antic no s’ha visitat perquè continua bloquejat en el navegador; la seva retirada està verificada amb proves i les metadades de desplegament, sense emprar una altra via per evitar el bloqueig.

## Lliurament

El procés d’exportació rellegeix cada entrada del ZIP, comprova mida i SHA-256 i valida que totes les evidències de tasques tancades hi siguin. Exclou secrets, JSON OAuth, `.cloud`, `.dev.vars` i dependències reinstal·lables. Es prepara un paquet base verificat abans de tancar la darrera tasca; el paquet final incorpora la checklist i l’historial tancats. L’informe i el manifest del mateix nom s’escriuen a `exports/`.

Paquet base rellegit: **1.969 fitxers**, totes les mides i hashes correctes, 130 tasques verificades amb evidències incloses. [Informe del paquet base](../output/google-only/lliurament-base-verificat.json). El paquet final incorpora el tancament de la tasca T32-04 i la checklist amb les 131 tasques verificades; el seu propi informe verifica novament totes les entrades.

La verificació anterior amb les seves dates i límits es conserva a [l’històric R44](historic/VERIFICATION-2026-10-11-bakery-transparent.md).
