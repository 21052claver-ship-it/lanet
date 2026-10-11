# Verificació de La Net · pastisseria R29

Revisió del 10 d’octubre de 2026. [Pla de la pastisseria](PLA-PASTISSERIA-ANIMACIO.md), [checklist](CHECKLIST.md), [registre](SEGUIMENT.json) i [historial](HISTORIAL-CANVIS.md): 29 requisits, 17 fases i 71 tasques, amb el límit d’una tasca activa. La verificació anterior es conserva a [historic/VERIFICATION-2026-10-10-ui-clean-resolta.md](historic/VERIFICATION-2026-10-10-ui-clean-resolta.md).

## Resultat

La preparació passa de 4,4 a 20,1 segons: salutació, gir, desplaçament, introducció al forn, tancament, cocció, espera, comprovació, extracció, retorn, presentació i oferta. Les poses es fonen suaument; el cos respira, acompanya els passos i s’inclina en treballar.

El forn obre i tanca la porta, mostra llum, flames suaus, massa que puja i vapor. La cocció dura set segons i precedeix l’oferta. La pastissera queda més endins, darrere de les superfícies del primer pla, que tapen les cames també durant el trajecte. Escenari, exterior i atlas originals mantenen el SHA-256 del lliurament anterior. [Art preservat](../output/bakery-motion/art-preservat.json).

El botó **Agafa el pastís** apareix al costat de la pastissera només quan és cuit. Manté 48 px d’alçada a totes les mides comprovades. Sortir està disponible durant tota la preparació, cancel·la els timers i retorna el focus. En entrar es mostra l’escena sota la capçalera fixa. En recollir, el servidor confirma abans del vol de 1,65 segons des del pastís fins al saldo; el final és únic. Un pastís ja recollit mostra una salutació i una marca discreta.

## Comprovacions locals

| Comprovació | Resultat | Evidència |
| --- | --- | --- |
| Unitats i regressions | 67/67 | [unit.txt](../output/bakery-motion/unit.txt) |
| API amb D1/R2 aïllats, incloses dotze recollides paral·leles | 26/26 | [api.txt](../output/bakery-motion/api.txt) |
| Tipus, sintaxi i ESLint | Superat | [typecheck.txt](../output/bakery-motion/typecheck.txt) |
| Build i desplegament simulat | Superat | [cf-check.txt](../output/bakery-motion/cf-check.txt) |
| Oferta i estat recollit × set amplades | 14/14 | [oferta](../output/bakery-motion/responsive-oferta.json), [recollit](../output/bakery-motion/responsive-recollit.json) |
| Seqüència visual amb timers reals | 12 fases | [seqüència](../output/bakery-motion/seqüencia-visual.json), [captures](../output/bakery-motion/poses/) |
| Interaccions amb el build final en una base aïllada | 10/10 | [integració](../output/bakery-motion/integracio-compilada.json) |
| Dades originals en lectura | 3 usuaris, 345 files i 16 taules intactes | [auditoria](../output/bakery-motion/preservacio-dades.json) |

Amplades: 320, 390, 760, 820, 1024, 1280 i 1536 px. S’ha comprovat desbordament exterior, límits del botó, alçada tàctil, separació del missatge, punts de cara/pastís i imatges carregades. La inspecció de les captures comprova l’oclusió de les cames i la coherència visual; les mesures de punts complementen aquesta inspecció.

Les deu interaccions inclouen cocció sense botó, saldo intacte durant la preparació, sortida a mig procés, retorn del focus, vol visible, exactament +1, finalització única, focus després de recollir, persistència en recarregar i un únic moviment diari. La prova utilitza localhost:8794 i una base dins d’output/api-tests/, exclosa del ZIP. No comparteix les dades originals ni les cookies de 127.0.0.1. Cap error o advertiment de consola a la compilació final.

[Informe local consolidat](../output/bakery-motion/verificacio-local.json), [oferta a 320 px](../output/bakery-motion/oferta-320.png), [oferta d’escriptori](../output/bakery-motion/oferta-1280.png), [cocció](../output/bakery-motion/coccio-compilada.png) i [vol](../output/bakery-motion/vol-pastis.png).

## Publicació i còpia

Publicada la versió `a72e8f46-780b-4bda-b36a-d507babe2d9c` al mateix Worker, amb tres recursos actualitzats i cap migració pendent. **46 recursos idèntics en SHA-256**; salut i accés temporal correctes. La preparació pública mostra el forn coent abans de l’oferta; botó i escena comprovats a 1280 i 390 px, sortida amb focus correcte i saldo intacte a 24. Cap pastís recollit ni dades de perfil/notes modificades durant el recorregut, i cap error nou de consola. [Desplegament](../output/bakery-motion/cloud-deploy.txt), [recursos](../output/bakery-motion/publicacio-recursos.json), [navegador](../output/bakery-motion/publicacio-navegador.json), [oferta pública](../output/bakery-motion/publicacio-escriptori.png) i [PUBLICACIO.md](PUBLICACIO.md).

Amb els servidors locals aturats, el SQL actual `backups/la-net-local-2026-10-10-clean.sql` continua coincidint en totes les files de **38 taules**, amb set migracions, quick_check correcte i zero errors de referències. No cal substituir-lo perquè aquesta revisió no modifica dades locals. SHA-256: `2203e6d7d9bdac05fc681cb0f3c213606914955e84888a51af297ff514eec85c`. [Verificació SQL](../output/bakery-motion/copia-sql-verificada.json). Nova còpia D1/R2 a `backups/state-v3-2026-10-10T09-41-17-132Z/`, amb els 14 fitxers contrastats amb el seu manifest. [Còpia verificada](../output/bakery-motion/copia-d1-r2-verificada.json).

El [paquet base](../output/bakery-motion/lliurament-base-verificat.json) acredita 777 fitxers, mides/SHA-256, totes les evidències i absència de camins privats exclosos. Les quatre tasques F16 estan verificades: **71/71 tasques totals, cap activa ni pendent**. El ZIP final es regenera amb la checklist tancada i es rellegeix íntegrament; el seu manifest i informe `*.verificacio.json` es conserven a `exports/`. [Instruccions de trasllat](../TRASLLAT.md).

## Abast

La recollida completa es comprova en local aïllat i la protecció contra duplicats a l’API; no es recullen pastissos de prova en producció. Moviment reduït es comprova amb proves de seqüència i revisió del codi/CSS, sense canviar la preferència del sistema del navegador. Es conserven l’art original i l’estructura general de la plataforma. Els informes anteriors mantenen els seus recomptes i dates; aquesta revisió comprova els canvis de pastisseria i les regressions de domini/API, sense afirmar que cobreix totes les combinacions possibles.
