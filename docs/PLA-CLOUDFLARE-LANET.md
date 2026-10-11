# La Net com a aplicació pròpia de Cloudflare

Marc demana crear una aplicació nova i confirma que ha de ser **dins del compte actual**, no un compte nou. Nom seleccionat: `lanet`. El compte autenticat és el de 21052.claver@fje.edu; el seu identificador queda fixat a `wrangler.jsonc`.

## Ordre de treball

1. **T30-01 — Configuració i comprovacions.** Registrar l’abast, fixar nom i compte, configurar el nou callback i fer que el configurador de Google llegeixi la destinació real. Comprovar que un JSON amb el callback antic falla abans d’escriure variables o secrets.
2. **T30-02 — Crear i verificar l’aplicació.** Compilar i publicar `lanet`, confirmar versió, adreça, bindings i metadades dels secrets amb Wrangler. Connectar els recursos existents de La Net (`la-net-db` i `la-net-files`) per conservar perfils, notes i adjunts. No calen migracions ni importacions per aquest canvi.
3. **T25-05 — Activar Google.** Completat: JSON real fora del projecte, nou callback confirmat per Marc, secrets locals/remots configurats i entrada real comprovada amb nom, cognoms i foto. Incompatibilitat de redirects workerd reproduïda i corregida. [Evidència real](../output/google-auth/entrada-real-verificada.json).

Només hi ha una tasca activa. La checklist es genera des de `SEGUIMENT.json`; cada tancament deixa evidència i una entrada a l’historial.

## Destinacions

- Nova aplicació: `lanet`, URL prevista `https://lanet.impossible-goals-research.workers.dev`.
- Aplicació anterior: `la-net`. Es conserva; no és la destinació dels desplegaments nous.
- El subdomini `impossible-goals-research.workers.dev` pertany al compte actual i es comparteix entre les seves aplicacions. No es modifica el subdomini del compte.
- D1 i R2 són els recursos dedicats de La Net que ja existeixen. Les dues versions de La Net comparteixen aquestes dades durant la transició.
- El JSON OAuth i els secrets no s’inclouen al codi, a la documentació ni als ZIP.

## Criteris de tancament

- `lanet` apareix com a Worker nou, amb el compte fixat i els bindings correctes.
- El frontend i l’API publicats corresponen a les fonts verificades.
- La publicació no escriu notes, saldos ni perfils, ni altera l’aplicació anterior.
- Google només s’anuncia com a activat després de configurar els secrets i comprovar el retorn real del compte educatiu.
- Els límits de revisió del navegador i qualsevol pas extern pendent queden explícits.
