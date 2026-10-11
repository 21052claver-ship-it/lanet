# Selectors de vista més clars · R32

Petició de Marc del 10 d’octubre de 2026: els controls Horari/Agenda de la captura no semblen prou visuals. El fons de la vista inactiva en passar-hi el ratolí competeix amb el subratllat de l’activa.

Una sola tasca activa. Seqüència: implementar → verificar → publicar i lliurar. El registre general governa els estats i l’historial conserva cada tancament.

- [x] T19-01 · Selector agrupat i coherència del component compartit.
- [x] T19-02 · Verificar compilació, regressions, estats i límits.
- [x] T19-03 · Publicar i lliurar la còpia verificada.

## Decisions

Una base neutra amb contorn agrupa les alternatives. Només l’opció seleccionada té superfície préssec, contorn marró i ombra lleu; l’estat hover és més discret. Horari i Agenda incorporen les icones de rellotge i calendari de la biblioteca ja existent. No s’afegeixen etiquetes, explicacions o animacions al contingut de la pàgina.

El mateix tractament s’aplica al component Tabs a Apunts, Plusos, Comunitat, perfil, accés i les vistes auxiliars. La selecció conserva aria-selected, un únic punt de tabulació i les tecles fletxa, Inici i Final. Els botons són explícitament de tipus button per evitar enviar formularis. El focus és visible dins del control, sense retallar-se amb el desplaçament horitzontal.

Objectius de mida: almenys 44 px per botó, amplada principal de 300 px limitada a l’espai disponible, espaiat reduït a 400 px i desplaçament intern per grups de moltes opcions. Respectar moviment reduït i colors forçats.

## Comprovacions i límits

Captura aportada per Marc i codi com a diagnosi; contrast calculat, lint, tipus i build. No es modifiquen dades, endpoints, imports ni art original. No cal repetir els 27 fluxos API de R31 perquè aquesta revisió només canvia la presentació dels controls.

El navegador ha denegat accedir a la web pública; localhost també tenia un bloqueig de permisos desat en la revisió anterior. No es provarà una altra superfície de navegador ni una lectura indirecta de la web. Les comprovacions de navegació visual i responsive real quedaran explícitament sense repetir en aquesta revisió. La publicació es confirma amb el resultat del desplegament, sense afirmar una comprovació visual pública nova.

Tancament: 83/83 tasques verificades, cap activa ni pendent. Versió pública `68ca5f45-49ec-4a89-a159-8cab8e80fb59`, 74 unitats, tipus/lint i build correctes. SQL restaurat amb 38 taules idèntiques, còpia D1/R2 de 14 fitxers i paquet base de 960 fitxers contrastats amb SHA-256. El ZIP final incorpora la checklist tancada. La mostra SVG/PNG és un esquema offline i està etiquetada explícitament.
