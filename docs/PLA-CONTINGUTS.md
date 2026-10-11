# Continguts · R60 / F47

Tasca T47-01 completada. Edició seqüencial dels fitxers compartits; proves independents només després de tancar el build. Estat centralitzat a SEGUIMENT.json i checklist generada. Historial acumulatiu, sense reescriure evidències anteriors.

- [x] Reanomenar la navegació a Continguts i separar Materials, Formularis i Eines i webs.
- [x] Conservar materials, preferències, compres, fitxers i ruta #notes.
- [x] Biblioteca del grup: delegats i administradors preparen, envien a revisió i aproven explícitament.
- [x] Els alumnes només veuen versions aprovades. Una edició no substitueix la publicació fins a la revisió. Registre d’accions, autor de revisió i data; revisions concurrents rebutjades.
- [x] Formularis amb assignatura, tema, fórmules i explicacions, font i previsualització. Cap HTML executable ni càrrega d’URLs al servidor.
- [x] Fonts educatives inicials identificades i enllaçades; no atribuir una revisió fictícia a delegats. Recursos externs s’obren en una altra pestanya.
- [x] Cerca, filtres, estats buits, recuperació d’errors, teclat i pantalles petites.
- [x] Proves, migració 0019 additiva, publicació i actualització d’historial.

Els recursos externs són referències d’estudi; no afirmen que es puguin portar a un examen. Les fórmules del centre només es presenten com a revisades després d’una aprovació real. No es generen fulls d’alumnes ni aprovacions simulades. Les publicacions del grup no es comparteixen amb altres grups. Un administrador o delegat pot fer la revisió explícita del seu propi esborrany: el revisor real queda identificat; no es promet una doble revisió independent.

Visita pública, Google real i dispositius físics continuen pendents del permís corresponent. Validació de navegador local i comprovacions del proveïdor autoritzades.


## Resultat i verificació

[Continguts](https://lanet.pages.dev/#notes), Pages **7f7848ce**, publicació main confirmada pel proveïdor. Materials existents, preferències, fitxers i compres conservats. Els filtres de biblioteca segueixen les assignatures del perfil; es poden ampliar a totes les assignatures. Cinc referències externes de fórmules i set eines identificades a [l’auditoria de fonts](../output/contents/source-audit.json). Les referències s’enllacen al seu editor i no porten aprovacions fictícies. Els formularis propis del grup són inicialment esborranys i només es mostren després d’una revisió explícita amb nom i data reals.

**244 unitàries, 50 fluxos API amb D1/R2 locals, 33 escenaris Continguts, 48 responsive i 135 controls generals correctes.** Chromium, Firefox i WebKit: navegació, cerca, filtres, lectura de PDF existent, permisos, creació de fórmules i eines, previsualització, enviament, aprovació, edició pendent, retorn, historial, conflictes, recuperació de càrrega i contingut maliciós inert. 320/390/820 píxels i horitzontal comprovats; nom complet a la barra inferior. Tipus, lint i build correctes. Les primeres proves van detectar una fallada de l’arnès de simulació de xarxa i un petit desbordament del nom a Firefox 320: corregits i bateria repetida amb èxit. La versió antiga desactiva l’aprovació per evitar revisar una edició equivocada. Les captures finals de revisió visual tenen noms independents dels informes de regressió.

Migració **0019_content_library.sql** aplicada: dues taules noves i un índex; cap dada existent reescrita. Cap migració pendent. 97 fitxers publicats coincideixen amb el build provat; cap dada privada ni patró de credencial. Bindings de D1, R2 i moderació visual privats conservats. Dades PAU sense canvis. Cap visita a la web pública: comprovació de publicació amb el proveïdor, navegadors amb fixtures locals, Google real i mòbils físics pendents.

[Unitàries](../output/contents/unit.txt), [API](../output/contents/api.txt), [Continguts](../output/contents/contents-browser-results.json), [responsive](../output/contents/regression/responsive-results.json), [regressió](../output/contents/regression/browser-results.json), [fonts](../output/contents/source-audit.json), [captures](../output/contents/visual-review.json), [build](../output/contents/tested-build.json), [migració](../output/contents/migration-apply.txt), [bindings](../output/contents/remote-bindings.json), [publicació](../output/contents/publicacio.json), [CLI](../output/contents/deploy.txt).
