# Revisió local — 9 d’octubre de 2026

La Net 0.1.0, restaurada del ZIP del 8 d’octubre i revisada contra les set pantalles v1 i les correccions v2. Frontend, D1 i R2 locals; cap desplegament remot executat.

## Canvis comprovats

- Marca, icones de fang 3D, retrats de demostració, il·lustracions dels Plusos, pastís de Pastisdoro i caseta originals reutilitzats des de les imatges aprovades. Procedència a [RECURSOS-ORIGINALS.md](../../design/RECURSOS-ORIGINALS.md).
- Tipografia local amb pesos 400–900, barra lateral de 228 px, barra superior de 102 px, títols, superfícies, cantonades, ombres i espais reajustats. Formularis i contingut continuen treballant amb les dades del servidor.
- Apunts en dues columnes amb formats i previsualitzacions; Plusos en tres targetes verticals; notes amb files de 54 px; Estudi amb cercle, pastís i ambient; Comunitat amb dos panells i accés permanent a propostes; Pastisseria amb l’escena aprovada i moneder real.
- Calendari amb context o només exàmens, setmana i mes, detall d’examen i lectura clara de matèria, títol i hora.
- Entrada a la Pastisseria amb perspectiva CSS, transició de 480 ms, llum i vapor al forn, i pastís de recompensa només després de confirmar la resposta del servidor. Moviment reduït elimina la transició i els efectes decoratius. Focus conservat sense desplaçaments inesperats.
- Àudio Web Audio generat localment: acords i melodia lo-fi, pluja i vent estèreo filtrats. Sense pistes externes, reproducció automàtica ni dependència d’un servei de música. Arrencada cancel·lable, recuperació d’errors, canvi d’ambient, volum gradual, aturada global i alliberament del graf d’àudio. El programador musical evita acumular notes després d’una pestanya inactiva.
- Corregit el primer segon del temporitzador, que podia mostrar 25:01 en iniciar. Corregit el rebuig de modificacions en ports locals personalitzats: l’origen addicional només s’accepta amb configuració explícita i mode demo.

## Comprovacions automàtiques

| Comprovació         | Resultat                                                                                           |
| ------------------- | -------------------------------------------------------------------------------------------------- |
| `npm test`          | **28/28**: 14 de domini/SQLite, 5 d’àudio, 3 de temporitzador, 3 d’origen i 3 de cerca             |
| `npm run test:api`  | **22/22** fluxos amb D1 i R2 reals aïllats                                                         |
| `npm run typecheck` | Tipus Workers/TypeScript, sintaxi de servidor/scripts i ESLint superats després dels últims canvis |
| `npm run cf:check`  | Build final i `wrangler deploy --dry-run` superats; 34 recursos estàtics, sense publicar           |

Les proves d’API cobreixen autenticació, invitacions, configuració del curs, permisos, dades privades, plusos, calendari, adjunts, likes, lectures, compres, retirada, propostes, bàner i recuperació de comptes. [Resum de l’execució](../../output/fidelity/api-result.json): 22 fluxos, 8 d’octubre a les 21:39 UTC; original a `output/api-tests/1791495505265/result.json`. La passada de detall no modifica el servidor. Les bases i els buckets de proves estan exclosos del paquet exportat.

Els registres de la revisió final són [unit-final.log](../../output/fidelity/unit-final.log), [typecheck-final.log](../../output/fidelity/typecheck-final.log) i [cf-check-final.log](../../output/fidelity/cf-check-final.log).

## Passada de màxim detall

El [pla de detall](../PLA-DETALL.md) registra els ajustos i els criteris executats. Les icones laterals recuperen les mides natives; el botó de saldo passa de 56 a **51 px**. La taula de notes comença a **y=287** i acaba a **y=774,6** a la mida de referència. Es recuperen l’ordre de matèries, els colors, les amplades de les columnes i les pestanyes, i es trasllada Afegir avaluació a la barra del full. El selector Més conserva l’accés a totes les assignatures; el menú addicional conté l’exportació CSV.

Apunts, Plusos i Propostes comparteixen una cerca tolerant als accents, les majúscules, els apòstrofs i els espais. Les paraules poden aparèixer en camps diferents. Les pestanyes admeten fletxes, Home i End amb un sol punt de tabulació. Les accions de desar i reaccionar bloquegen una segona petició mentre la primera està pendent.

La Pastisseria invalida els temporitzadors i les respostes tardanes en sortir o canviar de secció. El repte inclou càrrega, error i reintent; el focus torna a la clau o a la porta segons el recorregut. La càrrega normal i els retorns de focus s’han comprovat al navegador; el camí de reintent s’ha revisat en codi, sense provocar una interrupció artificial del servidor. El saldo continua a **27**.

Estudi recupera la geometria de les dues accions inicials, el cercle i el control de volum taronja amb resposta de teclat. Reiniciar apareix quan hi ha una sessió en marxa o temps consumit. S’han comprovat la pausa després de consumir temps, el reinici a 25:00 i l’activació/aturada de pluja a volum zero, amb retorn a 0,25.

S’ha reproduït i corregit una aturada de Vite per **EBUSY** de Windows en copiar captures. La vigilància exclou `output/`, `exports/`, `backups/` i `.wrangler/`; les captures posteriors s’han pogut escriure amb el servidor en marxa. El codi i els dissenys continuen vigilats.

La passada té **26 comprovacions funcionals** superades a [checks-detall.json](../../output/fidelity/checks-detall.json), **28 combinacions de pantalla i mida** sense desbordament exterior i **9 casos** del comparador amb imatges carregades. Les noves captures d’escriptori i mòbil substitueixen les anteriors; les captures prèvies d’escriptori es conserven a `output/fidelity/abans-detall/`. Les captures de formularis i de la recompensa corresponen a la primera passada del mateix dia.

La mesura de píxels foscos dels títols queda a [mesures-titols.json](../../output/fidelity/mesures-titols.json). Els set títols tenen una amplada i alçada iguals o amb una desviació d’un píxel respecte de la referència en aquesta mesura. Això **no** compara la forma de cada lletra ni tots els píxels de la pantalla. Es pot reproduir amb `python scripts/measure-fidelity.py` amb Pillow instal·lat; l’script llegeix les imatges i genera estadístiques, sense modificar-les.

## Revisió amb navegador

Navegador integrat de Codex, contra Vite **5183** i Worker local **8793**. Les set pantalles s’han revisat a **1586×992**, **1280×800**, **390×844** i **320×844**. Cap pantalla presenta desbordament horitzontal exterior. Cap imatge trencada en les comprovacions finals de 320, 390 i 1586 px. La consola de la pestanya de revisió no registra errors ni avisos.

El paquet compilat final servit pel Worker també s’ha obert amb la sessió real; Notes, Estudi i Pastisseria s’han comprovat a 1280 px sense desbordament, imatges trencades ni errors/avisos de consola. Registre a [checks-worker.json](../../output/fidelity/checks-worker.json).

Comprovacions funcionals de la sessió:

- Menú mòbil a 320 px: diàleg modal, fons inactiu, focus retingut, Escape i retorn al botó d’obertura.
- Cerca d’apunts «Descartes», lector gratuït i presentació del lector a 390 px.
- Filtres OR Física/Química mantinguts en canviar de pestanya de Plusos.
- Calendari: 25 classes i 3 exàmens amb context; 0 classes i 3 exàmens amb Només exàmens; mes amb 42 cel·les. Detall de Matemàtiques i retorn a Horari.
- Nota de Matemàtiques modificada de 8 a 0: mitjana recalculada a 5; desfer restaura 8 i mitjana 8,5. Estat original conservat.
- Temporitzador a 25:00, pausa, navegació i restauració. Els tres ambients d’àudio s’han iniciat amb volum zero per comprovar controls i cicle de vida; aturada global comprovada i volum final restaurat a 0,25. Aquesta comprovació no és una avaluació auditiva de qualitat musical.
- Comunitat amb àmbit global, formulari de proposta obert i cancel·lat.
- Pastisseria: entrada a l’interior, focus al forn, recollida real del dia 9, saldo de **26 a 27**, un sol moviment nou, botó desactivat després de recollir. Repte carregat sense enviar resposta. Els moviments anteriors es conserven.

Les comprovacions de dimensions estan desades a [checks-navegador.json](../../output/fidelity/checks-navegador.json). Les captures finals són a [output/fidelity/](../../output/fidelity/): set pantalles d’escriptori, set a 320 px, set a 390 px, calendari amb context/només exàmens/mes, interior amb recompensa i comparador.

## Fidelitat visual i diferències que es conserven

El [comparador](../../design/comparador/fidelitat-implementacio.html) mostra **9 casos**, costat a costat o superposats amb opacitat ajustable. Les imatges s’han comprovat carregades en tots els casos. El comparador també s’ha revisat a 320 px sense desbordament exterior.

Les captures corresponen a la plataforma real. L’eina de captura retorna JPEG de 1581×989 per al viewport de 1586×992; les dimensions reals es mostren al comparador. La compressió i aquesta escala impedeixen certificar igualtat píxel a píxel amb els PNG originals.

Encara hi ha diferències visibles:

- Noms, textos, assignatures, franges del curs, notes, saldos i publicacions són les dades locals, diferents dels exemples de les maquetes. El saldo final 27 reflecteix la prova real de recollida; no s’ha forçat a 24 per fer coincidir la imatge.
- Horari incorpora les pestanyes Horari/Calendari i la barra lateral conserva l’accés a propostes de la revisió v2, també en pantalles que només tenen una maqueta v1.
- La tipografia s’ha aproximat amb Nunito/Nunito Sans perquè no s’ha aportat el fitxer tipogràfic de la maqueta. El rasteritzat del navegador, algunes alçades de text, vores, ombres i espais poden diferir.
- La caseta conserva l’art original. Els controls dibuixats es cobreixen amb una màscara SVG i se substitueixen per HTML funcional; pot quedar un halo fi al contorn del botó original.
- Les icones són l’art de fang original renderitzat en finestres SVG, i l’animació d’entrada utilitza perspectiva CSS. Els PNG complets compartits ocupen aproximadament 9,25 MB abans de memòria cau; preservar els originals té aquest cost de càrrega.

El treball queda verificat dins d’aquest abast local. No s’afirma identitat visual absoluta ni absència universal d’errors. El domini, els recursos Cloudflare del compte i un desplegament real continuen pendents de configuració. Els pagaments amb diners continuen fora d’aquesta fase.

## Còpia transportable

L’exportador conserva codi, fonts locals, dissenys, captures, build, D1/R2 i SQL de suport. Exclou dependències reinstal·lables, memòries cau, metadades d’agents/Git i fixtures d’API. Descarta el manifest heretat del ZIP anterior abans de generar-ne un de nou: s’ha corregit la duplicació de `CONTINGUT-ZIP.json`, detectada per la verificació d’integritat. Amb els servidors aturats, `scripts/export-project.ps1 -LocalPorts @(5183,8793)` comprova la mida i el SHA-256 de cada entrada del ZIP i del manifest. L’informe de cada còpia es desa a `exports/*.verificacio.json`; les instruccions de recuperació són a [TRASLLAT.md](../../TRASLLAT.md).
