# Verificació · La Net 0.6.17

[Informe i límits](releases/0.6.17.md) · [Mapa funcional](PLA-AUDITORIA-FUNCIONAL.md) · [Estat](ESTAT-PROJECTE.md).

[CI completa](https://github.com/21052claver-ship-it/lanet/actions/runs/38652576530) verda sobre 36631c5d37896318f3b38cb27fd2858322cd73a4, amb tots els jobs i Validate correctes. 449 unitàries, 62 fluxos D1/R2 locals, 179 recorreguts addicionals, tipus/lint/build i audit:source correctes. Inventari de 324 definicions de botó, 29 formularis i 51 fitxers.

Objectiu zero corregit amb prova abans/després; permisos, persistència, cancel·lació, errors/reintents, retirades, exportacions, música i mòbil comprovats. La CI de PR inclou una reexecució acotada del grup d’àudio després d’un error WebKit/Linux reproduït i corregit localment; es conserva la incidència a l’informe.

Chrome/Edge instal·lats; iPhone/Pixel simulats. Sense visites públiques, login Google real ni dispositius físics. El tag/release immutable, digest del rebut, domini/commit/callback i bindings D1/R2 s’han verificat via proveïdor. [Registre segur](releases/0.6.17.json). Worker/migracions intactes i cap desplegament privat, regal o reinici.
