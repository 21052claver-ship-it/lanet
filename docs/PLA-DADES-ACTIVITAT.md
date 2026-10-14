# Dades i dashboard privat

14 octubre 2026 · R99 · T80-01 · H192.

`/admin` i `/api/admin/analytics` requereixen el compte Google verificat `21052.claver@fje.edu`, habilitat. El rol `admin` d’un altre compte no dona accés a aquest dashboard. La gestió acadèmica existent continua a `#management` amb els permisos anteriors.

## Què es conserva

- Una fila per persona/dia a `activity_daily`: primer/últim ús, última secció i comptadors mostrejats de presència, canvis confirmats i errors d’operació.
- Un resum per dia a `activity_days`, i per dia/secció a `activity_areas`. Els usuaris únics s’incrementen només quan s’insereix la primera fila personal del dia.
- Inventari d’usuaris habilitats, nombre de fitxers i suma de metadades `files.size`. Triggers incrementals en canvis reals, sense enumerar R2. Aquesta mida exclou originals privats, còpies i objectes encara no registrats: no és la facturació del proveïdor.
- Cap IP, agent de navegador, URL, paràmetre, text, nota acadèmica, cookie, token o còpia de fitxer al sistema d’activitat. El perfil informa de la finalitat i conservació.

## Límits i exactitud

La presència s’envia com a màxim cada 120 segons amb la pestanya visible i interacció en els últims cinc minuts. El servidor aplica el límit de manera atòmica per persona/dia/tipus, compartit entre pestanyes i instàncies; el canvi de dia permet una primera mostra nova. Un clic, una recàrrega o una petició de polling no crea un registre d’esdeveniment.

Canvis i errors: com a màxim una mostra per tipus cada dos minuts per persona. Per tant, els comptadors expressen **intervals mostrejats**, no el nombre exacte de clics, operacions o minuts. La secció indica la mostra acceptada; les accions d’altres seccions dins del mateix interval no afegeixen recompte. L’activitat recent és una aproximació de cinc minuts, no una connexió permanent; una sessió tancada pot continuar apareixent fins que caduqui aquesta finestra.

Per una hora de presència continuada: 30 mostres, 90 mutacions de taula d’activitat i una sola fila personal. D1 també compta el manteniment de l’índex de presència i les proteccions de peticions existents. Els intents repetits dins l’interval no modifiquen files d’activitat, índexs ni agregats. No s’ha afegit cap objecte d’analítica a R2.

El dashboard consulta resums precalculats (màxim 365 dies mostrats, 400 conservats), detalls de 50 persones amb cursor de clau primària i un índex de presència recent. S’actualitza cada minut només amb la pestanya visible. No hi ha dades d’activitat anteriors a l’inici real de la recollida.

La sincronització automàtica general també passa de cada 30 a cada 120 segons (quatre vegades menys recàrregues periòdiques), s’atura amb la pestanya oculta o cinc minuts sense interacció i evita peticions simultànies. El focus respecta el mateix interval mínim. Els desats continuen actualitzant la vista immediatament amb el mecanisme existent.

## Neteja i publicació

Detall personal: dia actual i 34 anteriors. Resums: dia actual i 399 anteriors. Neteja indexada en lots de fins a 1.000 files personals, 500 sessions caducades i 500 fluxos OAuth caducats per passada. Es conserven els totals quan caduquen els detalls.

Una concessió a `settings` coordina com a màxim una passada de manteniment per minut entre bootstrap i el Worker privat programat. Es reutilitza la cua durable de retirada de fitxers, els lots i el backoff de R2 ja existents; un error reintenta en una passada posterior. No esborra materials vinculats, notes, saldos o l’històric acadèmic. Si no hi ha trànsit ni scheduler, la neteja es reprèn quan torna una passada.

El dashboard mostra l’última passada completada i les retirades pendents. Avisa si fa més de 10 minuts que no es confirma el manteniment; una fallada no actualitza la data d’èxit. Aquest estat reutilitza una sola fila de `settings`, actualitzada com a màxim una vegada per minut en tot el sistema.

Abans de publicar: còpia privada de D1, revisió/aplicació separada de `0029_activity_dashboard.sql`, comprovació d’inventari i esquema, desplegament separat del Worker privat `lanet-file-maintenance` conservant compte/bindings/cron, PR i Validate amb el conjunt final, `npm run release`. CI no rep secrets ni migra producció. Les proves utilitzen només fixtures locals. Cap visita a la web pública.

## Evidències

- `tests/activity.test.js`: permisos al servidor, CSRF, fallades de telemetria sense afectar el desat, mostreig/concurrència, escriptures, límits, índexs, canvi de dia, paginació, retenció, inventari i migració additiva.
- `scripts/test-activity-dashboard.mjs`: dashboard local en tres motors, accés privat, navegació directa, errors recuperables, paginació i geometria mòbil.
- Evidències privades a `output/activity-dashboard/`; no s’inclouen al repositori públic.

Publicació conjunta confirmada: [0.6.16](https://github.com/21052claver-ship-it/lanet/releases/tag/v0.6.16) · [CI](https://github.com/21052claver-ship-it/lanet/actions/runs/38638160574) · [registre](releases/0.6.16.json). Validació final de la tanda: 446 unitàries, 318 fluxos locals i tots els jobs CI correctes.
