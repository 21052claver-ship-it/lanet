# Icona NET pastel

Revisió demanada per Marc a partir de la nova referència: base arrodonida, raigs blancs prominents des de la vora superior i blau pastel. Tasca T72-01; la configuració del domini continua en PR10 separada, pendent de HTTPS.

- [x] Generar la variant amb l’eina integrada `image_gen` a partir de la referència.
- [x] Preparar WebP transparent de 256 × 256, 10.942 bytes.
- [x] Substituir l’asset compartit de sidebar i Més: `public/images/ui/official-net-3d-v2.webp`.
- [x] Verificar a mida real, sidebar plegada i mòbil amb fixtures locals.
- [ ] Passar PR/CI i publicar 0.6.4.

L’enllaç, etiqueta accessible i obertura en pestanya nova es conserven. Un contorn CSS arrodonit limita la representació al cos de la insígnia i evita mostrar els píxels residuals de l’alpha exterior generat; no es retoca el dibuix ni els raigs. Redimensionament i codificació WebP conserven la transparència original. L’original seleccionat és `exec-32f049c4-1b09-4967-9918-26f4854b022b.png`, conservat localment. Les variants de neteja posteriors s’han descartat perquè no milloraven la fidelitat o el contorn.

## Prompt seleccionat

Mode: eina integrada `image_gen`, edició amb referència i `transparent_background: true`.

```text
Edit the supplied 3D NET logo reference for a polished small sidebar UI icon. Preserve its exact rounded square silhouette, frontal view, soft inflated ceramic volume and recognizable seven white downward sun rays attached at the top edge, with the long central ray. Change the saturated royal blue tile to a soft muted pastel cornflower blue (#94B8DA), with gentle slightly darker blue bevel shading and clean warm-white raised rays. Keep the emblem prominent and the same proportions as the reference. Clean up all stray pixels and rough edges around the top. Entire object centered and fully visible, with 8 percent transparent padding on all sides. Smooth matte clay material, soft upper-left studio lighting, enough subtle shadow under the white rays for legibility at 32px. No text, no extra symbols, no floor, no outer drop shadow, no background. True transparent background, square canvas.
```

Verificació local: compilació Pages correcta i cinc casos a 320, 390, 844, 1024 i 1440 px. Captures revisades de sidebar oberta, plegada i Més mòbil. URL exacta, nom accessible, pestanya nova sense opener, teclat i tancament de Més preservats; cap desbordament horitzontal. Portal extern simulat, sense visites a producció. Evidències privades: `output/net-pastel/local-checks.json`, `local.log`, `build.log` i captures.
