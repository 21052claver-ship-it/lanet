# Adjunts segurs i moderació visual · R58

Tasca T45-01 completada. Ordre: contracte de fitxers → servei privat de reconstrucció/moderació → integració i dades antigues → interfície → proves → publicació.

- [x] Rebutjar extensions executables i discrepàncies entre extensió i contingut. No confiar en Content-Type, noms, ni indicadors enviats pel client.
- [x] Decodificar i reconstruir imatges amb Cloudflare Images, eliminant metadades i fitxers afegits. Limitar bytes, dimensions i píxels. Convertir animacions a imatge fixa i explicar-ho a la interfície.
- [x] Classificar visualment les imatges reconstruïdes amb Workers AI; rebutjar contingut sexual explícit, nuesa sexualitzada i violència gràfica. Resultats incerts, errors i servei absent bloquegen la publicació.
- [x] Servei privat separat de La Net, sense URL pública, sense credencials al navegador i sense originals pujats a URLs públiques.
- [x] Registrar comprovació al servidor i exigir-la en adjunts, anuncis i lectura directa. Revisar les imatges antigues abans de servir-les; conservar originals sense esborrar dades.
- [x] Missatges comprensibles, errors recuperables i coherència entre anuncis i apunts.
- [x] Proves adversàries del contingut real, formats truncats, HTTP manipulat, moderació, permisos i cap execució d'adjunts; regressions locals i build.
- [x] Comprovar serveis reals amb imatges sintètiques no sensibles, migrar només l'esquema nou, publicar el paquet provat i actualitzar historial.

El filtre és una classificació automàtica amb un model visual, no una garantia absoluta ni un antivirus. No s'afirma inspecció NSFW de vídeos, PDF o documents. Les animacions es converteixen en fixes abans de classificar i mostrar: no es pot ocultar contingut en altres fotogrames. Les imatges de perfil de Google i els recursos estàtics de la plataforma no són pujades d'adjunts.

Fonts tècniques: [Cloudflare Images binding](https://developers.cloudflare.com/images/optimization/binding/), [Workers AI Llama 4 Scout](https://developers.cloudflare.com/workers-ai/models/llama-4-scout-17b-16e-instruct/), [Pages service bindings](https://developers.cloudflare.com/pages/functions/bindings/), [límits gratuïts de transformació](https://developers.cloudflare.com/images/pricing/). No s'activa cap subscripció de pagament. Els límits o serveis no disponibles fallen de forma tancada.


## Resultat

Pages **5e3a8138** publicat. Servei privat **lanet-media-safety**, versió **1e0e04f1-f87c-4d5b-8834-acf713aef083**, sense workers.dev ni previsualització pública. Binding de producció confirmat al proveïdor; conserva la mateixa D1 i R2. R2 sense URL pública activada i sense dominis personalitzats. Cap secret nou necessari ni credencial incorporada al paquet.

El servidor ignora el MIME declarat pel client i no accepta scripts, HTML, SVG ni extensions dobles executables. Verifica signatures, estructura, mides i correspondència amb l'extensió; les imatges es descodifiquen amb Cloudflare Images i es reconstrueixen com a WebP estàtic, de fins a 4.096 píxels per costat, conservant transparència. S'eliminen EXIF, XMP, perfils incrustats i altres metadades. Original d'entrada: màxim 10 MB, 24 megapíxels i 10.000 píxels per costat. Vídeos: màxim 25 MB. Documents: màxim 10 MB. No es pretén substituir un antivirus de documents.

Workers AI, amb el model visual Llama 4 Scout, classifica els píxels reconstruïts per contingut sexual, nuesa i violència gràfica. Només s'aprova una resposta completa, estrictament booleana i sense cap indicador activat. Incertesa, refusos, formats inesperats, absència del servei, errors, temps d'espera i quotes exhaurides bloquegen la publicació. Les dades del client no poden declarar una imatge com a aprovada. No es guarden originals ni fitxers rebutjats en pujades noves.

La classificació és automàtica: pot produir falsos positius o falsos negatius. No s'ha fet un banc de precisió/recall amb imatges sexuals; les proves del proveïdor han emprat una il·lustració pública i fitxers sintètics. Les branques de bloqueig NSFW, incertesa i avaria s'han provat amb dobles deterministes, separadament de les proves reals de descodificació, reconstrucció i inferència. El filtre cobreix les pujades d'imatges; no analitza fotogrames de vídeos, pàgines de PDF, documents, avatars externs de Google o il·lustracions estàtiques.

Cap imatge antiga té aprovació implícita. Després d'autoritzar l'usuari, es verifica, reconstrueix i modera abans de servir-la, també amb Range o download. Es conserva l'objecte original privat i només se serveix la còpia comprovada. Les peticions concurrents conserven una única còpia normalitzada. Els fitxers bloquejats no són accessibles tampoc a propietari o administrador. Els anuncis i les associacions d'adjunts exigeixen comprovació i tenen protecció addicional a D1. Una imatge rebutjada no cobra cap oferta.

Els noms d'objecte són identificadors aleatoris privats, independents del nom del fitxer. No s'importen ni s'executen pujades al servidor. Respostes amb MIME determinat pel servidor, nosniff, CSP sandbox, no-store, política de recursos del mateix origen i descàrrega forçada per a text/documents. Un TXT que contingui JavaScript continua sent text inert. Les imatges que no es poden mostrar tenen una alternativa accessible; els errors de pujada conserven l'esborrany i permeten reintentar.

**219 proves unitàries, 46 fluxos d'API amb D1/R2 locals reals, 36 escenaris de pujades en Chromium/Firefox/WebKit, 48 de responsive i 120 controls generals correctes.** Quatre controls amb el servei privat real ja desplegat: il·lustració vàlida, eliminació de JavaScript en metadades, rebuig de codi afegit al final i rebuig d'una imatge amb dades comprimides invàlides. Tipus, lint i build correctes. Migració additiva 0017: quatre columnes, un índex i dos triggers confirmats, sense esborrar continguts existents. 93 fitxers recompilats iguals als provats; escaneig sense fitxers privats ni patrons de credencials detectats.

La visita al web públic continua pendent del permís de navegador ja denegat. No s'ha repetit el login real de Google ni s'han provat mòbils físics. La comprovació del proveïdor i dels seus bindings no visita el web públic.

[Proves d'API](../output/upload-safety/api.txt), [unitàries](../output/upload-safety/unit.txt), [navegadors](../output/upload-safety/browser-results.json), [servei privat real](../output/upload-safety/deployed-provider-contract-results.json), [responsive](../output/upload-safety/regression/responsive-results.json), [regressió](../output/upload-safety/regression/browser-results.json), [bindings](../output/upload-safety/remote-bindings.json), [migració](../output/upload-safety/migration-apply.txt), [publicació](../output/upload-safety/publicacio.json), [registre CLI](../output/upload-safety/deploy.txt).
