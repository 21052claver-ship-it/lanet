# Domini principal lanet.es

Tasca única T69-01. Marc autoritza configurar el domini d’IONOS a Cloudflare com a principal, conservant projecte Pages, compte, D1/R2 i Google únic. El 12/10/2026 confirma que el callback OAuth de `lanet.es` ja està desat.

- [x] Revisar instruccions, domini, accés i configuració actual.
- [x] Preparar zona Cloudflare Free i dominis personalitzats del projecte Pages `lanet`.
- [x] Revisar els registres IONOS i conservar correu, TXT i serveis auxiliars.
- [x] Desar els nameservers de Cloudflare a IONOS i detectar-los al DNS públic.
- [ ] Confirmar zona activa i HTTPS vàlid a `lanet.es` i `www.lanet.es`.
- [x] Callback `https://lanet.es/api/auth/google/callback` confirmat per Marc; altres callbacks i marca compartida conservats.
- [x] Preparar origen canònic, redireccions i metadades amb proves locals.
- [ ] Passar PR/CI, publicar 0.6.5 i verificar el rebut i la configuració efectiva.

## Infraestructura

Zona `lanet.es` del mateix compte Cloudflare, pla Free. Nameservers `jakub.ns.cloudflare.com` i `keira.ns.cloudflare.com` desats a IONOS amb confirmació d’èxit. Apex i `www` associats al projecte Pages `lanet`, amb CNAME proxied a `lanet.pages.dev`.

S’han importat nou registres IONOS amb TTL 3600: dos MX de prioritat 10, SPF, DMARC, dos DKIM, autodiscover, Domain Connect i el TXT auxiliar existent. Els registres importats són DNS only; els A/AAAA de la pàgina aparcada d’IONOS se substitueixen pels CNAME web. No s’ha eliminat ni contractat cap servei. Exportació i comprovants en `output/domain-lanet-es`, fora del repositori públic.

SSL en Full (strict), Always Use HTTPS i TLS mínim 1.2; TLS 1.3 i Universal SSL activats. No s’ha desactivat cap protecció DNSSEC: el DNS públic no mostra cap DS preexistent. L’emissió del certificat i la propagació són passos del proveïdor que cal confirmar abans del desplegament canònic.

## Aplicació i accés

0.6.5 prepara `PUBLIC_ORIGIN=https://lanet.es` i `GOOGLE_REDIRECT_URI=https://lanet.es/api/auth/google/callback`. La versió publicada anterior continua activa fins que la infraestructura i CI estiguin verificades. Homepage, enllaços del README i metadades canòniques apunten al domini propi.

El guard de Pages existent serveix l’app només a l’origen principal. La web dels àlies `www.lanet.es`, `lanet.pages.dev` i previsualitzacions redirigeix a l’arrel canònica amb no-store/no-referrer i sense reenviar paràmetres OAuth. L’API dels àlies es rebutja abans d’accedir a dades o secrets. Les cookies de l’adreça antiga no es traslladen: els usuaris iniciaran sessió amb Google al domini nou.

Mateix client Google, marca compartida conservada, accés exclusiu @fje.edu, convidat i mode demo desactivats. Cap canvi de dades, rols, saldo, regals o migracions. Els secrets existents es conserven; no cal regenerar-los.

## Verificació i ordre

1. Registres de correu importats abans de canviar la delegació; confirmació visual IONOS i DNS públic.
2. Zona/Pages actius i cadena TLS vàlida per als dos hosts, sense ignorar errors de certificat.
3. Proves locals de routing, aïllament d’API/OAuth i configuració Google; compilació i CI de la PR.
4. PR fusionada, CI del commit exacte de main, publicació immutable i comprovació del rebut/proveïdor.

Les comprovacions d’infraestructura utilitzen DNS, negociació TLS i API del proveïdor. No visiten l’aplicació pública ni modifiquen dades d’usuaris.
