# Depuració de La Net · octubre 2026

Una sola tasca activa, T78-01. Treball seqüencial amb fixtures locals; cap accés de prova a la web pública. Les proves i les captures utilitzen usuaris ficticis.

- [x] Auditar navegació, formularis, continguts, notes, PAU, música i escenaris.
- [x] Reproduir incidències i registrar causa i efecte abans de corregir-les.
- [x] Corregir concurrència, recuperació i controls afectats amb regressions significatives.
- [x] Revisar captures de mòbil/escriptori, focus i absència de desbordaments.
- [x] Passar tipus/lint, unitàries, build, auditoria de font i CI completa.
- [x] Incorporar per PR, publicar una versió immutable i verificar el proveïdor.

La revisió no implica reexecutar regals, reinicis, migracions o configuració OAuth. La publicació conserva els serveis i el domini existents.

## Incidències corregides

| Cas | Causa | Correcció i prova |
| --- | --- | --- |
| Volum 1 → 0 acaba desat com a 1 | POST simultanis amb ordre de finalització invers | Reproducció local abans del canvi; escriptures ordenades i agrupació dels ajustos pendents. Reload comprova l’últim valor. |
| Canvis ràpids de disc poden recuperar un disc anterior | Mateixa concurrència de preferències | Cua compartida per sessió; tres seleccions mentre la primera està retinguda acaben amb l’últim disc, també en recarregar. |
| Desar aparença pot substituir música o privadesa d’una altra pestanya | El formulari enviava totes les preferències capturades en obrir-lo | Patch només dels camps editats; canvi extern de volum, disc i mode discret conservat. Sense edicions, cap POST. |
| Un gest de volum envia peticions iguals en keyup/pointerup/blur | Cada esdeveniment persistia incondicionalment | Seguiment de l’últim valor demanat, amb reintent possible després d’un error. |
| La confirmació tapa els botons inferiors al mòbil | Toast fixat a 18px del marge inferior, dins la barra | Posició sobre la navegació segons el layout compacte; comprovació de geometria vertical/horitzontal i controls sense intercepció. |
| La resposta d’una proposta antiga esborra una idea nova pendent | Neteja incondicional de la clau d’esborrany després de publicar o editar | Neteja només després de confirmació i si l’esborrany encara és el que s’ha enviat; edicions no el netegen. Reload comprova la conservació de la idea nova. |
| La prova d’àudio queda en NaN després d’un frame invàlid | El màxim acumulat quedava contaminat permanentment | Frames invàlids comptats i diagnosticats; senyal natiu finit exigit. Injecció d’un frame NaN en el cas de silenci/reentrada. |

## Abast de verificació

Fixtures amb D1 en memòria i mitjans ficticis: continguts, revisió de delegats, esborranys i conflictes; Top 5 PAU, estimació i privadesa; pujades paral·leles i filtre segur; responsive a diverses amplades, vertical i horitzontal; música, reaccions i escenaris de CI. Les comprovacions del navegador no equivalen a proves amb dispositius físics. Web Audio natiu de WebKit no està disponible en aquest Windows; la CI Linux comprova aquest motor amb sortida d’àudio.

Evidències privades a output/platform-polish/ i resultats de les suites locals. La versió 0.6.13 s’ha incorporat via PR33, amb Validate de main i publicació amb rebut verificats.

Resultat local: 388 unitàries i 294 escenaris de navegador correctes, tipus/lint, build i auditoria de font sense troballes; auditoria npm sense vulnerabilitats conegudes. Les sis comprovacions de Web Audio sense suport natiu a Windows es validen a Linux CI. Una recàrrega prematura de la prova de discos cancel·lava el bootstrap a WebKit: la fixture ara espera acabar la sincronització abans de recarregar; conserva totes les assertions.

Publicada **0.6.13**: [release](https://github.com/21052claver-ship-it/lanet/releases/tag/v0.6.13) · [CI](https://github.com/21052claver-ship-it/lanet/actions/runs/38493830734) · [registre](releases/0.6.13.json). Web Audio natiu verificat en els tres motors de Linux CI, sense casos omesos. Comprovació de publicació via proveïdor, sense visitar la web pública.
