# Cambios

- Los PDF pasan por un lector de verdad, no solo por mirar la cabecera y el final.
- Se rechazan scripts, acciones, adjuntos, formularios, capas y PDF cifrados o rotos.
- Se revisan todas las páginas con el filtro de imágenes que ya había. Si falla o no lo tiene claro, no se guarda el PDF.
- Se guarda un PDF nuevo con las páginas como imágenes. Así no se cuelan archivos ni cosas ocultas. Se ve igual, pero el texto ya no se puede seleccionar y los enlaces no funcionan.
- Los PDF viejos se revisan al abrirlos o adjuntarlos. El original queda privado, como ya pasaba con las fotos.
- Lo nuevo está en pdf-safety.js y pdf-inspection.js. files.js solo los llama y guarda la política nueva; media-entry.js atiende la revisión.