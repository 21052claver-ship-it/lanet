# Verificació de La Net · Cartell R39

10 d’octubre de 2026. **39 requisits, 27 fases, 110/111 tasques verificades.** [Pla](PLA-CARTELL-FIX.md), [checklist](CHECKLIST.md) i [historial](HISTORIAL-CANVIS.md). L’informe anterior es conserva a [historic/VERIFICATION-2026-10-10-google.md](historic/VERIFICATION-2026-10-10-google.md).

## Resultat

Cartell permanent: retirats els controls del perfil i del detall, i el render ignora qualsevol preferència antiga d’ocultació. Compatibilitat de protocol: showBoard sempre true; la resta de preferències, inclòs el mode discret de Notes, es conserva. Primera oferta mínima d’1 pastís; formulari, API i trigger D1 coherents. Les ofertes posteriors doblen el valor actual. Textos en singular i imports ràpids inicials 1, 2, 5 i 10.

## Comprovacions

| Comprovació | Resultat | Evidència |
| --- | --- | --- |
| Proves unitàries | 118/118 | [log](../output/banner-policy/unit.txt) |
| API real aïllada amb D1/R2 | 35 fluxos; mínim 1, imports invàlids, concurrència, cobrament únic i preferències | [resultat](../output/banner-policy/api-result.json) |
| Tipus, sintaxi i lint | Correctes | [log](../output/banner-policy/typecheck.txt) |
| Build i deploy dry-run | Correctes | [log](../output/banner-policy/build.txt) |
| Components reals amb SSR | 9 casos; preferència antiga false/true, detall, formulari i aparença | [informe](../output/banner-policy/ui-verificada.json) |
| Recursos sense canvi | 177 fitxers idèntics al paquet R38 | [hashes](../output/banner-policy/recursos-preservats.json) |
| Dades locals anteriors | 39 taules de dades comparades; files i columnes preservades. Comptador intern D1 exclòs | [informe](../output/banner-policy/dades-preservades.json) |
| SQL local restaurat | 39 taules idèntiques, 10 migracions, quick_check correcte i cap error de claus foranes | [informe](../output/banner-policy/copia-sql-verificada.json) |
| D1/R2 local | 14 fitxers de còpia comprovats amb SHA-256 | [informe](../output/banner-policy/copia-d1-r2-verificada.json) |
| Còpia D1 pública | Restaurada en memòria; SQL privat exclòs del ZIP, enllaç temporal eliminat del log | [informe](../output/banner-policy/copia-cloud-verificada.json) |

## Publicació

Versió **67cfe45e-4db1-4af7-ab94-76e55b071877**, [La Net](https://la-net.impossible-goals-research.workers.dev). Confirmació per CLI: migració 0010, tres recursos actualitzats, 49 reutilitzats i inici en 2 ms. [Log](../output/banner-policy/cloud-deploy.txt), [informe](../output/banner-policy/publicacio-verificada.json). No s’han importat dades locals ni publicat anuncis de prova. La migració substitueix només el trigger de validació.

## Límits i lliurament

SSR comprova el markup, sense demostrar interacció, focus, càrrega d’imatges o responsive real. El navegador de La Net continua denegat pels permisos desats; no s’ha esquivat amb HTTP o altres vies. T25-05 continua pendent: accés a Google Cloud, creació del client OAuth, secrets i entrada real. [Estat](../output/google-auth/activacio.json), [activació](GOOGLE-OAUTH.md).

T26-03 tancada: paquet base rellegit amb tots els SHA-256 correctes. El ZIP final incorpora checklist i historial actualitzats, amb Google real encara pendent. [Comprovació del paquet base](../output/banner-policy/lliurament-base-verificat.json).
