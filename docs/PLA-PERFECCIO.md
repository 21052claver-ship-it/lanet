# Pla de perfeccionament i depuració

9 d’octubre de 2026. Complement del [pla de fidelitat](PLA-FIDELITAT.md).

Aquesta revisió és un antecedent. El pla actiu per a les noves observacions de Marc és el [pla mestre](PLA-MESTRE.md), amb [checklist](CHECKLIST.md) i [historial](HISTORIAL-CANVIS.md).

La referència visual són les imatges aprovades v1 i les correccions v2. La plataforma ha de conservar les dades reals i totes les accions; les xifres i publicacions d’exemple de les maquetes no substitueixen les dades locals.

| Àrea              | Treball i criteri de comprovació                                                                                                                                          | Estat                                                                                                                                         |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Identitat         | Marca, retrats i art de fang originals; tipografia, superfícies, espais i controls a mida de referència.                                                                  | Implementat i revisat; diferències documentades                                                                                               |
| Set pantalles     | Horari/Calendari, Apunts, Plusos, Notes, Estudi, Comunitat i Pastisseria. Comparació amb cada maqueta, també amb superposició.                                            | 9 casos al comparador; captures desades                                                                                                       |
| Navegació i mòbil | Cap desbordament de pàgina a 320/390 px; graelles amb desplaçament intern; menú amb focus, Escape i fons inactiu.                                                         | 7 pantalles revisades a 320, 390, 1280 i 1586 px; sense desbordament exterior                                                                 |
| Pastisseria       | Transició amb profunditat en entrar, llum del forn i pastís animat només després de confirmar la recompensa. Aturar temporitzadors en sortir. Respectar moviment reduït.  | Implementat; recollida única i focus comprovats en navegador                                                                                  |
| Àudio             | Pluja, vent i música tranquil·la generats localment. Arrencada explícita, volum suau, canvi d’ambient segur i aturada global. Provar cancel·lacions i errors d’arrencada. | 5 regressions superades; 3 ambients comprovats en navegador                                                                                   |
| Dades i economia  | Notes zero/pendents, pesos, privacitat, adjunts, compres i recompenses amb validació al servidor. Cap recompensa visual anticipada.                                       | 22 fluxos d’API superats amb D1/R2 aïllats                                                                                                    |
| Temporitzador     | Inici exacte a 25:00, pausa, represa, navegació i límit de temps vençut.                                                                                                  | Error d’un segon corregit; proves superades                                                                                                   |
| Detall            | Mides natives d’icones, proporcions dels títols, geometria de Notes/Estudi, cerca tolerant i controls amb teclat.                                                         | Implementat; 26 comprovacions funcionals i captures noves. Vegeu PLA-DETALL.md                                                                |
| Paquet            | Sintaxi, ESLint, proves de domini/API, compilació i simulació Cloudflare. Còpia transportable amb manifest SHA-256.                                                       | 28 proves superades; tipus, sintaxi, ESLint, build i dry-run finals superats. L’exportador verifica cada fitxer i genera l’informe a exports/ |

## Ordre d’execució

1. Tancar els ajustos visuals que ja s’han detectat en captures.
2. Completar la transició de la Pastisseria i corregir la presentació de recompenses.
3. Reforçar el cicle de vida de l’àudio i comprovar-lo amb regressions i navegador.
4. Repassar filtres, lector, calendari, notes, formularis i navegació després dels canvis.
5. Desar captures finals d’escriptori/mòbil, crear el comparador i documentar les diferències.
6. Executar les comprovacions afectades i exportar un ZIP verificat.

## Criteri de tancament

Les comprovacions han de tenir resultats reproduïbles i captures reals. Les animacions no han d’alentir les accions, alterar el saldo ni activar àudio. Les fonts i els recursos visuals han de carregar localment. Qualsevol diferència visual que encara es vegi ha de quedar registrada; una revisió satisfactòria no és una garantia que no pugui existir cap error.

Resultats i límits: [informe de verificació](VERIFICATION.md). Revisió directa: [comparador amb superposició](../design/comparador/fidelitat-implementacio.html).
