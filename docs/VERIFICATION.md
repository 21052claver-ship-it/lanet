# Verificació · La Net 0.6.20

[Informe i límits](releases/0.6.20.md) · [Pla responsive](PLA-RESPONSIVE-2026-10.md) · [Estat](ESTAT-PROJECTE.md).

[CI completa](https://github.com/21052claver-ship-it/lanet/actions/runs/38670864115) verda sobre eeeb5211b4f251da3413aab26f508f99c15099d6: 458 unitàries, 66 escenaris responsive en Chromium/Firefox/WebKit i 45 regressions locals (10 de notificacions, 11 de delegats i 9 d’horari en Chromium, més 15 panoràmiques en tres motors) correctes. Tipus/lint/build/font/enllaços correctes; tots els 11 jobs i Validate de PR/main verds.

Comprovades nou seccions a set amplades; regressions específiques de pestanyes mòbils/paisatge, contingut sense espais, targetes de gestió, catàleg, comptes amb correus/noms llargs, formularis curts i taules d’escriptori. Font abans de push: 687 fitxers, cap troballa; 1.478 enllaços locals correctes. Cap càrrega nova D1/R2 o canvi de backend/permisos/migracions/manteniment.

Fixtures locals i identitats fictícies; amplades mòbils emulades, sense dispositius físics ni zoom real acreditat, login Google real o visites a l’aplicació/API públiques. Tag/release immutable, digest, domini/commit/callback i bindings verificats via proveïdor. [Registre segur](releases/0.6.20.json).
