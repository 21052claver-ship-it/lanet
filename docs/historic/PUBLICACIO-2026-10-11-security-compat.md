# La Net · seguretat i compatibilitat

[Obrir La Net](https://lanet.pages.dev). Desplegament Cloudflare Pages **d0cebb0c**, branca `main`: 90 recursos, Worker compilat i publicació confirmada per la CLI. 23 recursos nous o actualitzats; 67 reutilitzats.

Capçaleres de seguretat aplicades al servidor, protecció d’origen reforçada, límits de peticions i errors controlats. Compatibilitat ampliada amb MP3, PDF.js legacy, reserva de desplegables natius i ajustos mòbils. Es conserven el login exclusiu amb Google, els tres espais d’anuncis i els recursos transparents.

174 proves unitàries, 41 fluxos d’API i 120 controls locals entre motors correctes; recorreguts addicionals en Chrome, Edge i emulacions d’iPhone/Android correctes. Zero vulnerabilitats conegudes segons `npm audit`. No s’han reinicialitzat dades de producció ni aplicat migracions noves.

La CLI acredita el desplegament; la revisió pública navegada continua pendent per permisos del navegador. No s’han provat telèfons físics ni el login real de Google en aquesta revisió. La cobertura i els límits consten a l’informe.

[Informe i checklist](../PLA-SEGURETAT-COMPATIBILITAT.md), [verificació](VERIFICATION-2026-10-11-security-compat.md), [evidència de publicació](../../output/security-compat/publicacio.json), [registre CLI](../../output/security-compat/deploy.txt), [publicació anterior](PUBLICACIO-2026-10-11-bulb-alpha.md).
