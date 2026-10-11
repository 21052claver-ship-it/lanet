# GitHub, Cloudflare i versions

- [x] Identificar 21052claver-ship-it al navegador i CLI, Cloudflare amb 21052.claver@fje.edu.
- [x] Crear repositori públic lanet i revisar exclusió de dades, secrets i originals locals.
- [x] Pujar codi auditat, verificar autoria i contingut remot.
- [x] Configurar CI i comprovar execució real a GitHub.
- [x] Publicació versionada amb Cloudflare i GitHub Deployments; release, tag i rebut del commit exacte.
- [x] Protegir main contra esborrat/force push, documentar futur manteniment i tancar registre.

La integració conserva Pages Direct Upload i usa sessions locals. GitHub valida cada push; npm run release publica després de CI correcta. No es transfereix un token personal de Cloudflare a GitHub.

Publicada https://github.com/21052claver-ship-it/lanet/releases/tag/v0.2.0. Commit 2ee68351833edf9e3ed85f4013ebce76bfe53b78, Pages 0b889c30, GitHub Deployment 7003323563. CI real correcta: 324 unitàries, 9 escenaris del menú, 48 responsive i 135 generals. Codi i 50 àudios LFS pujats; 6 imatges de runtime conservades amb hashes idèntics. Fonts PAU públiques fixades per a tests reproduïbles. Dades, secrets i evidències privades excloses.

GitHub CI valida push/PR; la publicació és npm run release des de la sessió local. No hi ha desplegament automàtic de cada push ni token personal de Cloudflare a GitHub. Main protegida contra esborrat/force push, releases immutables, secret scanning/push protection i Dependabot configurats.

