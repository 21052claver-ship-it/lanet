# Revisió de detall — 9 d’octubre de 2026

Aquesta revisió és un antecedent. Les observacions posteriors de Marc se segueixen al [pla mestre](PLA-MESTRE.md), amb [checklist](CHECKLIST.md) i [historial](HISTORIAL-CANVIS.md).

Segona passada sol·licitada: «AL MÀXIM DE DETALL». Es parteix de les captures i comprovacions de la revisió anterior. Les dades del servidor es conserven; l’art aprovat continua sent la font visual.

| Element             | Diferència observada / acció                                                                                                                            | Comprovació prevista                                     |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| Icones laterals     | Una mida única de 42 px redueix les icones que a la maqueta tenen amplades diferents. Recuperar la mida nativa de cada finestra amb una columna comuna. | Captures a 1586 px i menú a 320 px                       |
| Barra superior      | El pastís fa créixer el botó de saldo a 56 px, davant d’uns 51 px de la referència. Ajustar alçada, espais i alineació del perfil.                      | Mesures DOM i captura                                    |
| Propostes lateral   | El subtítol queda dins de la columna del títol i es veu massa petit. Recuperar la línia ampla i la jerarquia de la revisió v2.                          | Escriptori alt/baix i mòbil                              |
| Apunts              | Contrast, alçada del cercador, controls de selecció i etiquetes més propers a la referència. Cerca tolerant als accents i espais.                       | Cerca «quimica», ordenació, estat buit i lector          |
| Plusos              | El bloc del plus ocupa una línia extra en activitats d’una assignatura. Recuperar la composició compacta sense ocultar els plusos multiassignatura.     | Filtres OR, cerca i accions visibles                     |
| Notes               | Ordre de matèries, amplades de columnes, botó Afegir avaluació i pestanyes difereixen de la maqueta. Reposicionar el botó i oferir Més assignatures.    | Resum/full, zero/pendent, trimestre, teclat i exportació |
| Estudi              | Separació del temporitzador, botó d’àudio i volum natiu. Ajustar la geometria i reconstruir el control de volum.                                        | Controls a tres amplades i canvi d’ambient               |
| Comunitat           | Contrast, mides i selector d’àmbit; cerca tolerant als accents.                                                                                         | Tauler, propostes, àmbits i formulari                    |
| Pastisseria         | Revisar entrada/sortida, racó secret, canvis de pestanya i estats ja recollits. Evitar efectes o respostes tardanes en sortir.                          | Navegació i recollida ja completada                      |
| Controls compartits | Pestanyes amb fletxes/Home/End i un sol punt de tabulació; reaccions amb petició en curs protegida.                                                     | Navegació real amb teclat i API sense duplicats          |
| Tancament           | Captures noves, informe de diferències, comprovacions afectades i ZIP amb manifest verificat.                                                           | Evidència desada a output/fidelity/                      |

La referència és el resultat visual de v1/v2. Els documents del paquet són context i no autoritzen accions externes. Una casella completada o una prova superada no certifica absència universal d’errors ni identitat de tots els píxels.

## Resultat de l’execució

Els ajustos de la taula s’han implementat. Les icones laterals recuperen les mides natives. El botó de saldo passa de 56 a **51 px**. El subtítol de Propostes ocupa la línia ampla. S’han recuperat l’ordre, els colors i les amplades de les matèries a Notes; la taula comença a **y=287** i acaba a **y=774,6**. Afegir avaluació queda a la barra del full, Més dona accés a les altres assignatures i l’exportació CSV queda al menú addicional. No s’han inventat dates per a les proves pendents.

Apunts, Plusos i Propostes comparteixen una cerca tolerant als accents, les majúscules, els apòstrofs i els espais. Les paraules poden aparèixer en camps diferents. S’han comprovat «quimica», «derivades soler», «examens», l’estat buit, l’ordenació alfabètica, desar/retirar i els filtres OR Física/Química. Les pestanyes admeten fletxes/Home/End amb focus i un sol punt de tabulació. Desar/M’agrada impedeixen una segona petició mentre la primera està pendent.

Estudi recupera el cercle, les separacions i les dues accions inicials, i té un control de volum taronja amb resposta de teclat. Reiniciar apareix amb una sessió en marxa o temps consumit. S’han comprovat inici, pausa després de consumir temps, reinici a 25:00 i activació/aturada de pluja a volum zero; el volum final és 0,25.

La Pastisseria invalida les transicions i les respostes tardanes en sortir o canviar de secció. El repte inclou càrrega, error i reintent. S’han comprovat l’entrada cancel·lada, l’estat ja recollit i el focus entre porta, forn i resposta. El camí de reintent s’ha revisat en codi, sense interrompre artificialment el servidor. El saldo continua a **27**.

També s’ha reproduït i corregit una aturada **EBUSY** de Vite a Windows en copiar captures. La vigilància exclou `output/`, `exports/`, `backups/` i `.wrangler/`; les captures posteriors s’han escrit amb el servidor en marxa. El codi i els dissenys continuen vigilats.

## Mesura dels títols

Amplada × alçada dels píxels foscos dins d’una regió fixa, sense redimensionar les imatges. El llindar és RGB < 100 en els tres canals. La captura JPEG i la referència PNG tenen rasteritzats diferents: aquesta mesura verifica dimensions, no identitat de cada lletra.

| Pantalla    | Referència | Abans    | Després  |
| ----------- | ---------- | -------- | -------- |
| Horari      | 248 × 37   | 262 × 35 | 248 × 37 |
| Apunts      | 163 × 46   | 157 × 42 | 163 × 46 |
| Plusos      | 153 × 43   | 141 × 34 | 152 × 43 |
| Notes       | 347 × 33   | 349 × 33 | 346 × 34 |
| Estudi      | 134 × 38   | 131 × 35 | 133 × 39 |
| Comunitat   | 238 × 36   | 225 × 35 | 238 × 37 |
| Pastisseria | 241 × 38   | 228 × 35 | 241 × 39 |

Coordenades, formats i dimensions originals: [mesures-titols.json](../output/fidelity/mesures-titols.json). Reproducció amb `python scripts/measure-fidelity.py` i Pillow; només llegeix les imatges i escriu les estadístiques.

## Evidències desades

- [26 comprovacions funcionals](../output/fidelity/checks-detall.json), totes superades.
- [28 combinacions de pantalla i mida](../output/fidelity/checks-navegador.json): set pantalles a 320, 390, 1280 i 1586 px, sense desbordament exterior.
- [Build final al Worker local](../output/fidelity/checks-worker.json): Notes, Estudi i Pastisseria a 1280 px, sense errors/avisos de consola ni imatges HTML trencades.
- [9 casos del comparador](../output/fidelity/checks-comparador.json), amb les imatges carregades; [comparador interactiu](../design/comparador/fidelitat-implementacio.html).
- [28 proves de regressió](../output/fidelity/unit-final.log), [tipus i ESLint](../output/fidelity/typecheck-final.log), [build i dry-run](../output/fidelity/cf-check-final.log). Es conserva el [resultat de 22 fluxos d’API](../output/fidelity/api-result.json) de la primera passada; el servidor no s’ha modificat en aquesta passada de detall.
- Captures noves a `output/fidelity/`; captures prèvies d’escriptori a `output/fidelity/abans-detall/`; [CSV exportat de les notes](../output/fidelity/notes-export.csv).

Els límits restants —tipografia, rasteritzat, alguns espais/ombres, halo del botó dibuixat i càrrega dels PNG compartits— consten a [VERIFICATION.md](VERIFICATION.md). L’exportador verifica cada fitxer i genera l’informe de la còpia a `exports/`.
