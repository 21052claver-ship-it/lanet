# Cartell permanent i oferta inicial · R39

Una sola tasca activa, comprovada abans de passar a la següent. [Checklist](CHECKLIST.md) i [historial](HISTORIAL-CANVIS.md). Aquesta revisió és independent de l’activació externa de Google, que continua pendent a T25-05.

- [x] T26-01: retirar l’opció d’amagar del detall i del perfil; mostrar el cartell encara que una preferència antiga digui el contrari. Conservar assignatures, privadesa de notes i altres preferències.
- [x] T26-01: oferta inicial mínima d’1 pastís, coherent al formulari, l’API i una migració D1 nova. Conservar el doble del valor actual per substituir un anunci.
- [x] T26-02: provar oferta inicial, imports invàlids, saldo, cobrament únic, concurrència, compatibilitat de preferències i components reals amb SSR offline. Executar regressions, tipus, lint i build.
- [x] T26-03: còpies verificades, migració local i pública, desplegament i ZIP amb historial actualitzat.

La migració només substitueix el trigger de validació d’ofertes. Cap anunci, saldo, moviment de moneder o preferència existent s’ha de reescriure. La clau antiga showBoard es conserva com a compatibilitat de protocol i sempre es normalitza a true.

La comprovació de navegador continua limitada pels permisos desats. No s’utilitzen lectures HTTP alternatives de la web bloquejada; l’API de proves funciona en una instància D1/R2 aïllada.
