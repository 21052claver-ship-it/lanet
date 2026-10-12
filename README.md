# La Net

Plataforma local completa per a estudiants de segon de batxillerat. Interfície en català, estil **Taller depurat**, frontend React i servidor Cloudflare Workers amb **D1** i **R2**. Un mateix servidor gestiona les dades en local i al núvol.

**[La Net publicada](https://lanet.es)** — aplicació pròpia `lanet` al compte actual de Cloudflare, amb **Google com a única entrada** i altes restringides a **@fje.edu**. Nom, cognoms i foto sincronitzats des de Google; la identitat no es pot editar a La Net. Entrada Google real, nom, cognoms i foto comprovats. Exterior i interior de la pastisseria amb transparència real, revisats en mòbil i escriptori. [Desplegament i comprovacions públiques](docs/PUBLICACIO.md).

## Codi i versions

[Repositori públic](https://github.com/21052claver-ship-it/lanet) · [Versions publicades](https://github.com/21052claver-ship-it/lanet/releases) · [CHANGELOG](CHANGELOG.md).

**Vols proposar una millora?** Fes un fork i envia una pull request a `main`; Marc revisa i accepta les propostes amb les proves automàtiques correctes. [Guia per contribuir](CONTRIBUTING.md).

GitHub comprova cada push/PR. `npm run release` publica el commit exacte després de CI verda a Cloudflare Pages, crea Deployment a GitHub i una release immutable amb tag i rebut JSON. La publicació s’executa amb les sessions locals existents; no es publica automàticament cada push ni es desen secrets personals de Cloudflare a GitHub. [Flux de versions](docs/VERSIONS.md).

## Actualització del 12 d’octubre de 2026

**Més complet · 0.2.1:** els vuit apartats en dues files sobre la barra inferior, icones, focus contextual i perfil/propostes. Verificat a 320 px i paisatge en tres navegadors. [Release](https://github.com/21052claver-ship-it/lanet/releases/tag/v0.2.1) · [Pla](docs/PLA-MES-COMPLET.md).

**GitHub i versions:** publicada [0.2.0](https://github.com/21052claver-ship-it/lanet/releases/tag/v0.2.0), amb CI correcta, tag/release immutable, rebut verificable i Deployment vinculat a Cloudflare. Main protegida, secret scanning i dependències monitorades. [Registre](docs/releases/0.2.0.json).

**Navegació mòbil:** Més obre una graella 2×2 sobre la barra inferior, amb icones, secció activa, perfil i propostes. Tancament ràpid, teclat i safe areas. 318 unitàries, 9 escenaris nous, 48 responsive i 135 generals correctes. [Pla](docs/PLA-NAVEGACIO-MOBIL.md).

## Actualització de l’11 d’octubre de 2026

**Retenció mínima dels anuncis:** imatges substituïdes eliminades de R2, cinc imatges històriques ja retirades, quotes per compte i bloqueig temporal d’allaus o fitxers prohibits repetits. Esborranys nous amb caducitat, cache de moderació sense píxels i neteja privada programada cada minut. 318 proves unitàries, 62 fluxos API amb D1/R2 locals, 18 escenaris nous, 36 de seguretat d’adjunts, 12 de pujades ràpides, 135 controls generals i 5 comprovacions del servei privat desplegat; tipus, lint i compilació correctes. [Pla i límits](docs/PLA-RETENCIO-ANUNCIS.md).

**Prediccions A/B a la sala secreta:** qualsevol usuari crea una pregunta amb termini i responsable; acceptació prèvia, aposta mínima d’1 pastís, pot comú i repartiment proporcional exacte. Responsable sense aposta pròpia, resolució justificada, retorns per anul·lació/caducitat i recuperació de peticions sense duplicats. 299 proves unitàries, 58 fluxos API D1/R2, 18 escenaris de prediccions, 36 de ruleta, 135 controls generals, 48 responsive i 6 perfils visuals correctes; tipus, lint i compilació correctes. [Pla i regles](docs/PLA-PREDICCIONS.md).

**Música Focus:** vuit discos instrumentals nous, 131.2 minuts de textures ambient i pols suau, incloses cinc sessions de 16–30 minuts. Filtre Focus amb descripcions, 25 peces i 8 estils, llicència CC BY 4.0 i àudio local a demanda. Pausa superior i reproducció seguida conservades. 284 proves unitàries, 52 fluxos API, 39 escenaris musicals, 48 responsive i 135 controls generals correctes; tipus, lint, compilació i descodificació completa correctes. [Pla i fonts](docs/PLA-MUSICA-FOCUS.md).

**PAU centrada en universitats:** top 5 privat i ordenat, selecció sense notes PAU i comparació de graus/campus. Calculadora secundària. Orientació amb notes actuals, pesos i plusos, percentatge del tall històric cobert i marge de punts; escenari provisional, no probabilitat d’admissió. 284 proves unitàries, 52 fluxos API locals, 24 escenaris nous del top 5, 39 casos de regressió PAU, 48 escenaris responsive i 135 controls generals correctes en Chromium, Firefox i WebKit; tipus, lint i build correctes. [Pla i hipòtesis](docs/PLA-PAU-TOP5.md).

**Pujades més ràpides:** tres adjunts simultanis, progrés i recuperació d’errors parcials; còpia lleugera per al filtre visual, cache privada d’aprovacions idèntiques i criteri afinat per a apunts. Publicació d’apunts i cartells confirmada abans de la sincronització general. 275 proves unitàries, 52 fluxos API locals, 12 escenaris nous de pujades/publicació, 36 controls de seguretat de fitxers, 48 escenaris responsive i 135 controls generals correctes en Chromium, Firefox i WebKit; tipus, lint i build correctes. [Pla, mesura real i límits](docs/PLA-PUJADES-RAPIDES.md).

**Pastisseria en mode de prova:** recollida reiniciada per a tothom, un pastís cada 60 segons reals per compte, comptador i nova fornada sense recarregar. Liquidació atòmica i historial conservat. 270 proves unitàries, 52 fluxos API locals i 12 escenaris de pastisseria en Chromium, Firefox i WebKit correctes; tipus, lint i build correctes. [Pla](docs/PLA-PASTIS-MINUT.md).

**Activitats a Notes:** quatre columnes extra visibles per defecte, ampliables, amb nota individual, nom i tipus al costat del percentatge. Configuració per assignatura, mode discret i CSV amb les activitats separades. **Regal de 50 pastissos als 17 comptes existents, 850 en total**, ja acreditat amb registre únic. 265 proves unitàries, 52 fluxos API locals D1/R2, 18 escenaris d’activitats, 48 responsive, 135 controls generals i 24 escenaris de nota final correctes en Chromium, Firefox i WebKit. [Pla i evidències](docs/PLA-ACTIVITATS-NOTES.md).

**Sala secreta de la pastisseria:** toca la catifa dins del forn per obrir una trapa i baixar per un túnel fins a la ruleta. Pastissera amb nou vestuari, ruleta europea animada, apostes a vermell/negre/número amb pastissos virtuals i retorn al forn. Resultat criptogràfic, càrrec/premi atòmics, historial privat i recuperació sense duplicitats. 260 proves unitàries, 52 fluxos API locals D1/R2, 36 escenaris de sala secreta, 135 controls generals, 48 escenaris responsive, 30 d’arrencada mòbil i 4 perfils visuals finals correctes. [Pla, evidències i límits](docs/PLA-SALA-SECRETA.md).

**Arrencada mòbil corregida:** pantalla blanca reproduïda en WebKit sense Object.hasOwn; compatibilitat ampliada, component arrel protegit, HTML inicial visible, càrrega per apartats i reintent quan falla la xarxa. 250 unitàries, 50 fluxos API locals, 30 casos d’arrencada, 135 generals, 48 responsive i 4 perfils de navegador/dispositiu correctes. [Pla i límits](docs/PLA-ARRENCADA-MOBIL.md), [verificació actual](docs/VERIFICATION.md). Pendent de confirmar al mòbil físic de Marc.

**[Continguts](https://lanet.es/#notes)** substitueix el nom Apunts i agrupa Materials, Formularis i Eines i webs. Formularis per assignatura i tema, amb editor de fórmules, fonts, previsualització, revisió explícita de delegats/administradors del grup i historial; les edicions pendents conserven la publicació anterior. Cinc referències educatives de fórmules i set eines inicials. Materials, fitxers, compres i preferències conservats. [Pla](docs/PLA-CONTINGUTS.md), [verificació actual](docs/VERIFICATION.md). 244 unitàries, 50 fluxos API locals, 33 casos Continguts, 48 responsive i 135 controls generals correctes; navegadors locals, mòbil emulat.

**[PAU i universitat](https://lanet.es/#pau):** calculadora d’accés de batxillerat i CFGS, nota d’admissió per grau amb les dues millors ponderacions, i cerca per carrera, universitat i campus. Recomana el tall històric més alt assolit dins de la carrera escollida. 560 codis oficials de Catalunya; 558 talls de la sisena assignació de juny 2026 (07/10/2026) i ponderacions 2026/2027. Simulació privada desada al compte, mode discret i protecció contra conflictes entre pestanyes. Les dades són orientatives i no garanteixen plaça; absències i contradiccions de la font s’indiquen explícitament. [Pla, fonts i actualització](docs/PLA-PAU.md), [verificació actual](docs/VERIFICATION.md). 235 proves unitàries, 48 fluxos d’API locals, 39 casos PAU, 48 de responsive i 135 controls generals correctes. Les proves de navegador d’aquesta revisió són locals, amb mòbil emulat.

**5 pastissos de benvinguda per persona, una sola vegada**, també als membres actuals que encara no en tenien. Saldo i historial anteriors conservats. [Pla](docs/PLA-PASTISSOS-BENVINGUDA.md).

70 requisits, 57 fases i 161 tasques al [registre actual](docs/CHECKLIST.md), amb 160 tasques verificades. La revisió anterior de [Google únic i identitat protegida](docs/PLA-GOOGLE-UNIC.md) va comprovar la migració conservadora amb 159 proves unitàries i 39 fluxos API aïllats; els totals de PAU i els actuals de Continguts consten més amunt. La web viu a Cloudflare Pages, amb URL pròpia, Google verificat en revisions anteriors i D1/R2 conservats. Les dues adreces workers.dev de La Net redirigeixen a la nova web i retornen 410 a les APIs antigues. Per indicació de Marc, la marca de consentiment Google continua sent «Impossible Goals». [Pla d’adreça pròpia](docs/PLA-MARCA-LANET.md). Els totals de les revisions anteriors es conserven com a historial.

## Revisió del 10 d’octubre de 2026

El [pla mestre](docs/PLA-MESTRE.md), el [pla de depuració](docs/PLA-DEPURACIO-2026-10-10.md), el [pla de simplificació UI/UX](docs/PLA-UI-CLEAN.md), el [pla de la pastisseria](docs/PLA-PASTISSERIA-ANIMACIO.md), la [revisió de l’exterior](docs/PLA-PASTISSERIA-EXTERIOR.md), el [pla del cartell visual](docs/PLA-CARTELL-VISUAL.md), el [pla dels selectors](docs/PLA-SELECTORS-VISUALS.md), el [pla de les icones transparents](docs/PLA-ICONES-TRANSPARENTS.md), el [pla dels anuncis amb identitat opcional](docs/PLA-ANUNCIS-IDENTITAT.md), el [pla de coreografia](docs/PLA-PASTISSERIA-COREOGRAFIA.md), la [revisió de les unions](docs/PLA-PASTISSERIA-UNIONS.md), el [ritme àgil](docs/PLA-PASTISSERIA-RITME.md) i la [checklist](docs/CHECKLIST.md) cobreixen 42 requisits, 30 fases i 123 tasques. La revisió incorpora **pastís i icones d’avisos sense requadres sobrants**, selectors agrupats amb selecció clara i icones Horari/Agenda, perfil i assignatures, Agenda, vídeo i PDF, desplegables, pesos, cinc músiques, navegació mòbil, **cartell de fusta amb imatge completa, text gran i editor de retall**, pastissera animada, **caseta centrada amb fons transparent** i **mode discret de Notes**. La simplificació redueix text repetit i panells, unifica els filtres i mostra les opcions avançades quan es necessiten. L’[historial](docs/HISTORIAL-CANVIS.md) registra cada canvi i les seves evidències; l’[informe actual](docs/VERIFICATION.md) diferencia comprovacions, publicació i límits. Marc ha autoritzat la restauració del convidat tècnic de T14-06 i s’ha verificat que persisteix.

`npm run plan:check` comprova el registre. `npm run plan:sync` regenera la checklist després d’actualitzar-lo. S’admet una sola tasca activa alhora.

## Obrir-la en local

Requisits: Node.js 22.20 o superior i npm.

```powershell
npm ci
npm run dev
```

Obre **http://127.0.0.1:5173**. L’ordre crea les migracions, el catàleg i les dades locals inicials, inicia l’API al port 8787 i Vite al 5173. Els processos escolten només la interfície local. Ctrl+C els atura.

Si els ports estan ocupats, pots configurar-los abans d’arrencar. Aquesta revisió utilitza:

```powershell
$env:LANET_WEB_PORT = '5183'
$env:LANET_API_PORT = '8793'
npm run dev
```

En aquest cas, obre **http://127.0.0.1:5183**. La configuració envia a l’API l’origen local exacte; producció continua exigint el mateix origen.

Per revisar el paquet final, amb el servidor de desenvolupament aturat:

```powershell
npm run init
npm run build
npm start
```

Obre **http://127.0.0.1:8787**. Les dades de D1 i els fitxers de R2 persisteixen a `.wrangler/state/`. No es reinicialitzen en tornar a obrir la plataforma. Perfil, assignatures de filtre, aparença, mode discret, saldos, permisos, notes i publicacions viuen al servidor; el navegador conserva la sessió, la vista de l’agenda, esborranys i l’estat del temporitzador.

## Entrada amb Google

L’única acció d’entrada és **Continua amb Google**, tant en local com al núvol. La primera entrada crea el perfil del compte educatiu; les següents sincronitzen el nom, els cognoms, el correu i la foto. La identitat no es pot modificar al perfil ni per l’API. Assignatures, curs, filtres, aparença i mode discret continuen sent configurables.

Cal configurar les credencials privades i el callback exacte segons [GOOGLE-OAUTH.md](docs/GOOGLE-OAUTH.md). Sense Google configurat l’accés queda tancat. Obrir directament `npm start` al port 8787 també exigeix autoritzar i configurar el callback d’aquell origen; `npm run dev` utilitza el port web configurat.

Les sessions anteriors a R45 han de tornar a entrar amb Google una vegada. No s’esborren les dades. Un compte antic es vincula pel mateix correu verificat de Workspace del centre, mantenint ID i rol. Un convidat que conservi una cookie vàlida pot convertir el seu espai mitjançant Google; no es fusiona amb un compte Google que ja existeixi.

Contrasenya, convidat, demo, registre manual, invitacions d’accés i recuperació de contrasenya estan retirats. Els indicadors antics no poden reactivar-los. Les dades locals d’exemple es preserven com a historial, però ja no són una forma d’accés. `.dev.vars` queda fora de Git i del ZIP.

## Què inclou

- **Horari / Agenda:** classes personalitzables, variants compatibles i una única font d’esdeveniments. Agenda en llista, setmana o mes amb exàmens, tasques, lliuraments i recordatoris, filtres per tipus i assignatura, progrés personal i exportació `.ics` Europe/Madrid.
- **Apunts:** text, fotos, vídeo MP4/WebM, PDF i documents combinables. Galeria, reproductor natiu amb rangs, visor PDF amb pàgines i zoom, permisos, ordre d’adjunts i mostra gratuïta. Assignatures habituals configurables, cerca, desats, esborranys, likes i preu opcional.
- **Plusos:** filtres personals per una o diverses assignatures amb coincidència OR, independents dels d’Apunts. Bonificacions informatives, condicions, likes, desats i incorporació idempotent a l’Agenda.
- **Notes:** nota i pes real per prova, totals del 100%, repartiment igual o proporcional, mitjanes, objectius, CSV i desfer. El **mode discret** oculta les notes guardades i els resultats derivats; permet escriure una entrada nova, visible només mentre s’edita. Inclou modal de pesos, previsió, preferència de perfil i avís abans d’exportar valors reals. Zero i coma decimal vàlids. Detall mòbil per targetes.
- **Estudi:** Pastisdoro persistent amb minuts aplicats en desar; una sessió activa permet triar aplicar ara o a la següent. Cinc composicions lo-fi originals amb icones, selecció i volum propis. Música iniciada voluntàriament, aturada global i registre de sessions conservat.
- **Comunitat i cartell:** anuncis amb nom o anònims, triats per publicació i amb signatura previsualitzada. Avisos i esdeveniments de classe/centre, propostes globals, cerca, ordre i vot únic. Cartell de fusta de 272 × 56 px a la barra superior, flexible al mòbil i detall complet en tocar-lo. Formats Només imatge, Text gran i Imatge i text. Editor visual amb guies, arrossegament, quatre nanses, zoom, teclat i Imatge sencera; només es puja el PNG final. La foto aportada és una mostra d’estil. Cartell sempre visible, oferta inicial mínima d’un pastís, import seleccionat marcat, cost, saldo resultant i esborrany conservat en cas de conflicte.
- **Pastisseria:** caseta i interior complets, centrats i transparents. Pastissera integrada en una postura fixa, sense salutacions ni braços articulats, i taulell net. Cinc fases en 7,2 segons, amb quatre segons de cocció visible i aparició suau del pastís abans de recollir. **Agafa el pastís** al seu costat; confirma l’API abans del vol d’1,65 segons del mateix pastís al saldo. Entrada de 650 ms, sortida cancel·lable, pausa de pestanya, moviment reduït i una recompensa diària. Repte retirat amb historial preservat.
- **Perfil i navegació:** assignatures, filtres independents, densitat compacta/còmoda, barra plegable, preferències persistents i barra inferior al mòbil. Selectors compartits amb icones, teclat i focus coherent dins dels diàlegs.
- **Gestió:** assignatures, grups, variants, professors com a dades, franges, plantilles, rols, desactivació de comptes i revisions de contingut.

La invitació a **Proposa una idea** es manté al peu de la barra lateral, damunt de Configurar curs. El professorat no té accions ni comptes específics.

## Regles dels pastissos

1. Recollir el pastís del dia: **+1**, un cop per dia a Europe/Madrid.
2. Un altre estudiant dona like a un apunt o plus: **+1 a l’autor**. El like no costa res. Retirar-lo i tornar-lo a donar no repeteix la recompensa; els likes propis no donen pastissos.
3. Cada cinc lectors diferents d’un apunt: **+1 a l’autor**. Cal obrir els apunts i llegir-los almenys deu segons; les recàrregues i les fotos addicionals no compten com a lectors nous.
4. Les contribucions per likes/consultes tenen un límit conjunt de **30 recompenses per autor i dia**. El pastís del forn és addicional. Els pastissos antics del repte retirat es conserven.
5. Comprar apunts transfereix el preu íntegre al creador. Una compra duplicada no es torna a cobrar. La retirada dels apunts conserva l’accés dels compradors.
6. Primer missatge del cartell: mínim **1 pastís**. Per substituir-lo cal almenys **2 × el valor vigent**. El valor és `max(1, ceil(oferta × 0,9^dies_complets))`, amb períodes de 24 hores des de la publicació. L’oferta es gasta en publicar i no es retorna quan el missatge se substitueix.

El moneder té un registre immutable de moviments i restriccions de base de dades. Les compres i les ofertes es validen i executen al servidor en transaccions. Les recàrregues amb diners, PayPal, targeta i efectiu queden per a una fase posterior, segons la decisió de planificació.

## Estructura del projecte

```text
src/                  Interfície, pantalles, formularis, àudio i temporitzador
worker/               API, autenticació, permisos, adjunts, notes i gestió
shared/               Càlculs de notes, dates, economia i catàleg inicial
migrations/           Esquema, restriccions i catàleg base; sense comptes demo
scripts/              Inicialització, comprovacions i preparació de Cloudflare
tests/                Proves de domini i transaccions SQLite
public/images/        Escenes originals de la Pastisseria
design/               Mockups aprovats i prompts dels recursos visuals
DESIGN.md             Contracte visual i funcional
wrangler.local.jsonc  D1/R2 locals persistents
wrangler.jsonc        Producció: Cloudflare Pages, D1 i R2
```

Les dades inicials del catàleg són exemples editables. Abans d’obrir La Net als estudiants del centre, un administrador o delegat les adapta a les assignatures, professors i franges reals.

## Comprovacions

```powershell
npm test
npm run test:api
npm run typecheck
npm run build
npm run cf:check
```

Les proves d’API creen una instància aïllada amb D1 i R2 reals al port 8791, que ha d’estar lliure. R37 redueix la preparació a 16 segons i verifica 15 regles CSS, 11 intervals i la postura final estable; 82 proves, tipus/lint i build correctes. Evidències a output/bakery-pace/. R36 centra el coll i cobreix les unions dels colzes: **82 proves**, 75 ampliacions offline i comprovació d’alfa dels pivots; evidències a output/bakery-joints/. Tipus/lint i build/dry-run correctes. La comprovació no inclou reproducció CSS al navegador. R35 supera **82 proves unitàries i 30 fluxos API**, tipus/lint i build/dry-run. La pastissera es verifica amb rellotge virtual, components i fotogrames offline i mostreig de l’oclusió; evidències a output/bakery-choreography/. La reproducció i el layout real del navegador no s’han pogut repetir pels permisos vigents. R34 conserva privadesa dels anuncis a output/banner-identity/; R31, les comprovacions visuals de la seva versió a output/board-creative/; les revisions anteriors es conserven a docs/historic/ i als seus output/. No es modifiquen dades de treball ni es publiquen recompenses o anuncis de prova a producció.

`cf:check` compila frontend i backend de Pages i executa les proves de l’origen canònic, sense publicar ni crear recursos remots. `typecheck` genera els tipus des de la configuració real de Workers, verifica el punt d’entrada, comprova la sintaxi dels mòduls del servidor i executa ESLint per detectar identificadors i imports JSX inexistents. El servidor està escrit en JavaScript amb una entrada TypeScript tipada.

La revisió d’aquesta versió es documenta a [docs/VERIFICATION.md](docs/VERIFICATION.md).

El [pla de perfeccionament](docs/PLA-PERFECCIO.md) i la [passada de màxim detall](docs/PLA-DETALL.md) registren el treball executat. El [comparador de fidelitat](design/comparador/fidelitat-implementacio.html) permet revisar les set pantalles i dos estats del calendari amb les imatges aprovades, costat a costat o amb superposició. Obre’l des de Vite a `/design/comparador/fidelitat-implementacio.html` o directament com a fitxer, conservant les carpetes `design/` i `output/fidelity/`. La procedència de les icones originals és a [design/RECURSOS-ORIGINALS.md](design/RECURSOS-ORIGINALS.md).

## Publicació a Cloudflare

Aplicació pròpia **Cloudflare Pages lanet**, publicada a [La Net](https://lanet.es). Mateixos D1 i R2 privats de La Net, sense importació local ni migració nova. La pantalla de Google conserva la marca existent per indicació de Marc; l’aplicació ImpossibleGoals i el subdomini del compte no s’han modificat.

`wrangler.jsonc` és la configuració de Pages; `cloudflare-target.json` fixa compte, projecte i origen. `wrangler.worker-archive.jsonc` conserva la configuració anterior només com a referència. Els scripts validen la destinació i que D1/R2 coincideixin abans de publicar.

```powershell
npx wrangler login
npm run pages:deploy
```

`pages:deploy` comprova que el projecte Pages ja existeix, compila React, genera `dist-pages/_worker.js` i publica a la branca `main`. `cf:deploy` és un àlies de la mateixa operació. `cf:prepare` comprova els recursos existents; no crea ni migra dades en aquesta configuració. Una migració futura requereix còpia D1 prèvia i execució explícita, separada de publicar codi.

Google requereix els secrets privats i el callback exacte `https://lanet.es/api/auth/google/callback`. Després de modificar secrets de Pages cal tornar a publicar. Vegeu [GOOGLE-OAUTH.md](docs/GOOGLE-OAUTH.md). La configuració de producció prohibeix convidat i contrasenya, limita les altes a @fje.edu i conserva els rols existents.

`wrangler.redirect.jsonc` i `wrangler.legacy.jsonc` retiren respectivament els antics Workers `lanet` i `la-net`: redirecció fixa 308 a la web i API 410, sense D1, R2 ni Assets. No són configuracions per publicar la plataforma. Les adreces de previsualització de Pages redirigeixen a l’origen públic i rebutgen l’API amb 421 abans d’accedir a les dades.

Fonts: [Pages en mode avançat](https://developers.cloudflare.com/pages/functions/advanced-mode/), [configuració de Pages](https://developers.cloudflare.com/pages/functions/wrangler-configuration/) i [bindings](https://developers.cloudflare.com/pages/functions/bindings/).
