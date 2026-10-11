# Verificació de La Net · Avaluació R40

10 d’octubre de 2026. **40 requisits, 28 fases, 114/115 tasques verificades.** [Pla](PLA-AVALUACIO.md), [checklist](CHECKLIST.md), [historial](HISTORIAL-CANVIS.md). L’informe anterior es conserva a [historic/VERIFICATION-2026-10-10-banner-policy.md](historic/VERIFICATION-2026-10-10-banner-policy.md).

## Resultat

Parcial 1, Parcial 2 i Trimestral per assignatura i trimestre; tres redaccions, tres entregues i tres presentacions opcionals. Categoria Participació retirada de formularis, resum, API i dades actives. Activitats antigues amb qualificacions es conserven com a activitats anteriors. Si només hi ha notes dels parcials i les activitats antigues són buides, aquestes es transformen de manera segura en trimestral i caselles opcionals, sense perdre notes ni total de pesos.

Resum net amb els exàmens i activitats només quan s’utilitzen. Grups opcionals plegats al detall i editors. Nou caselles opcionals amb pes zero; pesos orientatius editables per assignatura. Repartir igual exclou caselles opcionals buides. Pesos decimals conserven el text intermedi. Recuperar plantilla conserva notes addicionals amb pes zero per revisar-les. Mode discret preservat.

## Comprovacions

| Comprovació | Resultat | Evidència |
| --- | --- | --- |
| Proves unitàries | 125/125; migració, zeros, notes, dates, pesos i restauració | [log](../output/assessment-model/unit.txt) |
| API amb D1/R2 aïllats | 38 fluxos; curs, edició, tipus, permisos, pesos i recuperació | [resultat](../output/assessment-model/api-result.json) |
| Tipus, sintaxi i lint | Correctes | [log](../output/assessment-model/typecheck.txt) |
| Build i deploy dry-run | Correctes | [log](../output/assessment-model/build.txt) |
| UI offline | 7 casos SSR reals i callback del camp de pes decimal | [informe](../output/assessment-model/ui-verificada.json) |
| Recursos preservats | 179 fitxers de codi, art, cartell i animació idèntics al paquet anterior | [hashes](../output/assessment-model/recursos-preservats.json) |
| Dades locals | 876 files de notes anteriors, 30 qualificacions, dates i totals de pesos preservats; resta de taules de dades intactes | [informe](../output/assessment-model/dades-local-preservades.json) |
| Dades públiques | 1152 files anteriors i dues qualificacions preservades; estructura resultant comparada amb migració aïllada | [informe](../output/assessment-model/dades-cloud-preservades.json) |
| SQL local restaurat | 39 taules idèntiques, 11 migracions, quick_check correcte i cap error de claus foranes | [informe](../output/assessment-model/copia-sql-verificada.json) |
| D1/R2 local | 14 fitxers de còpia amb SHA-256 comprovats | [informe](../output/assessment-model/copia-d1-r2-verificada.json) |
| Còpies públiques privades | Abans i després restaurats en memòria; SQL i enllaços temporals fora del ZIP | [abans](../output/assessment-model/copia-cloud-before.json), [després](../output/assessment-model/copia-cloud-after.json) |

## Publicació i límits

Versió **922c7771-999f-4efc-90a6-8ab3162afa0b**, [La Net](https://la-net.impossible-goals-research.workers.dev). Migració 0011, 2 recursos actualitzats, 50 reutilitzats i inici en 3 ms. Confirmat per CLI i comparació offline dels exports privats D1; cap nota de prova pública ni importació de dades locals. [Log](../output/assessment-model/cloud-deploy.txt), [informe](../output/assessment-model/publicacio-verificada.json).

SSR i callbacks comproven markup i estat controlat; no demostren interacció de navegador, focus, imatges ni responsive real. El component PDF aliè es substitueix per un stub que fallaria si es renderitzés; aquestes proves no comproven el visor PDF. El navegador de La Net continua denegat pels permisos desats, sense lectures HTTP alternatives. La comparació pública cobreix avaluacions i plantilles; les sessions en viu són fora d’abast.

T25-05 continua pendent: accés a Google Cloud, client OAuth, secrets i entrada real. [Estat](../output/google-auth/activacio.json), [activació](GOOGLE-OAUTH.md).

T27-04 tancada: paquet base rellegit amb tots els SHA-256 correctes. El ZIP final incorpora checklist i historial actualitzats. [Comprovació del paquet base](../output/assessment-model/lliurament-base-verificat.json).
