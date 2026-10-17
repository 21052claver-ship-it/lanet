# Canvis propis sense peticions de revisió

Indicació de Marc del 17 d’octubre de 2026: incorporar els canvis propis directament i evitar les PRs i peticions de revisió que li omplen el correu. Aquesta decisió substitueix l’obligació anterior de crear PRs pròpies; no modifica els informes històrics de publicacions anteriors.

1. Verificar amb `gh api user` el compte `21052claver-ship-it`, utilitzant la sessió `.cache/gh-lanet`. Autoria: `21052.claver@fje.edu`.
2. Preparar els canvis en una branca `codex/` basada en la versió actual de `main`. Agrupar canvis relacionats, documentació, checklist i historial.
3. Fer les proves locals apropiades i executar `npm run audit:source` abans de cada push. Pujar la branca amb un push normal, sense obrir una PR.
4. La CI de l’esdeveniment **push** s’executa a `main` i `codex/**`. Esperar els **12 controls, inclòs Validate, correctes sobre el mateix SHA**. Comprovar que `main` no ha avançat; si ha avançat, actualitzar la branca i repetir CI sobre el nou commit. Un workflow llançat manualment no substitueix aquesta comprovació de push.
5. Immediatament abans d’incorporar, comprovar amb `git rev-parse HEAD` que el SHA coincideix amb el validat i que l’arbre és net. Incorporar-lo amb `git push origin HEAD:main`, sense force push, sense crear un commit de fusió nou i sense peticions de revisió. Només el compte propietari té aquesta excepció a la regla de PR; la regla de CI continua sense cap bypass.
6. Sincronitzar `main` local amb la remota. Si es publica producte, esperar també la CI de push de `main` al commit exacte, mantenir versió/lock/CHANGELOG i executar `npm run release` una vegada. Els commits només documentals o de governança no necessiten nova versió ni desplegament.
7. Conservar evidències privades del SHA, CI, incorporació i publicació. El tancament documental també s’incorpora directament; no obrir una PR addicional només per registrar una publicació.

Les contribucions externes continuen arribant amb fork i PR, revisió explícita de Marc, converses resoltes i CI correcta. `CODEOWNERS`, les proteccions contra force push/esborrat i les credencials privades es conserven. No es canvien les preferències generals de notificacions del compte.

[Contribucions externes](../CONTRIBUTING.md) · [Versions i publicació](VERSIONS.md) · [Regles històriques](PLA-PULL-REQUESTS.md).
