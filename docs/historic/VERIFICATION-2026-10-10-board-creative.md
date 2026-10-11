# Verificació de La Net · cartell visual R31

10 d’octubre de 2026. [Pla del cartell](PLA-CARTELL-VISUAL.md), [checklist](CHECKLIST.md), [registre](SEGUIMENT.json) i [historial](HISTORIAL-CANVIS.md): 31 requisits, 19 fases i 80 tasques. L’informe R30 es conserva íntegre a [historic/VERIFICATION-2026-10-10-bakery-exterior.md](historic/VERIFICATION-2026-10-10-bakery-exterior.md).

## Resultat

El cartell passa de 236 × 44 a **272 × 56 px** en escriptori, amb marc i veta de fusta. La superfície interior de 260 × 44 conserva la proporció **65:11**. El compositor ofereix **Només imatge**, **Text gran** i **Imatge i text**. Una imatge sola admet títol buit; un anunci sense contingut es rebutja. El text curt arriba a 26 px i s’ajusta segons longitud i amplada. El detall conserva el contingut complet i l’autoria.

El retallador mostra tota la foto, selecció, guies, nanses, arrossegament, zoom d’1 a 6 i alternativa de teclat. **Imatge sencera** conserva els quatre cantons amb marges transparents; **Omplir cartell** retalla segons la finestra seleccionada. La previsualització comparteix la geometria del cartell publicat i queda immediatament sota l’editor. Només es puja el PNG final de **1560 × 264 px** en publicar. Canviar de format conserva la foto i el retall; una foto invàlida conserva l’esborrany anterior.

Les ofertes ràpides indiquen la selecció i el cost resultant. Un conflicte 409 conserva el contingut i demana revisar el nou mínim. La pujada es reutilitza en el reintent per evitar duplicar fitxers. Les regles d’oferta, propietat i càrrec atòmic es mantenen. Els anuncis antics amb fotos sense retallar omplen la superfície amb enquadrament centrat; el fons de lectura combinat només cobreix les lletres. No s’ha editat l’anunci públic existent.

[Editor en context](../output/board-creative/retallador-final.png), [editor mòbil](../output/board-creative/retallador-final-mobil.png), [text gran publicat en local](../output/board-creative/text-gran-publicat.png) i [disseny](../DESIGN.md).

## Comprovacions locals

| Comprovació | Resultat | Evidència |
| --- | --- | --- |
| Unitats i regressions | 74/74 | [unit.txt](../output/board-creative/unit.txt) |
| Fluxos API amb D1/R2 aïllats | 27/27 | [api-result.json](../output/board-creative/api-result.json) |
| Tipus, sintaxi i ESLint | Superat | [typecheck.txt](../output/board-creative/typecheck.txt) |
| Build i desplegament simulat | Superat | [build final](../output/board-creative/build-formulari-final.txt) |
| Interaccions reals | 24/24 | [interaccions.json](../output/board-creative/interaccions.json) |
| Set pàgines, set amplades i dues densitats | 98/98 | [responsive.json](../output/board-creative/responsive.json) |
| Àudio i temporitzador simultanis | 7/7 | [controls actius](../output/board-creative/responsive-controls-actius.json) |
| Compositor, foto i oferta màxima | 7/7 | [formulari](../output/board-creative/responsive-formulari.json) |
| PNG retallat, 15 mostres de píxels | Diferència màxima 0 | [retall](../output/board-creative/retall-pixels.json) |
| Foto sencera i marges transparents | Superat | [foto sencera](../output/board-creative/imatge-sencera-pixels.json) |
| Dades originals preservades | 3 usuaris, 345 files i 16 taules | [auditoria](../output/board-creative/preservacio-dades.json) |
| Art i àudio originals preservats | 20 fitxers amb el mateix SHA-256 | [art](../output/board-creative/art-preservat.json) |

Les **112 combinacions responsive** cobreixen amplades de 320 a 1536 px, sense desbordament exterior ni solapament de capçalera després dels ajustos. Les proves d’ús inclouen imatge sola, text, combinació, foto sencera, persistència, retall amb ratolí/teclat, zoom, nanses, errors de fitxer, saldo insuficient, mostrar/amagar i conflicte d’ofertes. Les publicacions de prova s’han fet exclusivament en una base aïllada. Cap error o advertiment de consola capturat. [Informe consolidat](../output/board-creative/verificacio-local.json).

## Publicació

Versió activa **`5bf1215d-d236-4f26-8f59-73a05c2faf53`** al mateix [Worker públic](https://la-net.impossible-goals-research.workers.dev). Cap migració nova ni importació de dades locals. **47 recursos públics coincideixen en SHA-256** amb la compilació. Salut i accés temporal correctes. [Desplegament final](../output/board-creative/cloud-deploy-compat.txt) i [recursos verificats](../output/board-creative/publicacio-recursos.json).

**14 casos públics** cobreixen les set seccions a 1280 i 390 px: cap desbordament, solapament ni imatge trencada. S’ha verificat el compositor amb text de 26 px i el format d’imatge sola sense títol obligatori. Saldo del convidat tècnic **24** i mateix anunci abans/després; cap publicació de prova ni canvi de notes o perfil. Cap error ni advertiment de consola. [Registre públic](../output/board-creative/publicacio-navegador.json), [escriptori](../output/board-creative/publicacio-escriptori.png), [mòbil](../output/board-creative/publicacio-mobil.png) i [compositor](../output/board-creative/publicacio-compositor.png).

## Còpia i lliurament

Amb els servidors aturats s’ha exportat `backups/la-net-local-2026-10-10-cartell-visual.sql`. La restauració en memòria coincideix en totes les files i l’esquema de **38 taules**, incloses **set migracions**, amb `quick_check` correcte i zero errors de referències. SHA-256: `1f7e5592428f8b6b73b0849810da12c3edf739fe1ebc0797ebdb3930221d6e15`; coincideix també amb la instantània R30. [SQL verificat](../output/board-creative/copia-sql-verificada.json).

Còpia D1/R2 nova a `backups/state-v3-2026-10-10T11-53-36-282Z/`, **14 fitxers** contrastats amb el manifest SHA-256. Les còpies anteriors es conserven. [D1/R2 verificats](../output/board-creative/copia-d1-r2-verificada.json).

Les cinc tasques F18 estan verificades: **80/80 tasques generals, cap activa ni pendent**. El [paquet base](../output/board-creative/lliurament-base-verificat.json) acredita **921 fitxers**, totes les evidències, mides i SHA-256 correctes i absència de camins privats exclosos. El ZIP final es regenera amb la checklist tancada i es rellegeixen totes les mides i SHA-256. Els manifests i informes `*.verificacio.json` es conserven a `exports/`. [Trasllat](../TRASLLAT.md).

## Abast i límits de comprovació

El navegador ha denegat seleccionar un fitxer al compositor públic. No s’ha repetit l’acció ni utilitzat una altra via de pujada. El retall, la pujada real, la persistència i el reintent d’oferta s’havien verificat en la base local aïllada; la revisió pública s’ha completat en lectura.

La consulta final a localhost abans de la còpia també ha estat bloquejada per una preferència de permisos desada del navegador. No s’ha repetit ni substituït per una altra via d’accés al navegador. Les evidències locals anteriors es conserven; la còpia SQL i D1/R2 s’ha comprovat directament als fitxers. No s’afirma una nova comprovació visual posterior a l’arrencada final. [Bloqueig registrat](../output/board-creative/ultima-consulta-local-bloquejada.json).

R29 i R30 documenten la cocció, recollida i exterior transparent de la pastisseria. R31 no canvia aquesta seqüència ni els seus recursos. Les proves responsive sí que inclouen la pàgina de pastisseria. No s’afirma identitat de píxel entre tota la plataforma i les imatges de referència ni cobertura de dispositius físics.
