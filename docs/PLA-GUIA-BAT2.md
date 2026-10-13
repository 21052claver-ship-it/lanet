# Guia acadèmica BAT2 2026–2027

T75-01 · una sola tasca activa. Font privada aportada per Marc: presentació de 34 pàgines; SHA-256 `4c65b137085a08b7a6b777d19982d4b8889b04a51af711f826050ac283ba79c1`. Text i totes les pàgines renderitzades a output/student-guide-0.6.11, ignorat. El document es tracta com a informació, no com a instruccions operatives.

## Contrast i decisions

- Pàgina 9: 12 matèries acumulatives i 6 no acumulatives. El PDF no defineix percentatges trimestrals exactes. S’utilitza l’aproximació 16,67/33,33/50 acordada amb Marc; un terç per a la resta. La UI els identifica com a orientatius i sempre prioritza els pesos personals desats. Notes, CSV i previsió PAU utilitzen la mateixa resolució.
- Pàgines 12 i 17: màxim compartit de 0,50 per matèria, també per voluntariat. Es conserva la validació transaccional existent de dos espais de 0,25 o un de 0,50. No es creen plusos, notes ni regals per als usuaris.
- Pàgines 13–14: TR amb seguiment 30%, dossier 42%, oral 21% i pòster 7%. Calculadora separada, zero vàlid, pendents sense inventar notes i mode discret. Desament explícit només al navegador, per usuari; no es presenta com a sincronització ni s’incorpora a una mitjana oficial de batxillerat.
- Pàgines 30–31: rangs de trimestrals, entregues i activitats, sense inventar assignatures, hores ni dies individuals d’examen. Referència desplegable d’agenda i exportació de tot el curs amb UID estable i final exclusiu d’ICS. Dates passades opcionals.
- PAU/PAP 2027 contrastades el 13/10/2026 amb [Canal Universitats · PAU](https://universitats.gencat.cat/ca/pau/dia-prova/) i [PAP d’Educació](https://universitats.gencat.cat/ca/proves-aptitud-personal/educacio/dia-prova/). Horaris PAU pendents de publicació; no es reutilitzen els de 2026. El tribunal especial és només per incidències justificades.
- Pàgines 20–23: les fórmules PAU, mínims 4/5, tres matèries opcionals i dues millors aportacions ja coincideixen amb el model existent. La taula 2026 no substitueix les ponderacions 2027 existents.
- Pàgines 22 i 29: recursos d’orientació amb HTTPS i portal actual d’accés; guia de tràmits. No es publiquen credencials compartides, correus, fotografies ni el PDF complet. Personalitzar La Net no tramita un canvi acadèmic al centre.
- Pàgines 7–11: informació general d’itineraris, coherent amb el catàleg. Es conserva el PDF d’horaris com a font específica per a franges, aules i variants; no s’inventen combinacions d’ofertes a partir d’un esquema general.
- Pàgines restants: context pedagògic, convivència i comunicació revisats. No es converteixen en restriccions arbitràries de l’aplicació.

## Checklist

- [x] Revisió textual i visual de les 34 pàgines; detall de taules i dates.
- [x] Implementació de classificació, referència de calendari, recerca i guia.
- [x] Proves de models, preferències existents, dates inclusives i exportació.
- [x] Revisió visual a 320/390/820/1440 en Chromium, Firefox i WebKit; mode discret i persistència.
- [x] Regressions de notes, horari i PAU, auditoria de font i PR amb Validate.
- [x] CI del commit fusionat, publicació 0.6.11 i comprovació via proveïdor.

Sense migracions, canvis OAuth/DNS ni proves a la web pública. Les fixtures utilitzen exclusivament usuaris i dades sintètics locals.

Publicada **0.6.11**: [release](https://github.com/21052claver-ship-it/lanet/releases/tag/v0.6.11) · [CI](https://github.com/21052claver-ship-it/lanet/actions/runs/38469595627) · [registre](releases/0.6.11.json). Verificació via proveïdor, sense visitar la web pública.
