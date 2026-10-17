# Versions i Cloudflare

Repositori públic: [21052claver-ship-it/lanet](https://github.com/21052claver-ship-it/lanet). Aplicació principal: [lanet.es](https://lanet.es); es conserva `lanet.pages.dev`.

[Índex documental](README.md) · [Estat actual](ESTAT-PROJECTE.md) · [Publicació 0.6.26](releases/0.6.26.md).

## Flux

1. Actualitza versió SemVer a package.json/package-lock.json i descriu el canvi a CHANGELOG.md.
2. Executa els controls locals adients; actualitza el pla i l’historial.
3. Prepara els canvis propis en una branca codex/, fes commit i push amb el compte 21052claver-ship-it i correu d’autoria 21052.claver@fje.edu. La CI de push s’executa a main i codex/**. No obris PRs ni peticions de revisió per als canvis propis. [Flux del propietari](FLUX-PROPIETARI.md).
4. Espera els 12 controls, inclòs Validate, tots verds al commit exacte, amb la branca basada en main actualitzada; incorpora aquest mateix SHA a main amb un push normal. Les contribucions externes continuen passant per PR, converses resoltes i aprovació de Marc. Sincronitza main local amb main remota i espera Verify La Net verd del commit exacte de main abans de publicar.
5. Executa `npm run release`. Comprova identitat, main remota, arbre net, versió/tag, CI i destinació fixada. Compila, publica Pages, confirma el desplegament via proveïdor i crea Deployment/release a GitHub amb rebut JSON i notes.
6. Registra les evidències locals; les dades privades no es pugen a GitHub.

GitHub executa els controls automàticament als push de main/codex/** i a les PR externes. La publicació s’executa des de la sessió local amb `npm run release`; no es publica automàticament cada push. Això reutilitza els accessos existents sense copiar credencials personals de Cloudflare a GitHub.

La CI usa Ubuntu 24.04, FFmpeg i una sortida virtual PulseAudio perquè Firefox pugui reproduir àudio real sense altaveus físics. Les proves exigeixen durada i avanç del temps de reproducció. PulseAudio és el backend principal de Linux de [Mozilla cubeb](https://github.com/mozilla/cubeb).

Pages es va crear amb Direct Upload; Cloudflare no permet convertir-lo a integració Git nativa. La integració usa Wrangler i GitHub Deployments i conserva l’adreça actual. Font oficial: https://developers.cloudflare.com/pages/get-started/direct-upload/.

## Versions i recuperació

Els tags apunten al codi comprovat. El rebut adjunt inclou versió, SHA, execució CI, ID de Cloudflare i fitxers compilats amb SHA-256. Les revisions anteriors al repositori es documenten a HISTORIAL-CANVIS.md.

Si falla després de publicar Pages, el rebut privat a output/releases permet completar metadades de la mateixa versió sense inventar un segon desplegament. Una release publicada no es modifica ni es retaggeja: qualsevol canvi de producte necessita versió nova.

El pipeline no aplica SQL remot, no reinicia pastissos i no modifica secrets/serveis privats. Les proves de navegador es fan només contra fixtures locals. El pla històric referencia evidències privades d’output que no existeixen en un clon públic; `plan:check` és el control complet de l’espai local que les conserva.

## Àudio

Els MP3/Ogg de public/audio es desen amb Git LFS (~259 MiB). Cal Git LFS instal·lat en clonar i abans de compilar. CI els descarrega explícitament. Llicències i atribucions a public/licenses. L’emmagatzematge i descàrregues LFS estan subjectes a la quota de GitHub.
