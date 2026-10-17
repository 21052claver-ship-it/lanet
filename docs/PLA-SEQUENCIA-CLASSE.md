# Depuració i seqüència d’una classe

17 d’octubre de 2026 · T87-01 · ampliació R112 de la PR44, versió 0.6.22 encara no publicada.

Marc demana revisar a fons funcionalitats, botons, seguiments i proporcions, i simular l’experiència dels alumnes al llarg d’una classe. La revisió amplia l’única tasca activa i conserva els canvis d’horari, PDF i delegats pendents.

Les simulacions utilitzen comptes ficticis separats sobre el mateix servidor local: consultar classe i continguts, crear una tasca compartida, validar-la quan correspon, rebre l’avís, completar-la individualment, estudiar, desar notes i tornar després de recarregar. Es contrasten les accions visibles amb les dades persistides, la privacitat i els comptadors d’activitat.

La revisió visual inclou 320 px, mòbil, tauleta, paisatge i escriptori, textos llargs, focus, scroll, finestres i controls. Les regressions existents cobreixen la resta de famílies de funcions; s’afegeixen proves on es reprodueixin defectes o hi hagi buits de cobertura. Les evidències privades es desen a `output/class-audit/`.

No es fan proves contra l’aplicació pública. La sessió Google, els dispositius i les dades són simulats. Els resultats indicaran què s’ha provat i qualsevol límit pendent; no es considerarà cap recompte una garantia d’absència absoluta d’errors.

## Incidències reproduïdes i correccions

| Recorregut | Problema confirmat | Correcció |
| --- | --- | --- |
| Detall d’una tasca → completar | El botó permetia repetir el desament i una fallada del bootstrap deixava l’estat visual antic tot i haver desat. | Escriptura compartida amb la llista, bloqueig per tasca, estat optimista i confirmació local abans de sincronitzar. |
| Tasca vençuda feta → recarregar → incloure fetes | El filtre de dates continuava excloent-la i els grups antics de tasques fetes s’etiquetaven com a pendents. | Recuperació de tasques antigues quan es demanen i indicació de pendent només si queda treball sense completar. |
| Plus de dues assignatures → calendari → filtre d’assignatura | L’esdeveniment privat no tenia assignatura i desapareixia del filtre i de l’espai de la matèria. | Associacions recuperades de `plus_subjects` amb una cerca indexada dins de la consulta d’agenda existent; cap nova petició, taula, escriptura o migració. Les associacions sobreviuen a la retirada del plus. |
| Continguts → agenda de l’assignatura → recarregar | Es recuperaven els filtres anteriors i desapareixien les tasques que s’acabaven de consultar. | Desament conjunt de la vista, escala, tipus i assignatura contextuals. |
| Obrir apunts → amagar la pestanya durant una resposta lenta | La resposta antiga podia activar el registre de consulta en segon pla; dues respostes podien deixar temporitzadors simultanis. | Generació de lectura per canvi de visibilitat i comprovació de visibilitat també al venciment del temporitzador. |
| Agenda estreta i detall | Casella de tasca de 22 px com a únic objectiu i botons adjacents sense separació. | Etiqueta tàctil de 44 px, columnes amb espai propi i accions en files amb separació mesurada. |

Les regressions noves confronten l’efecte a la interfície amb SQLite local i comptes independents. El recorregut de classe inclou la proposta d’una tasca per un alumne, validació del delegat, recepció per un company i progrés personal separat. Un segon recorregut enllaça classe, publicació i lectura d’apunts, desat personal, tasca, nota zero, navegació durant l’estudi i una sola sessió persistent. Les proves de visibilitat i de rellotge són simulacions explícites.

Les proves inicials també han revelat dos problemes de la nova simulació: cal triar una franja abans d’esperar una classe en una matrícula reduïda i comprovar la retirada d’una fila després de clicar, perquè el postestat de `check()` pot arribar quan la fila ja ha desaparegut. S’han corregit les precondicions i es continua exigint l’efecte persistent. Una execució responsive inicial es va contaminar en recompilar els assets mentre encara s’executava; la compilació fixa següent supera els 66 casos. La compilació final queda immutable durant les regressions.

La matriu nova completa va superar inicialment 61/63 escenaris: en dos casos WebKit la prova recarregava mentre encara tornava el bootstrap posterior a completar l’estudi. Ara espera el registre visible de la sessió i el final de les peticions, com les regressions existents de preferències. Els 12 recorreguts de material/notes/estudi s’han reexecutat correctament; no s’ignoren errors de navegador. La prova del detall desactiva `Object.hasOwn` per comprovar també el contracte dels navegadors antics definit a Vite.

## Verificació local final

472 unitàries, matriu final de 63 escenaris de classe i 12 comprovacions addicionals del detall amb focus, disposició i `Object.hasOwn` absent. També passen 66 escenaris responsive, 33 d’espais d’assignatura, 33 de delegats, 39 de controls funcionals i 62 fluxos d’API D1/R2 locals, més horaris A/B/C, permisos de delegació i edició de professorat per dia amb workerd/D1. Tipus, lint, build i auditoria de font correctes. Captures reals revisades a 320/740/820/1440 px; la captura de viewport dels diàlegs evita els desplaçaments artificials dels elements fixos en captures de pàgina completa.

L’informe privat `output/class-audit/local-verification.json` conserva la matriu, els resultats originals i les reexecucions afectades, sense sumar-los com si fossin escenaris nous. Pendent CI de la branca actualitzada i de main abans de publicar 0.6.22 una vegada. Domini/callback i destinació fixada verificats via proveïdor; cap prova pública ni dades reals.
