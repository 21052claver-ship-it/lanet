# Verificació de La Net — 10 d’octubre de 2026

Revisió del codi actual contra els 26 requisits de Marc. La [checklist](../CHECKLIST.md) registra 56 tasques i l’[historial](../HISTORIAL-CANVIS.md) enllaça les evidències. Una sola tasca activa cada vegada. Informe anterior conservat a [historic/VERIFICACIO-2026-10-09.md](../historic/VERIFICACIO-2026-10-09.md); els seus totals no s’atribueixen al codi nou.

## Comprovacions integrades actuals

| Comprovació                                                           | Resultat                                     | Evidència                                                                                                      |
| --------------------------------------------------------------------- | -------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Unitats, SQLite, preferències, guest, àudio, seqüència, pesos i vídeo | **46/46, repetides amb el cartell compacte** | [unit.txt](../../output/cartell-compacte/unit.txt) |
| API amb D1 i R2 reals, dades aïllades                                 | **26/26**                                    | [api-final.txt](../../output/revisio-v3/api-final.txt)                                                            |
| Tipus Workers/TypeScript, sintaxi i ESLint | Superat amb el cartell compacte | [typecheck.txt](../../output/cartell-compacte/typecheck.txt) |
| Build i deploy dry-run | Superat, 52 entrades de Wrangler | [cf-check.txt](../../output/cartell-compacte/cf-check.txt) |
| Responsive: set seccions × sis amplades × dues densitats | **84 casos actuals sense solapaments ni desbordament exterior** | [compacta](../../output/cartell-compacte/responsive-compacta.json), [còmoda](../../output/cartell-compacte/responsive-comoda.json) |
| Preservació de dades anteriors                                        | **345 files, 3 usuaris, 16 taules intactes** | [preservacio-dades.json](../../output/revisio-v3/preservacio-dades.json)                                          |

Les proves API cobreixen privadesa entre comptes, invitacions, grups, notes zero, pesos, preferències parcials concurrents, esdeveniments i progrés, likes/consultes, compres, fitxers, rangs de vídeo, ofertes simultànies, repte retirat i recuperació. Les bases de proves queden fora del ZIP. La producció utilitza recursos separats i no rep la base local.

Els 26 fluxos API corresponen a la integració anterior a R26; el canvi del cartell no modifica el servidor, l’esquema ni l’economia. Tipus, unitats, build i matriu de navegador sí s’han repetit després de l’ajust final.

## Cartell compacte — R26

La fotografia era una mostra d’estil. El cartell actual utilitza CSS i ocupa **236 × 44 px a la barra superior**, o **44 × 44 px a 1100 px o menys**. Cap fila de cartell dins de `main`; títols i contingut queden lliures. La matriu comprova dimensions exactes, separació entre botons, contenció a la capçalera, densitat real, imatges i scroll exterior.

Sis interaccions locals verificades: detall amb missatge complet, Escape i retorn de focus, ocultació sense canvi de posició del títol, preferència persistent després de recarregar, títol llarg amb el·lipsi, miniatura de 30 × 30 px i publicació bloquejada amb saldo insuficient. L’esborrany amb imatge s’ha cancel·lat; cap anunci de prova publicat. [Registre](../../output/cartell-compacte/interaccions.json), [previsualització amb foto](../../output/cartell-compacte/previsualitzacio-foto.png).

A 320 px, música i temporitzador actius alhora: sis botons de capçalera amb àrea mínima de 44 × 44 px, sense interseccions. El menú «Més» conserva totes les seccions i el perfil, bloqueja el fons i retorna el focus amb Escape. Detall dins del viewport. [Comprovació](../../output/cartell-compacte/capcalera-accessible.json), [captura activa](../../output/cartell-compacte/capcalera-activa-320.png), [detall mòbil](../../output/cartell-compacte/detall-mobil.png). **Zero errors nous** durant aquesta revisió local; [registre acotat](../../output/cartell-compacte/consola.json).

[Cartell a escriptori](../../output/cartell-compacte/cartell-escriptori.png), [cartell mòbil](../../output/cartell-compacte/cartell-mobil.png). Les set captures actualitzades a 1280 px són `output/cartell-compacte/*-1280.png`.

## Mode discret comprovat

Switch i preferència de perfil persistents. Els inputs ocults no contenen els valors guardats; només es veu una entrada nova durant l’edició. Mitjanes, aportacions, editor de pesos i previsió ocults; dates i pesos visibles. Avís abans de CSV real.

Navegador: zero, coma decimal, Tab/Enter, desfer, recàrrega, editor i objectiu. A 320 px s’ha afegit 8,3 a una prova pendent, verificat el valor desat i conservat el 7,5 anterior; Desfer ha restaurat la prova pendent. Tots els camps tornen a ocultar-se després de desenfocar. Preferència independent d’altres usuaris comprovada per API.

[Captura escriptori](../../output/revisio-v3/notes-mode-discret-final.png), [captura mòbil](../../output/revisio-v3/notes-mode-discret-mobil.png), [registre](../../output/revisio-v3/mode-discret.json).

## Navegador i coherència

Vite 5183 i API local 8793. Amplades 320, 390, 760, 1024, 1280 i 1586 px, compacta amb barra plegada i còmoda amb barra desplegada, cartell visible. Sense imatges trencades ni desbordament exterior. Corregit el grid lateral de Pastisseria a 1024 px; el cartell queda a la barra superior i no ocupa espai dins del contingut.

Escape tanca primer el desplegable i després el diàleg, amb retorn de focus. Menú mòbil, scroll i focus restaurats. Saltar al contingut no canvia la ruta. Editor i menú a 320 px dins del viewport. Contrast calculat dels nous textos de privadesa/pesos: 4,77–5,27:1. [Accessibilitat i recorregut](../../output/revisio-v3/accessibilitat-final.json). Això no és una certificació WCAG integral.

Apunts: foto, PDF i vídeo combinats en esborrany de prova; lector PDF amb zoom/pàgines, reproducció de vídeo i aturada en tancar. [Comprovacions del lector](../../output/revisio-v3/reader-checks.json). Filtres personals Apunts/Plusos, perfil i densitat verificats. Els nous selectors s’utilitzen a formularis i pantalles.

Estudi: minuts en repòs i aplicació explícita amb sessió activa; navegació conserva el temps. Les cinc pistes carreguen i avancen en el reproductor; canvis ràpids deixen un únic element, volum zero vàlid, aturada global elimina el reproductor. [Àudio al navegador](../../output/revisio-v3/audio/navegador.json).

Comunitat: propostes, vot afegit/retirat, filtres i diàlegs; cartell global compacte, oferta seleccionada i saldo insuficient sense càrrec. API: dues ofertes paral·leles de 10 donen un sol èxit i un sol càrrec de 10.

Pastisseria: exterior complet, vuit poses independents, entrada/cancel·lació/sortida i oferta. Recollida real amb convidat: saldo 24→25, un moviment +1, vol creat després del servidor i eliminat en acabar, botó desactivat. Recàrrega conserva 25. Sense repte a la interfície ni a GET/POST; recompenses anteriors preservades. [Comprovació final](../../output/revisio-v3/pastisseria-final.json).

La consola conserva errors de la seqüència antiga del forn del 9 d’octubre a les 22:56 UTC, corregits amb wrappers de temporitzador; no s’han detectat errors nous durant la matriu final. No es presenta el registre històric buit com si s’hagués eliminat.

## Recursos i límits

[Procedència, prompts i llicències](../../design/RECURSOS-V3.md). Art original reutilitzat; fusta aportada conservada amb SHA-256. Pastissera nova generada amb ImageGen integrat, sprites RGBA en capes. Cinc composicions originals CC0 disponibles localment; PDF.js Apache 2.0 i fonts OFL.

- La qualitat musical s’ha verificat tècnicament (format, nivells, durada, bucle i reproducció), **sense audició humana disponible**. No s’afirma una valoració auditiva.
- El salt concret de Comunitat descrit originalment no s’ha reproduït exactament. S’han reforçat capes, scroll i focus i comprovat els recorreguts disponibles; [registre de reproducció](../../output/revisio-v3/community-reproduction.json).
- No s’ha emulat una xarxa lenta ni moviment reduït al navegador. Càrrega, cancel·lació i sessió caducada tenen comprovacions de codi/API; moviment reduït té proves amb rellotge aïllat i CSS específic.
- No s’afirma identitat de tots els píxels amb v1/v2: dades reals, fonts rasteritzades, densitat, controls nous i escena animada difereixen. Les captures actuals de les set seccions són `output/revisio-v3/final-*-1280.png`.
- Catàleg inicial d’exemple editable; un administrador l’adapta abans d’utilitzar-lo com a curs real. Pagaments amb diners fora d’aquesta revisió.

## Publicació i còpia

**Publicada i comprovada:** [La Net](https://la-net.impossible-goals-research.workers.dev), versió `27d218c4-bb87-44a0-a8a1-8fac870127e2`. Set migracions remotes, D1/R2 de la UE. Després de R26: **46 recursos servits amb SHA-256 coincident** en lectura i cinc comprovacions de navegador del cartell, preferència, focus, mode discret i mòbil. Cap error nou públic capturat. Les 11 comprovacions de servidor de la integració anterior es conserven amb la seva data. `DEMO_MODE=false` i `GUEST_ACCESS=true`; configuració del primer administrador protegida per secret. [Versió activa, recursos i evidències](../PUBLICACIO.md).

Exportació local actual: **`backups/la-net-local-2026-10-10-cartell.sql`**, creada amb Vite/API aturats després de R26. S’ha restaurat en SQLite temporal en memòria: **38 taules amb totes les files idèntiques**, set migracions, `quick_check=ok` i zero errors de referències. L’original només s’ha llegit. [Informe de restauració](../../output/cartell-compacte/copia-sql-verificada.json). La còpia SQL anterior i el seu informe es conserven; l’auditoria de preservació acredita les 345 files originals dels tres usuaris.

El ZIP es crea amb els servidors aturats, amb D1/R2 locals, SQL actual, codi, recursos, documentació i evidències. Exclou `.cloud`, `.dev.vars`, secrets d’entorn, eines reinstal·lables i bases d’API. Manifest de mida i SHA-256 de cada fitxer, rellegit després de comprimir; informe extern `exports/*.verificacio.json`. [Trasllat](../../TRASLLAT.md).
