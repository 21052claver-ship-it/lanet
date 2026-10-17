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
| Data oberta → actualització o retirada rebuda | El servidor retornava les dades noves però el detall mantenia la còpia antiga i permetia intentar completar una tasca retirada. | Títol, data, horari, aula i cos vinculats a l’estat actual. En retirar-se, missatge explícit i retorn a l’agenda, sense accions de la data anterior. |
| Actualitzar des de la versió anterior → continuar un esborrany públic | Separar les ubicacions de públic/privat podia deixar de recuperar un esborrany públic anterior. | Reutilitzar la ubicació antiga quan conté un públic, mantenir-la estable durant l’edició i esborrar només després de confirmar. El privat separat queda intacte; no hi ha còpia ni esborrat prematur. |

`output/journeys-audit/baseline.json` conserva les reproduccions prèvies i les captures locals. La primera execució de la nova prova també ha descobert una expectativa incorrecta del títol: en tornar a la vista Agenda, l’encapçalament correcte és «La teva agenda». S’ha corregit la prova i s’ha mantingut la comprovació de setmana i estat. La regla de pestanyes s’ha reforçat contra el selector general existent, sense ignorar les mesures de geometria.

La regressió antiga que canvia de compte substituint la cookie estava assumint que recarregar esborrava la subsecció Contactes. Ara selecciona explícitament Per validar abans d’obrir la proposta: conservar Contactes en recarregar és el comportament nou comprovat. No s’ignoren errors ni es relaxa la comprovació de permisos o publicació.

La primera CI ha passat els 60 recorreguts nous, però ha detectat una cursa en una prova de material a WebKit/Linux: llegia SQLite quan l’etiqueta optimista ja havia canviat i el POST encara no havia acabat. La prova ara retarda aquesta escriptura expressament, comprova el bloqueig i l’absència de la fila mentre està pendent, i exigeix resposta correcta i estat confirmat abans de comprovar la fila. No es relaxa cap assert ni s’amaga cap error; es revalida la matriu del nou commit.

La CI també ha exposat dos problemes de coordinació de les proves anteriors: es disposava la fixture mentre el seu callback de bootstrap encara treballava, i una inserció sintètica de text coincidia amb el focus i l’actualització de Desfer. Ara es confirma el refresc del panell i s’esperen els callbacks abans de disposar el context, sense ignorar errors. La prova de notes dona focus explícit, reté el refresc de Desfer, escriu durant l’espera i exigeix que el text nou sobrevisqui quan arriba la resposta. Passen els 36 recorreguts d’horari i les 24 proves de nota anual als tres motors, amb tots els asserts de persistència i límits conservats.

## Simulacions i criteris

La matriu nova conté 66 escenaris: tres motors, quatre disposicions (320, paisatge tàctil 740 × 390, tauleta 820 i escriptori 1440), itineraris 2A/2B/2C i comptes separats d’alumne, company, delegat, subdelegat i persona fora d’àmbit. El cicle comprova proposta, retorn amb missatge, correcció, aprovació pel subdelegat, estat publicat de l’autor, progrés personal independent, retirada amb motiu i avisos. Les proves contrasten SQLite i permisos, no només text visible.

També es comproven escriptura fallida i reintent, clic duplicat mentre es desa, concurrència de representants, errors de comprovació i actualització, llistes denses, cerca sense accents, recuperació de cerca buida, enllaços i recàrregues, focus i controls de 44 px sense solapaments. Es conserven les regressions de seqüència de classe, lectura visible, seguiments d’estudi/notes, responsive, espais d’assignatura, delegats i notificacions.

Cap canvi de permisos o consultes de servidor, migració, R2, Google o serveis privats. El panell demana el bootstrap existent una vegada en entrar i quan l’usuari prem Actualitzar; no s’afegeix cap interval de polling. Els camps de navegació contenen identificadors i dates, sense continguts ni dades personals.

Estat: verificació local en curs sobre una compilació fixa. Després dels controls cal la CI exacta de PR/main i una única publicació de 0.6.23.

La comprovació de detall viu afegeix sis casos (320/1440, tres motors) amb les actualitzacions del bootstrap existent: canvi de títol/data/aula/instruccions, retirada i retorn directe a la llista de l’agenda. La reproducció prèvia a output/journeys-audit/live-before.json contrastava servidor i finestra: títol antic i acció de completar encara visibles. Les captures també han permès moure la separació d’accions al CSS global: així no depèn d’haver carregat Horari abans d’obrir un detall des de Comunitat. Es mesuren 44 px i un mínim de 8 px entre les accions.
