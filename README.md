# La Net

Plataforma per a estudiants de segon de batxillerat, en català, amb horaris oficials, agenda, materials compartits, notes, estudi i PAU. React al frontend i Cloudflare Pages/Workers amb D1 i R2 al mateix origen.

**[Obrir La Net](https://lanet.es)** · **[Documentació ordenada](docs/README.md)** · **[Estat actual i decisions](docs/ESTAT-PROJECTE.md)**

## Versió publicada

**0.6.26 · 17 d’octubre de 2026.** El panell de delegats té una icona pròpia de representants amb bafarada i els colors de La Net. La mateixa icona identifica el menú lateral desplegat/plegat, el menú mòbil i la capçalera del panell.

[Informe Markdown](docs/releases/0.6.26.md) · [Release immutable](https://github.com/21052claver-ship-it/lanet/releases/tag/v0.6.26) · [CI del commit publicat](https://github.com/21052claver-ship-it/lanet/actions/runs/39064162350) · [CHANGELOG](CHANGELOG.md)

La versió publicada correspon al commit `a3070589da656348f6180ad0942c3236cf71a54e`. El tancament documental posterior no és un nou desplegament. Resultats i límits a [VERIFICATION.md](docs/VERIFICATION.md); pendents al [registre](docs/SEGUIMENT.json).

## Què inclou

- **Google i perfil:** única entrada amb compte educatiu del centre, identitat sincronitzada i protegida, preferències i tancament de sessió.
- **Benvinguda:** pàgina pròpia per al primer accés, itinerari, optatives/professorat i revisió de l’horari.
- **Horari i Agenda:** catàleg oficial, alta contextual de tasques/exàmens i publicació directa dels representants autoritzats o propostes públiques revisades pels delegats del mateix àmbit.
- **Continguts:** Materials, Formularis i Eines i webs per assignatura/tema, cerca i desats. Xat/Dubtes i preguntes des de materials retirats; històric conservat.
- **Notes i Plusos:** proves/activitats i pesos configurables, mode discret, desat recuperable i plusos corregits sobre la nota final del curs.
- **Estudi:** Pomodoro continu amb alarma o estudi lliure amb fons, mode focus accessible, música compartida i cua offline idempotent.
- **PAU i universitat:** top 5, ponderacions, calculadora i històric oficial amb rondes, cobertura i provisionalitat explícites.
- **Comunitat i anuncis:** avisos, propostes, delegats/notificacions i cartells visuals amb identitat opcional i retall d’imatge.
- **Pastisseria i sales de joc:** recursos visuals, recollida, ruleta i prediccions amb pastissos virtuals; regles i actuacions històriques als plans corresponents.
- **Gestió i manteniment:** gestió acadèmica segons permisos, dashboard privat, mostreig limitat, retenció i manteniment programat privat.

## Desenvolupament local

Requisits: **Node.js 24**, npm, Git i Git LFS. Els àudios de `public/audio` utilitzen LFS; descarrega’ls en clonar. No cal accés a dades de producció per contribuir.

```powershell
npm ci
npm run dev
```

Per defecte: web a `http://127.0.0.1:5173` i API local al port 8787. Els ports de desenvolupament poden ajustar-se amb `LANET_WEB_PORT` i `LANET_API_PORT`. `npm run dev` prepara dades locals; no és una ordre de migració de producció.

El login real continua requerint una configuració Google pròpia per a l’origen local. Les proves automatitzades usen fixtures fictícies i no necessiten secrets de producció. [Configuració OAuth](docs/GOOGLE-OAUTH.md).

## Comprovacions

```powershell
npm run typecheck
npm test
npm run pages:build
npm run audit:source
```

Executa també les regressions relacionades amb el canvi. La CI comprova el codi i els fluxos de navegador amb fixtures locals; les proves emulades no equivalen a mòbils físics. `npm run plan:check` valida seguiment/checklist al lloc de treball amb les evidències històriques privades; no és un requisit executable en un fork acabat de clonar.

## Contribuir i publicar

Qualsevol persona pot proposar millores amb un **fork i una pull request a main**. Marc revisa les contribucions externes. [CONTRIBUTING.md](CONTRIBUTING.md) explica el flux complet; [AGENTS.md](AGENTS.md) fixa els controls del projecte.

Els canvis propis del propietari segueixen el [flux directe sense PR](docs/FLUX-PROPIETARI.md): branca codex/, 12 controls, inclòs Validate, tots verds, i incorporació del mateix SHA a main amb un push normal. Per a producte: versió/lock i CHANGELOG, comprovacions locals i CI del commit exacte de main. La publicació es fa amb `npm run release` des d’una sessió local autoritzada i un main net, i genera tag/release immutable, GitHub Deployment i rebut de Cloudflare. Els passos de D1/R2 i serveis privats, si calen, es revisen i verifiquen separadament. Els canvis només documentals no requereixen desplegar producte. [Versions i publicació](docs/VERSIONS.md).

L’origen principal és `https://lanet.es`; `lanet.pages.dev` es conserva. [cloudflare-target.json](cloudflare-target.json) fixa la destinació; `wrangler.jsonc` configura Pages. Google és l’únic accés, i la marca OAuth compartida es conserva per decisió de Marc.

## Estructura

| Directori | Responsabilitat |
| --- | --- |
| `src/` | Interfície React i estils |
| `worker/` | API, autorització i manteniment |
| `shared/` | Regles i càlculs compartits |
| `public/` | Assets, catàlegs i llicències |
| `migrations/` | Esquemes versionats; no repetir migracions aplicades |
| `tests/` i `scripts/` | Fixtures, regressions i eines revisables |
| `docs/` | Estat, plans, seguiment, historial i publicacions |

## Privadesa i històric

Les proves funcionals utilitzen fixtures locals. No s’accedeix a l’aplicació pública ni a la seva API per provar sense nova autorització explícita. La verificació del desplegament es fa via proveïdor segons les instruccions del projecte.

No es publiquen `.cache`, `.cloud`, `output`, backups, exports, `.dev.vars`, secrets OAuth, sessions ni dades/fotografies d’usuaris. Llicències dels assets a `public/licenses`. No copiar identitats del roster als informes.

[Historial de canvis](docs/HISTORIAL-CANVIS.md) · [Checklist](docs/CHECKLIST.md) · [Arxiu del README anterior](docs/historic/README-2026-10-14-HISTORIC.md)
