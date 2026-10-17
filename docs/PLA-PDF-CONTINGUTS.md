# Continguts sense descàrregues automàtiques

17 d’octubre de 2026 · T89-01 · R114

Marc informa que prémer només «Continguts» descarrega un PDF, sense obrir cap apunt. El codi de la llista munta un iframe per cada PDF accessible i el servidor serveix els PDF amb `Content-Disposition: attachment`: navegar a aquest iframe pot iniciar la descàrrega.

La correcció substitueix l’iframe de la targeta per una portada estàtica. La llista no ha de demanar els bytes del PDF. Obrir expressament un material conserva el visor PDF.js existent; l’enllaç de descàrrega continua requerint una acció explícita. No cal canviar les capçaleres de seguretat ni el servidor.

Les proves només utilitzen el PDF fictici de la fixture local. Es comprovaran peticions i descàrregues després d’entrar des del menú, repetir el clic, recarregar, navegar i filtrar, i després lectura/descàrrega explícites en mòbil i escriptori als tres motors. Cap visita a la plataforma pública ni inspecció de fitxers reals.

Estat: verificació local correcta; pendent CI exacta i una publicació de 0.6.24. Evidències privades a `output/contents-download/`.

## Resultats locals

Reproduït un únic clic a Continguts que demanava i descarregava el PDF fictici. Retirat l’iframe de les targetes i substituït per una portada estàtica. La llista no demana cap PDF; el visor PDF.js carrega només el material obert i la descàrrega requereix el seu enllaç. 6 escenaris de 10 etapes, mòbil/escriptori als tres motors, amb 0 peticions/descàrregues espontànies; lectura i bytes de la descàrrega explícita correctes. 33 regressions de Continguts i 475 unitàries correctes; tipus/lint/build correctes. Portades revisades sense solapaments. Cap canvi de servidor, capçaleres, permisos, migracions o operació privada.

La reproducció anterior desa una petició de tipus document i una descàrrega només amb el clic al menú. La matriu final cobreix clic únic i repetit, enrere/endavant, retorn de l’horari, pestanyes, cerca, ordenació, assignatures, recàrrega i retorn del lector. Un segon PDF local vàlid roman sense carregar quan s’obre el primer. La descàrrega explícita es contrasta amb tots els bytes originals, la ruta i el recompte d’una sola descàrrega. Es manté la capçalera attachment del servidor.

Durant la preparació de la prova es corregeix una clau d’objecte duplicada a la fixture. WebKit/Windows proposa el nom derivat de la URL en aquesta fixture; la prova comprova la identitat amb tots els bytes del PDF i la ruta sol·licitada, sense dependre del nom suggerit pel navegador. La primera portada també es revisa per eliminar una etiqueta redundant que se solapava amb el text. La matriu final completa passa sense ignorar errors.
