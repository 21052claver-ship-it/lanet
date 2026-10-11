# Retenció mínima dels anuncis i protecció de pujades

Tasca única T56-01 / R70. No se solapa amb altres canvis.

- [x] Localitzar l’acumulació: els anuncis anteriors mantenien `file_id` i R2; el límit existent es podia repartir entre IPs.
- [x] Retirar atòmicament les imatges substituïdes; preservar les que continuen en un altre espai i els adjunts de continguts.
- [x] Implementar eliminació R2 i originals antics amb cua durable i reintents. Neteja històrica verificada a R2.
- [x] Limitar per compte abans de llegir el cos o moderar: 20 intents/minut, 60/hora, 180/dia; 3 pujades simultànies, 300 MB/dia.
- [x] Limitar nous esborranys sense publicar: 3 de cartell, 24 en total; caducitat de 30 minuts per cartells i 24 hores per altres adjunts sense associar. Els adjunts històrics aliens als anuncis es preserven.
- [x] Bloqueig de pujades de 15 minuts davant allaus o 5 fitxers invàlids/prohibits en 10 minuts; reincidència: 1 hora i 24 hores. La resta de La Net continua disponible.
- [x] No conservar píxels en la memòria cau de moderació; només una aprovació vinculada al hash, format i versió de política.
- [x] Provar eliminació, errors R2, ús compartit, saldo, concurrència i navegador local.
- [x] Migrar, desplegar, executar neteja privada i verificar els objectes i dades preservades.

Eliminació R2 immediata després de publicar. Si l’emmagatzematge falla, la imatge deixa de ser accessible igualment i la cua en reintenta l’eliminació. Les tasques de neteja també s’executen a les peticions posteriors i mitjançant un Worker privat programat cada minut, encara que ningú obri l’aplicació. No es visiten URL públiques durant les proves.


## Resultat verificat i publicat

Pages **65c243f2**; migració additiva **0023** amb còpia privada prèvia de metadades, sense copiar imatges. **5 imatges antigues eliminades de R2**, comprovades amb HEAD a través d’un relay privat local. Les **3 imatges vigents** continuen presents; els **348 registres conservats** coincideixen amb les metadades de la còpia prèvia. Cap imatge de prova creada en producció. Historial d’ofertes i llibre de pastissos preservats.

Els triggers retiren l’enllaç dels anuncis antics i marquen els fitxers dins la mateixa transacció de l’oferta. No es pot ressuscitar ni associar un fitxer retirat. Una imatge compartida entre espais es conserva fins que deixa de ser vigent a tots. Després s’esborren l’objecte normalitzat i l’original històric, si existeix; les metadades s’eliminen només després de confirmar R2. Si R2 falla, no hi ha accés a la imatge i queda una cua durable amb reintents i espera creixent.

**20 intents/minut, 60/hora, 180/dia, 3 pujades simultànies i un màxim de 300 MiB/dia**, amb reserves conservadores de mida màxima. Comptadors per compte i rellotge D1: canviar IP, falsificar Content-Length o disparar peticions paral·leles no els evita. Les comprovacions arriben abans de llegir el cos i abans de moderar. 3 esborranys d’anunci i 24 nous adjunts pendents en total; els cartells nous caduquen als 30 minuts, els altres esborranys nous a les 24 hores. Els fitxers històrics aliens als anuncis no reben caducitat retroactiva. Les pujades interrompudes deixen una clau temporal recuperable, per eliminar objectes que s’hagin escrit abans d’una interrupció del servidor.

Les allaus o 5 fitxers invàlids/prohibits en 10 minuts bloquegen pujades durant 15 minuts; reincidències dins de 24 hores: 1 hora i 24 hores. La resta de La Net continua disponible. Resposta 429 amb Retry-After, codi i missatge entenedor. Una fallada del proveïdor o un resultat NSFW incert no compten com a abús. Cancel·lar el compositor elimina l’esborrany propi; el servidor protegeix els fitxers publicats.

Worker privat **lanet-file-maintenance**, versió **31416887-4254-4f5a-8ced-bad07518fe07**, programat cada minut, D1/R2 i calendari confirmats al proveïdor; workers.dev i previsualitzacions desactivats. Així la neteja continua sense visites a l’aplicació. També s’executa en publicar, iniciar l’aplicació i pujar fitxers.

Servei privat de moderació **8b7dd5fd-0fc2-42c4-98d9-aaae46ff395a**: la nova cache només conté l’aprovació vinculada al hash del contingut, format, model i versió, mai píxels. Les imatges idèntiques es tornen a reconstruir sense repetir el model: prova sintètica desplegada de 2.830 ms a 680 ms en una ubicació, sense garantia general de latència. L’espai anterior de cache no es consulta; les entrades anteriors poden mantenir-se fins al seu TTL previ de 24 hores. No s’ha confirmat una purga global de la cache del proveïdor. Les respostes de fitxers i del servei continuen amb no-store. El filtre NSFW és automàtic i no ofereix garantia de detecció perfecta.

**318 proves unitàries, 62 fluxos API amb D1/R2 locals, 18 escenaris nous, 36 de seguretat d’adjunts, 12 de pujades ràpides, 135 controls generals i 5 comprovacions del servei privat desplegat; tipus, lint i compilació correctes.** Després de substituir una lectura de tota la cua per COUNT(*), regressió específica final 19/19 i lint repetits. Chromium, Firefox i WebKit, escriptori i mòbil emulat. La primera prova de cancel·lació escoltava massa tard la resposta DELETE; el test es va corregir per escoltar abans del clic i la bateria es va repetir: 18/18. Revisió visual del missatge de bloqueig a 390 px, sense desbordament horitzontal.

129 fitxers coincideixen amb el manifest de l’entrada publicada. Bindings de producció i migració confirmats. Regal anterior de 17×50 i forn en mode de prova cada 60 segons preservats. Web pública, dispositius físics i Google real no s’han provat en aquesta revisió.

[Unitàries](../output/ad-retention/unit.txt), [última regressió](../output/ad-retention/retention-final-unit.txt), [API](../output/ad-retention/api-final.txt), [navegador](../output/ad-retention/browser/results.json), [adjunts](../output/ad-retention/upload-regression/browser-results.json), [pujades ràpides](../output/ad-retention/fast-upload-regression/fast-browser-results.json), [general](../output/ad-retention/general/browser-results.json), [neteja R2](../output/ad-retention/remote-cleanup.json), [Worker programat](../output/ad-retention/maintenance-provider.json), [servei d’imatges](../output/ad-retention/deployed-service-probe.json), [publicació](../output/ad-retention/publicacio.json).
