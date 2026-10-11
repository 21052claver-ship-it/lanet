# La Net · responsive de mòbil i tauleta

[Obrir La Net](https://lanet.pages.dev). Pages **7e51a088**, branca main, 90 recursos i Worker compilat; publicació confirmada per la CLI de Cloudflare. Els 93 fitxers d’entrada recompilats per publicar coincideixen amb els utilitzats a les proves.

Horari per dies, agenda mensual llegible, notes en targetes amb Parcial 1 / Parcial 2 / Trimestral visibles, barra compacta de tauleta i navegació inferior en mòbil horitzontal. Capçalera alleugerida, filtres sense encavalcaments i finestres adaptades a poca alçada. Tres anuncis 16:9, mode discret, login Google i dades conservats.

48 escenaris de responsive, 120 controls generals, quatre recorreguts de navegadors/dispositius i 174 proves unitàries correctes. Tipus, sintaxi, lint i compilació correctes. Proves locals amb dades fictícies; revisió pública navegada i dispositius físics pendents. No s’han executat migracions ni modificat registres de producció.

[Informe i captures](../PLA-RESPONSIVE.md), [verificació](VERIFICATION-2026-10-11-responsive.md), [metadades](../../output/responsive/publicacio.json), [registre CLI](../../output/responsive/deploy.txt), [publicació anterior](PUBLICACIO-2026-10-11-security-compat.md).

Nota de manteniment, 11-10-2026: el resultat de coincidència dels 93 fitxers es va confirmar en publicar aquesta revisió. El manifest detallat de hashes es va sobreescriure accidentalment després; `output/responsive/tested-build.json` identifica la pèrdua i conserva el resultat històric sense atribuir-hi hashes nous. La utilitat d’exportació ja està corregida. Es conserven les proves, captures, metadades i registre de desplegament originals.
