# Reaccions immediates i estats visibles

T77-01 · 0.6.12. M’agrada, desats i vots han de respondre al clic abans de la resposta HTTP. El servidor retorna només l’estat i comptador de la reacció; no cal esperar un bootstrap complet. La resta de mutacions conserva el seu flux actual.

- [x] Una cua per clau d’element/acció a la sessió, compartida entre targeta i detall. Bloqueig de duplicats; m’agrada i desar poden anar en paral·lel.
- [x] Actualització immediata, confirmació amb comptador canònic i reversió en errors. Si la resposta es perd, resincronitzar; els endpoints continuen essent idempotents i els premis no es dupliquen.
- [x] Lectures antigues no poden desfer una reacció pendent. Canviar de pàgina o tancar un detall no perd el seguiment de l’acció.
- [x] Cor i marcador plens, fons i contorn persistents diferenciats de hover. Focus visible, estat pressed/busy accessible, àrea tàctil de 44px i moviment reduït.
- [x] Fixtures locals amb resposta retinguda, doble clic, error, resposta perduda, save/like paral·lels, targeta/detall, persistència i tres motors de navegador. Proves de servidor i sincronització.
- [ ] Tipus, unitàries, build, audit:source, PR i Validate; CI del commit exacte de main, release 0.6.12 i comprovació via proveïdor.

Sense migracions, regals, canvis de credencials ni proves sobre la web pública. Els controls antiabús i els permisos del servidor es conserven.

Validació local: 381 unitàries, tipus/lint, build i 24 escenaris en Chromium, Firefox i WebKit, 390/1440px. Reacció comprovada mentre el POST està retingut; no és un benchmark de la web pública. Captures revisades de m’agrada, desats i vot. Publicació pendent de CI.
