# Primera entrada de La Net

## Recorregut escollit

Una pàgina pròpia substitueix la plataforma fins que el compte té el curs configurat. Quatre passos: benvinguda, itinerari oficial, assignatures/professorat i revisió. La benvinguda explica horari i agenda, materials compartits, formularis i eines, estudi i seguiment de notes amb les il·lustracions existents. Una única acció principal per pas.

La configuració existent es reutilitza: mateixes dades oficials, validació de variants, blocs i coincidències. El perfil conserva l’editor habitual per als comptes configurats. No es mostra la barra lateral, els anuncis ni un diàleg durant la primera entrada.

## Checklist d’execució

- [x] Revisar configuració, autenticació i persistència oficials; una sola tasca activa T80-01.
- [x] Implementar pàgina completa, jerarquia visual, progrés i una acció principal.
- [x] Recuperar tries locals per compte i versió d’horari; sanejar dades no fiables.
- [x] Provar els tres itineraris, desats/reintents, reload, sessió i usuaris existents.
- [x] Revisar captures a mòbil i escriptori; teclat i moviment reduït.
- [ ] Tipus, unitàries, build i auditoria de font; CI verda de la PR actualitzada.
- [ ] Fusionar per PR, CI exacta de main, publicar 0.6.16 i verificar rebut del proveïdor.

## Criteris

Sense scroll horitzontal a 320px; cap interfície de la plataforma al darrere. Selecció marcada amb color, contorn i check. Focus al títol quan es canvia de pas; radios accessibles amb fletxes. Errors visibles conserven les tries. Una resposta de desat confirmada permet continuar encara que falli la lectura posterior. Progrés de sessió separat per compte, eliminat en confirmar. Google continua sent l’únic accés; identitat inalterada. La benvinguda i retirada del xat no requereixen migració. La publicació conjunta incorpora 0028/0029 per agenda i analítica, revisades separadament; no hi ha regals ni reinicis. Totes les proves funcionales usen fixtures locals, mai la web pública.

## Ajust de Continguts demanat durant la revisió

Retirar el xat/Dubtes i preguntes contextuals de materials. Mantenir Materials, Formularis i Eines i webs, amb agenda contextual. Retirar API i codi de converses, preservar taules històriques sense migracions i donar sortida clara als enllaços antics. Verificar també informes arxivats i accions de moderació sense accessos trencats. La mateixa T80-01 continua sent l’única tasca activa.

## Publicació conjunta

Inclou R98/H191 (agenda validada per delegats) i R99/H192 (dades/dashboard privat), amb els seus plans propis. Una sola tasca activa i una pujada consolidada després de proves locals. Còpia privada, migracions additives 0028/0029, roster privat i servei de manteniment verificats separadament abans de Pages. El rebut de la release immutable és el registre públic de desplegament.

Aquesta tanda també incorpora R100/H193 (Pomodoro/focus), R101/H194 (històric PAU) i R102/H195 (logo mòbil), amb proves i plans propis. Una única pujada després del freeze final; sense canvis de producte a mig validar.
