# PAU · pla de treball

Tasca T46-01 completada. Els canvis de seguretat, música i notes ja verificats es conserven. L’historial registrarà la publicació amb les seves evidències.

- [x] Dades: baixar els PDFs de Canal Universitats, conservar hash, data i convocatòria; unir només per codi oficial i auditar cobertura.
- [x] Càlcul: batxillerat i CFGS, fase obligatòria, mínims d’accés, dues millors aportacions aprovades, validesa i ponderacions per grau.
- [x] Experiència: apartat PAU, entrada de notes, cerca per carrera/universitat/campus, recomanació de la nota de tall més alta assolida dins de la carrera, comparació i detall de ponderacions.
- [x] Privadesa: dades del compte, desament explícit, mode discret coherent; cap nota personal dins del catàleg públic.
- [x] Qualitat: comprovar dades i fórmules, accés a dades privades, tres navegadors i mòbils emulats; revisar captures.
- [x] Publicació: migració si cal, compilació verificada, desplegament de Pages i comprovació del proveïdor. Sense accedir a la web pública mentre el permís del navegador continuï pendent.

Les notes de tall són històriques, no una garantia d’assignació. S’indicaran la convocatòria de juny, la ronda i l’any exactes. Les universitats fora de la preinscripció pública catalana no tenen una nota de tall comparable en aquesta font.

## Dades i criteris

Fonts primàries de [notes de tall](https://universitats.gencat.cat/ca/preinscripcions/notes-tall/), [ponderacions](https://universitats.gencat.cat/ca/preinscripcions/ponderacions/) i [estructura de la PAU](https://universitats.gencat.cat/ca/pau/que-qui/). Arrodoniment d’accés a la mil·lèsima més propera i empats cap amunt segons els articles 14 i 15 del [Reial decret 534/2024 consolidat](https://www.boe.es/buscar/act.php?id=BOE-A-2024-11858). El càlcul intern de mitjanes i aportacions fa servir mil·lèsimes enteres per evitar errors binaris als límits d’admissió.

Catàleg de **560 codis únics**: **560** amb tall a la primera assignació de juny de 2026 i **558** a la sisena, publicada el **07/10/2026**. Els dos codis absents de la sisena ronda, **11102** i **11112**, conserven la primera nota i indiquen absència de dada a la ronda posterior; no se substitueix per un 5. Les rondes de setembre no es barregen amb les de juny.

Les ponderacions tenen **559 codis únics** per a 2026 i 2027, amb files duplicades que representen noms alternatius de simultaneïtats. Només es dedupliquen coeficients iguals. El codi **61080**, Llengües Aplicades i Traducció / Filologia Hispànica (UdL), té una discrepància entre les pàgines 19 i 23 del PDF 2027: Moviments Culturals i Artístics apareix ponderat en una fila i buit a l’altra. Es desactiva el càlcul de 2027 per a aquest codi i s’explica el motiu al detall; 2026 continua disponible. El codi **41066**, reservat a altres sistemes educatius, no té ponderacions en aquestes taules: tampoc s’inventen.

El PDF de 2027 està enllaçat expressament com a 2027 a Canal Universitats i té la capçalera 2027; el peu de pàgina diu 2028. Es conserva la font i s’utilitza l’any de la pàgina oficial i la capçalera, deixant constància de la discrepància. Dues cel·les amb la notació original `0'2` s’han normalitzat a `0,2`, conservant codi, pàgina i matèria a l’auditoria. Els noms de l’última ronda prevalen sobre una etiqueta retallada a la primera.

[Auditoria de dades](../output/pau/data-audit.json), [registre d’importació](../output/pau/import.txt) i [catàleg publicable](../public/data/pau.json). Els PDFs originals, els seus SHA-256 i les pàgines de procedència queden registrats. L’importador comprova que tots els codis trobats al text existeixen a les taules extretes i rebutja cel·les numèriques inesperades.

## Comportament

La mitjana de batxillerat s’introdueix explícitament: les notes anuals de La Net no equivalen a la mitjana oficial de batxillerat per a l’accés. La fase obligatòria es pot introduir com a mitjana o com a cinc exàmens. S’exigeix batxillerat aprovat, fase ≥4 i accés ≥5. La via CFGS fa servir la nota final del cicle, amb mínim 5. Només les dues millors aportacions vigents i aprovades (≥5) es sumen a la base, fins a 14, inclosa la matèria obligatòria de modalitat. Les matèries vigents compten l’any de l’examen i els dos següents; no s’apliquen anys futurs a un accés anterior.

La recomanació exigeix una carrera escollida i respecta els filtres de la universitat i de ronda. Ordena per tall històric descendent i escull la primera opció que s’assoleix amb la ponderació d’aquell grau. El tall no es presenta com un rànquing de qualitat. S’expliquen les PAP, la prioritat de convocatòria i la preinscripció oficial.

La simulació es desa explícitament al compte; els esborranys sobreviuen a la navegació interna. Una revisió de versió impedeix sobreescriure una altra pestanya i permet recuperar la versió desada. El mode discret elimina les notes existents dels camps i dels resultats visibles, oculta marges i recomanacions personals, i permet introduir una nota substitutiva amb camp de contrasenya. Les dades privades només es consulten pel propietari autenticat; no formen part del catàleg públic.

## Actualització de dades

Abans d’una actualització, comprovar les pàgines oficials i canviar, si escau, l’URL fixada, la data i la ronda a `scripts/import-pau.py` i les etiquetes corresponents. Executar l’importador amb `--download` per recuperar els PDFs, revisar l’auditoria i les excepcions, i tornar a provar dades, fórmules i navegadors abans de publicar. El catàleg és una còpia contrastada a **11/10/2026**; no és una consulta en directe al portal oficial. No hi ha cap tasca programada de recollida automàtica.


## Verificació i publicació

Pages **35d2fa1d** publicat a [PAU i universitat](https://lanet.pages.dev/#pau). **235 proves unitàries, 48 fluxos d’API amb D1/R2 locals, 39 casos PAU, 48 de responsive i 135 controls generals correctes.** Chromium, Firefox i WebKit; escriptori, mòbil, 320 píxels, tauleta i horitzontal. Tipus, lint i build correctes. Revisió visual de captures, selector de carrera, detall de ponderacions, recomanació, desament, recuperació de conflictes, connexió interrompuda, camps ocults i edició privada comprovats.

Migració additiva **0018_pau.sql** aplicada: una nova taula privada, sense modificar continguts existents. Cap migració pendent. El proveïdor confirma la publicació main i els mateixos bindings de D1, R2 i servei privat de moderació visual. 97 fitxers recompilats coincideixen amb els provats; cap fitxer privat ni patró de credencial detectat.

La primera prova de navegador va detectar errors en el mateix arnès (signatura de la injecció de fallada i atributs de selectors); es van corregir, es va revisar visualment la privadesa i es van repetir les proves. El primer preflight de migració va aturar-se abans de cap canvi perquè confonia la clàusula de clau forana ON DELETE amb una sentència DELETE. La comprovació es va corregir per reconèixer sentències; només es va aplicar el CREATE TABLE previst. Els registres d’aquests intents es conserven.

No s’ha visitat la web pública, perquè el permís de navegador continua pendent; la comprovació de publicació i configuració s’ha fet amb el proveïdor. No s’ha repetit el Google real ni s’han provat mòbils físics. La comparació és històrica i no garanteix plaça.

[Unitàries](../output/pau/unit.txt), [API](../output/pau/api.txt), [PAU](../output/pau/pau-browser-results.json), [responsive](../output/pau/regression/responsive-results.json), [regressió](../output/pau/regression/browser-results.json), [compilació](../output/pau/tested-build.json), [migració](../output/pau/migration-apply.txt), [bindings](../output/pau/remote-bindings.json), [publicació](../output/pau/publicacio.json), [CLI](../output/pau/deploy.txt).


## Revisió posterior · Top 5

La revisió R67 / T53-01 reorienta l’entrada cap al top 5 i l’exploració. La mitjana de Notes s’utilitza exclusivament en un escenari provisional, identificat com a tal; la calculadora oficial continua demanant la mitjana real de batxillerat/CFGS i les notes PAU. No es converteix una nota parcial de La Net en una nota oficial ni en una probabilitat. [Pla actual, proves i hipòtesis](PLA-PAU-TOP5.md). Pages 12a6da82.
