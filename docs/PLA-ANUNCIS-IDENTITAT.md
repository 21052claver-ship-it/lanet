# Anuncis amb nom o anònims · R34

Petició de Marc: els anuncis es poden publicar amb nom o anònimament. Tria per anunci, compatible amb els tres formats del cartell i sense canviar l’oferta.

Una sola tasca activa, seguida a SEGUIMENT.json i HISTORIAL-CANVIS.md:

- [x] T21-01 · Persistència, validació i protecció de la identitat a l’API.
- [x] T21-02 · Selector accessible, previsualització i detall coherents.
- [x] T21-03 · Proves de privadesa, API aïllada i compilació.
- [x] T21-04 · Migració, publicació i còpia verificada.

## Decisions

«Publicar com»: dues opcions de ràdio amb icones, **Amb el meu nom** i **Anònim**. Per defecte es conserva el comportament anterior amb nom. La previsualització indica la signatura seleccionada sense ocupar l’espai del text o de la imatge. Selecció conservada mentre es canvia de format, es retalla o es revisa una oferta en conflicte. La identitat s’escull explícitament per a cada anunci.

Columna anonymous amb valor inicial 0 per als anuncis existents. L’API admet només booleans per a l’opció nova; ometre-la conserva la compatibilitat. La resposta pública del cartell usa una llista explícita de camps i omet sempre author_id; si és anònim, author és null. L’associació interna amb el compte es conserva per al cobrament i la moderació. El detall, els textos alternatius i les etiquetes accessibles respecten l’opció.

La migració és additiva i conserva l’anunci vigent, els saldos i les dades anteriors. Les proves de publicació utilitzen exclusivament una base temporal aïllada. Es respecten els bloquejos del navegador de R31/R32: sense accés al navegador públic ni a localhost:5183, ni comprovacions HTTP alternatives de la web. La publicació es confirma amb Wrangler.
