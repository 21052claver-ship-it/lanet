# Simplificació de la UI i la UX · 10 d’octubre de 2026

Objectiu: reduir la sobreacumulació de contingut i controls sense perdre funcions, dades ni la identitat càlida de La Net.

## Criteris

- Una acció principal per secció. Accions secundàries amb menys pes visual; opcions avançades a desplegables amb nom explícit.
- Cada dada apareix una sola vegada dins d’una targeta. Títols i resums llegibles, sense previsualitzacions que dupliquin el text.
- Filtres en una franja coherent: cerca visible, preferències i ordenació disponibles sense tres panells consecutius.
- Menys caixes dins de caixes, ombres i fons acolorits. Espais, tipografia i separadors defineixen la jerarquia.
- Mantenir les icones originals, el cartell petit, la pastisseria completa, la privadesa de les notes, l’àudio i la navegació mòbil.
- Controls amb nom accessible i ús amb teclat. Mòbil sense retalls ni desplaçament horitzontal de la pàgina; taules i horari conserven el seu propi desplaçament.

## Execució, sense solapaments

El registre `SEGUIMENT.json` continua sent l’única font d’estat. Una sola tasca activa; cada pas s’acaba amb evidència abans de començar el següent.

1. **T15-01 · Diagnòstic**: captures inicials, redundàncies i criteris de reducció de les set seccions.
2. **T15-02 · Estructura comuna**: capçalera, barra lateral, filtres i tractament de superfícies més tranquils.
3. **T15-03 · Contingut i accions**: apunts, plusos, notes, horari, comunitat, estudi i pastisseria. Consolidar controls duplicats; mostrar el detall quan es necessita.
4. **T15-04 · Verificació**: revisar el resultat visual a escriptori i mòbil, desplegables, teclat, privadesa i temporitzador; executar les regressions pertinents i comprovar la preservació de dades.
5. **T15-05 · Publicació i lliurament**: publicar al mateix servei, comprovacions públiques de només lectura, còpia SQL i ZIP verificat, captures i informe.

## Comparació abans / després

Guardar captures amb la mateixa amplada i secció. Comprovar que els controls retirats de la vista inicial continuen sent accessibles, que les opcions obertes no se solapen i que els estats buits i els missatges d’error segueixen sent útils.

## Restauració independent autoritzada

T14-06 va conservar el pendent d’autorització mentre s’executava aquest redisseny. Marc ha respost «Sí, restaura el convidat tècnic» el 10 d’octubre: s’ha restaurat només Matemàtiques / Prova 2 a pendent i s’ha activat el mode discret del mateix convidat públic. La recàrrega confirma la persistència, les altres caselles no han canviat i el saldo continua a 24. [Resolució](PENDENT-APROVACIO-2026-10-10.md), [evidència](../output/restauracio-publica/restauracio-verificada.json). Les proves públiques R28 anteriors continuen sent de només lectura.
