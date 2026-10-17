# Versions i Cloudflare

Repositori públic: [21052claver-ship-it/lanet](https://github.com/21052claver-ship-it/lanet). Aplicació principal: [lanet.es](https://lanet.es); es conserva `lanet.pages.dev`.

[Índex documental](README.md) · [Estat actual](ESTAT-PROJECTE.md) · [Publicació 0.6.24](releases/0.6.24.md).

## Flux

1. Actualitza versió SemVer a package.json/package-lock.json i descriu el canvi a CHANGELOG.md.
2. Executa els controls locals adients; actualitza el pla i l’historial.
3. Crea una branca, fes commit i push amb el compte 21052claver-ship-it i correu d’autoria 21052.claver@fje.edu; obre una pull request a main. Les contribucions externes arriben des de forks segons [CONTRIBUTING.md](../CONTRIBUTING.md).
4. Espera Validate verd i la revisió de Marc per a contribucions externes; resol converses i fusiona la PR. Sincronitza main local amb main remota i espera Verify La Net verd per al commit fusionat exacte. Les PR pròpies del propietari tenen una excepció de revisió, però no de CI.
5. Executa `npm run release`. Comprova identitat, main remota, arbre net, versió/tag, CI i destinació fixada. Compila, publica Pages, confirma el desplegament via proveïdor i crea Deployment/release a GitHub amb rebut JSON i notes.
6. Registra les evidències locals; les dades privades no es pugen a GitHub.

GitHub executa els controls automàticament a push/PR. La publicació s’executa des de la sessió local amb `npm run release`; no es publica automàticament cada push. Això reutilitza els accessos existents sense copiar credencials personals de Cloudflare a GitHub.

La CI usa Ubuntu 24.04, FFmpeg i una sortida virtual PulseAudio perquè Firefox pugui reproduir àudio real sense altaveus físics. Les proves exigeixen durada i avanç del temps de reproducció. PulseAudio és el backend principal de Linux de [Mozilla cubeb](https://github.com/mozilla/cubeb).

Pages es va crear amb Direct Upload; Cloudflare no permet convertir-lo a integració Git nativa. La integració usa Wrangler i GitHub Deployments i conserva l’adreça actual. Font oficial: https://developers.cloudflare.com/pages/get-started/direct-upload/.

## Versions i recuperació

Els tags apunten al codi comprovat. El rebut adjunt inclou versió, SHA, execució CI, ID de Cloudflare i fitxers compilats amb SHA-256. Les revisions anteriors al repositori es documenten a HISTORIAL-CANVIS.md.

Si falla després de publicar Pages, el rebut privat a output/releases permet completar metadades de la mateixa versió sense inventar un segon desplegament. Una release publicada no es modifica ni es retaggeja: qualsevol canvi de producte necessita versió nova.

El pipeline no aplica SQL remot, no reinicia pastissos i no modifica secrets/serveis privats. Les proves de navegador es fan només contra fixtures locals. El pla històric referencia evidències privades d’output que no existeixen en un clon públic; `plan:check` és el control complet de l’espai local que les conserva.

## Àudio

Els MP3/Ogg de public/audio es desen amb Git LFS (~259 MiB). Cal Git LFS instal·lat en clonar i abans de compilar. CI els descarrega explícitament. Llicències i atribucions a public/licenses. L’emmagatzematge i descàrregues LFS estan subjectes a la quota de GitHub.
