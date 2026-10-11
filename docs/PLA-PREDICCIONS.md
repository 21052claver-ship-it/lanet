# Prediccions de la sala secreta · T55-01

T55-01 completada sense tasques solapades. Ordre: contracte → servidor → interfície → verificació → publicació. L’historial i SEGUIMENT.json són el registre comú; cap canvi a les altres tasques pendents.

## Regles

- Pastissos virtuals, sense diners ni comissions. Mínim 1, màxim 1.000 per aposta; pot màxim 1.000.000.
- Qualsevol usuari crea una pregunta, dues opcions diferents, criteris verificables i un termini entre 5 minuts i 180 dies. Designa una altra persona responsable, que ha d’acceptar abans d’obrir-la.
- Pregunta, opcions, regles, responsable i termini són immutables. El responsable no pot apostar. Cada participant tria un únic costat i hi pot afegir pastissos fins al tancament.
- Després del termini només el responsable confirma A/B, amb una justificació visible. Repartiment proporcional als pastissos guanyadors; residus enters per major resta, empat per identificador estable del participant. Sense pastissos al costat guanyador: retorn íntegre.
- Rebutjar, anul·lar o no resoldre en els 7 dies posteriors retorna íntegrament els pastissos. La caducitat s’executa en accedir a la sala o sincronitzar l’aplicació, sense dependre del rellotge del navegador.
- Autor pot cancel·lar propostes o taules sense participació; responsable i administració poden anul·lar amb motiu. No es pot canviar un resultat final.
- Cada acció porta una referència única. Reintentar una petició mai duplica càrrecs ni premis. El servidor valida identitat, permisos, termini, saldo i resultats; liquidació i llibre de moviments són una transacció.
- Es mostren percentatges de pastissos del pot, no probabilitats. El retorn estimat pot variar fins al tancament. Les apostes individuals d’altres usuaris no s’exposen.

## Checklist

- [x] Tasca registrada i regles definides.
- [x] Validació compartida i migració additiva.
- [x] API, permisos, idempotència, comptabilitat i reemborsaments.
- [x] Proves de casos límit, concurrència i rollback.
- [x] Taules, creació, filtre, detall i resolució visual.
- [x] Recuperació després de desconnexió i navegació.
- [x] Verificació Chrome, Firefox i WebKit, mòbil i ruleta existent.
- [x] Migració remota i publicació; comprovació de vinculacions i dades preservades.

## Fonts tècniques

El disseny pren les regles prèvies i la resolució explícita com a referència dels [mercats de predicció de Polymarket](https://help.polymarket.com/en/articles/13364518-how-are-prediction-markets-resolved). La comptabilitat fa servir transaccions i triggers SQLite, compatibles amb [D1 batch](https://developers.cloudflare.com/d1/worker-api/d1-database/).

Compatibilitat remota: les expressions CASE dels triggers van entre parèntesis per evitar la [incidència del separador SQL de D1](https://github.com/cloudflare/workers-sdk/issues/4727). La primera aplicació fallida va quedar revertida: d1_migrations seguia a 0021 i no existia cap objecte prediction_*. [Estat comprovat](../output/predictions/migration-failure-state.json). Després de l’ajust sintàctic es repeteixen les proves de comptabilitat i API; les regles i els imports no canvien. Una prova de regressió i .gitattributes preserven parèntesis, BEGIN en majúscules i finals de línia LF.


## Resultat publicat

Pages **b625f1b4**. A la sala secreta, el selector «Ruleta / Prediccions A/B» obre la segona taula. Qualsevol usuari pot crear una proposta amb dues opcions, criteris verificables, termini i un responsable diferent. El responsable accepta abans d’obrir apostes i no pot participar-hi. Pregunta, criteris, opcions i termini queden fixats.

Pot comú sense comissions, aposta mínima d’1 pastís i màxim de 1.000 per enviament. Un sol costat per participant, amb ampliacions fins al tancament. Repartiment proporcional exacte amb major resta per usuari; dividir l’aposta no altera la prioritat. Si el costat guanyador no té participants, s’anul·la o passen 7 dies sense resolució, retorn íntegre. L’autor només pot cancel·lar sense apostes; responsable i administració poden anul·lar amb motiu. Justificació pública i historial del responsable, apostes individuals privades.

Creació, apostes i accions idempotents. Les peticions es desen abans d’enviar-les i es poden recuperar després de tall, recàrrega o resposta perduda. Triggers SQL validen termini, permisos, costat, saldo i límit del pot. Liquidació, auditoria, imports i llibre de moviments són atòmics: qualsevol error desfà tot el canvi. Servidor D1 com a rellotge de referència; Unicode validat amb el mateix recompte que SQLite. Directori amb noms i identificadors, sense correus ni dades d’autenticació.

**299 proves unitàries, 58 fluxos API D1/R2, 18 escenaris de prediccions, 36 de ruleta, 135 controls generals, 48 responsive i 6 perfils visuals correctes; tipus, lint i compilació correctes.** Provats tres usuaris, reintents simultanis, dos resultats contradictoris, anul·lació durant una aposta, saldo insuficient, arrodoniments, pot d’un milió, expiració, fracàs d’abonament i contingut semblant a HTML. Chromium, Firefox i WebKit; mòbil emulat de 320–390 px, tauleta i escriptori. Filtres en dues files i contrast de botons/hover comprovats amb estils calculats i revisió visual.

Una execució de la regressió de ruleta va patir un error del protocol de Firefox en tancar un context, després de 13 casos correctes. S’ha conservat l’error i s’ha repetit la bateria completa aïllada: 36/36. No se n’atribueix una causa definitiva a l’aplicació ni a la concurrència. Els controls generals i responsive cobreixen la versió de la interfície després dels ajustos de contrast; l’últim ajust Unicode s’ha verificat amb unitàries/API i amb la bateria específica i ruleta sobre el paquet final.

Migració additiva 0022 aplicada després d’una còpia de seguretat privada. Taules noves buides en aplicar-la, cap aposta de prova a producció. 129 fitxers de l’entrada publicada coincideixen amb el manifest provat. D1/R2 i servei privat MEDIA_SAFETY confirmats; regal anterior de 17×50 i mode de prova d’un pastís cada minut preservats. Cap visita a la web pública, cap Google real ni dispositiu físic provats en aquesta tasca.

[Unitàries](../output/predictions/unit.txt), [API](../output/predictions/api.txt), [prediccions](../output/predictions/browser-results.json), [ruleta final](../output/predictions/roulette-isolated/secret-room-browser-results.json), [error de protocol conservat](../output/predictions/roulette-driver-error.txt), [general](../output/predictions/general-final/browser-results.json), [responsive](../output/predictions/responsive-final/responsive-results.json), [revisió visual](../output/predictions/visual-review.json), [migració](../output/predictions/migration-schema.json), [build](../output/predictions/tested-build.json), [publicació](../output/predictions/publicacio.json).
