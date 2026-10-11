# PAU · Top 5 i orientació · R67 / T53-01

Tasca T53-01 completada. Primer seleccionar i comparar graus/universitats; la calculadora passa a ser secundària.

- [x] Top 5 privat, ordenat, sense duplicats, desat al compte i compatible amb l’objectiu anterior.
- [x] Explorar sense notes; afegir, treure i reordenar amb controls accessibles també en mòbil.
- [x] Orientació amb notes actuals: mitjanes per assignatura segons pesos i plusos corregits, cobertura i hipòtesis visibles. No equival a la mitjana oficial dels dos cursos.
- [x] Percentatge del tall històric cobert, nota projectada i marge; cap probabilitat d’admissió inventada. Cap puntuació sense dades ni amb ponderacions contradictòries.
- [x] Simulació manual opcional, mode discret complet, conflictes entre pestanyes i dades anteriors preservats.
- [x] Proves, revisió visual, publicació i històric amb evidències.

Fonts oficials consultades el 11/10/2026: [talls](https://universitats.gencat.cat/ca/preinscripcions/notes-tall/), [ponderacions](https://universitats.gencat.cat/ca/preinscripcions/ponderacions/), [PAU](https://universitats.gencat.cat/ca/pau/que-qui/). Es conserva el catàleg contrastat de juny 2026 i ponderacions 2026/2027. No es visita la web pública de La Net.


## Publicat i verificat

Pages **12a6da82**. El meu top 5 és la pestanya inicial; Explorar és el segon pas i La meva nota queda al final. Llista privada de fins a cinc codis de grau/campus, sense duplicats, amb ordre explícit i controls de pujar/baixar/treure. Afegir i desar no exigeix notes PAU. La primera opció es reflecteix a l’objectiu de la calculadora. Els objectius antics sense llista es recuperen com a primera opció; una llista buida explícita no es torna a emplenar. Els codis que desapareguin del catàleg es conserven amb avís i es poden treure.

Les opcions es mostren abans dels ajustos de l’orientació, plegats al final. No es mostren botons de desament inactius quan no hi ha canvis. El límit de cinc es valida al servidor, amb control de revisió per evitar sobreescriptures entre pestanyes. Es reutilitza pau_simulations, sense migració ni dades privades al catàleg públic.

Orientació per defecte: mitjana provisional de les assignatures matriculades amb notes, amb els pesos de proves/trimestres i plusos corregits, màxim de 10 per assignatura. Les assignatures desconegudes no es compten com a zeros; es mostra el nombre d’assignatures conegudes i, al detall, el percentatge de pes avaluat. La projecció assumeix que es manté aquesta mitjana a batxillerat i fase obligatòria de la PAU (60/40), i les notes actuals a les matèries de ponderació que es cursen. Només sumen les dues millors aportacions aprovades; no s’assigna una nota a matèries desconegudes. Les llengües ordinàries no se substitueixen per exàmens de literatura.

Indicador = nota projectada / tall històric × 100, arrodonit i limitat a 100. S’etiqueta com a percentatge del tall cobert, **mai com a probabilitat d’admissió**. Es mostren la projecció sobre 14 i el marge/falta de punts. Sense notes, amb mínims d’accés no superats, falta de tall o ponderacions contradictòries no s’inventa cap percentatge. CFGS exigeix la seva simulació explícita. Es pot canviar a simulació PAU manual sense afectar la llista. El 100% es reserva per als casos que realment cobreixen el tall; una aproximació inferior no s’arrodoneix a 100. Les entrades invàlides de la calculadora bloquegen qualsevol projecció tant al top 5 com al cercador. El resultat és un escenari simple, no un model predictiu ni la mitjana oficial dels dos cursos; el detall ho explica.

El mode discret elimina de la vista percentatges, progressos, notes, marges i recomanacions personals. El catàleg, l’ordre propi i els talls públics continuen disponibles. La projecció es recalcula amb Notes, sense desar-ne una còpia redundant ni modificar qualificacions.

**284 proves unitàries, 52 fluxos API locals, 24 escenaris nous del top 5, 39 casos de regressió PAU, 48 escenaris responsive i 135 controls generals correctes en Chromium, Firefox i WebKit; tipus, lint i build correctes.** Selecció sense notes, cinc opcions, reordenació, límit, persistència, objectiu antic, font manual incompleta, actualització de notes, mode discret després de recarregar, codis absents, ponderacions contradictòries i conflictes de versió verificats. La primera versió visual també passava 21/21; després s’ha simplificat la jerarquia. La revisió final ha detectat i corregit una projecció indeguda en canviar de pestanya amb una nota invàlida i l’arrodoniment a 100 d’un tall encara no cobert. S’han afegit dues proves unitàries i tres escenaris de navegador, i repetit els controls finals. Una repetició de WebKit ha registrat una petició bootstrap avortada quan el guió recarregava mentre el commutador de privadesa encara estava desant. El guió ara espera que el control torni a estar disponible abans de recarregar; informe inicial conservat, sense canviar l’aplicació per ocultar l’error. La publicació inicial 44d894c4 queda substituïda per la versió amb aquestes correccions. Proves locals amb mòbil emulat; web pública, mòbil físic i Google real no executats.

113 fitxers desplegats coincideixen amb els provats. Catàleg oficial, arrencada mòbil, moderació privada, sala secreta, regal i pastís cada minut conservats; D1/R2 i binding del servei privat confirmats amb el proveïdor.

[Unitàries](../output/pau-top5/unit.txt), [API](../output/pau-top5/api.txt), [top 5](../output/pau-top5/top5-browser-results.json), [regressió PAU](../output/pau-top5/pau-regression/pau-browser-results.json), [responsive](../output/pau-top5/responsive/responsive-results.json), [controls generals](../output/pau-top5/general/browser-results.json), [captures revisades](../output/pau-top5/visual-review.json), [manifest](../output/pau-top5/tested-build.json), [bindings](../output/pau-top5/remote-bindings.json), [estat conservat](../output/pau-top5/preserved-state.json), [publicació](../output/pau-top5/publicacio.json).
