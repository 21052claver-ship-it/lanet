# Publicació · La Net 0.6.24

[Informe complet](releases/0.6.24.md) · [Estat](ESTAT-PROJECTE.md) · [Índex](README.md).

[Release immutable](https://github.com/21052claver-ship-it/lanet/releases/tag/v0.6.24) · [PR #48](https://github.com/21052claver-ship-it/lanet/pull/48) · [CI exacta](https://github.com/21052claver-ship-it/lanet/actions/runs/39053459420).

Publicada a https://lanet.es, commit d3ef96fb678a77fe751c6b3aed2691e61210c139, Pages df18bede-e81b-4497-a07d-24400d3d2b7a.

Entrar a Continguts ja no carrega ni descarrega els PDF dels materials. Les targetes mostren una portada estàtica; obrir expressament l’apunt carrega el visor PDF.js i descarregar requereix prémer l’enllaç del fitxer. Les capçaleres de seguretat i els permisos del servidor es conserven.

Reproducció prèvia amb un clic únic: una petició de document i una descàrrega. Després: 6 escenaris als tres motors, a 320/1440 px, amb 10 etapes per escenari i zero peticions PDF/descàrregues espontànies. Lectura correcta i descàrrega explícita contrastada amb tots els bytes originals; el segon PDF no obert continua sense carregar-se. 33 regressions de Continguts i 475 unitàries correctes; tipus/lint/build/font correctes. Els 12 jobs i Validate de PR/main són verds.
