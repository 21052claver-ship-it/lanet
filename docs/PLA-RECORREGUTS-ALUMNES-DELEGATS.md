# Recorreguts d’alumnes i delegats

17 d’octubre de 2026 · T88-01 · R113

Marc demana una passada més profunda: posar-se en situació d’alumnes i delegats, simplificar la seqüència sencera i cuidar alineació, proporcions i detalls. La revisió parteix de 0.6.22 i treballa sobre una sola tasca activa.

Es revisen les transicions entre horari, classe, continguts i agenda, la gestió diària del delegat, el cicle proposta → demanar canvis → corregir → publicar i els avisos que rep l’autor. Les simulacions contrasten la interfície amb els efectes persistits, la privacitat i els permisos de comptes ficticis separats. Inclouen errors recuperables, recàrregues, navegació enrere i pantalles petites.

Les proves només utilitzen servidors locals i fixtures; bloquegen peticions externes. No s’accedeix a la plataforma pública ni a dades reals. Les evidències privades es desen a `output/journeys-audit/`. La matriu final distingirà casos nous, regressions i límits de la simulació.

## Auditoria en curs

| Recorregut | Problema reproduït | Canvi |
| --- | --- | --- |
| Preparar la setmana següent → classe → continguts → enrere | Es tornava a la setmana actual. | Context per compte i sessió; setmana, dia i tasques fetes es conserven en navegar i recarregar. Un nou dia torna a Avui; l’emmagatzematge bloquejat conserva la navegació en memòria. |
| Delegats → Contactes → recarregar | Es tornava al Tauler de Comunitat. | Pestanya i subsecció formen part de l’enllaç, també per enrere/endavant i accés directe. La visibilitat d’accions continua depenent dels permisos del servidor. |
| Panell → publicar o trobar una data ja aprovada | No hi havia alta ni llista de publicades al panell. | Entrada pública explícita, secció Publicades, cerca, dades actualitzades en entrar i actualització manual recuperable. El desament mostra la llista corresponent. Esborrany privat separat de l’entrada pública. |
| Autor → corregir una proposta retornada | El missatge del delegat desapareixia dins del formulari. | Motiu visible abans dels camps, dades conservades i reenviament amb els controls existents. Les aprovades continuen a Les meves propostes. |
| Publicada → retirar | Es mostrava també una aprovació desactivada que ja no corresponia. | Una acció de retirada, amb motiu obligatori, avís a l’autor i comprovació de revisió al servidor. |
| Dos representants → validar simultàniament | El segon error exigia sortir i trobar com refrescar el panell. | Estat antic bloquejat i acció per actualitzar des del mateix diàleg; cap segon avís ni validació duplicada. |
| Panell a 320 px | Pestanyes tallades per especificitat d’estil; massa resum abans de les propostes. | Dues columnes, instrucció breu, comptadors compactes, botons principals en una fila quan hi caben, targetes alineades i text adaptable. |
| Acció confirmada → obrir un altre formulari ràpidament | La confirmació anterior podia tapar camps del nou diàleg. | En obrir un diàleg es retira la confirmació d’èxit anterior; avisos i errors es conserven. |

`output/journeys-audit/baseline.json` conserva les reproduccions prèvies i les captures locals. La primera execució de la nova prova també ha descobert una expectativa incorrecta del títol: en tornar a la vista Agenda, l’encapçalament correcte és «La teva agenda». S’ha corregit la prova i s’ha mantingut la comprovació de setmana i estat. La regla de pestanyes s’ha reforçat contra el selector general existent, sense ignorar les mesures de geometria.

La regressió antiga que canvia de compte substituint la cookie estava assumint que recarregar esborrava la subsecció Contactes. Ara selecciona explícitament Per validar abans d’obrir la proposta: conservar Contactes en recarregar és el comportament nou comprovat. No s’ignoren errors ni es relaxa la comprovació de permisos o publicació.

## Simulacions i criteris

La matriu nova conté 60 escenaris: tres motors, quatre disposicions (320, paisatge tàctil 740 × 390, tauleta 820 i escriptori 1440), itineraris 2A/2B/2C i comptes separats d’alumne, company, delegat, subdelegat i persona fora d’àmbit. El cicle comprova proposta, retorn amb missatge, correcció, aprovació pel subdelegat, estat publicat de l’autor, progrés personal independent, retirada amb motiu i avisos. Les proves contrasten SQLite i permisos, no només text visible.

També es comproven escriptura fallida i reintent, clic duplicat mentre es desa, concurrència de representants, errors de comprovació i actualització, llistes denses, cerca sense accents, recuperació de cerca buida, enllaços i recàrregues, focus i controls de 44 px sense solapaments. Es conserven les regressions de seqüència de classe, lectura visible, seguiments d’estudi/notes, responsive, espais d’assignatura, delegats i notificacions.

Cap canvi de permisos o consultes de servidor, migració, R2, Google o serveis privats. El panell demana el bootstrap existent una vegada en entrar i quan l’usuari prem Actualitzar; no s’afegeix cap interval de polling. Els camps de navegació contenen identificadors i dates, sense continguts ni dades personals.

Estat: verificació local en curs sobre una compilació fixa. Després dels controls cal la CI exacta de PR/main i una única publicació de 0.6.23.
