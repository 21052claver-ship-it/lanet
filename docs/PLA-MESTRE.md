# Pla mestre de revisió de La Net

> **Context històric del pla inicial.** L’estat vigent del 14 d’octubre és a [ESTAT-PROJECTE.md](ESTAT-PROJECTE.md) i la [publicació 0.6.16](releases/0.6.16.md). L’origen principal és `lanet.es`; Google és l’únic accés, la benvinguda és a pantalla completa i el xat/Dubtes està retirat. Les propostes i recomptes datats següents es conserven com a historial. [Índex documental](README.md).

9 d’octubre de 2026. Revisió basada en les observacions de Marc després de provar la plataforma i en el cartell de fusta adjunt. **La configuració sol·licitada és la del perfil**, amb les assignatures i preferències personals; aclarit per Marc en aquest mateix xat.

Aquest és el pla actiu per a la següent revisió. Les imatges v1/v2 continuen definint la identitat de La Net, però les indicacions noves prevalen en els elements que Marc ha demanat canviar. La marca, els colors càlids i l’art de fang es conserven. Els plans anteriors descriuen revisions ja fetes.

Actualitzat l’11 d’octubre (R46): adreça pròpia **https://lanet.pages.dev**, amb Google existent i marca «Impossible Goals» conservada temporalment per indicació de Marc ([pla d’adreça](PLA-MARCA-LANET.md)). No es modifica la marca compartida ni l’altra aplicació. **Google és l’única entrada i la identitat de Google no es pot editar** ([R45](PLA-GOOGLE-UNIC.md)). Les opcions de convidat, contrasenya, invitació i nom editable descrites més avall queden substituïdes. A més: aplicació Cloudflare pròpia `lanet`, entrada Google real comprovada i interior de pastisseria transparent. Les instruccions posteriors de Marc substitueixen les propostes inicials següents: cartell sempre visible, oferta inicial mínima d’un pastís, sense participació fixa a les notes, pastissera quieta sense salutació i només animació del forn/pastís. L’[informe actual](VERIFICATION.md), el registre i la checklist indiquen l’estat real. Aquest document conserva la fotografia de partida i les decisions originals com a historial.

R47: **5 pastissos de benvinguda per persona, una sola vegada**, amb saldo anterior conservat i crèdit també als membres actuals sense benvinguda. [Pla i criteris](PLA-PASTISSOS-BENVINGUDA.md).

## Seguiment i criteri de tancament

| Element                                                    | Funció                                                    |
| ---------------------------------------------------------- | --------------------------------------------------------- |
| Aquest pla                                                 | Especificació, ordre, decisions i criteris d’acceptació   |
| [Registre de tasques](SEGUIMENT.json)                      | Font única dels estats, dependències i evidències         |
| [Checklist generada](CHECKLIST.md)                         | Vista llegible del registre, regenerada automàticament    |
| [Historial de canvis](HISTORIAL-CANVIS.md)                 | Registre cronològic dels canvis fets i comprovats         |
| [Informe de preparació](../output/planning/auditoria.json) | Fitxers revisats, referència i hashes del codi de partida |

Estats: **pendent → en curs → en revisió → verificat**. Una tasca que falla una comprovació torna a estar en curs. Una dependència verificada és una condició per començar; l’ordre de la taula no és suficient per si sol.

Una tasca es tanca quan compleix el seu criteri, té comprovacions proporcionades al canvi i una evidència desada. Per a una interacció visible, cal provar el recorregut al navegador. Per a persistència, saldo, permisos o adjunts, també cal comprovar el servidor. «Compila» i «s’ha canviat el CSS» no són criteris suficients.

## Com evitarem solapaments

1. **Una tasca activa cada vegada.** Les tasques en curs i en revisió compten com a actives. No es comença una altra funcionalitat mentre la primera no està verificada o retornada explícitament a pendent.
2. **Un identificador per canvi.** Cada tasca té un ID, requisits associats, dependències, fitxers previstos, comprovacions i evidències. Un error descobert durant la feina s’anota amb ID; no es converteix en una segona reforma improvisada.
3. **Components compartits abans de les pantalles.** Selector, selecció d’assignatures, preferències, navegació i cartell tenen una sola implementació. Les pantalles els consumeixen; no creen variants independents.
4. **Un sol lloc on desar cada dada.** El perfil és l’origen de les assignatures; Apunts i Plusos tenen filtres propis. Horari, Agenda i Comunitat llegeixen els mateixos esdeveniments. El saldo només el confirma el servidor.
5. **Control dels fitxers compartits.** Abans de tocar `ui.jsx`, `context.jsx`, `App.jsx`, formularis o estils globals, es consulta el registre. Si una pantalla necessita ampliar un component compartit, s’acaba primer aquest canvi i després es reprèn la pantalla.
6. **CSS amb responsabilitat definida.** Els components nous tenen estils propis. Els valors de densitat i navegació són compartits. No s’acumulen regles contradictòries al final de `fidelity.css`; es revisen les regles que ja governen l’element.
7. **Migracions noves i additives.** No es reescriuen les migracions aplicades ni es reinicialitza D1/R2. Es prova la migració en una còpia abans d’aplicar-la a les dades locals. Una còpia de codi i dades precedeix la primera modificació funcional.
8. **Cap resultat antic atribuït al codi nou.** Les 32 proves i els 23 fluxos d’API de l’accés de convidat són la línia de base. Cada fase afegeix els resultats que realment ha executat, amb data i fitxers.
9. **Historial al tancar cada tasca.** S’anota què canviava abans, què passa després, fitxers afectats, comprovacions i limitacions. Les entrades anteriors es conserven.
10. **Comprovació mecànica del registre.** `npm run plan:check` detecta IDs duplicats, cicles, dependències inexistents, més d’una tasca activa, manca de cobertura dels requisits, tasques verificades sense evidència i checklist desactualitzada. `npm run plan:sync` regenera la checklist després d’actualitzar el registre. El control detecta inconsistències del seguiment; les proves i la revisió visual comproven el producte.

## Punt de partida comprovat

| Àrea         | Estat observat en el codi                                                                                                           | Implicació                                                                                        |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Apunts       | Fotos, galeries, PDF i documents ja existeixen; fins a 12 adjunts i 10 MB per fitxer. `worker/files.js` rebutja vídeo.              | Millorar la descoberta dels formats existents i ampliar el recorregut complet per a vídeo.        |
| Desplegables | Hi ha selectors natius repartits entre pantalles i formularis.                                                                      | Crear un selector compartit amb icona, color, focus i teclat; migrar tots els casos.              |
| Assignatures | El curs ja genera `enrolled`; Apunts comença a «Totes» i Plusos usa filtres locals buits i accessos fixos Física/Química/Filosofia. | Fer servir el curs com a valor inicial i desar preferències pròpies sense modificar la matrícula. |
| Notes        | La graella resum no mostra el pes al costat de cada entrada; el full detallat i l’editor ja tenen pesos.                            | Fer visible la relació nota/pes i simplificar l’editor conservant el càlcul existent.             |
| Pastisdoro   | `FocusForm` desa a l’API; `TimerProvider` inicialitza `remaining` una vegada i no el sincronitza amb una nova durada en repòs.      | Corregir la sincronització i definir explícitament què passa amb una sessió començada.            |
| Música       | Tres ambients generats: pluja, lo-fi i vent; selector inicial de pluja.                                                             | Substituir-los per cinc opcions lo-fi amb identitat pròpia i revisió auditiva.                    |
| Navegació    | Menú mòbil amb focus i fons inactiu; barra d’escriptori sense mode plegat.                                                          | Afegir barra plegable i navegació inferior mòbil amb els mateixos destins.                        |
| Comunitat    | Activitats i detalls existeixen. El salt/solapament descrit per Marc encara no està reproduït amb un cas concret.                   | Tasca específica de reproducció i correcció abans del redisseny.                                  |
| Cartell      | Missatge i imatge opcionals, oferta numèrica i validació transaccional ja existeixen a Comunitat.                                   | Crear el cartell global, la preferència de visibilitat i una selecció d’oferta inequívoca.        |
| Pastisseria  | Exterior retallat des d’una maqueta i interior en una imatge plana; entrada amb CSS i pastís animat. Repte diari actiu.             | Recuperar l’enquadrament complet, separar la pastissera en capes i eliminar el repte.             |
| Perfil       | Nom editable, correu de lectura i canvi de contrasenya; curs configurat en un altre formulari.                                      | Crear una entrada coherent a perfil, assignatures i preferències, també per al convidat.          |

Fonts locals: `src/pages/`, `src/forms-general.jsx`, `src/forms-resources.jsx`, `src/context.jsx`, `src/timer.jsx`, `src/audio.js`, `worker/` i `shared/`. Les observacions de Marc són requisits; la hipòtesi sobre una causa no es tracta com un error reproduït fins que se’n tingui evidència.

## Ordre d’execució

Les fases s’executen en aquest ordre. Dins de cada fase, cada tasca depèn de l’anterior. Es poden llegir referències mentre es treballa, però no s’obren dues implementacions simultànies.

| Fase                      | Resultat                                                                       | Dependència | Prioritat               |
| ------------------------- | ------------------------------------------------------------------------------ | ----------- | ----------------------- |
| F00 Preparació            | Requisits traçables, referència conservada, registre i historial               | Cap         | Feta en aquesta passada |
| F01 Errors funcionals     | Durades del temporitzador coherents i error de Comunitat investigat i corregit | F00         | Primera                 |
| F02 Controls compartits   | Desplegables, icones i selecció múltiple consistents                           | F01         | Base compartida         |
| F03 Perfil i preferències | Assignatures i preferències persistents per usuari                             | F02         | Base de dades personals |
| F04 Navegació i densitat  | Barra plegable, navegació inferior mòbil i composició més compacta             | F03         | Estructura global       |
| F05 Horari i Agenda       | Dues entrades clares i tots els tipus de dates ben representats                | F04         | Acadèmica               |
| F06 Apunts i Plusos       | Formats multimèdia i filtres personals                                         | F05         | Acadèmica               |
| F07 Notes                 | Nota i percentatge junts; editor de pesos clar                                 | F06         | Acadèmica               |
| F08 Estudi i música       | Cinc lo-fi, sense el bloc «En què treballes»                                   | F07         | Concentració            |
| F09 Comunitat i cartell   | Propostes, àmbits, cartell de fusta global i ofertes clares                    | F08         | Comunitària             |
| F10 Pastisseria           | Entrada completa, pastissera animada i recollida; sense repte                  | F09         | Visual i interacció     |
| F11 Integració            | Regressions, revisió de totes les pantalles i còpia verificable                | F10         | Tancament               |
| F12 Mode discret          | Qualificacions ocultes amb inserció de notes noves i preferència pròpia        | F03, F07    | Ampliació R24           |
| F13 Cartell compacte      | Peça petita a la barra superior, detall accessible i lliurament verificat      | F11         | Correcció R26           |

### F01 Errors funcionals

**Pastisdoro.** En repòs, desar 40 minuts ha de mostrar **40:00** immediatament, actualitzar l’anell i conservar-se després de recarregar. Canviar descans i descans llarg ha de produir el mateix comportament en la fase corresponent. Si la sessió ja ha començat, es conserva el temps actual i es mostra «Aplicar ara i reiniciar» o «Aplicar a la següent sessió». No es reinicia silenciosament una sessió activa ni es registra com a completada. Es mantenen els límits vàlids del servidor.

**Comunitat.** Reproduir el recorregut Tauler → Esdeveniments → detall → tancar → Propostes i repetir-lo després de fer scroll. Revisar posició del diàleg, bloqueig del fons, alçada de graella, elements sticky/fixed, focus i restauració del desplaçament. Provar amb zero activitats, una activitat i moltes activitats; títol llarg, contingut llarg i mòbil. Registrar el cas exacte abans de corregir. Si el problema no es reprodueix, deixar-ho indicat i ampliar els casos, sense marcar-lo com a resolt per aparença.

**Tancament:** evidència abans/després dels errors reproduïts, persistència dels minuts i cap canvi de saldo o notes personals durant la prova.

### F02 Controls compartits

Un sol sistema de desplegables: superfície càlida, icona i nom de l’opció, color d’assignatura, fletxa coherent, opció activa amb marca i focus visible. Les icones segueixen la identitat de fang existent; el text continua sent llegible i accessible.

Separar un selector d’una sola opció d’un selector múltiple d’assignatures. El primer cobreix trimestre, ordenació, estat, classe, centre, tipus de prova i formularis. El segon mostra caselles seleccionades, resum i accions «Les meves», «Totes» i «Netejar». Cercador quan la llista ho justifiqui. La selecció múltiple no tanca el menú després de cada clic.

Revisar també els desplegables de configuració i administració. Teclat: Tab, fletxes, Enter i Escape; focus de retorn; nom i valor anunciats. El menú ha de quedar dins de la pantalla, també dins d’un diàleg i amb teclat mòbil. Definir una sola escala de capes per menú, diàleg, navegació i cartell. Evitar opcions tallades o menús darrere d’un altre panell.

**Tancament:** inventari complet migrat, selecció visible sense dependre només del color i proves amb teclat, formulari, modal i mòbil.

### F03 Perfil i preferències

Entrada **El meu perfil** des de la capçalera i des de «Més» al mòbil. Àrees: dades personals, curs i assignatures, preferències de contingut i aparença. El canvi de contrasenya continua disponible per a comptes amb credencials; el convidat veu la seva condició temporal i no un formulari de contrasenya que no pot utilitzar.

Les assignatures matriculades són l’origen inicial. Apunts i Plusos poden consultar altres assignatures sense canviar el curs. «Les meves assignatures» s’actualitza si canvia la matrícula; una selecció personal explícita es conserva mentre les assignatures existeixin. Distingir el mode «Les meves», «Totes» i «Personalitzades»: una llista buida no significa indistintament cap resultat o tots els resultats.

Les preferències es desen al servidor per usuari, amb valors inicials compatibles amb els comptes existents. Cada pantalla pot conservar els seus filtres i ordenació. Cap preferència global en `localStorage` compartida entre Júlia i un convidat. Les modificacions del curs reutilitzen la validació de franges i la configuració existent; no es duplica el procés de matrícula.

**Tancament:** crear preferències, recarregar, navegar i tornar; verificar separació entre dos usuaris i canvi de curs sense pèrdua de notes.

### F04 Navegació i densitat

**Escriptori:** botó per plegar/desplegar la barra. En mode plegat es mantenen icones de fang, indicador actiu i etiqueta accessible; ajuda amb tooltip al focus i al ratolí. Marca compacta, saldo i perfil funcionals. Propostes i configuració continuen accessibles. La preferència persisteix per usuari. El contingut recupera l’espai real alliberat.

**Mòbil:** barra inferior de cinc accessos: **Curs, Apunts, Notes, Estudi i Més**. «Curs» dona accés a Horari i Agenda. «Més» conté Plusos, Comunitat, Pastisseria, Perfil i configuració. Tots els destins continuen disponibles; text curt sota les icones, estat actiu, àrees tàctils còmodes i marge per la zona segura del dispositiu. El contingut i els botons finals no queden darrere de la barra. Un menú o diàleg obert té focus controlat i el fons inactiu.

**Densitat:** crear «Còmoda» i «Compacta» al perfil. La vista compacta redueix espais, alçades i la mida dels elements decoratius de manera coherent. Provar-la com a punt de partida per a la sensació de «zoom enrere» que demana Marc. No fer servir un `transform: scale()` global ni alterar el zoom del navegador: les graelles i àrees de clic han de conservar geometria correcta. La mida de lletra mínima i el contrast continuen sent llegibles.

**Tancament:** les dues densitats, barra oberta/plegada, dispositiu vertical/horitzontal i navegació sense perdre filtres, àudio ni temporitzador.

### F05 Horari i Agenda

Nom de treball del segon botó: **Agenda**, perquè inclou exàmens, proves, tasques, lliuraments i activitats. Dos botons al mateix lloc i amb la mateixa jerarquia: **Horari / Agenda**. Es conserva la setmana/data en canviar. A l’Horari es consulten les classes; a l’Agenda es prioritzen les dates i les coses pendents, amb llista de pròxims elements i vistes de calendari quan siguin útils.

Cada element indica tipus, assignatura, data, hora si existeix, origen i visibilitat. Filtres per tipus i assignatures; «Només exàmens» continua disponible. Diferenciar una tasca personal d’un lliurament compartit. Si les tasques incorporen estat fet/pendent, la marca és personal i no modifica l’estat del grup.

Una única font d’esdeveniments alimenta Horari, Agenda i activitats de Comunitat. Una prova no és un esdeveniment duplicat amb un altre nom. L’origen d’un plus incorporat al calendari es conserva i l’acció continua sent idempotent. No s’importen els exàmens com a notes acadèmiques automàticament.

**Tancament:** dates amb/sense hora, dos esdeveniments coincidents, cap de setmana, filtre buit, tasca personal, element compartit i plus afegit dues vegades. Editar un element es reflecteix a totes les vistes on correspon.

### F06 Apunts i Plusos

**Apunts:** compositor amb opcions visibles **Text, Fotos, PDF, Vídeo i Documents**. Es poden combinar; una foto o vídeo no exigeix text llarg. Miniatures, ordre dels adjunts, estat de càrrega, errors entenedors i previsualització abans de publicar. El text buit és vàlid quan existeix contingut adjunt vàlid. Conservar esborranys i edició sense tornar a pujar tot.

Les fotos obren una galeria llegible amb ampliació. Els PDF mantenen lector i descàrrega. Els vídeos tenen portada, controls accessibles i reproducció iniciada per l’usuari; s’aturen en tancar o sortir del lector. El suport de vídeo ha de cobrir validació del fitxer al servidor, emmagatzematge, lectura parcial quan calgui per moure’s pel vídeo, i els mateixos permisos de mostra gratuïta/compra que la resta d’adjunts. Definir i comunicar un límit de mida viable abans d’ampliar l’actual de 10 MB; comprovar-lo en dispositiu real.

**Filtres:** començar en «Les meves assignatures», mostrar clarament què està seleccionat i permetre canviar-ho amb caselles. Cercador, ordenació i Desats es combinen amb la selecció. «Veure totes» ofereix sortida de qualsevol estat buit. Una preferència d’assignatures no amaga els apunts propis a l’autor sense una indicació clara.

**Plusos:** mateix component i mateixa lògica de preferències. La selecció és per assignatures, amb coincidència OR entre les seleccionades, no per font. Substituir els accessos fixos de tres matèries pels de l’usuari. Un plus multiassignatura mostra totes les seves aportacions i no canvia notes automàticament.

**Tancament:** publicació només amb foto, només amb PDF, només amb vídeo i combinada; edició i canvi d’ordre; error de càrrega; compra/mostra; canvi de filtres i separació entre usuaris. Proves d’adjunts amb D1/R2 aïllats.

### F07 Notes i pesos

En el resum, cada prova té un espai editable clar per a la nota i un petit indicador del **percentatge real d’aquella prova** al costat o sota. Això és necessari perquè la Prova 1 de Física pot tenir un pes diferent de la Prova 1 de Química. No posar un únic percentatge genèric al títol de columna. Una cel·la agregada indica que és una mitjana i permet veure les proves que la formen.

Conservar zero com a nota vàlida i buit com a pendent. El full detallat mostra nom, data, nota i pes junts. El trimestre usa el selector compartit amb l’opció activa clara.

**Editor de pesos:** una entrada per prova/activitat amb nom, categoria, data i pes. Total permanent **X/100%**, indicador explícit del que falta o sobra, previsualització de la mitjana i desament només amb el total vàlid. Afegir/eliminar prova conserva les notes restants. Cancel·lar no canvia dades. Les plantilles del delegat i la personalització de l’estudiant continuen separades; recuperar una plantilla explica l’efecte abans de confirmar-la.

**Tancament:** pesos diferents per assignatura, 0%, decimals, total incorrecte, nota 0, pendent, editar/desfer, Tab/Enter/fletxes, enganxar un bloc i CSV coherent amb el full. Es preserven les notes reals.

### F08 Estudi i cinc opcions lo fi

Eliminar el panell **En què treballes** i els seus camps visibles. El temporitzador continua registrant sessions amb una descripció genèrica; les descripcions històriques es conserven. La configuració dels minuts, resolta a F01, es presenta sense ambigüitat entre sessió actual i següent.

Substituir pluja i vent per **cinc opcions lo-fi** diferenciades. Noms de treball: **Cafè tranquil, Biblioteca, Nit suau, Tarda càlida i Núvols**. Cada opció té una icona pròpia, nom, selecció marcada i botó reproduir/pausar. Les cinc han de sonar diferents, amb transicions suaus i bucle sense clics; no són cinc etiquetes del mateix patró.

Prioritzar peces originals locals amb qualitat auditiva revisada. Si s’utilitzen enregistraments de tercers, comprovar la llicència de cada pista concreta, permís de redistribució i atribució abans d’incorporar-la, i conservar font i llicència al projecte. «Gratuït» i «open source» no substitueixen aquesta comprovació. No dependre d’una emissora externa que canviï o requereixi compte.

Un sol motor d’àudio. Sense reproducció automàtica; volum, pausa i aturada global. Canvi ràpid de pista sense superposicions. L’àudio continua en navegar, però s’atura en sortir de la sessió. Conservar les regressions de cancel·lació, arrencada fallida i pestanya en segon pla.

**Tancament:** escolta real de les cinc opcions, inici, pausa, canvi ràpid, volum zero, error, navegació i sortida. No donar per bona la qualitat musical només amb una prova automatitzada.

### F09 Comunitat i cartell de fusta

**Comunitat:** Tauler, Esdeveniments i Propostes amb graelles estables. Àmbit «La meva classe / Tot el centre» amb el selector compartit. L’àmbit controla avisos i activitats; la visibilitat de les propostes s’explica i no canvia accidentalment per reutilitzar un filtre. Propostes amb títol, cos, autor, vots, estat i resposta de l’equip; vot seleccionat i petició en curs clars. Gestió reservada als rols que ja la tenen.

**Referència del cartell:** [mostra aportada per Marc](../design/referencies-v3/cartell-fusta-original.png). Aclariment posterior, R26: és només una referència d’estil, sense obligació de copiar-ne la imatge o les vores. La superfície clara es dibuixa amb CSS, amb text real de l’aplicació. El títol es retalla a una línia; el missatge i la foto complets es consulten dins del detall.

Un únic component global mostra el cartell vigent a Horari/Agenda, Apunts, Plusos, Notes, Estudi, Comunitat i Pastisseria. R26 substitueix la ubicació inicial: peça de 236 × 44 px a la barra superior, sense fila dins del contingut. A 1100 px o menys queda una icona de 44 × 44 px. No tapa graelles, selectors, diàlegs ni el pastís que s’està recollint. El detall utilitza el diàleg compartit i retorna el focus al botó d’origen.

Interpretació de «mostrar-te o no»: incorporar **mostrar/amagar el cartell** com a preferència del lector. En plegar-lo queda un accés petit «Cartell» per tornar-lo a obrir. Per al nom de l’autor, preparar separadament l’opció de signatura visible o missatge sense signatura pública; la identitat real continua disponible per a moderació. Aquesta segona opció és una proposta de comportament, pendent de confirmar si Marc només es referia a la visibilitat del cartell.

**Ofertes:** imports ràpids calculats sobre el mínim real, amb marca de selecció, contorn i text **Oferta seleccionada: X pastissos**. Es manté l’import personalitzat. Mostrar cost, saldo actual i saldo resultant. El botó final diu **Publicar per X pastissos**. Un primer missatge de 10 ha de quedar marcat com 10; si el mínim vigent és superior, 10 no es presenta com a oferta vàlida.

La validació i el cobrament continuen sent atòmics al servidor. Si un altre usuari canvia el cartell durant l’edició, es conserva l’esborrany, s’actualitza el mínim i es demana revisar l’import; no es cobra una oferta antiga. Doble clic no crea dos càrrecs. Es conserva la regla vigent de doblar el valor actual i la depreciació diària; canviar-ne l’economia queda fora d’aquesta revisió.

**Tancament:** cartell de text/imatge/combinat, mostrar/plegar/restaurar, totes les pantalles, títol llarg, mòbil, oferta de 10 quan és vàlida, oferta personalitzada, saldo insuficient, dos usuaris simultanis i càrrec únic. Les proves de cobrament s’executen en dades aïllades.

### F10 Pastisseria

**Exterior complet:** revisar l’enquadrament i el retall del recurs actual. La casa, el rètol, la porta i el terra no queden tallats. Fer servir proporció reservada i enquadrament complet en lloc de forçar `cover` dins d’una caixa incompatible. Separar la imatge dels botons i del fons del panell; cap etiqueta dibuixada duplicada sota un botó real.

**Entrada:** porta que respon, acostament breu i transició a l’interior. No deformar tota la pàgina ni perdre el focus. El moviment reduït fa un canvi directe amb la mateixa funcionalitat.

**Pastissera:** preparar personatge i escenari en capes independents coherents amb l’art aprovat. Accions mínimes: espera suau, gir cap al forn, agafar/preparar el pastís, acostar-lo i oferir-lo. Provar primer una animació per capes/sprites amb moviment real de braços/cos; si no assoleix el gest, preparar un personatge 3D animable. Moure una fotografia rectangular sencera no compleix el requisit. Es decideix la tècnica segons el resultat visual, la càrrega i el rendiment al mòbil.

**Recollida:** seqüència explícita **Entrar → la pastissera prepara i ofereix → Agafa el pastís → confirmació del servidor → el pastís va al saldo → estat recollit**. El pastís preparat no acredita saldo abans de prémer el botó i confirmar l’API. Si falla, es pot reintentar. Si ja s’ha recollit, la pastissera saluda i el botó ho indica. Sortir durant l’animació cancel·la els efectes pendents; recarregar no duplica la recompensa.

**Eliminar el repte diari:** retirar racó secret, clau, pregunta, formulari, crides i textos explicatius. Desactivar els endpoints de repte; conservar els moviments històrics i els pastissos ja guanyats. La recompensa del forn continua sent una al dia. Actualitzar instruccions i comprovacions que encara facin referència al repte.

**Tancament:** exterior complet a totes les mides, pastissera amb gest recognoscible, botó final, animació del pastís fins al saldo, error/reintent, estat ja recollit, sortida a mitja animació, segon clic i moviment reduït. El repte no és accessible per la interfície ni per una crida antiga.

### F11 Integració i lliurament

Recorregut complet com a convidat, estudiant, delegada i administrador segons les accions de cada rol. Perfil → assignatures → filtres → publicació → lectura → Agenda → Notes → Estudi → Comunitat → cartell → Pastisseria. El curs i els saldos anteriors es comparen abans i després; les proves destructives o de cobrament es fan en dades aïllades.

Captures de totes les pantalles i estats modificats a **320, 390, 760, 1024, 1280 i 1586 px**, amb finestres baixes i orientació horitzontal quan afecti la composició. Barra plegada/desplegada, densitat compacta/còmoda, cartell visible/plegat, menú/diàleg obert i moviment reduït. No cal provar totes les combinacions possibles: sí cada límit de layout i les interaccions que comparteixen capes o espai.

Revisar accessibilitat amb teclat, contrast, text llarg, estats buits, càrrega/error i focus. Cap scroll horitzontal exterior; taules amb desplaçament intern i cap botó final ocult. Revisar ús de memòria/àudio i càrrega dels recursos nous al mòbil.

Executar les comprovacions afectades durant cada fase i la suite integrada al final: domini/SQLite, API D1/R2, tipus, lint, build i dry-run de Cloudflare. El dry-run no publica. Guardar resultats, captures, diferències pendents, llicències i un ZIP amb manifest SHA-256 i instruccions d’obertura. No afirmar identitat visual o funcionament perfecte sense l’evidència corresponent.

## Decisions ja resoltes i decisions de detall

| Punt                    | Decisió                                                                                                                                                                          |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Configuració personal   | **Perfil**, confirmat per Marc; inclou assignatures i preferències.                                                                                                              |
| Referència visual       | Es conserva la identitat aprovada. Els canvis nous prevalen en els elements indicats.                                                                                            |
| Segon botó del curs     | «Agenda» com a nom de treball per reunir exàmens, proves, lliuraments i tasques.                                                                                                 |
| Música natural          | Retirar pluja i vent de les opcions noves; cinc lo-fi diferenciats.                                                                                                              |
| Tasca del Pastisdoro    | Eliminar el panell visible i conservar el registre històric.                                                                                                                     |
| Repte de la pastisseria | Eliminar-lo i conservar els saldos històrics.                                                                                                                                    |
| Cartell                 | Fusta de la imatge adjunta, component global i control per mostrar-lo/plegar-lo.                                                                                                 |
| Nom públic al cartell   | Es conserva l’autor visible. «Mostrar-te o no» es resol amb mostrar/amagar el cartell; no s’afegeix anonimat sense una petició específica. Identitat disponible per a moderació. |
| Densitat                | Dos modes de layout; decidir el valor inicial després de comparar captures.                                                                                                      |
| Vídeo i animació        | Límit de fitxer i tècnica de personatge es decideixen després d’una prova funcional/visual.                                                                                      |

## Com es mantindrà l’historial

Cada entrada inclou data d’Europa/Madrid, ID de tasca, canvi abans/després, fitxers modificats, proves amb resultat, captures o altres evidències, i qüestions pendents. Una tasca pendent continua pendent encara que tingui disseny o codi parcial. No es modifiquen els totals d’una verificació antiga per fer-los coincidir amb proves noves.

Si Marc afegeix una indicació, primer s’incorpora al registre amb ID i s’explica quina decisió substitueix. Després es reordenen les dependències si cal. Això permet reprendre la feina sense tornar a decidir el que ja estava acordat ni oblidar una correcció.

## Ampliació demanada el 10 d’octubre de 2026

R24: mode discret de Notes. Un control amb icona d’ull oculta qualificacions, mitjanes i aportacions sense amagar proves, dates ni pesos. **Decisió d’UX aplicada:** els valors desats no es renderitzen als camps; només la nova entrada és visible mentre s’edita i torna a quedar oculta en desenfocar. El mode també s’aplica al detall, l’editor i la previsió. Preferència pròpia desada al perfil. L’exportació real avisa abans de descarregar. Zero, decimal, teclat, desfer, recàrrega i mòbil verificats. És privadesa visual i no modifica permisos ni xifrat.

R25: Marc autoritza publicar la versió verificada. Es comprova l’allotjament Cloudflare configurat i es desplega després de la integració; qualsevol dependència externa real queda documentada.

R26: cartell d’anuncis **molt més petit i ben situat**, amb la foto com a exemple. F13 ordena redisseny → verificació → publicació i ZIP, sense tasques actives simultànies. Màxim 236 × 44 px a l’escriptori, icona de 44 px en pantalles estretes, miniatura de 30 px, text complet en diàleg i mostrar/amagar persistent sense moure el contingut. Es comproven les set seccions a sis amplades i dues densitats, i el cas de música i temporitzador actius a 320 px. Es mantenen les regles d’ofertes i els permisos.

R28: interfície més neta, amb menys acumulació. [PLA-UI-CLEAN.md](PLA-UI-CLEAN.md) defineix cinc passos consecutius: diagnòstic, estructura comuna, jerarquia de les set seccions, verificació i publicació/còpia. El registre passa a 28 requisits, 16 fases i 67 tasques. Cada dada es presenta una vegada, les opcions avançades es despleguen a petició i es conserven art, funcions i preferències. Les comprovacions públiques R28 són de només lectura. Posteriorment Marc ha autoritzat explícitament la restauració del convidat tècnic de T14-06: nota sintètica a pendent i mode discret activat, comprovats després de recarregar.


R29: millorar l’animació de la pastisseria segons la petició de Marc del 10 d’octubre. [PLA-PASTISSERIA-ANIMACIO.md](PLA-PASTISSERIA-ANIMACIO.md) ordena diagnòstic → escena → verificació → publicació i còpia en quatre tasques F16, amb 29 requisits, 17 fases i 71 tasques totals. Preparació de 20,1 segons, set segons de cocció abans de recollir, més gestos, cames darrere del taulell i acció al costat del personatge. Les imatges originals es conserven. La prova de recollida es fa en una base local aïllada; la revisió pública observa la preparació sense concedir recompenses de prova.

R30: centrar la caseta exterior i retirar-ne el fons, segons la captura de Marc. [PLA-PASTISSERIA-EXTERIOR.md](PLA-PASTISSERIA-EXTERIOR.md) ordena diagnosi → retall i marc → verificació → publicació i còpia, amb una sola tasca activa. El registre passa a 30 requisits, 18 fases i 75 tasques. El límit d’alçada es trasllada a un marc centrat amb proporció reservada; imatge, porta i vapor comparteixen coordenades. El retall transparent es genera amb imagegen i l’original es conserva. Es comproven mòbil, escriptori, barra plegada, finestres baixes i entrada/sortida; la seqüència interior i les regles de recompensa no canvien.

R31: cartell una mica més gran, més fusta, imatge sola a tota la superfície, text gran i retallador molt visual. [PLA-CARTELL-VISUAL.md](PLA-CARTELL-VISUAL.md) ordena diagnosi → API/geometria → interfície → verificació → publicació i còpia. El registre passa a 31 requisits, 19 fases i 80 tasques, amb una sola tasca activa. Aquesta petició substitueix les dimensions i la miniatura de R26: 272 × 56 px, superfície útil 65:11, formats explícits i editor amb pan, zoom, nanses, teclat i imatge sencera. El PNG final comparteix la selecció de la previsualització. Les publicacions, cobraments i conflictes es proven en una base local aïllada; producció es comprova en lectura. Es conserven el detall, mostrar/amagar, la resta de la plataforma i les regles d’ofertes.

## R32 · Selectors de vista visuals

La petició de Marc del 10 d’octubre substitueix el subratllat de R28 per una base agrupada i una única opció emplenada amb contorn. Horari/Agenda incorporen icones; el component compartit manté la coherència de les altres seccions. [Pla i límits](PLA-SELECTORS-VISUALS.md). F19 té tres tasques consecutives; total de 32 requisits, 20 fases i 83 tasques, amb una sola activa.


R90: horaris oficials BAT2 2026–27 a partir del PDF aportat per Marc. [Pla d’horaris](PLA-HORARIS-OFICIALS.md): transcripció revisada → migració de catàleg → selector visual i enllaços → proves locals → còpia privada, PR/CI i publicació. Tres itineraris, optatives i professorat segons el cas; 208 combinacions completes, 30 hores setmanals i conservació de qualificacions i referències. Tasques T74-01 i T74-02 en seqüència, una sola activa, fase F74.

R115: Marc confirma el 17 d’octubre de 2026 que Química també és una alternativa a Dibuix/Empresa al tecnològic, amb les mateixes quatre franges. Aquesta correcció amplia el catàleg de R90 a 272 combinacions; no canvia el resultat històric de la primera transcripció. [Pla i evidències](PLA-QUIMICA-TECNOLOGIC.md), tasca única T90-01. Les seleccions i notes actuals es conserven; l’identificador antic i retirat de Química no es reutilitza.

R116: icona pròpia de representants amb bafarada per identificar el panell de delegats al menú lateral, al mòbil i a la capçalera. Tasca única T91-01; revisió visual amb fixtures locals i regressions de navegació per a alumnes, delegats i subdelegats.

R117: per indicació de Marc del 17/10/2026, evitar PRs i peticions de revisió per als canvis propis. Excepció de PR només per al compte propietari, CI obligatòria sobre el commit exacte i incorporació directa sense force push. Les contribucions externes continuen requerint PR i revisió de Marc. [Flux vigent](FLUX-PROPIETARI.md), tasca única T92-01.

R118: nova depuració a fons amb simulacions locals d’alumnes, delegats i subdelegats. Desaments lents, recuperació d’errors, esborranys, navegació, controls i disposició mòbil/escriptori. Correccions agrupades amb regressions, CI completa i incorporació directa segons R117. [Pla, fallades i evidències](PLA-DEPURACIO-INTEGRAL.md), tasca única T93-01.
