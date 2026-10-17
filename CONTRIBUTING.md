# Contribuir a La Net

Pots proposar millores sense tenir permisos d'escriptura al repositori. Treballa en un **fork** i envia una **pull request a `main`**. Marc (`@21052claver-ship-it`) revisa els canvis i decideix si s'incorporen.

## Proposar una millora

1. Prem **Fork** a [21052claver-ship-it/lanet](https://github.com/21052claver-ship-it/lanet).
2. Crea una branca al teu fork, per exemple `millora/menu-mobil`. No treballis directament a `main`.
3. Fes un canvi concret i comprova'l en local. Mantén la interfície en català i l'estil de la plataforma.
4. Puja la branca al teu fork i prem **Contribute → Open pull request**. Selecciona `21052claver-ship-it/lanet`, branca base **main**.
5. Explica què millora, com ho has provat i qualsevol pas de publicació. Respon els comentaris de revisió fent nous commits a la mateixa branca.

Per començar en local calen Node.js 24, npm, Git i Git LFS. Substitueix `EL_TEU_USUARI` pel teu usuari de GitHub:

```sh
git lfs install
git clone https://github.com/EL_TEU_USUARI/lanet.git
cd lanet
git remote add upstream https://github.com/21052claver-ship-it/lanet.git
git switch -c millora/menu-mobil
npm ci
npm run dev
```

El desenvolupament inicia D1 i dades locals. No necessites accés a Cloudflare de producció per proposar canvis. El login real de Google requereix configuració OAuth pròpia; les proves automatitzades utilitzen fixtures locals. No demanis ni copiïs secrets de producció.

Abans d'enviar el canvi, executa:

```sh
npm run typecheck
npm test
npm run pages:build
npm run audit:source
```

Executa també les proves de navegador relacionades amb el canvi. Per exemple, `npm run test:responsive` per al responsive; cal instal·lar abans els navegadors amb `npx playwright install`. Consulta els scripts de `package.json`.

## Revisió i acceptació

Les contribucions externes a `main` exigeixen una pull request. La comprovació **Validate**, de GitHub Actions, ha de passar amb la branca actualitzada. Les converses han d'estar resoltes i les propostes d'altres persones han de tenir l'aprovació de Marc, propietari de tots els fitxers segons `CODEOWNERS`. Si es modifica la proposta després d'aprovar-la, cal tornar-la a revisar.

GitHub pot demanar a Marc que autoritzi l'execució de les proves d'un contribuïdor nou. Aquesta autorització només executa CI; **no accepta la proposta**. Els workflows no reben secrets de producció i no s'utilitza `pull_request_target` per executar codi d'un fork.

Per indicació de Marc del 17 d’octubre de 2026, els canvis propis del propietari s’incorporen sense PR ni peticions de revisió. Es preparen en una branca `codex/`, es comproven els 12 controls, inclòs **Validate**, sobre el commit exacte i s’incorpora aquest mateix SHA a `main` amb un push normal. L’excepció és només per al compte propietari; la CI continua sense bypass. No es permeten force push ni esborrar `main`. [Flux del propietari](docs/FLUX-PROPIETARI.md).

Per acceptar una proposta, Marc obre [Pull requests](https://github.com/21052claver-ship-it/lanet/pulls), revisa **Files changed**, deixa la revisió **Approve**, espera **Validate** verd i prem **Squash and merge** o **Merge pull request**. També pot demanar canvis amb **Request changes** o descartar-la amb **Close pull request**.

## Versions i publicació

Incorporar el commit verificat del propietari, o fusionar una PR externa aprovada, actualitza el codi a GitHub. La web publicada s'actualitza amb un pas separat: Marc sincronitza `main`, espera la CI del commit exacte i executa `npm run release` amb les sessions locals autoritzades. La publicació genera versió, tag, release immutable, GitHub Deployment i rebut de Cloudflare.

Els canvis de producte han de quedar descrits a `CHANGELOG.md`, amb versió coherent a `package.json` i `package-lock.json`; coordina la numeració si hi ha diverses PR obertes. Els canvis només documentals no necessiten publicar producte. [Flux de versions](docs/VERSIONS.md).

No pugis `.cache`, `.cloud`, `.wrangler`, `output`, còpies de seguretat, exportacions, `.dev.vars`, credencials ni dades/fotos reals d'usuaris. Utilitza exemples ficticis, conserva les atribucions dels recursos i descriu qualsevol canvi de migracions, permisos o bindings. No facis proves contra la web o la base de dades públiques.

El registre històric referencia evidències privades conservades al lloc de treball del mantenidor. `npm run plan:check` necessita aquestes evidències i no és un requisit per a un fork acabat de clonar.
