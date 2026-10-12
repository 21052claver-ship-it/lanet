# Accés a la NET oficial

Tasca T71-01, requisit R85. Una sola tasca activa; la migració de domini T69-01 continua pendent.

- [x] Generar una icona 3D a partir del logotip aportat i revisar-la visualment.
- [x] Preparar WebP amb transparència de 256 × 256 px, aproximadament 13 KB.
- [x] Afegir accés a la sidebar oberta/plegada i al menú Més del mòbil.
- [x] Verificar destinació, pestanya nova, accessibilitat i disposició amb fixtures locals.
- [ ] Passar qualitat, PR/CI i publicar amb rebut.

Enllaç: `https://login.net.fje.edu/`. Etiqueta: «La NET oficial». Pestanya nova amb `noopener noreferrer`, anunciada al nom accessible. No cal iniciar sessió al portal extern per comprovar l’enllaç.

## Imatge

Eina: `image_gen` integrada. Fitxer final: `public/images/ui/official-net-3d-v1.webp`. Generada a partir del logotip de l’usuari; redimensionament i codificació WebP per preparar l’asset web, conservant l’alfa. Els originals es conserven localment.

Prompt final: «Generate a clean premium 3D UI icon from the attached FJE reference logo. A royal blue softly rounded square ceramic tile, straight-on, shallow extrusion, with the recognizable white downward sun rays from the reference embossed on the upper half. Inset the entire white emblem slightly inside the tile, with a narrow blue rim above the white rays. Keep the reference ray count and geometric silhouette. Blue and white only, no text, no extra objects. Soft diffuse upper-left lighting, tactile matte clay texture, rounded bevels. Single centered square badge on transparent background.»

Qualitat local: 357 unitàries, tipus/lint i compilació correctes. Cinc comprovacions del nou enllaç a 320, 390, 844, 1024 i 1440 px: URL exacta, nova pestanya sense opener, teclat, tancament de Més, icona carregada i absència de desbordament. Nou casos de navegació mòbil en Chromium/Firefox/WebKit correctes. Captures revisades a output/official-net. PR/CI i publicació 0.6.3 pendents.
