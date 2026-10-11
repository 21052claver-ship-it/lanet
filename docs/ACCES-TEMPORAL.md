# Accés temporal sense compte · 9 d’octubre de 2026

Implementat el botó **Entrar sense compte**, visible damunt del formulari de credencials i accessible en mòbil. Obre directament la plataforma amb un perfil de convidat independent, rol estudiant i sessió HttpOnly de set dies. No demana correu, contrasenya ni codi d’invitació.

El perfil inclou el curs de ciències de 2n B sense superposicions, plantilles de notes buides i 24 pastissos de prova. Les notes, preferències de focus i moneder es desen al servidor amb el seu identificador propi. No copia dades personals de Júlia ni d’altres usuaris.

Recarregar conserva la sessió. Sortir invalida la sessió actual; tornar a entrar sense compte crea un altre perfil. Les dades del perfil anterior es conserven a la base de dades, però no hi ha recuperació de convidat per correu.

## Activació temporal

La funció depèn de `DEMO_MODE=true`, activat a la configuració local. Amb `DEMO_MODE=false`, desapareix l’opció, `/api/auth/guest` retorna 403 i les sessions de convidat existents no poden accedir a l’API. La configuració de producció continua tenint aquest mode desactivat.

El servidor comprova l’origen, exigeix POST i limita els intents. El convidat no té permisos de delegat ni d’administrador. No s’ha publicat cap canvi al núvol.

## Verificació

- 32 proves locals aprovades, incloent creació de convidats independents, notes buides, horari sense conflictes, persistència de sessió, sortida, permisos, desactivació i límit d’intents.
- 23 fluxos d’API amb D1 i R2 de proves aïllats, incloent l’entrada sense compte.
- Comprovació al navegador de les set seccions, sessió després de recarregar i botó visible a 320 px sense desbordament horitzontal.
- Comprovació de tipus, lint i compilació aprovades.

Captures i comprovacions del navegador a `output/guest/`.
