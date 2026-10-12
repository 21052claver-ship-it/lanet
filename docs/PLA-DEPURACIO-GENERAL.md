# Depuració general

Tasca única T67-01. Les proves utilitzen dades locals aïllades.

- [x] Revisar instruccions, seguiment i cobertura existent.
- [x] Auditar seccions, formularis, teclat, textos llargs i errors de connexió.
- [x] Corregir incidències reproduïdes i comprovar coherència entre seccions.
- [x] Afegir proves de regressió significatives.
- [x] Verificar tres motors, qualitat del codi i dependències.
- [x] Publicar amb CI verda i registrar versió i rebut.

## Regles de treball

Un únic bloc actiu. Primer reproducció i evidència local; després correcció i regressió. No executar reinicis, regals ni migracions de tasques anteriors. No utilitzar comptes ni dades reals per provar.

## Incidències

1. Icones d’assignatures no seleccionades: 105,5 px davant 34 px de les seleccionades. Selector CSS dependent del nombre de fills corregit amb classe explícita; dimensions preservades en seleccionar i desmarcar.
2. Cerca d’assignatures: «fisica» no trobava «Física». Ara comparteix la cerca sense accents, espais o apòstrofs variants; estat buit explícit.
3. Sortida sense connexió: promesa rebutjada «Failed to fetch», cap avís ni bloqueig mentre s’esperava. Ara informa, permet reintentar i impedeix dobles peticions.
4. Resposta antiga d’uns apunts tancava un perfil acabat d’obrir: reproduït amb POST retardat i un recurs creat. Tancament vinculat a la instància del formulari.
5. Editor d’apunts: la càrrega original podia substituir fitxers triats mentre s’esperava. Controls bloquejats durant càrrega, error i desament; recuperació explícita sense substituir canvis nous.
6. Gestió del centre: avís de connexió persistent després de recuperar dades i sense reintent directe. Ara permet reintentar, elimina l’avís en recuperar-se i descarta respostes antigues en canviar de pestanya.

Exploració local de les vuit seccions i formularis a 320, 390 i 1440 px amb noms i textos llargs: sense desbordament de pàgina ni excepcions. Ampliada amb gestió del centre i regressions de respostes desordenades. 354 unitàries correctes. Evidència privada: output/debug-pass i output/workspace-recovery.

Publicació confirmada: [0.6.1](https://github.com/21052claver-ship-it/lanet/releases/tag/v0.6.1), commit 53ebb7f7d0d5d5c18e3fb3ed3ca2f5ea1fbc8ecd, [CI](https://github.com/21052claver-ship-it/lanet/actions/runs/38227341981), Pages a4e10a9c. CI: 354 unitàries i 342 casos de navegador correctes; 120 casos locals addicionals de música, continguts, nota final i PAU.
