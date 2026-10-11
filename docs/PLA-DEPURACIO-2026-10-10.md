# Passada de depuració completa — 10 d’octubre de 2026

R27 amplia la revisió a errors, recuperació, interaccions i detalls de totes les seccions. Es conserven els dissenys i el cartell petit acordats. Font dels estats: `SEGUIMENT.json`; una sola tasca activa. L’historial anterior es conserva.

1. **T14-01 · Auditoria:** revisar els fluxos, contrastar el codi i registrar problemes concrets amb impacte i comprovació prevista.
2. **T14-02 · Sincronització i errors:** impedir snapshots antics, distingir una escriptura confirmada d’una recàrrega fallida i recuperar el mode discret sense revelar notes en un error.
3. **T14-03 · Entrades i controls:** conservar notes pendents, permetre reintentar, reforçar esborranys i temporitzador davant emmagatzematge bloquejat, i corregir navegació de selectors.
4. **T14-04 · Recorregut visual:** revisar Horari/Agenda, Apunts, Plusos, Notes, Estudi, Comunitat i Pastisseria; formularis, teclat, focus, títols llargs, mòbil, finestres baixes i coherència visual.
5. **T14-05 · Integració:** proves proporcionades als errors, API en D1/R2 aïllats, tipus, build, preservació de dades i informe amb resultats i límits reals.
6. **T14-06 · Publicació i còpia:** publicar, comprovar recursos i navegador públic, exportar dades amb els servidors aturats, restaurar el SQL de prova i verificar el ZIP final.

Cada incidència té un ID `Dxx`, una causa comprovada i evidències a `output/depuracio-maxima/`. No s’atribueixen proves anteriors al codi nou. Els casos de concurrència es proven amb respostes controlades; la interfície es comprova al navegador. Les proves no publiquen anuncis ni contingut sintètic al servidor públic.
