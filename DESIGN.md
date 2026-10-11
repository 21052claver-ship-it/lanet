# La Net — criteris visuals i funcionals

Actualitzat el 10 d’octubre de 2026. Taller depurat i les set pantalles aprovades defineixen la identitat. Les correccions de Marc del 9–10 d’octubre prevalen en els elements modificats. [Pla i decisions](docs/PLA-MESTRE.md), [historial](docs/HISTORIAL-CANVIS.md) i [verificació](docs/VERIFICATION.md). La versió anterior es conserva a `docs/historic/`.

## Identitat

- Ivori càlid `#FBF8F4`, superfícies quasi blanques `#FFFDFA`, carbó `#3C3430` i albercoc `#F0C6A5`.
- Nunito/Nunito Sans locals, cantonades suaus, ombres càlides, acabat mat i art de fang original. Els noms, les xifres i els textos dels mockups són exemples; les dades reals no es forcen a coincidir-hi.
- L’art gran es reserva per a la Pastisseria. Les icones petites donen identitat a la navegació i als controls.
- Cada anunci permet triar «Amb el meu nom» o «Anònim» amb ràdios natives, icones i estat seleccionat préssec. La signatura es previsualitza fora de la peça de fusta i es mostra al detall. En mode anònim, nom i identificador del compte queden fora de la resposta pública; també es protegeixen les etiquetes accessibles i el nom de descàrrega. La selecció es conserva en canviar format, retall o revisió d’oferta.
- Els colors d’assignatura es combinen amb text i símbols. Un estat essencial no depèn només del color.
- Respostes animades breus i moviment reduït respectat. Les graelles acadèmiques romanen quietes mentre s’editen.
- `src/clean.css` concentra la simplificació de la plataforma; `src/bakery.css`, `src/board.css`, `src/tabs.css` i `src/art-polish.css` concentren les revisions de pastisseria, cartell, selectors i transparència. Els components compartits eviten variants per pantalla.
- Pastís, megàfon i document utilitzen PNG amb alfa real i composició normal, sense requadres del mockup ni enfosquir els blancs. El mateix pastís apareix al saldo, preus, moneder i menú; el Pastisdoro conserva la seva identitat daurada. S’han creat variants amb ImageGen a partir de les referències, amb originals i prompts conservats. No s’afirma identitat de píxels per a aquestes variants. Enquadrament compartit a `src/transparent-art.json`, amb marge per conservar els contorns.

| Assignatura  | Color     |
| ------------ | --------- |
| Matemàtiques | `#DCE8F4` |
| Química      | `#F2DCDF` |
| Castellà     | `#E4EAD5` |
| Física       | `#E6DDF0` |
| Català       | `#F5E2D5` |
| Anglès       | `#F2ECD5` |
| Història     | `#EFE5D7` |
| Filosofia    | `#E8DFE8` |

## Navegació, perfil i controls

Horari i agenda, Apunts, Plusos, Notes, Estudi, Comunitat i Pastisseria comparteixen la mateixa estructura. Barra plegable a l’escriptori, densitat compacta/còmoda i capçalera visible amb context, saldo, avisos i perfil. En mòbil, Curs/Apunts/Notes/Estudi/Més formen la barra inferior; Més obre la resta de seccions.

La barra desplegada conserva les set seccions, un accés discret a Proposa una idea i El meu perfil. Veure propostes és dins de Comunitat i Configurar curs és dins del perfil. La capçalera presenta el curs en una sola línia, el cartell petit, el saldo i el compte. El professorat és informació del curs; no té comptes ni tasques específiques. Horari és la vista inicial per a un usuari nou.

Una acció principal per context; la resta utilitza menys contrast o un desplegable Opcions. Menys ombres, fons acolorits i caixes dins de caixes. Els selectors de vista comparteixen una base neutra agrupada; només l’opció activa té fons préssec, contorn marró i ombra lleu. Horari/Agenda incorporen rellotge/calendari. El hover és discret, el focus queda visible dins del botó i les fletxes/Inici/Final conserven el canvi de vista. Mínim 44 px per botó, amplada principal limitada a 300 px o a l’espai disponible; grups llargs es desplacen dins del control. La densitat compacta redueix espais i la còmoda els amplia. [Selectors visuals](docs/PLA-SELECTORS-VISUALS.md) i [simplificació](docs/PLA-UI-CLEAN.md).

El perfil desa nom, assignatures habituals d’Apunts i Plusos, densitat, barra, cartell i mode discret. Matrícula i variants de curs tenen una configuració separada. Les preferències són personals; un canvi parcial no sobreescriu altres canvis concurrents.

Select és l’únic desplegable: icona, etiqueta, marca activa, teclat, cerca i posició dins de la finestra. Escape tanca primer el menú i després el diàleg; el focus retorna al botó d’origen. El menú mòbil reté el focus i restaura el scroll en tancar. Saltar al contingut conserva la ruta.

## Horari i Agenda

Dos botons visibles amb la mateixa importància. Horari presenta les classes i els exàmens sobre les franges corresponents. La configuració detecta variants incompatibles i conserva les franges reals.

Agenda reuneix exàmens, tasques, lliuraments, activitats i recordatoris amb Llista/Setmana/Mes, filtres per assignatura i tipus, progrés i exportació `.ics` Europe/Madrid. Els actes sense hora pertanyen al seu dia; no se’ls inventa una franja. La vista i els filtres es conserven per compte en el navegador.

Un mateix acte té una única font. Les activitats incorporades des de Plusos no es dupliquen. El progrés d’una tasca és personal, també quan l’acte és compartit. Els permisos respecten autoria, grup i matrícula. El detall s’obre en un diàleg i retorna el focus en tancar.

## Apunts i Plusos

Apunts combina text, fotos, PDF, vídeo MP4/WebM i documents. Galeria ampliable, PDF amb pàgines, zoom i descàrrega, i vídeo natiu que s’atura en tancar. Altres documents es descarreguen amb format i nom visibles. Vídeos fins a 25 MB; altres formats fins a 10 MB, amb signatures i permisos verificats al servidor.

La publicació té títol, assignatura amb icona, resum, text opcional i adjunts ordenables. N’hi ha prou amb text o un adjunt. Esborrany, mostra gratuïta, preu i desbloqueig corresponen a la publicació sencera. Un like o una lectura no es multiplica per cada foto. Donar like és gratuït; l’autorecompensa i les recompenses repetides estan bloquejades.

Apunts i Plusos tenen preferències d’assignatura independents. El filtre desplega una regió dins de la graella, sense tapar targetes: seguir la matrícula o triar assignatures amb icona i desar. Diverses assignatures coincideixen amb OR. Una selecció buida és explícita, amb estat buit i acció per recuperar contingut. Cerca tolerant a accents i apòstrofs. Cerca, ordre i assignatures comparteixen una franja que s’adapta al mòbil.

Les targetes d’apunts mostren un sol títol i un resum de dues línies. Només fotos i PDF generen miniatures reals; els apunts de text no tenen una falsa previsualització que repeteixi el contingut. Autor i format comparteixen línia; Llegir apunt té menys pes visual que publicar. Les targetes de Plusos conserven l’art original petit, amb condicions completes al detall.

Plusos conserva targetes verticals, dates, condicions i bonificacions per assignatura. Qualsevol estudiant pot publicar-ne. El Plus indicat és informació compartida i no modifica una nota acadèmica. Likes, desats i afegir a Agenda tenen una resposta clara i no es dupliquen.

## Notes i mode discret

Resum amb una assignatura per fila, proves editables, mitjana i percentatge avaluat. Cada prova mostra el seu pes real sota la nota. Si una cel·la agrega diverses activitats, obre el detall. El selector Full de notes reuneix Resum i totes les assignatures; el trimestre utilitza el mateix control compartit. Configurar avaluació és l’única acció principal i obre l’editor existent; CSV, objectiu, restauració i ajuda de teclat són a Opcions. Desfer apareix quan hi ha una acció disponible.

El detall mostra nom, data, nota, pes i aportació; en mòbil es presenta per targetes. El resum es desplaça internament i conserva una columna d’assignatura estreta. L’editor exigeix 100%, mostra el total i permet repartir igual, ajustar proporcionalment o completar el restant sense perdre notes.

Zero és una nota vàlida; buit és pendent. La mitjana provisional divideix la suma ponderada pel pes ja avaluat. Els decimals només s’arrodoneixen en presentar. Notes privades, escrits serialitzats, Tab/Enter/fletxes, enganxat de blocs i Desfer. No s’obre l’editor mentre s’estan desant notes, per evitar una captura antiga.

Si falla el desament, una indicació càlida marca les entrades pendents i ofereix Reintentar desament sense mostrar-ne el valor en mode discret. Es conserven mentre es navega dins de la sessió; Desfer només consumeix l’acció confirmada. El missatge distingeix una escriptura fallida d’una escriptura confirmada pendent de sincronitzar.

**Mode discret:** switch persistent amb ull i estat Activat/Desactivat. Els valors guardats no es renderitzen als inputs; es mostren punts o Afegir. Només la nova entrada és visible mentre s’edita i torna a quedar oculta en desenfocar. Enfocar no revela la nota anterior. Suprimir buida explícitament i Desfer restaura el valor anterior.

Mitjanes, aportacions, modal de pesos i previsió respecten el mode. Dates, pesos, progrés i objectiu desitjat continuen visibles. El CSV avisa abans de descarregar valors reals. El mode és privadesa visual; els permisos del compte continuen protegint les dades.

## Estudi

Nom exacte Pastisdoro. Minuts de treball, descans, descans llarg i rondes configurables. En repòs, desar actualitza el temps; amb una sessió activa es tria aplicar ara o a la següent. El temporitzador persisteix i no registra dues vegades la mateixa sessió.

Panell En què treballes retirat, amb historial conservat. Cinc composicions lo-fi originals amb icones diferents, selecció marcada, volum, pausa i aturada global. Música voluntària, un sol reproductor, cancel·lació de canvis ràpids i alliberament en sortir de la sessió. No hi ha pluja ni vent entre les opcions noves.

Temporitzador i Inicia concentren l’atenció. La durada configurada ocupa una sola línia; Canviar ambient desplega les cinc músiques quan es necessita i es tanca en seleccionar, retornant el focus. Només la pista actual apareix inicialment.

## Comunitat i cartell

Avisos i esdeveniments filtrats per classe/centre. Propostes globals amb cerca, ordre, estat, un vot per usuari i resposta de l’equip. Formularis i detalls respecten les capes de diàleg; cap contingut es fixa al capdamunt de la graella.

Cartell global discret a la barra superior: 272 × 56 px a l’escriptori i amplada flexible amb 44 px d’alçada al mòbil. Fusta càlida amb veta vectorial i un marc de 5 px. **Només imatge**, **Text gran** o **Imatge i text** ocupen tota la superfície útil; autor i context es consulten al detall. La foto aportada per Marc és una mostra d’estil. El text curt arriba a 26 px; s’ajusta fins a 12 px i el text llarg es resumeix visualment amb punts suspensius, mantenint-se complet al detall. Si música i temporitzador funcionen alhora en una pantalla de 400 px o menys, el cartell conserva un accés de 44 × 44 px per evitar solapaments.

El retallador mostra tota la foto i una finestra de proporció **65:11**, amb guies, quatre cantonades, arrossegament, zoom d’1 a 6 i teclat: fletxes, Majúscules per a passos grans, +/− i Inici. La previsualització queda immediatament sota la selecció. **Imatge sencera** conserva la foto completa, amb fusta als marges lliures. PNG/JPG/WebP, fins a 10 MB i 40 megapíxels; la foto original queda al navegador i només es puja el PNG final de 1560 × 264 en publicar. Un anunci d’imatge sola no exigeix títol. Els anuncis antics mostren la foto ocupant la superfície amb un enquadrament centrat; les regles d’ofertes es conserven. En el format combinat, el fons fosc queda només darrere de les lletres. [Pla del cartell visual](docs/PLA-CARTELL-VISUAL.md).

El cartell es manté sempre visible i no disposa de control per amagar-lo. L’oferta inicial mínima és d’un pastís. Escape i tancament retornen el focus al botó d’origen. Previsualització amb la mateixa mida, import seleccionat amb marca, cost, saldo resultant i bloqueig amb saldo insuficient. Si canvia el cartell, es conserva l’esborrany i s’exigeix revisar el mínim nou. Un únic càrrec atòmic al servidor.

## Pastisseria i economia

Exterior complet a proporció 3:2, centrat amb marges automàtics i un PNG amb alfa real. La caseta conserva la base de gespa i es mostra sobre el fons de la pàgina, sense rectangle verd. La porta HTML i el vapor comparteixen el marc de la imatge; la mida s’adapta a l’amplada i a l’alçada disponible sense retallar. L’original opac es conserva i el retall generat es desa com una versió nova, amb prompt i comprovació d’alfa. Interior en un únic sistema de coordenades SVG amb una il·lustració coherent de la pastissera darrere del taulell. Mans recolzades, cos sencer integrat i peus ocults de forma natural; cap articulació, salutació, respiració simulada o caminada. Taulell central lliure de gerro, estris, maduixes i drap. Cinc estats durant 7,2 segons: escalfor, quatre segons de cocció amb massa que puja, repòs i aparició suau del pastís al costat de les mans. Porta fixa. Seqüència i CSS comparteixen durades; la presentació acaba abans d’habilitar el botó. Preparar no acredita saldo.

Entrar espera els recursos, manté una transició de 650 ms i es pot cancel·lar. L’interior apareix en 450 ms. La seqüència i els moviments es pausen quan la pestanya queda oculta; es reprenen amb el temps restant. Els estats accessibles descriuen la preparació, la cocció i el pastís disponible. **Agafa el pastís** apareix dins de l’escena, a la dreta de la pastissera, només quan el pastís està acabat. Manté almenys 48 px d’alçada en mòbil, sense tapar cara, pastís ni estat. Confirma el servidor abans d’animar el vol de 1,65 segons des del pastís real fins al saldo, amb finalització única. Sortir sempre està disponible a la capçalera de l’escena i retorna el focus a Entrar. Un pastís per dia Europe/Madrid; doble clic, recàrrega o dos intents simultanis no dupliquen la recompensa. Sortir cancel·la els efectes. Moviment reduït ofereix directament; si ja s’ha recollit, l’escena queda quieta amb la confirmació.

Repte diari retirat de la interfície i de l’API; taula, moviments i recompenses històriques conservats. Compres, likes, consultes i cartell mantenen les regles del README i les garanties de base de dades. Recàrregues amb diners fora d’aquesta fase.

L’escena conserva la imatge completa. Saldo i estat del pastís del dia comparteixen un panell; els accessos a la cartera i a guanyar pastissos són discrets, i els moviments recents es despleguen a petició.

## Referències i diferències

`design/pantalles-v1/`, revisions de calendari/apunts/plusos/notes/comunitat a `design/pantalles-v2/`, i fusta original a `design/referencies-v3/`. [Art original](design/RECURSOS-ORIGINALS.md) i [recursos nous, prompts i llicències](design/RECURSOS-V3.md).

No es certifica igualtat de tots els píxels: contingut real, rasteritzat de fonts, densitats, nous controls i escena animada introdueixen diferències. Les captures actuals i els límits concrets són a l’informe de verificació; els comparadors anteriors es conserven com a evidència històrica.

## Google Sign-In · R38

Botó amb G oficial de quatre colors, blanc i contorn suau; estat de càrrega i text explícit quan falten credencials. El perfil mostra la foto circular amb inicials de fallback, nom i cognoms separats. Els comptes Google sense contrasenya no mostren el formulari de canvi de contrasenya. Noms personalitzats es conserven en entrades posteriors; la foto s’actualitza. No s’exposa la foto als anuncis anònims.

Els 78 recursos d’art i pastisseria comprovats segueixen idèntics. La UI s’ha comprovat amb SSR; verificació visual/interactiva i OAuth real pendents dels permisos. Evidències: output/google-auth/.

## Cartell permanent · R39

El cartell conserva mida, ubicació compacta, textura de fusta, imatge retallada i identitat opcional. Es retiren els controls d’ocultació i el CSS de restauració. La preferència antiga showBoard=false no canvia el render ni elimina altres preferències. Oferta inicial d’1 pastís, singular correcte i quatre imports ràpids inicials: 1, 2, 5 i 10.

## Avaluació per assignatura · R40

El resum presenta els tres exàmens principals. Activitats apareix quan té pes o qualificacions; els grups de redaccions, entregues i presentacions es despleguen al detall i als editors. Un component compartit manté coherència entre estudiants i delegats. Nou caselles opcionals amb pes zero; Repartir igual exclou les buides. Els pesos admeten decimals sense perdre el punt intermedi mentre s’escriu. Mode discret amb valors desats fora del markup. Els percentatges inicials són orientatius i editables.

## Benvinguda i inici de sessió · R41

Llenç ivori, tipografia Nunito, accent préssec i detalls sàlvia. Marca original a la capçalera. Composició amb presentació i art a l’esquerra, formulari a la dreta; una columna en mòbil. Sense panells flotants ni opcions de preparació inactives. Registre i recuperació comparteixen camps, focus i estats. La càrrega, la connexió fallida i els avisos de retorn Google segueixen la mateixa composició; l’avís de Google queda dins del formulari, sense tapar la capçalera.

Il·lustració nova generada amb **image_gen integrat**, sense modificar l’art aprovat: [PNG](public/images/welcome-study-v1.png), [WebP](public/images/welcome-study-v1.webp), [prompt final](design/welcome-study-v1-prompt.txt). 1536×1024, alfa real i WebP sense pèrdua: 733084 bytes; píxels visibles i alfa idèntics al PNG. La vista mòbil selecciona una font transparent mínima i oculta l’art.

Camps de 48 px i text de 16 px; control de contrasenya de 44 px. Les onze parelles de text declarades superen contrast 4,5:1, contorn de camp 3.08:1 i focus 4.06:1. És una comprovació matemàtica, no una certificació completa d’accessibilitat o responsive de navegador.

## Pastisseria simple · R42

Il·lustració sencera de la pastissera amb mans recolzades, sense cap extremitat retallada o animada. El taulell central queda lliure: s’han retirat flors, estris, maduixes i drap. El pastís se situa al costat de les mans i recolza sobre la fusta. Només es mouen l’escalfor dins del forn, el creixement del pastís i una aparició final de sis unitats SVG. Cap moviment repetitiu quan ja està recollit.

Recurs editat amb **image_gen integrat**: [PNG](public/images/bakery-simple-v1.png), [WebP](public/images/bakery-simple-v1.webp), [prompt final](design/bakery-simple-v1-prompt.txt). 1536×1024, 1285864 bytes en WebP sense pèrdua de píxels. Els originals aprovats es conserven. S’han eliminat 18 regles antigues del personatge; les altres 275 regles de revision.css són idèntiques.

La seqüència passa de catorze a cinc estats de preparació i de 16 a 7,2 segons. El forn cou durant quatre segons abans de presentar i habilitar el pastís. Botó de 48 px al costat del taulell. Proves offline amb límits explícits, sense acreditar reproducció real en navegador.
