# Agenda contextual i delegats

14 d’octubre de 2026 · T80-01 · R98.

Des de la targeta d’una classe es pot afegir una tasca o examen amb assignatura, variant, data, hora i aula preseleccionades. El selector visual Privat/Públic és per a tothom. Privat es desa immediatament; Públic s’envia a validació i encara no apareix a l’agenda dels companys.

La classe es deriva de la tutoria oficial (Marina, Fer, Científic o Social/Humanístic), independentment de l’itinerari. Les variants agrupen només ofertes amb la mateixa assignatura, professorat, bloc i franges/aula. Això permet que una optativa compartida tingui els mateixos destinataris entre itineraris. Abans d’enviar es mostren els representants autoritzats. Delegat i subdelegat tenen exactament el mateix poder de revisió dins dels àmbits assignats.

Comunitat inclou Delegats (pendents, propostes pròpies i contactes) i Notificacions. La campana compta propostes pendents de revisar i avisos personals no llegits. La sincronització existent actualitza la vista cada 30 segons en pestanyes visibles i en recuperar el focus. Les decisions i la lectura dels avisos persisteixen a D1; no s’envien correus ni es demanen permisos del navegador.

La revisió exigeix confirmar la veracitat. Demanar canvis o retirar una data exigeix un motiu. Cada canvi incrementa la revisió; una decisió antiga no pot aprovar contingut modificat ni repetir notificacions. Una edició d’una data pública torna a requerir validació. Les dates privades no són visibles als delegats ni a l’administrador.

El control local i de servidor bloqueja duplicats (inclòs un examen reanomenat de la mateixa assignatura i franja); detecta coincidències i exigeix confirmar-ne una instantània actualitzada abans d’enviar o aprovar. Les franges consecutives no se solapen i les tasques sense hora no generen avisos de coincidència innecessaris. Un índex únic i triggers protegeixen també creacions simultànies idèntiques o parcialment coincidents dins del mateix àmbit. Les consultes del bootstrap filtren l’àmbit a SQL i recuperen només destinataris/revisors de cada data accessible. La previsualització cancel·la peticions obsoletes i ofereix reintent després de 12 segons.

Migració additiva `0028_delegate_agenda.sql`: conserva tots els esdeveniments anteriors com a aprovats i no modifica rols globals, matrícules, notes ni saldos. El roster de persones reals es prepara amb `scripts/prepare-delegates.mjs` exclusivament dins de `.cache`; la vinculació s’aplica per correu exacte d’un compte Google verificat, inclosos comptes que encara no hagin entrat. Cap nom/correu real queda al codi, la migració o els fixtures.

Publicació consolidada amb benvinguda, retirada del xat, depuració visual i analítica a PR38, després de proves locals, còpia privada D1, revisió/aplicació separada de migracions i CI. Les proves utilitzen exclusivament fixtures locals. El roster privat s’aplica amb una operació explícita del proveïdor i se’n comproven només comptatges i àmbits, sense exposar identitats.

Verificació local: 12 proves de l’agenda i permisos, dues de deadline/cancel·lació, 426 unitàries conjuntes, tipus/lint i build correctes; 15 fluxos de navegador en Chromium/Firefox/WebKit a 320/390/820/1440, tres regressions contextuals i D1/workerd real local correctes. Un reload transitori de WebKit es va quedar en blanc; la reexecució completa i cinc repeticions aïllades passen, sense assumir-ne la causa. Integració final amb dist immutable i reexecució de navegador abans de publicar. Evidències privades a `output/delegates/verification.json`.
