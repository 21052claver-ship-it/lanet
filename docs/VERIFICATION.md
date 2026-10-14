# Verificació · La Net 0.6.13

[CI completa](https://github.com/21052claver-ship-it/lanet/actions/runs/38493830734) correcta per a main 6a00486a0534f5305071beece77e66e118fc5540, després de PR33.

388 unitàries, tipus/lint, build, auditoria de font i npm audit correctes. 294 fluxos locals correctes en Chromium/Firefox/WebKit: preferències, continguts, PAU, pujades ràpides, responsive, seguretat de pujades, música, reaccions, recuperació i àudio. Captures revisades; no equival a proves amb dispositius físics.

CI verifica 24 casos de preferències, 33 de recuperació i 21 d’àudio natiu sense salts, i tots els grups de regressió habituals. Confirmacions separades de la navegació vertical/horitzontal; última selecció conservada amb xarxa lenta i errors; perfil sense sobreescriure privadesa o música; resposta antiga sense esborrar idees noves. La suite API històrica general conserva la limitació registrada a 0.6.9 i no es presenta com a passada; la prova específica D1 d’horaris sí que passa a CI.

Domini, commit canònic, tag/release immutable i digest del rebut verificats via proveïdor. Sense migracions, proves contra la web pública ni dades reals modificades. [Registre](releases/0.6.13.json).
