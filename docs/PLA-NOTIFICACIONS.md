# Fiabilitat de les notificacions · 2026-10-15

T83-01 / R105. Punt de partida: 0.6.17 publicada. Marc demana que les notificacions funcionin bé.

La bústia existent comunica a l’autor el resultat de les propostes d’agenda i mostra als delegats les revisions pendents del seu àmbit. Es manté aquest abast, amb confirmacions persistents dins de La Net.

## Correccions

- L’ordre cronològic amb límit 100 amagava avisos antics sense llegir darrere d’històric llegit. Ara es recuperen primer fins a 101 avisos no llegits i se’n mostren 100; el registre addicional indica excés. Si queda espai, s’omple amb històric llegit recent. En marcar un lot, apareixen els següents. No es calcula un recompte global ni es carreguen llistes il·limitades.
- Marcar avisos feia fins a 100 sentències. Ara és un únic UPDATE amb IDs acotats, usuari autenticat i `read_at IS NULL`. IDs repetits es dedupliquen, un lot buit no escriu i lectures repetides conserven el primer timestamp.
- Una lectura confirmada no depèn de l’èxit del bootstrap posterior. El client aplica només els IDs confirmats i conserva avisos arribats durant la petició. Les lectures iniciades abans de l’escriptura continuen protegides per la sincronització existent.
- La bústia actualitza en entrar, ofereix reintent explícit i mostra errors. No s’afegeixen temporitzadors ni polling. El sondeig general conserva els 120 segons i la pausa en inactivitat.
- Cada avís permet obrir la data o la proposta actual quan és accessible. La cua pendent té accés directe al panell de revisió. Si la data ha desaparegut, s’indica explícitament sense un botó buit.
- El comptador diferencia notificacions i tasques de revisió, usa els mateixos permisos que el panell i representa l’excés amb `+`.

## Eficiència i dades

Mateixa taula i destinataris. Una consulta de bústia per bootstrap amb dos accessos indexats, una CTE de màxim 101 files i el seu recompte acotat. La migració additiva 0030 afegeix un índex parcial per als no llegits: permet saltar directament a aquests avisos sense recórrer l’històric llegit. La segona branca usa l’índex usuari/data existent i només s’executa quan hi ha menys de 100 no llegits. Una única fotografia SQL evita duplicats si es marca un avís mentre es carrega la bústia. Cap còpia d’esdeveniments per destinatari, recompte global, secret nou, polling, operació R2 o desplegament del servei privat. La generació transaccional existent continua impedint duplicar un avís en revisions concurrents.

La migració 0030 és únicament CREATE INDEX, sense UPDATE/DELETE ni taules noves. Es prova sobre 10.000 avisos llegits i un no llegit antic, amb EXPLAIN de l’índex i igualtat de totes les files abans/després. Producció exigeix CI exacta, còpia privada restaurada i íntegra, només 0030 pendent i aplicació separada via proveïdor amb registre de migracions. No s’executen migracions antigues ni scripts de regals/roster.

## Verificació

Proves unitàries: antic no llegit darrere de 110 llegits, lots amb excés, arribades concurrents, privacitat, validació d’IDs, lot buit, idempotència i una única escriptura. Consulta contrastada amb EXPLAIN QUERY PLAN sobre l’índex existent.

Navegadors: 320/1440 px en Chromium, Firefox i WebKit amb fixtures; actualització en obrir, lectura individual/agrupada i recàrrega, fallada d’escriptura/reintent, fallada de refresh després de confirmar, arribada concurrent, 101 avisos, destinacions de data/proposta/cua i data no disponible. Regressions anteriors de delegats i API amb D1/workerd local.

Evidències privades a `output/notifications/` i logs `output/notifications-*.log`. Resultats finals i publicació es consignaran en el seguiment i al rebut de versió. Cap visita a la web o API de producció; els navegadors són automatitzats i les amplades mòbils emulades.

Resultat local: 453 unitàries, 30 escenaris de notificacions i 15 de delegats correctes. D1/workerd confirma l’SQL real i les lectures privades/idempotents. A 320 px, la pestanya activa es manté visible també quan WebKit afegeix scrollbar i quan la finestra passa d’escriptori a mòbil. Tipus/lint/build correctes. Fonts i CI/publicació es verificaran abans de tancar la tasca.

Revisió final d’eficiència: l’índex parcial 0030 evita recórrer històric llegit. La consulta de llegits usa l’ordre de timestamp de l’índex existent; el desempat per ID s’aplica només a les files del lot final, evitant ordenar històrics amb timestamps idèntics. 454 unitàries correctes. Es requereix una correcció de la mateixa PR40; la publicació continua sent única.

Publicació completada: [0.6.18](https://github.com/21052claver-ship-it/lanet/releases/tag/v0.6.18) · [PR40](https://github.com/21052claver-ship-it/lanet/pull/40) · [CI de main](https://github.com/21052claver-ship-it/lanet/actions/runs/38659165728) · [Informe](releases/0.6.18.md). T83-01 verificada. Commit d2cadcc35a98e94da812b49503d4ef58a7489424, tag/release immutable i digest del rebut, domini/callback/bindings i desplegament confirmats via proveïdor. Una pujada inicial i una correcció de branca i una publicació; cap prova pública ni desplegament privat; només índex additiu 0030.
