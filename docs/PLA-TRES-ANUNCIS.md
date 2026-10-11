# Tres espais d’anuncis · R52

- [x] Migració additiva: cartells existents a l’espai 1; historial i cobraments conservats.
- [x] Tres espais independents, amb mínim inicial d’un pastís i control de concurrència per espai.
- [x] Tres cartells 16:9; selector d’espai amb disponibilitat i preu. En pantalles estretes, fila pròpia.
- [x] Text, imatge, retallador i anonimat conservats; selecció d’espai conserva l’esborrany i el retall.
- [x] 168 proves unitàries, 40 fluxos API, tipus, lint i renderització local dels components correctes.
- [x] Còpia privada de D1 abans de migrar; migració i Pages 9c423d76 publicats.
- [ ] Revisió visual pública pendent: accés al navegador denegat pels permisos. No s’ha eludit.

T38-02 continua aparcada amb la revisió pública de música pendent. Aquesta tasca no modifica anuncis existents ni concedeix cobraments de prova en producció. La migració només afegeix l’espai i adapta les proteccions. Recuperació: restaurar el codi anterior mantenint la columna additiva; si ja hi ha anuncis als espais 2/3, conservar-los i revisar la compatibilitat abans de tornar enrere.
