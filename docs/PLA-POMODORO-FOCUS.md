# Pomodoro continu i mode focus

14 d’octubre de 2026 · R100 · T80-01 ampliada.

El Pastisdoro encadena automàticament concentració, descans i sessió següent. Conserva el descans llarg segons el nombre de sessions configurat. Es pot desactivar la continuïtat per començar cada fase manualment. La pausa, el reinici i les durades existents es mantenen; el recompte usa terminis reals, també en tornar a una pestanya o recarregar.

L’alarma té tres sons originals sintetitzats (Campaneta, Suau i Digital), volum independent de la música, silenci i botó de prova. El navegador prepara l’àudio amb una acció de l’usuari. La manca de suport o el bloqueig d’àudio no atura el temporitzador. No es descarreguen recursos ni es creen enregistraments.

Mode focus cobreix tota la finestra i demana pantalla completa quan el navegador ho permet després de l’acció de l’usuari. Manté sortida explícita i Escape, bloqueja la navegació del fons, conté el focus del teclat i el retorna al botó d’entrada. El Pomodoro continua quan se surt del mode focus. Les opcions inclouen ambients Clar/Bosc/Nit, rellotge Anell/Digital, controls de música opcionals i manteniment de pantalla activa als navegadors compatibles. La pantalla activa s’allibera en sortir i es recupera en tornar a una pestanya visible quan continua activada.

Les opcions visuals i d’alarma es recorden per compte en aquest dispositiu. La música manté el reproductor compartit i el volum es desa amb el mecanisme de preferències existent. Les durades es continuen editant amb el formulari de Pastisdoro i la configuració existent del servidor.

Les sessions acabades pendents de confirmació es guarden en una cua local limitada de 50 entrades. La sincronització usa l’ID idempotent existent i no impedeix continuar; un error espera l’esdeveniment de connexió o el reintent cada 30 segons, sense bucle de peticions. Es conserva el dia del termini real, encara que el reintent sigui l’endemà. El servidor valida el dia i rebutja dates futures o invàlides; els clients anteriors sense dia continuen desant avui. La recuperació d’una pestanya suspesa registra només la sessió real que era activa i reprèn una fase nova; no inventa hores d’estudi per tots els cicles transcorreguts amb l’aplicació tancada.

Sense migracions ni serveis privats nous. Proves exclusivament locals amb fixtures; build separat a `output/focus/dist` per no modificar el `dist` congelat de la integració. Publicació consolidada per l’integrador després de les proves i CI.

Referències tècniques: [Fullscreen API](https://developer.mozilla.org/en-US/docs/Web/API/Element/requestFullscreen), [àudio i interacció](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices) i [Screen Wake Lock](https://developer.mozilla.org/en-US/docs/Web/API/Screen_Wake_Lock_API).

Verificació final: 14 proves de temporitzador/alarma/registre, 445 unitàries conjuntes, tipus/lint i build aïllat correctes. 27 recorreguts Chromium/Firefox/WebKit a 320/390/820/1440 i mòbil horitzontal: 24 de flux general i tres regressions de silenci intencional. El volum zero conserva el context preparat i no es tracta com un bloqueig d’àudio. So real amb mesurament d’àudio a Chromium/Firefox; el WebKit de Windows no exposa AudioContext i es verifica explícitament el mode sense suport, sense interrompre el temporitzador. Cap afirmació de prova en dispositius físics. Evidències privades a `output/focus/verification.json`; build final immutable a `output/focus/muted-verified-dist`.

Publicació conjunta confirmada: [0.6.16](https://github.com/21052claver-ship-it/lanet/releases/tag/v0.6.16) · [CI](https://github.com/21052claver-ship-it/lanet/actions/runs/38638160574) · [registre](releases/0.6.16.json). Validació final de la tanda: 446 unitàries, 318 fluxos locals i tots els jobs CI correctes.
