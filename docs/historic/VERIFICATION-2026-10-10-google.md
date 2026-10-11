# Verificació de La Net · Google R38

10 d’octubre de 2026. **38 requisits, 26 fases, 107/108 tasques verificades.** [Pla](PLA-GOOGLE.md), [checklist](CHECKLIST.md) i [historial](HISTORIAL-CANVIS.md). L’informe R37 es conserva a [historic/VERIFICATION-2026-10-10-bakery-pace.md](historic/VERIFICATION-2026-10-10-bakery-pace.md).

## Resultat i activació pendent

Codi de Google Sign-In publicat: nom, cognoms i foto al perfil, connexió des del compte existent i conversió del convidat conservant dades. Altes noves només @fje.edu, amb claim signat hd=fje.edu. Els usuaris existents no es vinculen automàticament per coincidència de correu.

**El client OAuth real encara no s’ha creat ni configurat.** Google Cloud ha estat rebutjat dues vegades; el segon intent, amb permís explícit renovat, informa d’una preferència desada que bloqueja el domini. No s’ha intentat cap via alternativa. El botó mostra honestament que encara no està disponible. [Estat](../output/google-auth/activacio.json), [activació](GOOGLE-OAUTH.md).

## Comprovacions

| Comprovació | Resultat | Evidència |
| --- | --- | --- |
| Proves unitàries | **115/115**, incloses 33 noves de Google/configuració | [log](../output/google-auth/unit.txt) |
| D1/R2 aïllats | **33 fluxos** reals en localhost:8791; PKCE, cookie, cancel·lació/replay i perfil | [resultat](../output/google-auth/api-result.json) |
| JWT i comptes | Firma, algorisme, issuer, aud/azp, nonce, exp/iat, correu verificat, hd, sessió iniciadora, conversions, permisos i col·lisions | [proves](../tests/google-auth.test.js), [JWT](../tests/google-token.test.js) |
| Tipus/lint | Correctes | [log](../output/google-auth/typecheck.txt) |
| Compilació/dry-run | Correctes | [log](../output/google-auth/build.txt) |
| Components UI | **8 casos SSR**: botó activat/desactivat, domini, foto/inicials, noms separats, contrasenya i convidat | [informe](../output/google-auth/ui-verificada.json) |
| Recursos originals | **78 fitxers idèntics**, inclosa la pastisseria, imatges, àudio i dissenys | [hashes](../output/google-auth/recursos-preservats.json) |
| Dades locals | Cada fila i columna anteriors preservades; només metadades internes D1 i la nova migració canvien | [comparació](../output/google-auth/dades-preservades.json) |
| SQL restaurat | **39 taules idèntiques, 9 migracions**, quick_check ok, zero errors FK | [informe](../output/google-auth/copia-sql-verificada.json) |
| Còpia D1/R2 | **14 fitxers** rellegits amb SHA-256 correcte | [informe](../output/google-auth/copia-d1-r2-verificada.json) |

OAuth usa codi al servidor amb PKCE S256, estat d’un sol ús/cookie HttpOnly, nonce i JWT RS256 verificat amb jose. UserInfo només completa el perfil si sub coincideix. No es guarden tokens de Google. La conversió conserva l’ID i revoca les sessions antigues; el compte existent conserva rol i dades. Els nous comptes són estudiants. Els secrets només es configuren amb fitxer privat extern i Wrangler stdin; queden fora del codi i ZIP. [Implementació](../output/google-auth/implementacio.md).

## Publicació

Worker **edb5e406-4124-484b-8d80-703598cb74c6** a [La Net](https://la-net.impossible-goals-research.workers.dev). Confirmat per CLI: migració 0009, quatre recursos actualitzats, 48 reutilitzats, arrencada de 4 ms. [Log](../output/google-auth/cloud-deploy.txt), [informe](../output/google-auth/publicacio-verificada.json).

Còpia privada de D1 públic abans de migrar, exclosa del ZIP; el seu enllaç temporal s’ha eliminat del log exportable. No s’han importat dades locals a producció ni creat usuaris o notes de prova públics. Logs d’invocació desactivats per evitar registrar el codi OAuth.

## Límits i lliurament

Les proves de JWT fan servir claus RSA de prova i respostes de proveïdor injectades només al codi de test. Els 33 fluxos d’API fan servir una instància aïllada amb credencials fictícies, sense contacte amb Google. El render SSR no comprova interacció, focus, càrrega d’imatges ni responsive real. L’accés de navegador a La Net continua denegat; no s’ha esquivat aquesta restricció.

T25-05 segueix pendent: desbloquejar Google Cloud, crear el client autoritzat, configurar secrets i verificar l’entrada real. T25-04 tancada; paquet base rellegit amb 1580 fitxers i SHA-256 correctes. El ZIP final inclou aquesta checklist amb l’activació encara pendent.
