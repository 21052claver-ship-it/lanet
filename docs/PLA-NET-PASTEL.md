# Icona NET pastel

Revisió demanada per Marc a partir de la nova referència: base arrodonida, raigs blancs prominents des de la vora superior i blau pastel. Tasca T72-01; la configuració del domini continua en PR10 separada, pendent de HTTPS.

- [x] Generar la variant amb l’eina integrada `image_gen` a partir de la referència.
- [x] Preparar WebP transparent de 256 × 256, 10.942 bytes.
- [x] Substituir l’asset compartit de sidebar i Més: `public/images/ui/official-net-3d-v2.webp`.
- [x] Verificar a mida real, sidebar plegada i mòbil amb fixtures locals.
- [x] Passar PR/CI i publicar 0.6.4.

L’enllaç, etiqueta accessible i obertura en pestanya nova es conserven. Un contorn CSS arrodonit limita la representació al cos de la insígnia i evita mostrar els píxels residuals de l’alpha exterior generat; no es retoca el dibuix ni els raigs. Redimensionament i codificació WebP conserven la transparència original. L’original seleccionat és `exec-32f049c4-1b09-4967-9918-26f4854b022b.png`, conservat localment. Les variants de neteja posteriors s’han descartat perquè no milloraven la fidelitat o el contorn.

## Prompt seleccionat

Mode: eina integrada `image_gen`, edició amb referència i `transparent_background: true`.

```text
Edit the supplied 3D NET logo reference for a polished small sidebar UI icon. Preserve its exact rounded square silhouette, frontal view, soft inflated ceramic volume and recognizable seven white downward sun rays attached at the top edge, with the long central ray. Change the saturated royal blue tile to a soft muted pastel cornflower blue (#94B8DA), with gentle slightly darker blue bevel shading and clean warm-white raised rays. Keep the emblem prominent and the same proportions as the reference. Clean up all stray pixels and rough edges around the top. Entire object centered and fully visible, with 8 percent transparent padding on all sides. Smooth matte clay material, soft upper-left studio lighting, enough subtle shadow under the white rays for legibility at 32px. No text, no extra symbols, no floor, no outer drop shadow, no background. True transparent background, square canvas.
```

Verificació local: compilació Pages correcta i cinc casos a 320, 390, 844, 1024 i 1440 px. Captures revisades de sidebar oberta, plegada i Més mòbil. URL exacta, nom accessible, pestanya nova sense opener, teclat i tancament de Més preservats; cap desbordament horitzontal. Portal extern simulat, sense visites a producció. Evidències privades: `output/net-pastel/local-checks.json`, `local.log`, `build.log` i captures.

## Tancar sessió des del perfil

Marc demana afegir l’acció a El meu perfil. Botó neutral «Tancar sessió» al peu de la pestanya Perfil, al costat de Fet; comparteix el flux existent de logout. Mentre espera, es desactiva i mostra «Tancant sessió…». Un error apareix també dins del diàleg amb opció de reintent; la sessió local només desapareix després de confirmar el servidor. No tanca el compte Google del navegador.

24 regressions de recuperació en Chromium, Firefox i WebKit, incloses les tres noves de perfil: petició bloquejada, una sola sol·licitud, error recuperable amb sessió conservada, reintent correcte, sessió eliminada i entrada Google visible. Captura a 320px revisada; tipus/lint i compilació correctes. Evidències privades a `output/profile-logout` i logs `output/net-pastel/profile-*.log`.

## Ponderacions PAU visuals

- [x] Icones semàntiques per matèria i cinc famílies de colors pastel, amb noms sempre visibles.
- [x] Coeficient i màxim de punts explícits; identificació textual de les dues aportacions seleccionades.
- [x] Mode discret sense marques de selecció ni aportacions personals; dades oficials i càlcul preservats.
- [x] Composició compacta amb coeficient sota el nom en pantalles estretes i noms llargs sense retalls.
- [x] Revisar captures i completar 39 regressions locals en Chromium, Firefox i WebKit.
- [x] CI de la PR actualitzada i publicació versionada.

La prova responsive selecciona el grau amb nom més llarg que té ponderacions oficials publicades. Comprova icona, coeficient, màxim de punts i absència de desbordament per targeta; els casos de dades absents i conflictes continuen coberts per la regressió existent. Evidències privades a output/pau-visual-verified.

Publicada 0.6.4: https://github.com/21052claver-ship-it/lanet/releases/tag/v0.6.4. Commit dd7fa5f3c857a51f80c4b345a703d191a51e7bc9; dominis actius i SSL vàlid, proves HTTP i digests publicats verificats.
