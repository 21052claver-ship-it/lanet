# Pujades ràpides · R66 / T52-01

Tasca T52-01 completada després del reinici i l’activació de la pastisseria de prova.

- [x] Accelerar la comprovació visual amb una còpia més lleugera, conservant la imatge llegible desada.
- [x] Reutilitzar aprovacions de bytes idèntics dins del servei privat, sense publicar fotos privades a cap URL.
- [x] Pujar fins a tres adjunts alhora, mostrar progrés i conservar les pujades que han funcionat quan alguna falla.
- [x] Tancar la publicació d’un missatge quan el servidor la confirma, sense esperar la sincronització general.
- [x] Afinar el criteri per a apunts, textos il·legibles i persones vestides; continuar bloquejant contingut sexual explícit, executables i formats manipulats.
- [x] Verificar, publicar els serveis afectats i documentar el rendiment mesurat i els límits.

Fonts tècniques: [Images](https://developers.cloudflare.com/images/optimization/features/), [model visual](https://developers.cloudflare.com/workers-ai/models/llama-4-scout-17b-16e-instruct/), [Cache API](https://developers.cloudflare.com/workers/runtime-apis/cache/). La memòria cau de Cloudflare és local a cada centre de dades; un encert no està garantit.

No es visita la web pública, segons la restricció anterior. El mode de prova de 60 segons, Notes, Google únic, PAU i la sala secreta es conserven.


## Resultat publicat

Pages **258065d3** i servei privat **b6149977-41fc-4998-9923-ba296dd4124f**. Fins a tres adjunts simultanis, progrés per fitxer, ordre original i èxits parcials conservats. Els errors indiquen el nom del fitxer i permeten tornar a pujar només el que ha fallat. Les accions sobre adjunts queden bloquejades durant la pujada per evitar sobreescriptures.

La comprovació visual utilitza una còpia reduïda, mentre es desa la imatge reconstruïda de lectura. Transformacions en paral·lel, resposta estructurada curta i límits de temps. Memòria cau privada d’aprovacions durant 24 hores, indexada pel SHA-256 dels bytes reals, MIME, model i versió del criteri. Només s’hi desen aprovacions; errors, incertesa i bloquejos exigeixen nova comprovació. Una fallada de cache torna al filtre. La resposta al consumidor continua amb no-store i no exposa cap URL pública de la foto.

El criteri visual deixa explícit que lletra il·legible, text petit o fórmules complexes no són per si mateixos contingut inadequat. Es mantenen sexualitat explícita, nuesa íntima i violència gràfica com a categories bloquejades; una resposta invàlida o una indisponibilitat no autoritza el fitxer. Les instruccions dins de les imatges no són fiables. Validació de signatures, descodificació, MIME, límits i reconstrucció de píxels conservats.

Apunts i cartells confirmen i tanquen el formulari quan el servidor ha desat la publicació. La sincronització general continua després; si falla, informa que la publicació s’ha desat. La finalització d’una publicació anterior no tanca un formulari nou. Els missatges escrits no passen pel model visual; no s’ha afegit una espera artificial ni una aprovació visual per al text.

En una mostra d’apunts sintètics de 3200×2200, el servei privat real desplegat ha retornat la primera aprovació en 2403 ms i la repetició en 345 ms (cache hit). És una mostra puntual des d’una ubicació: no és una garantia per a totes les fotos, xarxes o centres de dades. La còpia desada conserva 3200×2200; la còpia d’inspecció té un màxim de 1024 píxels de costat.

**275 proves unitàries, 52 fluxos API locals, 12 escenaris nous de pujades/publicació, 36 controls de seguretat de fitxers, 48 escenaris responsive i 135 controls generals correctes en Chromium, Firefox i WebKit; tipus, lint i build correctes.** El proveïdor privat també rebutja MIME executable i una imatge falsificada. Les proves inicials del nou guió tenien recomptes/selector de fixtures incorrectes; s’han corregit les comprovacions i conservat els dos informes inicials. La versió final passa 12/12. NSFW i fallades del proveïdor s’han verificat amb respostes controlades; no s’ha fet una avaluació estadística de falsos positius amb fotos personals. Proves locals amb mòbil emulat; mòbil físic, Google real i visita pública no executats.

113 fitxers desplegats coincideixen amb els provats. Backend de l’aplicació, arrencada mòbil, PAU, Notes, sala secreta, regal de 50 i política de pastís cada 60 segons conservats; estat de D1 llegit sense modificar-lo. Cap migració addicional.

[Unitàries](../output/fast-uploads/unit.txt), [API](../output/fast-uploads/api.txt), [pujades](../output/fast-uploads/fast-browser-results.json), [seguretat](../output/fast-uploads/security-browser/browser-results.json), [responsive](../output/fast-uploads/responsive/responsive-results.json), [controls generals](../output/fast-uploads/general/browser-results.json), [revisió visual](../output/fast-uploads/visual-review.json), [servei real](../output/fast-uploads/deployed-service-probe.json), [resolució](../output/fast-uploads/provider-image-audit.json), [manifest](../output/fast-uploads/tested-build.json), [bindings](../output/fast-uploads/remote-bindings.json), [estat conservat](../output/fast-uploads/preserved-state.json), [publicació](../output/fast-uploads/publicacio.json).
