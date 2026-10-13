# Verificació · La Net 0.6.4

Commit dd7fa5f3c857a51f80c4b345a703d191a51e7bc9. [CI completa](https://github.com/21052claver-ship-it/lanet/actions/runs/38262263060) correcta després de la PR #11. 357 proves unitàries i controls de tipus/lint/build correctes. 39 casos PAU en Chromium/Firefox/WebKit i 24 de recuperació de sessió; cinc disposicions de la icona. Captures locals a 320 i 820 px revisades.

Publicació confirmada per Cloudflare i GitHub, release immutable i digest del rebut verificat. HTTPS real amb validació de certificat a lanet.es i www.lanet.es, HTTP 200 a l’arrel i redirecció www 308. Fitxers publicats de PAU, app, CSS, HTML i icona coincideixen amb SHA-256 del rebut. Status d’accés Google únic correcte i configuració efectiva del callback .es confirmada via proveïdor. D1/R2 EU i MEDIA_SAFETY preservats.

La verificació HTTP utilitza el DNS autoritatiu actual. El navegador obert encara ha retornat un error SSL perquè el seu resolutor conserva la IP antiga d’IONOS; no s’ha ignorat ni desactivat cap validació TLS. Cloudflare UI mostra ambdós dominis Active / SSL enabled i producció La Net 0.6.4. No s’ha iniciat sessió amb un compte real ni provat dispositius físics.

Evidències privades a output/net-pastel, output/pau-visual-verified, output/profile-logout i output/domain-lanet-es. [Registre públic](releases/0.6.4.json).
