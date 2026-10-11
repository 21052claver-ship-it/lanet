# Activitats a Notes · R63 / R64 / T50-01

Tasca T50-01 completada, amb una sola tasca activa durant tota la revisió. Regal acreditat abans de continuar amb Notes; publicació i proves registrades sense solapament.

- [x] Acreditar 50 pastissos extra a tots els comptes existents, amb un moviment únic per compte, sense substituir saldos. 17 comptes, 850 pastissos en total; acreditació remota i idempotència local verificades.
- [x] Mostrar quatre columnes d’activitats extra per defecte, cadascuna amb la seva nota; ampliar-les si hi ha més activitats.
- [x] Mostrar el tipus —redacció, entrega, presentació o altra activitat— al costat del percentatge i conservar el nom concret.
- [x] Facilitar quatre espais inicials a la configuració personal; conservar totes les dades anteriors, notes zero i pesos.
- [x] Verificar desament, privadesa, mitjanes, CSV i mòbil amb dades locals.
- [x] Publicar, comprovar el desplegament amb Cloudflare i tancar l’historial.

No es visita la web pública, segons la restricció anterior. Google únic, PAU, moderació visual i sala secreta es conserven.


## Resultat publicat

Pages **5dd344ec**, main. Quatre columnes d’activitats extra sempre visibles al costat de Parcial 1, Parcial 2 i Trimestral. Si una assignatura en té més, s’amplien i es mantenen separades. Cada activitat mostra el nom concret, la seva nota i el pes amb el tipus: per exemple, «10% · Redacció». Les cel·les buides obren la configuració d’aquell espai de l’assignatura.

La configuració personal ofereix quatre activitats inicials amb tipus, nom, data, nota i pes editables. Aprofita només espais antics buits; conserva tots els registres significatius, IDs, notes, pesos i dates. Les plantilles compartides no canvien. Obrir o cancel·lar no escriu dades. Guardar un full sense canvis conserva també les notes zero i no genera files duplicades en reobrir-lo. CSV amb nota individual, tipus, nom i percentatge; títols amb prefixos de fórmula escapats. Mode discret i càlcul anual amb plusos conservats.

En escriptori es corregeix el desplaçament de la columna fixa d’assignatura perquè no cobreixi la primera nota. En mòbil, els tres exàmens formen una fila i les activitats s’organitzen en parelles, amb controls de toc d’almenys 44 px i sense desbordament de la pàgina.

## Regal acreditat

**17 comptes existents han rebut 50 pastissos cadascun: 850 en total.** Operació remota executada el 11/10/2026 a les 18:20 UTC i totals agregats verificats. Cada regal té una referència única al ledger, gift:2026-10-11-extra-50:, i el trigger existent suma l’import al saldo. No se substitueixen saldos, no es modifiquen guanys anteriors ni s’exclouen comptes inactius. La repetició local no duplica el regal. És una operació explícita per als comptes existents en aquell moment, sense migració ni regal automàtic de 50 per a futurs comptes.

## Verificació i límits

**265 proves unitàries, 52 fluxos API locals D1/R2, 18 escenaris d’activitats, 48 responsive, 135 controls generals i 24 escenaris de nota final correctes en Chromium, Firefox i WebKit.** Sintaxi, lint, build i quatre captures finals revisades visualment. Es comproven quatre espais per defecte, cancel·lació sense escriptures, configuració individual, persistència després de recarregar, notes zero, sis activitats a 320 px, edició privada, exportació CSV i separació entre trimestres. Les proves utilitzen fixtures locals; no es creen notes ni apostes de prova en producció.

La primera bateria de nota final va passar 23/24 escenaris: WebKit va quedar a la pantalla d’entrada en un cas. La repetició completa aïllada, amb diagnòstic de xarxa en cas d’error, passa 24/24 sense canvis al codi de l’aplicació. Es conserven els dos informes i la captura inicial; no s’ha determinat una causa definitiva del primer error.

113 fitxers de l’entrada de publicació coincideixen amb el manifest provat. Backend, carregador mòbil, dades PAU i crupier idèntics a la versió anterior; fonts de moderació visual conservades. Cap credencial ni fitxer privat al build. D1, R2 i servei privat de moderació confirmats amb Cloudflare. No cal migració de l’esquema.

No s’ha visitat la web pública per respectar la restricció anterior. Desplegament confirmat per CLI i estat del proveïdor; no s’ha repetit Google real ni s’ha provat un mòbil físic. Mòbil emulat en els tres motors de navegador.

[Unitàries](../output/grade-activities/unit.txt), [API](../output/grade-activities/api.txt), [activitats](../output/grade-activities/activities-browser-results.json), [responsive](../output/grade-activities/responsive/responsive-results.json), [navegació](../output/grade-activities/general/browser-results.json), [nota final](../output/grade-activities/course-final/course-browser-results.json), [nota final inicial](../output/grade-activities/course/course-browser-results.json), [revisió visual](../output/grade-activities/visual-review.json), [regal acreditat](../output/grade-activities/gift-after.json), [build](../output/grade-activities/tested-build.json), [bindings](../output/grade-activities/remote-bindings.json), [publicació](../output/grade-activities/publicacio.json), [CLI](../output/grade-activities/deploy.txt).
