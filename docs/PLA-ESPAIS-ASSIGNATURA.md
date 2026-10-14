# Espais d’estudi · pla i verificació

T79-01 és l’única tasca activa. Cada pas acaba abans de començar el següent; els fitxers compartits s’editen des d’aquesta tasca. Evidències privades a output/subject-workspaces/, mai dades d’alumnes. Disseny previ: [comparació i mockups](PROPOSTES-XATS-CONTINGUTS.md).

## Decisió

1. **Espais per assignatura**: punt d’entrada visual, material per temes d’un sol nivell, dubtes, formularis revisats, eines i agenda. Millor continuïtat entre trobar, entendre i preparar una prova.
2. Carpetes profundes: més clics, recursos difícils de trobar i classificació costosa. No seleccionada.
3. Xat separat: la conversa perd la referència al material. No seleccionada.
4. Conversa com a portada: els documents queden enterrats i augmenta el soroll. No seleccionada.

És una decisió de disseny raonada, no el resultat d’un estudi amb alumnes. Conservem la cerca global, Desats i Els meus; desar un material d’una altra assignatura no el farà desaparèixer. No es dupliquen fitxers en carpetes. Els materials antics queden a «Sense tema».

## Seqüència

- [x] Revisar arquitectura, fluxos existents i comparar alternatives.
- [x] Espais visuals i context persistent, temes plans i trimestre opcional.
- [x] Connectar formularis/eines, agenda i alta d’examen/tasca amb assignatura preseleccionada.
- [x] Dubtes contextuals per grup/variant, respostes, resolució i moderació; només text i referències a materials existents.
- [x] Recuperació d’esborranys, errors, reintents sense duplicats i permisos comprovats al servidor.
- [x] Verificar recorreguts complets i captures a 320/390/820/1440px i horitzontal en tres motors.
- [ ] Tipus/lint, unitàries, build, auditoria de font, PR i CI completa.
- [ ] Còpia privada de D1, revisió i aplicació separada de la migració additiva.
- [ ] Publicació immutable i verificació de domini/commit/rebut via proveïdor.

## Acceptació

- Obrir un material d’una assignatura/tema en un màxim de tres accions des de Continguts.
- Crear examen o tasca des de l’assignatura amb el context correcte, data i audiència clares; només el personal autoritzat comparteix amb el grup.
- Preguntar sobre un material i tornar-hi des del fil; respostes ordenades, resolució visible i esborrany conservat després d’un error o reload.
- Reintentar una resposta confirmada al servidor no en crea dues. No enviar dues vegades en doble clic.
- Cap accés a dubtes d’una variant no matriculada; administració limitada al seu àmbit. Sense correus, fotos o notes privades a les respostes.
- Cerques amb accents, temes buits, assignatures sense materials, més missatges que una pàgina, continguts retirats i xarxa interrompuda coberts.
- Tot accessible amb teclat, controls tàctils i sense desbordament horitzontal. Les proves de navegador no equivalen a dispositius físics.

## Dades i publicació

La migració afegeix metadades opcionals als materials i taules de dubtes. No altera saldos, notes, matrícules ni fitxers existents. Abans de producció: còpia privada, hash de la còpia, comprovació que només aquesta migració està pendent, revisió del SQL i verificació remota de l’esquema. Cap prova funcional contra la web pública. Google, D1/R2 i lanet.es es conserven.

Verificació local: 398 unitàries, 27 recorreguts nous, 33 de biblioteca, 12 de publicació/pujades i 36 de recuperació, en tres motors. Captures a 320/390/1440 revisades; botó de tornar i quadrícula de sis tipus de data corregits a partir de captures. La prova WebKit espera el canvi efectiu a Agenda abans de comprovar-lo, mantenint les assertions. Pendent CI i publicació; no provat amb dispositius físics.
