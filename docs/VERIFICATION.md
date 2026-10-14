# Verificació · La Net 0.6.16

[Matriu detallada, incidències i límits](releases/0.6.16.md) · [Estat actual](ESTAT-PROJECTE.md) · [Índex documental](README.md).

[CI completa](https://github.com/21052claver-ship-it/lanet/actions/runs/38638160574) correcta per al commit exacte de main 7f267bb342ecf6dc27040fbe104cb556db86ad51, després de PR38. Tots els jobs, inclòs Validate, correctes.

446 unitàries, tipus/lint, build i auditoria de font correctes. 243 recorreguts del snapshot conjunt més 75 regressions de la correcció CI sobre el build final en Chromium/Firefox/WebKit. Snapshot: primera entrada 18, continguts/retirada 33, recuperació 36, horaris 27, agenda/delegats 15, dashboard 9, focus 30, històric PAU 12, PAU 39 i top 5 24. Migracions/API amb workerd/D1 real en local. Captures revisades, teclat/mòbil/horitzontal i moviment reduït comprovats. El WebKit de Windows no exposa AudioContext: fallback provat; Chromium/Firefox mesuren àudio real. No equival a dispositius físics. La suite API històrica general conserva la limitació registrada a 0.6.9 i no es presenta com a passada.

Artifacts de CI exacta descarregats i comprovats per primera entrada, continguts, agenda/delegats, dashboard, focus, històric PAU, PAU i top 5. Còpia D1 privada restaurada i íntegra, només migracions 0028/0029 i roster autoritzat aplicats, esquema/inventari/àmbits verificats. Manteniment privat separat amb SHA, bindings i cron confirmats pel proveïdor i URL pública/preview desactivades. Domini, commit, callback, tag/release immutable i digest del rebut confirmats. Cap prova contra la web pública ni regals/reinicis/canvis de notes, saldos o rols globals. [Registre](releases/0.6.16.json).
