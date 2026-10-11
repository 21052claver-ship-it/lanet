# Verificació · Arrencada mòbil · R61

Publicada la correcció a [La Net](https://lanet.pages.dev), Pages **2f009340**. Pantalla blanca reproduïda en WebKit sense Object.hasOwn i corregida. Component arrel protegit, HTML visible abans de descarregar l’aplicació, càrrega per apartats i recuperació si fallen els scripts o els estils. Reintent i watchdog de 20 segons comprovats, inclosa una descàrrega que arriba tard.

**250 proves unitàries, 50 fluxos API locals D1/R2, 30 escenaris d’arrencada, 135 controls generals, 48 escenaris responsive i 4 perfils de navegador/dispositiu correctes.** Tipus, lint, build i revisió visual correctes. Chrome/Edge i emulació d’iPhone/Android; proves de xarxa interrompuda i d’APIs antigues absents. 110 fitxers publicats iguals als provats, sense dades privades ni patrons de credencial.

HTML sense memòria cau; recursos absents protegits contra fallback HTML. Google únic, D1/R2, PAU, dades i moderació visual conservats. Cap migració ni modificació de dades. La causa del telèfon real encara no està confirmada, la versió d’iOS és desconeguda i no s’ha visitat la web pública ni repetit el login real en aquesta revisió.

[Pla i evidències](../PLA-ARRENCADA-MOBIL.md), [metadades](../../output/mobile-startup/publicacio.json), [verificació Continguts anterior](VERIFICATION-2026-10-11-contents.md).
