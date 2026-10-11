# Google · única entrada a La Net

**Entrada real comprovada l’11 d’octubre de 2026 a [La Net](https://lanet.pages.dev)**. Mateix client Web, callback nou desat i confirmat per Marc. Nom complet i foto de Google carregats; identitat no editable. [Prova real](../output/brand-lanet/navegador-verificat.json), [perfil](../output/brand-lanet/perfil-escriptori.png).

Marc ha demanat conservar de moment la marca de consentiment **Impossible Goals**, perquè el projecte pot servir l’altra aplicació. No s’ha canviat Google Cloud ni s’ha creat un altre client. El nom «La Net Web» del client és intern de Google i no substitueix la marca de consentiment. Si més endavant es vol una marca pròpia, es prepararà un projecte OAuth separat; no s’ha de canviar la marca compartida.

## Política vigent

Google és l’únic accés. Altes amb compte educatiu @fje.edu, correu verificat i claim signat hd=fje.edu. Nom, cognoms, correu i foto provenen de Google i es sincronitzen en cada entrada. Preferències, curs i assignatures són editables. Els rols existents es conserven. No hi ha contrasenya, registre manual, convidat ni recuperació alternativa. Les sessions antigues s’han de substituir iniciant sessió amb Google.

Identificació pel sub signat. Verificació d’emissor, destinatari, signatura, caducitat, nonce, estat d’un sol ús i PKCE. Només es demanen openid, email i profile; cap accés a Drive, Gmail o Calendar. No se sobreescriuen comptes desactivats o ja vinculats a una altra identitat. [Política i migració R45](PLA-GOOGLE-UNIC.md).

## Callbacks

El client existent ja té desat el callback públic següent. Les variants locals depenen de l’adreça que s’obri:

```text
https://lanet.pages.dev/api/auth/google/callback
http://127.0.0.1:5173/api/auth/google/callback
http://127.0.0.1:5183/api/auth/google/callback
http://localhost:5173/api/auth/google/callback
http://localhost:5183/api/auth/google/callback
```

Les adreces workers.dev retirades ja no gestionen OAuth. Cal entrar a l’adreça pública nova; les cookies pertanyen a cada host. El backend de Pages rebutja l’API de previsualitzacions abans de tocar D1/R2.

## Secrets i trasllat

Els secrets es desen privadament a .dev.vars per al desenvolupament i als secrets de Pages per a producció. No s’imprimeixen ni s’inclouen al ZIP. Per instal·lar-los des del JSON privat:

```powershell
npm run google:configure -- --file "C:\Users\Marc\Downloads\client_secret_CLIENT.json" --remote --confirmed-redirect https://lanet.pages.dev/api/auth/google/callback
npm run pages:deploy
```

Si el callback ja consta al JSON, es pot ometre confirmed-redirect. Aquest argument només és vàlid després de la confirmació manual del callback; ha de coincidir exactament amb wrangler.jsonc. Per al desenvolupament en 5183, afegir --local-origin http://127.0.0.1:5183. Sense --remote només configura local. --check valida sense escriure secrets. Reiniciar el servidor local després d’un canvi.

Per reutilitzar els secrets locals existents a Pages, amb la marca actual conservada:

```powershell
npm run google:pages-configure -- --remote --keep-existing-brand --confirmed-redirect https://lanet.pages.dev/api/auth/google/callback
npm run pages:deploy
```

El configurador fixa compte, projecte, origen, callback i domini educatiu; envia els secrets per stdin. Després d’actualitzar secrets de Pages, cal tornar a publicar. No modifica Google Cloud. El botó queda desactivat si la configuració és incompleta; no existeix cap accés alternatiu.

## Verificació

R46: 156 proves unitàries, 38 fluxos API aïllats, tipus/lint correctes i entrada Google real a la nova adreça. Cap nota, saldo o preferència modificats en la prova pública. Les comparacions locals conserven les dades del paquet anterior. [Informe actual](VERIFICATION.md).

L’accés automatitzat a console.cloud.google.com continua rebutjat per una preferència desada del navegador. No s’ha intentat evitar-lo. El callback l’ha desat Marc; el funcionament s’ha comprovat amb el login normal a accounts.google.com. La marca s’ha deixat com està per la seva indicació posterior.

Fonts: [Google OAuth Web Server](https://developers.google.com/identity/protocols/oauth2/web-server), [verificació d’identitat Google](https://developers.google.com/identity/gsi/web/guides/verify-google-id-token), [secrets de Pages](https://developers.cloudflare.com/pages/functions/bindings/#secrets).

