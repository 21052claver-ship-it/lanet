# Química al tecnològic

Tasca única **T90-01**, requisit **R115**. El selector del grup B omet Química i només permet Dibuix tècnic o Empresa. El PDF i el full de càlcul originals també ometen aquesta alternativa. Marc confirma el 17 d’octubre de 2026 que Química es fa a les mateixes franges de Dibuix/Empresa:

| Dia | Química del tecnològic |
| --- | --- |
| Dilluns | 09:10–10:10 |
| Dimarts | 09:10–10:10 |
| Dimecres | 08:10–09:10 |
| Dijous | 08:10–09:10 |

No es reutilitzen les hores de Química del grup A: dimecres i dijous tenen una altra franja. Es mantenen les variants de professorat de Química documentades, Mireia Biosca (aula 3) i Kiko Solsona (aula 6), amb selecció explícita.

## Implementació i comprovació

- Química, Dibuix i Empresa són alternatives excloents al mateix bloc del B. Les altres assignatures i els grups A/C es conserven.
- La migració `0031_technology_chemistry.sql` afegeix dues variants, vuit franges i les plantilles configurables de notes que faltin. No altera les migracions publicades, matrícules, notes, usuaris ni configuracions actuals.
- Una matriu independent comprova les quatre hores de cada variant. S’enumeren les **272 combinacions**: 96 del A, 128 del B i 48 del C, amb 30 hores setmanals, sis franges al dia i cap coincidència.
- Les proves locals inclouen selecció, canvi entre alternatives, professorat, revisió, desament, fallada i reintent, recàrrega i retorn al perfil per a alumnat i delegats, als tres motors de navegador.
- La migració es revisa i assaja separadament abans d’aplicar-la al D1 fixat amb còpia privada. La publicació necessita PR, CI verda del commit exacte i rebut del proveïdor.

Estat i evidències vigents: [seguiment](SEGUIMENT.json). Les proves utilitzen fixtures locals; no es visita la web pública ni la seva API.

## Verificació local

479 proves unitàries, 272 combinacions i totes les 55 ofertes contrastades amb els blocs de la matriu independent. 18 recorreguts nous de Química per a alumnat, delegats i subdelegats als tres motors, a 320/1440 px; 27 regressions dels tres itineraris, amb amplades entre 320 i 1440 px. Desament de les dues variants, recuperació d’errors, recàrrega, perfil i detall de classe correctes. API workerd/D1 local correcta, incloent exclusió d’alternatives i conservació de notes. Les proves són amb fixtures, no dispositius físics ni comptes reals.

La migració publicada 0026 queda idèntica. L’antic `2B-chem` continua retirat; `2B-chem-biosca` i `2B-chem-solsona` són ofertes noves. La simulació verifica totes les taules i plantilles existents, integritat i reexecució sense duplicats. Pendent còpia privada i pas separat al proveïdor, després de CI exacta.

## Sincronització de la prova de preferències

La primera CI detecta una lectura de bootstrap cancel·lada en una recàrrega de WebKit, després de confirmar el volum al servidor. La prova comprova ara que l’últim valor també s’ha rebut a la lectura abans de recarregar, a més d’esperar la xarxa. No es filtra ni es retira la comprovació d’errors. Les 24 regressions de preferències passen localment als tres motors. La CI es torna a executar completa sobre el commit que incorpora aquesta correcció de prova; el codi de producte d’àudio no canvia.
