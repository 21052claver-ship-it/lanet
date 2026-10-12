# Accés a la NET oficial

Tasca T71-01, requisit R85. Una sola tasca activa; la migració de domini T69-01 continua pendent.

- [x] Generar una icona 3D a partir del logotip aportat i revisar-la visualment.
- [x] Preparar WebP amb transparència de 256 × 256 px, aproximadament 13 KB.
- [x] Afegir accés a la sidebar oberta/plegada i al menú Més del mòbil.
- [x] Verificar destinació, pestanya nova, accessibilitat i disposició amb fixtures locals.
- [x] Passar qualitat, PR/CI i publicar amb rebut.

Enllaç: `https://login.net.fje.edu/`. Etiqueta: «La NET oficial». Pestanya nova amb `noopener noreferrer`, anunciada al nom accessible. No cal iniciar sessió al portal extern per comprovar l’enllaç.

## Imatge

Eina: `image_gen` integrada. Fitxer final: `public/images/ui/official-net-3d-v1.webp`. Generada a partir del logotip de l’usuari; redimensionament i codificació WebP per preparar l’asset web, conservant l’alfa. Els originals es conserven localment.

Prompt final: «Generate a clean premium 3D UI icon from the attached FJE reference logo. A royal blue softly rounded square ceramic tile, straight-on, shallow extrusion, with the recognizable white downward sun rays from the reference embossed on the upper half. CRITICAL FOR CLEAN ALPHA: inset the ENTIRE white emblem slightly inside the tile, so a continuous blue border is visible around all FOUR sides, including a narrow blue rim ABOVE the white rays. No white shape may touch the outer silhouette or extend outside the blue tile. Every white part belongs inside the blue square. Keep the reference ray count and geometric silhouette, simply inset it. Blue and white only, no text, no extra objects, no surrounding scene, no detached pixels. Soft diffuse upper-left studio lighting, gentle tactile matte clay texture, rounded bevels. Single centered square badge occupying 82% of a square canvas with transparent background. Crisp clean transparent silhouette, no floor or drop shadow outside badge.»

Qualitat local: 357 unitàries, tipus/lint i compilació correctes. Cinc comprovacions del nou enllaç a 320, 390, 844, 1024 i 1440 px: URL exacta, nova pestanya sense opener, teclat, tancament de Més, icona carregada i absència de desbordament. Nou casos de navegació mòbil en Chromium/Firefox/WebKit correctes. Captures revisades a output/official-net. PR/CI correctes i publicació 0.6.3 confirmada amb rebut.

Publicació confirmada: [0.6.3](https://github.com/21052claver-ship-it/lanet/releases/tag/v0.6.3), commit 12536d1112d6a6c9d449d4481c9d19e1d5a51236, [CI](https://github.com/21052claver-ship-it/lanet/actions/runs/38250108288), Pages f2970048.
