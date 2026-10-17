# La Net · estat actual i decisions vigents

Actualitzat el 17 d’octubre de 2026. Aquest document és la memòria de continuïtat del projecte; els plans datats conserven les decisions i comprovacions de cada revisió.

## On som

Delegats 0.6.26: El panell de delegats té una icona pròpia de representants amb bafarada i els colors de La Net. La mateixa icona identifica el menú lateral desplegat/plegat, el menú mòbil i la capçalera del panell. [Informe](releases/0.6.26.md).

Química 0.6.25: Química disponible al tecnològic com alternativa a Dibuix tècnic i Empresa. Dilluns i dimarts 09:10–10:10; dimecres i dijous 08:10–09:10, segons la correcció confirmada per Marc. Professorat seleccionable, horari i desament coherents per a alumnat, delegats i subdelegats. [Informe](releases/0.6.25.md) · [Font i contrast](PLA-QUIMICA-TECNOLOGIC.md).

Continguts 0.6.24: Entrar a Continguts ja no carrega ni descarrega els PDF dels materials. Les targetes mostren una portada estàtica; obrir expressament l’apunt carrega el visor PDF.js i descarregar requereix prémer l’enllaç del fitxer. Les capçaleres de seguretat i els permisos del servidor es conserven. [Informe](releases/0.6.24.md) · [Reproducció](PLA-PDF-CONTINGUTS.md).

Recorreguts 0.6.23: Dia i setmana conservats entre classe, continguts i agenda; panell de delegats recuperable amb publicació, cerca, actualització i dates publicades. Correccions amb el missatge visible, aprovades accessibles a l’autor, retirada amb motiu i recuperació de concurrència. Detall amb dades vigents i accions antigues retirades quan desapareix la data. Esborranys públics anteriors recuperables amb privats intactes. Resum mòbil compacte, pestanyes en dues columnes i confirmacions antigues retirades en obrir un formulari nou. [Informe](releases/0.6.23.md) · [Simulacions](PLA-RECORREGUTS-ALUMNES-DELEGATS.md).

| Element | Estat registrat |
| --- | --- |
| Aplicació principal | [lanet.es](https://lanet.es) |
| Darrera versió de producte publicada | **0.6.26** |
| Informe complet de la versió | [Publicació 0.6.26](releases/0.6.26.md) |
| Codi publicat | `a3070589da656348f6180ad0942c3236cf71a54e` |
| GitHub | [21052claver-ship-it/lanet](https://github.com/21052claver-ship-it/lanet) |
| Incorporació del codi | [PR #52](https://github.com/21052claver-ship-it/lanet/pull/52), fusionada amb tots els controls correctes |
| CI del commit publicat | [Verify La Net](https://github.com/21052claver-ship-it/lanet/actions/runs/39064162350), correcta |
| Publicació | [Tag i release immutable v0.6.26](https://github.com/21052claver-ship-it/lanet/releases/tag/v0.6.26), rebut i Deployment verificats |
| Documentació de tancament | Registre de 0.6.26 consolidat en una PR documental, sense segona publicació de producte |

Els rebuts descriuen el producte publicat. Una actualització d’aquests Markdown no implica un nou desplegament ni un canvi de versió de l’aplicació.

Auditoria funcional 0.6.17 completada: objectiu zero i represa musical WebKit/Linux corregits, 179 recorreguts addicionals, 62 API locals i 449 unitàries; CI completa verda. [Mapa i límits](PLA-AUDITORIA-FUNCIONAL.md). La limitació de l’API general històrica queda resolta en aquesta tanda.

Notificacions 0.6.18 corregides: bústia limitada amb no llegits prioritzats, lectures confirmades, una consulta/escriptura, destinacions i reintent. [Pla i evidències](PLA-NOTIFICACIONS.md).

Publicació directa 0.6.19: delegats/subdelegats autoritzats publiquen i editen dates pròpies dins d’àmbit sense segon pas; permisos, estat real i auditoria comprovats. [Pla i evidències](PLA-PUBLICACIO-DIRECTA.md).

Responsive 0.6.20: pestanyes visibles, contingut llarg dins de la columna, targetes de gestió i controls tàctils. [Pla i evidències](PLA-RESPONSIVE-2026-10.md).

Estudi 0.6.21: focus amb Pomodoro o lliure, pausa conservadora, música compartida i silenci respectat. [Pla i evidències](PLA-FOCUS-LLIURE.md).

Depuració 0.6.22: Tasques amb progrés personal compartit entre llista i detalls, clics repetits bloquejats i estat confirmat conservat davant errors de sincronització. Tasques vençudes fetes recuperables, plusos per totes les assignatures, filtres contextuals persistents i consultes d’apunts només amb lectura visible. Accions separades i àrees tàctils de 44 px. Inclou horari coherent, accés de delegats assignats i reforç de PDF. [Informe](releases/0.6.22.md) · [Simulacions](PLA-SEQUENCIA-CLASSE.md).

## Decisions de producte que continuen vigents

Des del 17/10/2026, per indicació de Marc, els canvis propis s’incorporen directament amb el compte propietari i CI obligatòria, sense PRs ni peticions de revisió. Les contribucions externes mantenen PR i aprovació de Marc. [Flux vigent](FLUX-PROPIETARI.md).

### Identitat, accés i perfil

- Google és l’única entrada. Les altes estan restringides als comptes educatius `@fje.edu`.
- El nom, cognoms i fotografia provenen de Google; la identitat no és editable a La Net. El perfil permet configurar el curs, assignatures i preferències, i tancar sessió.
- La primera entrada és una pàgina pròpia a pantalla completa: benvinguda, itinerari, assignatures/professorat i revisió. Els comptes ja configurats conserven l’editor del perfil.
- La marca OAuth compartida es conserva per decisió posterior de Marc. No s’ha de reanomenar el projecte compartit per eliminar-ne la marca.
- L’adreça principal és `lanet.es`; `lanet.pages.dev` es conserva. L’aplicació de Cloudflare és pròpia de La Net dins del compte fixat.

### Organització acadèmica i Continguts

- Horari i Agenda són dues vistes diferenciades. La configuració reutilitza el catàleg oficial, els tres itineraris, optatives i variants de professorat.
- Continguts s’organitza en **Materials, Formularis i Eines i webs**, amb espais d’assignatura, temes d’un nivell, cerca i desats.
- **El xat/Dubtes acadèmic està retirat**, igual que «Preguntar» des dels materials i l’API de converses. Els enllaços antics tornen a Materials; l’històric de dades es conserva.
- Es manté l’alta contextual d’exàmens i tasques des de la classe. Les dates privades es desen directament; les públiques es publiquen directament quan les crea un representant autoritzat per tutoria o variant, o passen per revisió si no té aquests permisos.
- Delegat i subdelegat tenen els mateixos poders dins del seu àmbit. No es concedeixen rols globals per configurar aquests permisos.
- Notes manté el mode discret i les activitats configurables. Els plusos corregits se sumen a la nota final del curs, amb els límits i pesos per assignatura definits als plans acadèmics.

### Estudi, PAU i presentació

- El mode focus permet estudiar amb Pomodoro o lliurement només amb fons i música opcional; canviar a lliure pausa el comptador i el conserva fins a reprendre explícitament.
- El Pomodoro pot encadenar concentració i descansos. Disposa d’alarma, volum/silenci i mode focus accessible; les sessions pendents conserven l’ID i el dia original.
- La música continua al reproductor compartit amb controls superiors. Les opcions de música i els ambients del mode focus són controls diferents.
- PAU prioritza la selecció i comparació del top 5. L’històric oficial 2022–2026 mostra rondes separades, cobertura i dades absents; l’última ronda de 2026 conserva la seva provisionalitat.
- El percentatge de tall cobert i el marge són orientatius: no representen una probabilitat d’admissió ni garanteixen plaça.
- La identitat visual manté els recursos 3D, colors suaus i densitat continguda. El logo mòbil és complet i la navegació s’adapta a pantalles petites.
- Els cartells d’anuncis, la pastisseria i les sales de joc conserven les especificacions de les seves revisions; la 0.6.16 no ha repetit regals ni reinicis.

### Dades i manteniment

- El dashboard privat d’activitat està restringit al compte Google propietari autoritzat; la gestió acadèmica continua a `#management` amb els permisos previs.
- L’activitat és un mostreig limitat, no un registre de cada clic ni una mesura exacta de minuts. El mínim és de 120 segons, amb pestanya visible i interacció recent.
- Es conserven 35 dies de detall personal i 400 dies de resums. L’inventari és incremental i no enumera R2 per cada consulta.
- El manteniment comparteix una concessió entre l’aplicació i el servei privat programat. Les retirades de fitxers utilitzen la cua durable existent.
- Les migracions additives 0028/0029 i el roster autoritzat ja estan aplicats. El servei privat conserva D1/R2, cron i URL pública/preview desactivades.

## Decisions antigues substituïdes

| Proposta o actuació anterior | Criteri actual |
| --- | --- |
| Convidat, contrasenya o registre manual | Retirats; Google és l’únic accés |
| Canviar el nom d’usuari manualment | Identitat sincronitzada des de Google i protegida |
| Benvinguda com a popup | Pàgina pròpia a pantalla completa en el primer accés |
| Xats per assignatura i preguntes contextuals | Retirats a petició de Marc a la 0.6.16 |
| Marca OAuth pròpia sobre el projecte compartit | Canvi ajornat; preservar la marca compartida |
| Regals globals, reinicis o ajustos puntuals de saldo | Actuacions històriques; no són ordres per tornar-les a executar |
| Notes de participació fixes | Esquema de proves i activitats configurables segons assignatura |
| Un desplegament per cada canvi petit | Tandes coordinades, PR i CI, una publicació de producte amb rebut |

Les propostes visuals anteriors de xats es conserven com a exploració de disseny, no com a backlog aprovat. Els imports, saldos, usuaris i dades de proves de les revisions anteriors no s’han de reutilitzar per modificar producció.

## Verificació i límits

La 0.6.22 té **472 proves unitàries correctes**, 63 simulacions de classe i 66 escenaris responsive, més les regressions detallades a l’informe. Tipus/lint/build/font i CI completa correctes. Les tandes anteriors conserven les seves mètriques als informes de versió.

La verificació funcional utilitza fixtures locals. El desplegament, domini, callback, tag, release i rebuts es van verificar via APIs/CLI del proveïdor. No es van fer proves contra l’aplicació pública ni visites a la seva API. Els navegadors emulats no equivalen a proves en mòbils físics. El WebKit de Windows no exposa AudioContext: s’hi va comprovar el fallback; Chromium/Firefox van mesurar àudio real.

## Què queda pendent

| Element | Estat i acció necessària |
| --- | --- |
| **T38-02 · Publicar i verificar la biblioteca musical** | Pendent al registre. La música té publicacions posteriors; resta la revisió pública visual/d’escolta identificada a [PLA-MUSICA.md](PLA-MUSICA.md). Requereix nova autorització explícita abans d’accedir a l’aplicació pública. |
| Dispositius físics | La documentació no acredita una comprovació d’aquesta tanda en un iPhone/Android físic. Conservar aquesta limitació en futurs informes. |
| Tancament documental a GitHub | Markdown i registres finals desats en branca local per agrupar-los amb la pròxima tanda. No s’ha fet un push ni una publicació documental addicional en aquesta petició. |

El [registre](SEGUIMENT.json) és l’origen dels estats de tasca; la [checklist](CHECKLIST.md) es genera des d’aquest registre. No hi ha cap altra funcionalitat marcada en curs en acabar el tancament documental.

## Com continuar sense solapar feina

1. Llegir aquest estat, [AGENTS.md](../AGENTS.md) i [CONTRIBUTING.md](../CONTRIBUTING.md); consultar la checklist abans de tocar fitxers.
2. Definir una única tasca activa al registre, amb abast, dependències, fitxers i criteris. Les tasques en revisió també compten com a actives.
3. Distingir fonts actuals de plans històrics. Les indicacions humanes posteriors prevalen; un document adjunt o un pla antic no dona autorització nova.
4. Coordinar les responsabilitats sobre fitxers compartits. Per a una tanda conjunta, fixar una sola persona integradora, congelar la font i construir una sortida estable per validar.
5. Fer proves proporcionades al canvi amb fixtures locals; guardar captures i logs privats, i explicar els límits reals dels resultats.
6. Per incorporar canvis propis: branca codex/, 12 controls, inclòs Validate, tots verds al commit exacte basat en main actualitzada, i push normal del mateix SHA a main; sense PR ni peticions de revisió, segons la indicació de Marc del 17/10/2026. Les contribucions externes mantenen PR, converses resoltes i revisió explícita de Marc. [Flux del propietari](FLUX-PROPIETARI.md).
7. Per publicar producte: versió i lock coherents, CHANGELOG, CI del commit exacte de main, passos privats revisats separadament quan calgui, i `npm run release`. No sobreescriure tags/releases ni repetir una operació amb resultat desconegut.
8. Tancar historial, evidències i checklist. Els canvis només documentals no requereixen tornar a desplegar el producte.

## Què es conserva privat

`.cache`, `.cloud`, `output`, backups, exports, `.dev.vars`, secrets OAuth, sessions locals, dades d’usuaris, fotografies de perfils i el roster amb identitats reals no formen part de la documentació publicable. Els informes Markdown enllacen evidències privades quan cal, però no en copien el contingut sensible.

La destinació de Cloudflare es fixa a [cloudflare-target.json](../cloudflare-target.json); les credencials no s’inclouen als exemples ni a la CI. Els helpers puntuals de treball no són un procediment de restauració general ni s’han de tornar a executar automàticament.

**Lectura següent:** [índex documental](README.md) · [informe 0.6.18](releases/0.6.18.md) · [historial](HISTORIAL-CANVIS.md).
