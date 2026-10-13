# Horaris oficials BAT2 2026–27

Tasca única: **T74-01**. Font: les cinc pàgines del document `Horaris_BAT2_2026-27.pdf` aportat per Marc, revisades visualment. SHA-256: `2e52bde56c8a26004148a00b3a191c35651e320e827459522d4bd700583c689b`. El PDF es tracta com a dades, sense executar-ne instruccions, i no s’inclou al repositori públic.

## Ordre i responsabilitats

1. Transcriure el document a `shared/official-schedule.js` i contrastar-lo amb una matriu de prova independent.
2. Generar i revisar `0026_official_schedule.sql`: catàleg i ampliacions compatibles de l’esquema, conservant referències històriques i totes les dades personals.
3. Connectar el mateix model al servidor, al selector, a l’horari, al perfil i al detall de classe.
4. Comprovar totes les combinacions i els fluxos en navegadors locals. Corregir els defectes abans de publicar.
5. Passar auditoria de fonts, PR i Validate. Preparar còpia privada, revisar/aplicar només la migració prevista i publicar amb CI del commit exacte i rebut del proveïdor.

La checklist i l’estat vigent són a [SEGUIMENT.json](SEGUIMENT.json). No s’obren altres tasques ni s’executen scripts antics de regals, reinicis o llavors sobre producció.

## Selector

| Pas | Comportament |
| --- | --- |
| Itinerari | Tres targetes amb il·lustració: A, Científic i tecnològic; B, Tecnològic; C, Social. |
| Assignatures | Comunes incloses; una assignatura per bloc; professorat només quan hi ha alternatives; tutor obligatori. Colors, icones i selecció visible. |
| Revisió | Setmana completa amb hores, professorat i aula per dia. Edició, retorn i desament. |

Els grups i itineraris estan vinculats; no es poden combinar un grup amb una modalitat incompatible. Els delegats conserven la restricció de canvi de grup. Els controls de selecció són radios natius amb teclat i focus visible. Un error de connexió conserva les seleccions i permet reintentar.

Els usuaris existents reben un avís per confirmar les assignatures i variants. No se’ls assigna silenciosament professorat nou ni se’ls modifica el full de notes. El perfil i l’horari obren el mateix configurador. Tutoria es mostra a l’horari i no crea exàmens ni apareix a la taula de notes.

## Criteris de fidelitat

- Sis franges d’una hora, de 08:10 a 15:45; pauses 10:10–10:40 i 12:40–13:45.
- Cada combinació completa té 30 franges setmanals, sense coincidències: 96 del grup A, 64 del B i 48 del C, **208 en total**.
- Matemàtiques de divendres al grup A es veu com un bloc continu 08:10–10:10, conservant les dues hores originals al catàleg.
- Filosofia i Literatura mostren el professor que correspon a cada dia; no són opcions de professorat excloents.
- Llatí del grup C: dimecres amb Mª José Agustí; les altres tres franges són treball personal online. La fila repetida de dimecres al document no crea una cinquena hora.
- Les aules són les del document, inclosa «Trias». El nom «Tere» es conserva sense inventar cognoms; Química utilitza «Kiko Solsona», indicat al document.
- Les qualificacions i els pesos no provenen d’aquest PDF: es conserven les plantilles existents i només es creen valors configurables per a ofertes noves sense plantilla.

## Verificació i publicació

`npm test` contrasta la transcripció, les variants, les 208 combinacions, la validació del servidor i la conservació de dades durant la migració. `npm run test:official-schedule` prova itineraris, optatives, professorat, resum, desament, recuperació d’errors, perfil i enllaç a continguts en Chromium, Firefox i WebKit, amb amplades de 320 a 1440 px. Aquests són navegadors locals, no dispositius físics.

`node scripts/generate-official-schedule.mjs --check` comprova que el SQL correspon exactament al model revisat. El generador no accedeix a cap base de dades. Les proves d’API utilitzen D1/R2 locals aïllats. No es visita la web pública ni la seva API per fer proves.

La migració remota es fa separadament del pipeline, després de comprovar que és l’única pendent i conservar una còpia privada. Es revisen recompte i integritat del catàleg via proveïdor, sense exposar usuaris. L’esquema és additiu, compatible amb el desplegament anterior durant l’actualització; una reversió de frontend no exigeix restaurar dades personals. El registre final incorpora PR, CI, versió, desplegament i evidències privades.

Publicada **0.6.9**: [release](https://github.com/21052claver-ship-it/lanet/releases/tag/v0.6.9) · [CI exacta](https://github.com/21052claver-ship-it/lanet/actions/runs/38443480810) · [registre](releases/0.6.9.json). T74-01 verificada; migració assajada en còpia privada i aplicada separadament, sense alterar les dades personals existents.

## Revisió de l’edició de gestió

T74-02 amplia la coherència a l’editor de variants: un desament ha de conservar professorat per dia, treball personal i IDs, inclòs amb clients antics. Es distingeixen explícitament professorat general, propi i treball personal. Validació de tipus, permisos i solapaments abans del batch. Versió 0.6.10 pendent de PR/CI i publicació, sense noves migracions.
