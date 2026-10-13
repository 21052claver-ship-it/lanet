# Verificació · La Net 0.6.11

[CI completa](https://github.com/21052claver-ship-it/lanet/actions/runs/38469595627) correcta per a main 54e1009692b57c3e0c489955fc8b78b35cab0a7e, després de PR26/27.

376 unitàries: classificació de les 18 matèries avaluables, preferències desades prioritàries, coherència PAU/Notes, TR amb zero/pendents i rubricació 30/42/21/7, calendari amb rangs i ICS UTF-8. Tipus/lint, compilació i auditoria de font correctes.

60 fluxos locals en Chromium, Firefox i WebKit: 12 de guia/calendari/TR a 320/390/820/1440, 24 de notes i plusos, 24 de Top 5 PAU. Mode discret sense exposar valors antics, desament local/recarrega, notes invàlides, emmagatzematge bloquejat, exportació, pesos personals i recuperació comprovats. Guia i notes també correctes a CI; tots els grups de regressió de CI correctes. La suite API històrica general conserva la limitació registrada a 0.6.9 i no es presenta com a passada; la prova específica D1 d’horaris sí que passa a CI.

Les 34 pàgines del PDF s’han revisat; dates PAU/PAP contrastades amb fonts oficials. Domini, commit canònic, tag/release immutable i digest del rebut verificats via proveïdor. Sense migracions, proves contra la web pública ni dispositius físics. El TR només es desa en aquest navegador i no es presenta com a mitjana oficial de batxillerat. [Registre](releases/0.6.11.json).
