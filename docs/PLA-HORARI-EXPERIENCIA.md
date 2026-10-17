# Horari · experiència visual i funcional

15 d’octubre de 2026 · R109 · F87 · T87-01.

La revisió parteix de 0.6.21 i preserva el seu tancament documental local. Una única tasca activa i fixtures fictícies amb el catàleg oficial existent. No es visita l’aplicació/API públiques ni s’inventa professorat, hores o festius.

L’auditoria comprova els itineraris A/B/C i les variants per dia, navegació de setmanes, selecció mòbil i retorn a Avui, data d’alta contextual, detalls i enllaços, lectura de targetes i pauses, esdeveniments curts/solapats/fora de franja i ús amb teclat. Les captures i mesures a 320–1440 px i paisatge són emulades, sense acreditar dispositius físics.

Incidències inicials al codi: WeekTimeline conserva el dia com estat independent de la data del pare; canviar la pestanya no actualitza l’alta global i Avui no retorna al dia actual. Les columnes d’esdeveniments es calculen per coincidència directa, de manera que una cadena pot canviar l’amplada d’un element i tapar el seu veí. Es contrastaran amb reproduccions locals abans de corregir-les.

Resultats, decisions, regressions i publicació s’afegiran en verificar-los. Evidències privades a output/schedule-experience. Qualsevol canvi de dades/servidor s’avaluarà explícitament; es prioritza resoldre la presentació amb el catàleg i les API existents.

## Ampliació i recuperació

C: es va quedar sense espai i una escriptura fallida va buidar Schedule.jsx. Restaurat des de Git i reconstruït abans de continuar. No hi va haver publicació d’aquest estat. R110 afegeix un preflight de PDF limitat a capçalera, final i referència d’índex, noms més estrictes i límits de recursos al visor; no és un parser complet, antivirus ni filtre de tot contingut actiu. PDF ja validats amb la política antiga es revaliden abans de servir-los i conserven l’objecte R2. R111 afegeix un botó al menú reutilitzant Comunitat/Delegats, només per a membres assignats amb àmbit gestionat; els endpoints mantenen els permisos existents. Un sol lot de publicació 0.6.22.

Referències: [OWASP File Upload](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html), [PDF.js API](https://mozilla.github.io/pdf.js/api/draft/api.js.html).

## Verificació local

0.6.22 en revisió local: horari amb dia únic, Avui/alta/mes coherents, solapaments consistents i exportació de classes. Accés al panell per representants assignats; PDF/noms/recursos reforçats i revalidació de política antiga. 469 unitàries, 36 nous fluxos en tres motors i 81 regressions (15 targetes, 27 horaris oficials, 36 pujades i 3 visors PDF) correctes, tipus/lint/build i API locals correctes. Incidència de captura intermèdia WebKit aïllada; la captura de viewport i el recorregut complet passen sense forçar clicks. Pendent CI exacta de PR/main i una publicació; cap prova pública ni migració.

Els PDF originals es serveixen com a descàrrega; el visor integrat continua renderitzant-los al canvas, amb eval i XFA desactivats i pressupost de píxels. La validació del PDF llegeix només prefix/final i la referència d’índex, amb cost acotat; no descomprimeix ni certifica l’absència de malware en els streams. Un PDF actualment validat no torna a escanejar-se en cada lectura. No es trameten documents a serveis externs.
