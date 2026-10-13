# Verificació · La Net 0.6.8

[CI completa](https://github.com/21052claver-ship-it/lanet/actions/runs/38432733507) correcta a main 3ae9e52e0c11d9f65f73c842bb564e83269734d0, després de PR20.

Àudio natiu mesurat amb AnalyserNode: música simultània, preferència, silenci en gir, segon pla, fonts acotades, lliurament, sortida, denegació i recuperació sense repetir sons. Local: 15 casos correctes; 6 omesos per manca de Web Audio al WebKit Windows. CI Linux: 21 correctes, 0 omesos. Omissions registrades explícitament; no es presenten mocks com a so natiu.

15 proves visuals en tres motors, inclosos 320px i control visible dins la sala; 18 d’animació i 357 unitàries correctes. Tipus/lint, compilació i auditoria correctes. Dispositius físics no provats.

Publicació, domini i commit canònic confirmats via API/CLI de Cloudflare; tag, release immutable i SHA256 del rebut correctes. Sense proves amb comptes reals ni dades modificades. [Registre](releases/0.6.8.json).
