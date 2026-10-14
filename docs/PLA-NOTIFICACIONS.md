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

Mateixa taula, índex usuari/data i destinataris existents. Una consulta de bústia per bootstrap amb dos accessos indexats, una CTE de màxim 101 files i el seu recompte acotat. Una única fotografia SQL evita duplicats si es marca un avís mentre es carrega la bústia. Cap migració, còpia d’esdeveniments per destinatari, recompte global, secret nou, operació R2 o desplegament del servei privat. La generació transaccional existent continua impedint duplicar un avís en revisions concurrents.

## Verificació

Proves unitàries: antic no llegit darrere de 110 llegits, lots amb excés, arribades concurrents, privacitat, validació d’IDs, lot buit, idempotència i una única escriptura. Consulta contrastada amb EXPLAIN QUERY PLAN sobre l’índex existent.

Navegadors: 320/1440 px en Chromium, Firefox i WebKit amb fixtures; actualització en obrir, lectura individual/agrupada i recàrrega, fallada d’escriptura/reintent, fallada de refresh després de confirmar, arribada concurrent, 101 avisos, destinacions de data/proposta/cua i data no disponible. Regressions anteriors de delegats i API amb D1/workerd local.

Evidències privades a `output/notifications/` i logs `output/notifications-*.log`. Resultats finals i publicació es consignaran en el seguiment i al rebut de versió. Cap visita a la web o API de producció; els navegadors són automatitzats i les amplades mòbils emulades.

Resultat local: 453 unitàries, 30 escenaris de notificacions i 15 de delegats correctes. D1/workerd confirma l’SQL real i les lectures privades/idempotents. A 320 px, la pestanya activa es manté visible també quan WebKit afegeix scrollbar i quan la finestra passa d’escriptori a mòbil. Tipus/lint/build correctes. Fonts i CI/publicació es verificaran abans de tancar la tasca.
