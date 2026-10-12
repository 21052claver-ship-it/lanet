# Creador responsable

Tasca única T66-01.

- [x] Revisar API i restricció SQL.
- [x] Preparar formulari i servidor.
- [x] Revisar migració i verificar preservació amb dades locals.
- [x] Còpia privada abans de modificar la base de dades.
- [x] Proves en tres motors, CI i publicació.

Assaig privat verificat: còpia exportada via proveïdor, migració en transacció sobre còpia aïllada, digests de totes les taules iguals i foreign_key_check buit. Abans d’aplicar en producció es farà una còpia fresca i s’exigirà CI verda del commit exacte. La reconstrucció preserva rowids i recrea els 14 triggers originals; només canvien el CHECK entre persones diferents i l’estat inicial propi. S’utilitza PRAGMA defer_foreign_keys segons https://developers.cloudflare.com/d1/sql-api/foreign-keys/.

352 unitàries i 39 casos de prediccions correctes en tres motors. Migració 0025 verificada. Publicació confirmada: [0.6.0](https://github.com/21052claver-ship-it/lanet/releases/tag/v0.6.0), commit 731b5d4c8499c74276cd279f04da5aec68b20281, [CI](https://github.com/21052claver-ship-it/lanet/actions/runs/38220603175), Pages eebd85ef.
