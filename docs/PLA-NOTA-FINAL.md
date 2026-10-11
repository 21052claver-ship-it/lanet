# Nota final del curs i plusos · R57

Tasca T44-01 completada. Primer el model de càlcul i la protecció de dades; després la interfície; finalment proves, migració additiva i publicació.

- [x] Calcular els tres trimestres sense arrodoniments intermedis i amb pesos configurables.
- [x] Registrar plusos personals: dos de 0,25 o un de 0,50 com a màxim per assignatura.
- [x] Permetre posar la nota corregida, conservant la diferència entre zero i pendent.
- [x] Sumar-los a la nota final del curs; mantenir intacte el càlcul trimestral.
- [x] Fer resum final, detall per assignatura, registre des de Plusos i exportació.
- [x] Conservar mode discret, desament, reintent i privadesa entre usuaris.
- [x] Verificar límits, concurrència, migració, mòbil i navegadors.
- [x] Publicar el paquet verificat i registrar evidències.

Per defecte els trimestres pesen igual. Cada assignatura podrà triar avaluació acumulativa (16,67%, 33,33%, 50%) o pesos personalitzats, segons la indicació de l’usuari. Una assignatura amb avaluacions pendents es mostrarà com a provisional. La nota corregida d’un plus no s’infereix de l’activitat publicada ni de desar-la o afegir-la al calendari.

## Resultat

Publicat Pages **ab981cd3** a [La Net](https://lanet.pages.dev/#grades). A Notes, selector «Trimestres / Nota final», amb una targeta per assignatura. Desglossament: tres mitjanes trimestrals → base del curs + plusos corregits = nota final. No s’arrodoneix abans de calcular. Els resultats incomplets són provisionals i només normalitzen els trimestres amb notes conegudes; cap nota pendent es tracta com a zero.

Pesos independents per assignatura: iguals (un terç exacte), acumulatius (16,67%, 33,33%, 50%) o personalitzats amb suma 100%. El límit de nota 10 és configurable i s’aplica després dels plusos.

Plusos privats: dos espais de 0,25 o un de 0,50. El límit el protegeixen triggers de la base de dades, també amb peticions concurrents. Es pot registrar una activitat publicada o una de personal, guardar-la pendent i posar després la nota real corregida entre zero i el seu màxim. No s’afegeix automàticament el màxim anunciat. Es conserva la instantània si es retira l’activitat pública; retirar el registre privat allibera capacitat i conserva l’activitat pública. No es canvien les mitjanes trimestrals.

Mode discret, entrada de noves notes mentre estan ocultes, desament en sortir de la casella, errors, reintents després de navegar i desfer compartit. Exportació anual en CSV amb confirmació visible i focus gestionat quan hi ha notes ocultes, també en WebKit. Les publicacions noves de Plusos només accepten els dos tipus; el contingut històric es conserva.

**200/200 proves unitàries, 44/44 fluxos d’API amb D1/R2 locals, 24/24 escenaris de nota final, 48/48 de responsive i 120/120 controls generals correctes.** Tipus, sintaxi, lint i compilació correctes. Chromium, Firefox i WebKit; amplades de 320 a 1440 px. Proves amb dades fictícies i xarxa externa bloquejada; captures revisades. Migració 0016 comprovada localment contra totes les files de l’esquema anterior i aplicada com a única migració pendent a D1, amb dues taules, dos índexs i dos triggers confirmats. Cap fila prèvia de producció modificada per la migració.

Els 93 fitxers recompilats per publicar coincideixen amb els provats. Escaneig del paquet sense fitxers privats ni patrons de credencials detectats. Visita pública navegada, Google real i mòbils físics pendents; els resultats locals no certifiquen disponibilitat universal.

[Escenaris](../output/course-grades/course-browser-results.json), [API](../output/course-grades/api.txt), [unitàries](../output/course-grades/unit.txt), [responsive](../output/course-grades/regression/responsive-results.json), [regressió](../output/course-grades/regression/browser-results.json), [migració](../output/course-grades/migration-apply.txt), [esquema](../output/course-grades/migration-schema.json), [integritat i publicació](../output/course-grades/publicacio.json), [CLI](../output/course-grades/deploy.txt).

Captures: [escriptori](../output/course-grades/chromium-annual-1440.png), [320 px](../output/course-grades/chromium-annual-320.png), [plus corregit](../output/course-grades/webkit-bonus-detail-390.png).
