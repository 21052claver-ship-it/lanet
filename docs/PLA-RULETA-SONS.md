# Sons de la ruleta · 0.6.8

- [x] Clic curt només en posar una fitxa vàlida; no sona en retirar o restaurar posicions.
- [x] Bola amb cops progressivament més espaiats, fins a la captura visual al 76% del gir; cop suau en acabar.
- [x] Acord curt de premi només quan els pastissos arriben al saldo. Recuperar una aposta anterior no repeteix els sons.
- [x] Un sol control accessible amb preferència persistent. Silenciar, sortir o amagar la pestanya cancel·la les fonts programades.
- [x] Síntesi local original, sense descàrregues. Context creat/reprès amb interacció, volum limitat i nombre de fonts acotat. La música utilitza el seu reproductor independent.
- [x] Errors d’àudio o API absent no bloquegen el joc. Volum/silenci no altera apostes, saldo ni resultat.
- [x] Completar comprovacions locals i CI; publicar amb PR, versió i rebut.

La prova d’àudio instrumenta un AudioContext natiu i mesura el senyal PCM amb AnalyserNode. Comprova música simultània, lliurament, silenci durant el gir, preferència, neteja, segon pla, navegador sense API, denegació, prefix antic i recuperació. Quan el runtime no exposa Web Audio es registra explícitament que les proves de senyal no es poden executar; es manté la comprovació del fallback. No es presenten mocks com a so real.

El WebKit de Playwright instal·lat en aquest Windows no exposa Web Audio. Les proves locals de senyal s’executen en Chromium i Firefox; la CI Linux comprova la seva capacitat WebKit i registra qualsevol absència. No s’ha provat un iPhone físic.

Referència d’activació: [Web Audio i autoplay, Chrome Developers](https://developer.chrome.com/blog/web-audio-autoplay). Evidències privades: output/roulette-sound i output/roulette-panorama/sound-*.log. La CI incorpora un grup d’àudio independent; tots els grups continuen sent obligatoris.

Publicada 0.6.8: https://github.com/21052claver-ship-it/lanet/releases/tag/v0.6.8. CI exacta, domini i commit canònic confirmats; resum a releases/0.6.8.json.
