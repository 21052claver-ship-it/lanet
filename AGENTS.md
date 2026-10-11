# La Net · treball i publicació

- Mantén una sola tasca activa a docs/SEGUIMENT.json; actualitza checklist i historial amb evidències. No executis scripts antics de regals, reinicis, migracions o finalització sense revisar-ne l’abast.
- No accedeixis a lanet.pages.dev ni a la seva API per fer proves sense nova autorització explícita. Les proves han d’utilitzar fixtures locals; es permet verificar desplegaments/configuració via API/CLI del proveïdor.
- No publiquis .cloud, .cache, output, backups, exports, .dev.vars, secrets OAuth, dades d’usuaris ni fotos de perfils. npm run audit:source ha de passar abans de push.
- GitHub: 21052claver-ship-it/lanet. Autoria de commits: 21052.claver@fje.edu. Verifica el compte amb gh api user; no facis servir els altres comptes del dispositiu. La sessió específica local està a .cache/gh-lanet, ignorada per Git.
- Cada nova publicació de producte: incrementa package.json/package-lock.json, afegeix CHANGELOG.md, executa proves apropiades, commit i push. Publica amb npm run release després de CI verda; genera tag, release i Deployment amb commit i rebut. No sobreescriguis tags/releases existents. Els commits només documentals no requereixen publicar producte.
- Conserva lanet.pages.dev, compte Cloudflare fixat a cloudflare-target.json, D1/R2 i Google únic. No canviïs marca OAuth compartida ni concedeixis regals de nou.
- El pipeline no aplica migracions de producció ni desplega serveis privats automàticament: prepara còpia privada, revisa migració i verifica aquests passos separadament quan calgui.
- GitHub CI no rep secrets de producció. La publicació usa les sessions locals existents i mai desa un token OAuth personal a GitHub.
