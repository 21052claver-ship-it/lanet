# Creador responsable

Tasca única T66-01.

- [x] Revisar API i restricció SQL.
- [x] Preparar formulari i servidor.
- [x] Revisar migració i verificar preservació amb dades locals.
- [ ] Còpia privada abans de modificar la base de dades.
- [ ] Proves en tres motors, CI i publicació.

Assaig privat verificat: còpia exportada via proveïdor, migració en transacció sobre còpia aïllada, digests de totes les taules iguals i foreign_key_check buit. Abans d’aplicar en producció es farà una còpia fresca i s’exigirà CI verda del commit exacte. La reconstrucció preserva rowids i recrea els 14 triggers originals; només canvien el CHECK entre persones diferents i l’estat inicial propi. S’utilitza PRAGMA defer_foreign_keys segons https://developers.cloudflare.com/d1/sql-api/foreign-keys/.
