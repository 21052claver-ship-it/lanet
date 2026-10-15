# Publicació directa dels representants · 2026-10-15

T84-01 / R106, després de la 0.6.18. Marc indica que un delegat no ha d’esperar una aprovació per publicar un examen i demana revisar detalls relacionats.

## Comportament

El servidor aplica el mateix permís d’àmbit que ja autoritza validar una proposta: delegats i subdelegats actius vinculats per correu, o administrador. La classe i els destinataris de variant es calculen des de matrícula/tutoria i horari oficial; no es confien camps de rol, revisió o audiència enviats pel client. Una variant física compartida conserva els mateixos àmbits i revisors que la validació existent.

Un representant autoritzat publica directament exàmens, tasques i altres dates públiques. També publica les edicions de les seves dates, amb revisió incrementada. Un membre o representant fora d’àmbit envia la proposta a revisió. Un rol global antic de delegat sense assignació activa no concedeix permisos. Privat continua sent l’opció inicial i no es comparteix automàticament.

La previsualització comunica el tipus de publicació al formulari. «Publicar ara» substitueix «Enviar a validació» quan correspon i explica que la data apareixerà a l’agenda compartida. No cal una segona aprovació ni un flag addicional d’aprovació al servidor. Es mantenen els avisos de duplicat i l’acceptació explícita de coincidències d’horari.

Si els permisos canvien, la comprovació abans d’enviar actualitza la indicació i demana revisar l’acció. El servidor torna a calcular l’autoritat al desar. Si s’ha revocat entre les dues peticions, desa com a pendent i el missatge usa l’estat retornat real, sense anunciar una publicació inexistent.

La mateixa transacció desa la data, destinataris, àmbits i historial `publish`, amb autor/revisor i timestamp. No es genera una notificació pròpia ni una entrada pendent per al representant que acaba de publicar. Les revisions de propostes d’altres membres mantenen els avisos i els motius de retorn/retirada. Els administradors poden publicar sense exigir un roster aliè innecessari.

## Verificació i eficiència

Fixtures locals per a delegat, subdelegat, admin, membre, assignació fora d’àmbit, rol global antic, revocació/alta de permisos, variants compartides, publicació/edició, revisions antigues, privacitat, duplicats/coincidències, errors i reintent. D1/workerd comprova publicació directa, edició i tasca completable per companys. Navegadors a 320/390/820/1440 px, amb recàrrega i comprovació de files persistides.

Mateixa previsualització i transacció de desament; la decisió de publicació reutilitza el context de permisos ja llegit. Cap consulta, taula, migració, polling, operació R2 o servei privat addicional. La publicació directa evita la segona operació de revisió i la notificació pròpia redundant.

Evidències privades a `output/delegate-publishing/` i logs `output/delegate-publishing-*.log`. Publicació consolidada després de comprovacions locals, auditoria de font i CI del head actualitzat i de main. Sense visites a l’aplicació o API públiques ni proves en dispositius físics.

Resultat local: 458 unitàries, 33 recorreguts de navegador (15 regressions i 18 execucions noves) i D1/workerd correctes. Tipus/lint/build correctes. La prova fora d’àmbit diferencia explícitament tutoria de variant física compartida: la primera exigeix revisió, mentre una variant autoritzada per l’àmbit existent es publica directament. Pendent font/CI i publicació consolidada.
