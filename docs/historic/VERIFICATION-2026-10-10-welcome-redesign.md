# Verificació de La Net · Benvinguda R41

10 d’octubre de 2026. **41 requisits, 29 fases i 119 tasques; 118/119 verificades.** [Pla](PLA-BENVINGUDA.md), [checklist](CHECKLIST.md), [historial](HISTORIAL-CANVIS.md). [Informe anterior R40](historic/VERIFICATION-2026-10-10-assessment-model.md).

## Resultat

Benvinguda i inici de sessió reconstruïts amb marca original, una presentació breu, art 3D transparent i formulari compacte. Una acció principal; registre com a enllaç, convidat separat i demostració local plegada. Google només apareix si està disponible. Mòbil en una columna, art decoratiu sense descàrrega en la vista compacta, camps de 48 px i control de contrasenya de 44 px. Càrrega, error de connexió, recuperació i retorn Google integrats en el mateix disseny.

Peticions duplicades bloquejades fins que acaba bootstrap. Error i reintent, recuperació sense entrada automàtica, secrets netejats en canviar de mode, focus identificat i enllaç de salt a un objectiu enfocable. Backend i migracions sense canvis; cap escriptura de prova en producció.

## Comprovacions

| Comprovació | Resultat | Evidència |
| --- | --- | --- |
| Unitats | 131/131, sis proves noves d’accions asíncrones | [log](../output/welcome-redesign/unit.txt), [proves](../tests/auth-session.test.js) |
| API D1/R2 aïllada | 38 fluxos, incloent convidat, recuperació, Google, notes, cartell i permisos | [resultat](../output/welcome-redesign/api-result.json) |
| Tipus, sintaxi i lint | Correctes | [log](../output/welcome-redesign/typecheck.txt) |
| Build i deploy dry-run | Correctes | [log](../output/welcome-redesign/build.txt) |
| Components reals | 16 casos SSR i callbacks controlats; cap stub ni xarxa | [informe](../output/welcome-redesign/ui-verificada.json), [SSR autònom](../output/welcome-redesign/welcome-offline.html) |
| Estils | Onze parelles de text amb contrast ≥4,5:1; camp 3.08:1 i focus 4.06:1; 1.739 regles CSS alienes idèntiques | [informe](../output/welcome-redesign/estils-verificats.json) |
| Art | 1536×1024, alfa real, WebP sense pèrdua de 733084 bytes | [informe](../output/welcome-redesign/art-verificat.json), [prompt](../design/welcome-study-v1-prompt.txt) |
| Regressions | 189 fitxers idèntics; espai autenticat, backend i migracions preservats | [hashes](../output/welcome-redesign/recursos-preservats.json) |
| SQL local restaurat | 39 taules idèntiques, onze migracions, quick_check correcte i cap error de claus foranes | [informe](../output/welcome-redesign/copia-sql-verificada.json) |
| Còpia D1/R2 | 14 fitxers amb SHA-256 comprovat | [informe](../output/welcome-redesign/copia-d1-r2-verificada.json) |

## Publicació i límits

**d8c507fe-e478-4b6f-9785-6574e5a20c12**, [La Net](https://la-net.impossible-goals-research.workers.dev). Wrangler confirma 3 recursos nous/actualitzats, 51 reutilitzats i inici en 2 ms. Fonts comprovades i recursos de dist idèntics als publicats. Sense migració ni importació local. [Log](../output/welcome-redesign/cloud-deploy.txt), [verificació](../output/welcome-redesign/publicacio-verificada.json).

Els permisos desats continuen denegant el navegador de La Net. No s’ha fet servir cap via alternativa per accedir-hi. SSR, callbacks i contrast de CSS no acrediten layout, responsive, validació nativa, focus, interacció o càrrega real d’imatges en navegador. La previsualització és estàtica; els controls no tenen JavaScript. No es declara perfecció visual comprovada al navegador.

T25-05 continua pendent: client OAuth, secrets i entrada Google real. [Estat](../output/google-auth/activacio.json), [activació](GOOGLE-OAUTH.md).

T28-04 verificada. Paquet base rellegit amb tots els hashes correctes; el ZIP final incorpora checklist i historial actualitzats. [Paquet base](../output/welcome-redesign/lliurament-base-verificat.json).
