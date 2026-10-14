# Primera entrada de La Net

## Recorregut escollit

Una pàgina pròpia substitueix la plataforma fins que el compte té el curs configurat. Quatre passos: benvinguda, itinerari oficial, assignatures/professorat i revisió. La benvinguda explica horari i agenda, continguts i dubtes, estudi i seguiment de notes amb les il·lustracions existents. Una única acció principal per pas.

La configuració existent es reutilitza: mateixes dades oficials, validació de variants, blocs i coincidències. El perfil conserva l’editor habitual per als comptes configurats. No es mostra la barra lateral, els anuncis ni un diàleg durant la primera entrada.

## Checklist d’execució

- [x] Revisar configuració, autenticació i persistència oficials; una sola tasca activa T80-01.
- [x] Implementar pàgina completa, jerarquia visual, progrés i una acció principal.
- [x] Recuperar tries locals per compte i versió d’horari; sanejar dades no fiables.
- [x] Provar els tres itineraris, desats/reintents, reload, sessió i usuaris existents.
- [x] Revisar captures a mòbil i escriptori; teclat, zoom i moviment reduït.
- [ ] Tipus, unitàries, build i auditoria de font; CI verda de la PR actualitzada.
- [ ] Fusionar per PR, CI exacta de main, publicar 0.6.16 i verificar rebut del proveïdor.

## Criteris

Sense scroll horitzontal a 320px; cap interfície de la plataforma al darrere. Selecció marcada amb color, contorn i check. Focus al títol quan es canvia de pas; radios accessibles amb fletxes. Errors visibles conserven les tries. Una resposta de desat confirmada permet continuar encara que falli la lectura posterior. Progrés de sessió separat per compte, eliminat en confirmar. Google continua sent l’únic accés; identitat inalterada. No cal migració ni regals o reinicis. Totes les proves funcionales usen fixtures locals, mai la web pública.
