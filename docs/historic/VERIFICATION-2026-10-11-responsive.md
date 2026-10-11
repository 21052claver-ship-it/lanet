# Verificació · responsive · R55

Pages **7e51a088** publicat a [La Net](https://lanet.pages.dev). Horari per dies en mòbil; calendari mensual amb agenda del dia seleccionat; esdeveniments en finestra amb edició sense diàlegs duplicats. Resum de notes en targetes fins a 1200 px, amb els mateixos inputs, pesos, mode discret i desament.

Barra d’icones de 88 px en tauleta; navegació inferior també en mòbil horitzontal. Capçalera mòbil amb logo, tres anuncis 16:9 i desplaçament amb la pàgina. Filtres de Plusos sense encavalcament. Formularis i desplegables limitats a l’espai visible i botó de tancar disponible durant el desplaçament.

**48/48 escenaris específics, 120/120 controls generals de navegador, quatre recorreguts addicionals i 174/174 proves unitàries correctes.** Chromium, Firefox, WebKit, Chrome i Edge instal·lats i emulacions d’iPhone/Pixel. Tipus, sintaxi, lint i compilació correctes. Captures locals revisades, incloent la pastisseria amb imatges descodificades. Els 93 fitxers del paquet recompilat per publicar coincideixen amb el paquet utilitzat a les proves; escaneig sense fitxers privats ni patrons de credencials detectats.

Les proves utilitzen dades fictícies locals i bloquegen la xarxa externa. No s’han modificat dades de producció ni migracions. La revisió pública navegada, Google real i mòbils/teclats físics continuen pendents; no s’afirma compatibilitat universal.

[Informe, checklist i captures](../PLA-RESPONSIVE.md), [escenaris de responsive](../../output/responsive/responsive-results.json), [regressió general](../../output/responsive/regression/browser-results.json), [Chrome/Edge i emulacions](../../output/responsive/regression/device-results.json), [publicació i integritat](../../output/responsive/publicacio.json), [seguretat anterior](VERIFICATION-2026-10-11-security-compat.md).

Nota de manteniment, 11-10-2026: el resultat de coincidència dels 93 fitxers es va confirmar en publicar aquesta revisió. El manifest detallat de hashes es va sobreescriure accidentalment després; `output/responsive/tested-build.json` identifica la pèrdua i conserva el resultat històric sense atribuir-hi hashes nous. La utilitat d’exportació ja està corregida. Es conserven les proves, captures, metadades i registre de desplegament originals.
