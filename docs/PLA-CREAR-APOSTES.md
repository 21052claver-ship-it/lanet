# Crear apostes · R77

Tasca única T63-01. Qualsevol alumne autenticat pot crear una aposta A/B amb termini, regles i una altra persona que accepti validar el resultat.

- [x] Revisar permisos: la creació ja està disponible als alumnes al servidor.
- [x] Corregir l’accés: «Crear aposta» sempre visible en llista i detall.
- [x] Fer coherent el nom al botó, al formulari i a l’estat buit.
- [x] Corregir el refresc posterior a crear: carregar l’aposta confirmada pel servidor, sense recuperar el detall anterior per una referència antiga.
- [x] Verificar com a alumne en Chromium, Firefox i WebKit, a 320 i 390 px: cancel·lar conserva l’aposta anterior; crear obre una aposta nova pendent d’acceptació.
- [x] Comprovar el flux complet de creació, acceptació, aposta i liquidació, i les regressions.
- [x] Publicar amb versió, CI del commit exacte i rebut del proveïdor.

Es conserven les regles de resolució independent, la necessitat d’acceptació, les quotes antiabús i la recuperació idempotent. Crear una aposta no consumeix pastissos.

Verificació local: 350 proves unitàries i 24 casos de prediccions en tres motors. Publicació confirmada: [0.4.1](https://github.com/21052claver-ship-it/lanet/releases/tag/v0.4.1), commit bfdb479f65ce35ff3e9216260ce6a0dc12821d2a, [CI](https://github.com/21052claver-ship-it/lanet/actions/runs/38191721369), Pages b49ec67f.
