# R42 · Pastisseria simple

Petició: simplificar la pastisseria, retirar les salutacions i els moviments artificials dels braços; treure objectes del taulell quan millorin la claredat.

## Ordre de treball

- [x] T29-01 · Definir composició i acceptació.
- [x] T29-02 · Implementar una escena estable i una seqüència curta.
- [x] T29-03 · Verificar fotogrames, temps, estats i regressions.
- [x] T29-04 · Publicar, fer còpies i lliurar ZIP verificat.

Una única tasca activa. Dependències i proves a SEGUIMENT.json; historial append-only. Aquesta revisió substitueix la coreografia de R37, sense reobrir les altres seccions de la plataforma.

## Disseny seleccionat

Pastissera sencera integrada en la il·lustració, en una postura tranquil·la darrere del taulell. Cap extremitat separada, cap salutació, cap caminada o balanceig. Taulell buit per donar protagonisme al pastís. Exterior i art de la resta de La Net preservats.

Seqüència de 7,2 segons: escalfar (0–0,8 s), coure (0,8–4,8 s), reposar (4,8–6,2 s), presentar suaument el pastís (6,2–7,2 s). Botó al costat de la pastissera només quan el pastís està llest. Després de recollir, escena quieta sense repetir gestos.

Només es mouen llum i escalfor dins del forn, la pujada del pastís durant quatre segons i la seva aparició final de pocs píxels. Porta fixa: elimina deformacions i una acció de mans fictícia. El moviment reduït ofereix el pastís directament, com abans.

## Acceptació

No han de veure’s talls del cos, peus sota el taulell, fragments de braços, salutacions o decoració que tapi el pastís. La imatge del pastís que vola al saldo coincideix amb la del taulell. Una sola recompensa diària, botó protegit contra duplicats, pausa amb pestanya oculta i cancel·lació en sortir preservades.

Proves amb rellotge virtual, API local aïllada, SSR dels components reals, SVG i rasterització offline, inspecció de fotogrames, lint/tipus i compilació. Navegació al web local/públic continua denegada: cap afirmació de reproducció real en navegador, focus o responsive observat. Google OAuth extern continua pendent (T25-05), fora d’aquest canvi.
