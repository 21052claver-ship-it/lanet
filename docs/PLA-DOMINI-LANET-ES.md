# Domini principal lanet.es

Tasca única T69-01. L'usuari autoritza configurar el seu domini d'IONOS a Cloudflare com a principal. Aquesta petició permet substituir l'origen públic fixat anteriorment, conservant el mateix projecte Pages, compte, D1/R2 i Google únic.

- [x] Revisar instruccions, domini, accés i configuració actual.
- [x] Preparar zona Cloudflare i dominis personalitzats del projecte Pages `lanet`.
- [ ] Revisar/exportar registres d'IONOS i conservar correu, TXT i altres serveis.
- [ ] Configurar els nameservers assignats per Cloudflare a IONOS i confirmar la delegació.
- [ ] Comprovar HTTPS vàlid a `lanet.es` i `www.lanet.es`.
- [ ] Afegir `https://lanet.es/api/auth/google/callback` al client OAuth existent, conservant els callbacks i la marca compartida.
- [ ] Preparar l'origen canònic, redireccions i metadades amb proves locals.
- [ ] Obrir PR, passar CI, publicar la nova versió i registrar el rebut.

## Situació inicial

`lanet.pages.dev` continua sent l'origen de la versió 0.6.1. El punt d'entrada Pages ja impedeix accedir a API des d'orígens alternatius i redirigeix la web a `PUBLIC_ORIGIN`; no s'activarà `lanet.es` com a origen fins a tenir DNS, HTTPS i callback Google preparats.

La pestanya d'IONOS estava oberta amb informació anterior. En actualitzar-la, el servei ha demanat iniciar sessió. S'ha deixat el formulari de contrasenya preparat per a `lanet.es`; no es demana ni es desa la contrasenya al projecte.

El DNS local i el resolutor públic de Cloudflare retornen NXDOMAIN per a `lanet.es` i `www.lanet.es` (NS, A/AAAA, MX, TXT, CAA i DS). Això no permet concloure si el registre del domini encara està en procés; cal confirmar-lo al panell d'IONOS. Evidència privada: `output/domain-lanet-es/dns-before.json`.

## Ordre i preservació

Primer infraestructura i verificació; després canvi d'origen i publicació. No comprar ni transferir el domini, canviar titularitat, eliminar serveis de correu o modificar la marca OAuth compartida. Sense reinicis, regals, migracions de dades ni canvi de permisos dels usuaris. Cap secret ni dada del compte d'IONOS es publica al repositori.

Per servir l'arrel `lanet.es` amb Pages cal una zona del mateix compte i delegar als seus nameservers. Referència: [dominis personalitzats de Cloudflare Pages](https://developers.cloudflare.com/pages/configuration/custom-domains/).

## Configuració preparada a Cloudflare

Zona `lanet.es` creada al compte fixat, pla Free. Els dos dominis consten al projecte Pages `lanet`, pendents de verificació. Registres creats i confirmats al panell:

| Tipus | Nom | Destinació | Proxy | TTL |
| --- | --- | --- | --- | --- |
| CNAME | `@` | `lanet.pages.dev` | Activat | Auto |
| CNAME | `www` | `lanet.pages.dev` | Activat | Auto |

Nameservers assignats: `jakub.ns.cloudflare.com` i `keira.ns.cloudflare.com`. Encara **no** s'han configurat a IONOS. Abans de delegar, revisar els registres existents d'IONOS i copiar els de correu/TXT/altres serveis necessaris.

SSL configurat en `Full (strict)`, `Always Use HTTPS` activat i TLS mínim 1.2; TLS 1.3 i Universal SSL continuen activats. El certificat encara no consta emès: cal delegació i verificació del domini. No s'ha activat HSTS addicional ni fet cap canvi a altres zones.

Evidències privades: `output/domain-lanet-es/pages-domains.json`, `cloudflare-dns.jpg`, `cloudflare-tls.jpg` i `cloudflare-https.jpg` dins del mateix directori.

## Accés pendent i canvi final

IONOS continua al formulari de contrasenya. L'usuari ha de completar el login en aquella pestanya, sense compartir la contrasenya al xat. La consola de Google està bloquejada per un permís desat del navegador de Codex; no es pot completar aquell canvi des de l'automatització ni esquivar el bloqueig.

Cal afegir **`https://lanet.es/api/auth/google/callback`** a «URIs de redireccionamiento autorizados» del client existent. Conservar els altres callbacks i la marca OAuth compartida. No cal regenerar secrets.

Després de verificar DNS, certificat HTTPS vàlid i callback desat:

1. Canviar `public_origin` de `cloudflare-target.json` i `PUBLIC_ORIGIN` de `wrangler.jsonc` a `https://lanet.es`; `GOOGLE_REDIRECT_URI` a `https://lanet.es/api/auth/google/callback`.
2. Actualitzar homepage i documentació actual; conservar les adreces històriques de releases.
3. Executar proves, passar PR/CI i publicar amb el procés de versions. No desplegar directament una configuració que no ha passat aquest ordre.
4. Confirmar origen/callback/bindings via proveïdor i verificar HTTPS de `lanet.es` i `www.lanet.es`. El guard existent redirigeix les visites web dels àlies a l'arrel canònica; no reenvia codis OAuth ni permet API als àlies.

La branca inclou regressions locals del domini propi, redirecció dels àlies i aïllament OAuth. El test de configuració Google deriva el callback de l'origen fixat per continuar sent vàlid després de la migració. La configuració de producció encara és la de `lanet.pages.dev`; T69-01 continua en curs.
