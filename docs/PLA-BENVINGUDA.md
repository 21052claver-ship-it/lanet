# Benvinguda i inici de sessió · R41

Una sola tasca activa, quatre passos consecutius. [Checklist](CHECKLIST.md), [historial](HISTORIAL-CANVIS.md).

- [x] T28-01: definir composició, jerarquia i criteris.
- [x] T28-02: reconstruir benvinguda, formularis i estats.
- [x] T28-03: comprovar accions, accessibilitat, art i regressions.
- [x] T28-04: publicar, actualitzar informes i lliurar ZIP verificat.

## Disseny

Llenç clar i càlid, marca original i un únic bloc de presentació. A l’escriptori, text i una escena d’estudi 3D transparent a l’esquerra; un formulari blanc i compacte a la dreta. Sense pastisseria com a portada, targes flotants, llistes llargues ni botons repetits. Tipografia Nunito, préssec i sàlvia de la plataforma. L’art nou és un recurs separat; no es modifiquen la pastisseria ni els recursos aprovats.

Al mòbil, una columna, capçalera breu i formulari prioritari. L’art decoratiu desapareix quan resta espai als camps. Sense alçades fixes, retalls de contingut ni scroll bloquejat. Camps de 48 px, botons d’almenys 44 px, text de camps de 16 px i focus visible. Entrada suau, sense animacions contínues i amb reducció de moviment.

## Fluxos

Iniciar sessió és l’acció principal. Crear compte és un enllaç explícit; entrar sense compte és una opció separada i secundària, disponible només quan el servidor ho permet. Google apareix com a botó operatiu només quan està configurat; no es mostren controls inactius ni estats de preparació al formulari. L’activació externa pendent es documenta als informes.

Registre, recuperació i configuració inicial comparteixen estructura i etiquetes. Es conserva el contracte actual amb el servidor. Mostrar/amagar contrasenya no envia el formulari. Canviar de mode elimina contrasenya, codi i errors antics, però conserva nom i correu. Les peticions concurrents es bloquegen; només l’acció en curs mostra progrés. Recuperar la contrasenya torna a iniciar sessió, amb confirmació i sense entrar automàticament. Errors i canvis de mode reben focus identificable. Càrrega inicial i error de connexió fan servir el mateix disseny, sense instruccions tècniques al visitant.

## Verificació i límits

Proves del controlador asíncron amb API simulada: accés, convidat, registre, recuperació, configuració, error, reintent i exclusió de peticions duplicades. SSR dels components reals en cada mode i estat, contrast, dimensions i alfa de l’art. Proves unitàries de la plataforma, API aïllada, tipus/lint, build i dry-run. Hashes de preservació de backend, dades, notes, cartell i pastisseria respecte del ZIP R40.

Els permisos desats deneguen el navegador de La Net. No es fa servir una altra via per accedir-hi. SSR i inspecció de codi no acrediten interacció ni responsive real al navegador; aquesta limitació ha de quedar explícita. Google OAuth extern continua pendent a T25-05.

No cal cap migració ni es modifiquen dades de producció. La publicació és de codi i recursos. Per al ZIP complet s’aturen els escriptors locals, es verifica la còpia D1/R2 i es comproven tots els hashes del paquet.
