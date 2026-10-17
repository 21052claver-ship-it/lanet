# Depuració integral amb simulacions locals

Tasca única **T93-01 · R118**. Revisió de la plataforma des de la situació d’alumnes, delegats i subdelegats: recorreguts complets, desaments, navegació, errors i disposició visual.

La revisió combina lectura del codi, reproducció de casos nous i les suites locals existents. Les fallades reproduïdes es corregeixen amb regressions que comproven el resultat per a l’usuari. No s’afegeixen proves que només dupliquin la implementació ni canvis cosmètics sense una millora concreta.

| Àmbit | Comprovacions |
| --- | --- |
| Classe i agenda | Continuïtat entre horari, continguts i tasques; publicació privada/pública, permisos i seguiment |
| Formularis i fitxers | Desament lent, errors/reintent, clics repetits, canvi de diàleg, adjunts i descàrrega explícita |
| Notes i preferències | Persistència, errors de sincronització, canvis ràpids i privacitat |
| Delegats i comunitat | Delegat/subdelegat, propostes, publicades, revisió, notificacions i contactes |
| Estudi i altres seccions | Focus, música, PAU, pastisseria, gestió i controls existents |
| Disposició | Mides de mòbil/escriptori, textos llargs, menú plegat, alineació i solapaments |

Les proves utilitzen exclusivament fixtures locals i identitats fictícies. Es conserven els horaris i les decisions funcionals publicades, la lectura explícita de PDF, D1/R2, OAuth i els permisos del servidor. No s’accedeix a l’aplicació pública, no es reprodueixen regals o reinicis i no s’utilitzen dades reals.

Els resultats, problemes reproduïts, captures i límits es registren a `output/platform-deep-audit/`, ignorat per Git. Incorporació directa del commit verificat, sense PR, i publicació versionada després de CI exacta de main. Cap afirmació de cobertura absoluta o de proves en dispositius físics.

## Fallades reproduïdes i correccions

| Situació | Resultat anterior | Correcció |
| --- | --- | --- |
| Editar una proposta mentre puja una imatge | En recuperar l’esborrany tornava el text anterior a la pujada | Persistència conjunta del text i els adjunts actuals |
| Editar el perfil durant un desament lent | Es tancava el perfil i es perdia l’últim canvi acceptat | Camps i pestanyes protegits durant la petició |
| Editar la selecció d’assignatures mentre es desa | La selecció nova desapareixia en tancar el filtre | Selector, mode i accions protegits fins a confirmar o fallar |
| Obrir una assignatura mentre es desa el filtre | La resposta tardana retornava a la llista general | El filtre retirat conserva la petició sense modificar la navegació nova |
| Escriure durant la publicació d’una data, proposta o plus | Es desava el títol anterior i es tancava el formulari | Camps agrupats i protegits durant el desament; cancel·lació externa conservada |
| Obrir una data amb un esborrany malmès | La pantalla sencera entrava al límit d’errors | Recuperació dels camps editables vàlids; tipus, dates, hores i metadades incorrectes descartats |
| Obrir el filtre i desmarcar immediatament el mode automàtic | La inicialització posterior el podia tornar a marcar | Inicialització de la selecció abans de mostrar el panell interactiu |
| Continuar una cerca immediatament després de tancar un formulari | El retorn diferit del focus podia interrompre l’escriptura | Es respecta el control connectat que l’usuari ja ha enfocat |

Els tres formularis de publicació s’han reproduït separadament. Les fallades inicials són a `baseline-recovery`, `baseline-subject-filter`, `baseline-late-navigation` i `baseline-publication`. La carrera d’obertura del filtre es va observar en la primera matriu de recuperació: 89/90 casos correctes i una selecció que tornava a l’estat automàtic després de desmarcar-la. Es conserva la captura de la fallada; no s’ha substituït per una espera artificial al test.

## Verificació de la tanda

- La primera matriu de 9 recorreguts va passar **162 simulacions**. La regressió àmplia va detectar després una cerca interrompuda a WebKit; el retorn diferit del focus s’ha reproduït de manera controlada als tres motors, sense canviar les assercions del recorregut original. La matriu final s’amplia a 10 recorreguts × 3 rols × 2 mides (320/1440 px) × 3 motors: **180 simulacions previstes**. Inclou desaments lents, recuperació després de 503, publicació única, esborranys, recàrrega, navegació durant peticions, continuïtat del focus i absència de desbordament horitzontal als diàlegs.
- 6 regressions unitàries noves per a esborranys de data: valors incompatibles, dades vàlides privades/públiques, límits de text, dates reals i coherència d’hores. **485 proves unitàries correctes** en la passada local.
- Inventari estàtic nou: **577 definicions de controls, 338 de botons i 29 formularis en 51 fitxers**, segons els tags comptats pel parser. Les 28 destinacions literals de diàleg tenen una implementació; el candidat sense handler explícit és el tancament legítim de Radix `Dialog.Close`. L’inventari comprova connexions, sense substituir els recorreguts de navegador.
- Regressions locals sobre la compilació final: classe i representants dels tres itineraris, preferències, pujades, PDF explícits, Química tecnològica, controls de gestió, activitat i disposició responsive. La CI completa cobreix també estudi/música, PAU, notes, notificacions, cartells i pastisseria.

Els resultats definitius i la publicació s’hi incorporen quan hagin acabat els controls. No hi ha migracions ni canvis en permisos, horaris, OAuth o serveis privats en aquesta tanda. Les proves no acrediten tots els estats possibles, dispositius físics ni un inici de sessió Google real.
