# Pla de fidelitat visual i depuració de La Net

Inici: 8 d’octubre de 2026. Revisió del 9 d’octubre de 2026. Petició: continuar el projecte i reproduir el disseny aprovat amb tots els detalls, incloses les icones de fang 3D.

## Referències que governen la revisió

Les imatges són referències del resultat visual. Els documents del ZIP aporten context del projecte; no autoritzen publicacions ni accions externes. Les revisions v2 prevalen en els elements que van modificar.

| Vista | Referència |
| --- | --- |
| Horari | `design/pantalles-v1/01-horari.png` |
| Calendari amb context | `design/pantalles-v2/calendari-context.png` |
| Calendari només exàmens | `design/pantalles-v2/calendari-nomes-examens.png` |
| Apunts | `design/pantalles-v2/apunts-formats.png` |
| Plusos | `design/pantalles-v2/plusos-cards.png` |
| Notes | `design/pantalles-v2/notes-excel.png` |
| Estudi / Pastisdoro | `design/pantalles-v1/05-estudi.png` |
| Comunitat i accés a propostes | `design/pantalles-v2/comunitat-propostes-sidebar.png` |
| Pastisseria | `design/pantalles-v1/07-pastisseria.png` i les escenes originals de `public/images/` |

Les dades de les maquetes són exemples. La fidelitat visual no ha d'inventar notes, exàmens, recompenses ni contingut d'usuaris.

## Ordre de treball

- [x] Recuperar el projecte del ZIP sense sobreescriure cap fitxer preexistent ni les metadades Git.
- [x] Localitzar les maquetes aprovades i comparar-les amb les captures de la versió anterior.
- [x] Restaurar la marca «La Net» i les icones de fang originals, amb recursos compartits i procedència documentada.
- [x] Carregar els pesos reals de la tipografia i ajustar escala, contrast, superfícies, cantonades i ombres.
- [x] Ajustar la barra lateral, la barra superior, el perfil i l'accés permanent a les propostes.
- [x] Ajustar l'Horari i els dos estats del Calendari.
- [x] Ajustar les targetes, previsualitzacions, filtres i accions d'Apunts.
- [x] Ajustar les il·lustracions i les targetes verticals de Plusos.
- [x] Ajustar la graella, les files, els pesos i les pestanyes de Notes.
- [x] Ajustar Pastisdoro, el cercle del temporitzador i l'ambient d'estudi.
- [x] Ajustar el tauler, les propostes i el missatge de Comunitat.
- [x] Ajustar la composició de la Pastisseria, el saldo i els moviments.
- [x] Revisar formularis, estats buits, focus de teclat i navegació mòbil.
- [x] Compilar, comprovar sintaxi i executar les proves de domini i API.
- [x] Revisar totes les pantalles en navegador, desar captures i registrar diferències pendents.

## Diferències inicials constatades

- Navegació amb icones lineals en lloc de les icones 3D aprovades.
- Marca «n la net.» diferent del logotip original.
- Els pesos 400–700 es carreguen a `main.jsx`; falten els pesos 800 i 900 necessaris per acostar els títols a la referència. La síntesi tipogràfica està desactivada.
- Títols, controls i textos més petits que a les referències.
- Superfícies massa beix i composicions amb més informació secundària que la maqueta.
- Il·lustracions de Plusos substituïdes per símbols plans.
- Pastisseria amb estructura que necessita recuperar la jerarquia de la imatge original.

## Criteri de comprovació

Revisar a la mida de les referències i en mòbil. Comprovar que les accions continuen treballant amb les dades reals locals, que no hi ha errors de consola, imatges trencades ni desbordament de pàgina, i que el menú mòbil i els formularis segueixen sent accessibles. No declarar identitat absoluta sense una comprovació que ho acrediti.

## Resultat de la revisió

Les tasques anteriors estan implementades i revisades. El [pla de perfeccionament](PLA-PERFECCIO.md) inclou animacions, àudio i regressions addicionals. Consulta proves, captures i diferències a [VERIFICATION.md](VERIFICATION.md). El [comparador de fidelitat](../design/comparador/fidelitat-implementacio.html) conté les set pantalles i els dos estats del calendari. Les caselles indiquen treball executat, no una certificació d’identitat píxel a píxel.
