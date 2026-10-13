# Verificació · La Net 0.6.9

[CI completa](https://github.com/21052claver-ship-it/lanet/actions/runs/38443480810) correcta per a main 22752b3b2668e6117e1589f6bd4b6ce2db8979b9, després de PR22.

208 combinacions exhaustives: 30 hores setmanals cadascuna, sense coincidències. Transcripció contrastada amb les cinc pàgines del PDF, professorat per dia, optatives, tutoria, aules i pauses. 366 unitàries, 24 fluxos de navegador locals i 24 a CI en tres motors, 15 regressions de targetes i API amb D1/workerd local correctes. Tipus/lint, compilació i auditoria correctes.

Migració assajada sobre una còpia privada exportada de D1: totes les columnes personals anteriors i les plantilles existents conservades, integritat local correcta. Única migració pendent 0026 aplicada separadament amb CI verda; 53 ofertes i 155 franges contrastades exactament via proveïdor.

L’API històrica general test:api s’atura al control antiabús per acumulació d’infraccions deliberades entre escenaris; no es presenta com a passada ni s’han relaxat els controls. La prova específica d’horari és independent i obligatòria a CI.

Domini, desplegament i commit canònic confirmats amb API/CLI del proveïdor; tag, release immutable i SHA-256 del rebut correctes. Cap prova contra comptes reals o la web pública. Dispositius físics no provats. [Registre](releases/0.6.9.json).
