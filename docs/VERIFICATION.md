# Verificació · La Net 0.6.10

[CI completa](https://github.com/21052claver-ship-it/lanet/actions/runs/38455769429) correcta per a main 61592226ddf77ae7e3fcb545d8c0a805078c9ed3, després de PR23/24.

370 unitàries, incloses les 208 combinacions oficials i la conservació de metadades en desar variants. Clients antics, IDs aliens/duplicats, tipus invàlids, modes general/específic/personal i solapaments comprovats. D1/workerd local verifica tres itineraris i l’edició de Filosofia, Literatura i Llatí amb payload antic.

27 fluxos de navegador locals i 27 a CI en Chromium, Firefox i WebKit; inclosos 9 casos d’edició de variants a 320, 390 i 1440 px. Comprovació que els noms de dia no es comprimeixen verticalment. Tipus/lint, compilació i auditoria correctes.

Catàleg del proveïdor contrastat amb el model: 53 ofertes i 155 franges intactes. Domini, commit canònic, tag/release immutable i digest del rebut verificats. Sense migracions addicionals ni dades de producció modificades. Cap prova contra la web pública ni dispositius físics. La limitació de la suite API històrica general es conserva al registre de 0.6.9; la prova D1 específica és obligatòria a CI. [Registre](releases/0.6.10.json).
