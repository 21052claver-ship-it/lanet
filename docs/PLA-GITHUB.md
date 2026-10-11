# GitHub, Cloudflare i versions

- [x] Identificar 21052claver-ship-it al navegador i CLI, Cloudflare amb 21052.claver@fje.edu.
- [x] Crear repositori públic lanet i revisar exclusió de dades, secrets i originals locals.
- [ ] Pujar codi auditat, verificar autoria i contingut remot.
- [ ] Configurar CI i comprovar execució real a GitHub.
- [ ] Publicació versionada amb Cloudflare i GitHub Deployments; release, tag i rebut del commit exacte.
- [ ] Protegir main contra esborrat/force push, documentar futur manteniment i tancar registre.

La integració conserva Pages Direct Upload i usa sessions locals. GitHub valida cada push; npm run release publica després de CI correcta. No es transfereix un token personal de Cloudflare a GitHub.
