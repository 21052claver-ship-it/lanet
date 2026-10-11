# Marca i adreça pròpies de La Net · R46 / F33

Petició: eliminar ImpossibleGoals tant del login com de l’enllaç públic. El nom de consentiment depèn del projecte OAuth de Google; el subdomini workers.dev depèn del compte de Cloudflare. Canviar noms de clients OAuth o el Worker, tot sol, no resol aquestes dues aparicions.

## Abast vigent confirmat per l’usuari

L’usuari ha desat el callback https://lanet.pages.dev/api/auth/google/callback al client existent. Després ha indicat que el compte/projecte també pot servir ImpossibleGoals i ha demanat deixar la marca Google com està de moment. No es modifica Google Cloud ni es crea un altre client. Es completa només l’adreça independent i es connecta el client actual, conservant la marca del consentiment. Aquesta indicació substitueix el canvi de marca previst inicialment a T33-03.

## Pla inicial (marca Google ajornada)

1. T33-01: auditar origen i dependències; conservar les versions i el paquet anterior.
2. T33-02: preparar una aplicació Cloudflare Pages pròpia, amb adreça pages.dev de La Net i el mateix backend/D1/R2. Publicar en preparació, sense reutilitzar un client OAuth amb marca aliena.
3. T33-03: configurar projecte Google i pantalla de consentiment La Net, amb client Web i callback de l’adreça nova. Mateixos permisos openid/email/profile i altes @fje.edu. Comprovar entrada real abans del canvi definitiu.
4. T33-04: només després, redirigir les adreces anteriors de La Net, validar recursos i fluxos, actualitzar documents i exportar un paquet complet verificat.

## Criteris i preservació

- Una sola tasca activa. No es renomena el subdomini workers.dev de tot el compte, perquè afectaria aplicacions d’ImpossibleGoals.
- No es canvia la marca del projecte Google Impossible Goals compartit. La Net ha de tenir un projecte OAuth propi.
- Cap migració de dades, fusió d’usuaris, canvi de rol, nota, saldo o preferència. Es reutilitzen D1 i R2 de La Net a la mateixa jurisdicció.
- Només Google; identitat protegida i domini educatiu preservats. A la nova adreça caldrà iniciar sessió perquè les galetes són de cada host.
- L’adreça actual continua operativa fins que la nova entrada Google estigui comprovada. Sense credencials pròpies, la nova aplicació tanca l’accés i no ofereix alternatives de convidat o contrasenya.
- Secrets i JSON de Google fora del repositori i del ZIP.

## Accés a Google Cloud

L’usuari ha confirmat l’11 d’octubre que té la consola oberta i ha autoritzat operar-hi. En vincular la pestanya 2, l’eina ha retornat una denegació per un permís desat del navegador. No s’han provat vies alternatives ni un altre navegador. La configuració Google requereix restablir l’accés o que l’usuari faci aquesta part des de la consola.

Fonts: [Cloudflare Pages en mode avançat](https://developers.cloudflare.com/pages/functions/advanced-mode/), [configuració de Pages](https://developers.cloudflare.com/pages/functions/wrangler-configuration/), [subdominis workers.dev](https://developers.cloudflare.com/workers/configuration/routing/workers-dev/).

## Resultat R46

Adreça pública **https://lanet.pages.dev**, desplegament Pages `46d60224-3df8-4d1a-9ed6-002d3cf6dd25`. Entrada Google real completada, nom/foto carregats i perfil sense camps d’identitat editables en 1280×720 i 390×844. Marca Google conservada per la darrera indicació de Marc; el pla inicial de marca pròpia no s’ha executat.

Dos Workers antics redirigits després de verificar l’entrada: `lanet` versió `45b72faa-aa68-4f40-a8a7-4d7ea8dd965f`, `la-net` versió `6ecd17f9-1a40-4d06-b310-21c6eb1b5167`. Cap binding D1/R2/Assets; APIs 410. Els secrets antics que Cloudflare conserva com a bindings no s’utilitzen pel codi de redirecció. El domini `la-net` bloquejat no s’ha visitat; la seva retirada es comprova amb proves i metadades.

156 proves, 38 fluxos API i tipus/lint correctes; 58 recursos públics idèntics al build. 186 fitxers de producte/art/migracions i 30 fitxers d’estat local idèntics al paquet anterior. Cap migració nova ni importació de dades. L’exportació omet secrets i `dist-pages`, que es regenera amb el script de build. Vegeu [informe actual](VERIFICATION.md) i [evidències](../output/brand-lanet/publicacio-verificada.json).
