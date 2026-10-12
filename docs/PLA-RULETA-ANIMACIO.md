# Ruleta · animació i premis

- [x] Diagnosticar el saldo i l’historial que avançaven el premi, i la bola independent de la roda.
- [x] Trajectòria compartida: contrapès, desacceleració, descens i casella final coherent als 37 números.
- [x] Debitar visualment l’aposta; revelar resultat, animar el retorn i alliberar el saldo al final.
- [x] Distingir guany net de retorn parcial; respectar moviment reduït i netejar animacions en sortir.
- [x] Verificació local en Chromium, Firefox i WebKit, regressions i auditoria pública.
- [ ] CI del commit exacte, publicació 0.3.1 i comprovació del proveïdor.

La liquidació continua sent atòmica al servidor. L’animació no decideix el resultat ni crea crèdits. Una sortida, recàrrega o pèrdua de connexió no perd ni duplica pastissos. La retenció del saldo és només de presentació i impedeix avançar el premi durant actualitzacions automàtiques.

Els retorns inclouen l’aposta: només es mostra «Has guanyat» quan el guany net és positiu. No s’afegeixen falsos quasi-encerts ni s’alteren les probabilitats.

Proves amb dades locals aïllades; cap visita al web públic ni prova en dispositiu físic.

Verificació local completada: 338 unitàries, 18 casos específics de premi i interrupció, 15 escenaris del tapet i 36 de la sala secreta. Tipus/lint i auditoria de 533 fitxers sense incidències.
