# Seguretat i control d’abús · R76

Una sola tasca: T62-01. Implementació al servidor, dades locals de prova i publicació versionada. Sense migració ni modificació de notes, saldos o permisos dels usuaris.

## Checklist

- [x] Revisar autenticació, autorització, origen, pujades i operacions amb pastissos.
- [x] Fer persistents i atòmics els límits per compte; canviar d’IP no els reinicia.
- [x] Evitar publicacions duplicades, també en peticions concurrents o amb camps aleatoris ignorats.
- [x] Instal·lar pauses temporals progressives davant d’abús repetit.
- [x] Limitar mida, profunditat i complexitat del JSON i rebutjar claus de prototip.
- [x] Verificar ús normal, concurrència, recuperació, privadesa i regressions en navegadors.
- [x] Auditoria de codi publicable, CI del commit exacte i release amb rebut verificat.

## Pressupostos

Les finestres comencen amb la primera acció i es renoven quan caduquen. Els comptadors són SQL atòmics, compartits entre instàncies del servidor.

| Acció | Límit |
| --- | --- |
| API per IP, excepte tancar sessió | 6.000/minut, sostre ampli per xarxes compartides |
| Lectures per compte | 600/minut; bootstrap 120/minut |
| Escriptures per compte | 60/10 segons i 240/minut |
| Crear continguts, plusos, propostes, esdeveniments, avisos o recursos | 10/minut i 60/hora, combinats |
| Anuncis | 6/minut i 30/hora |
| Informes de contingut | 5/minut i 20/dia |
| Recollir pastís / completar concentració | 10/minut / 6/minut |
| Ruleta / operacions de prediccions | 12/minut / 30/minut per operació; idempotència preservada |
| Iniciar Google OAuth | 120/minut per IP, compatible amb una xarxa de centre |

Les pujades mantenen les quotes existents per compte, reserves de bytes, límits de concurrència i bloquejos progressius. Els fitxers es comproven pel contingut, es reconstrueixen i passen moderació abans de servir-se; els reemplaçats es retiren segons el cicle de vida existent.

## Duplicats i recuperació

Empremta de compte, ruta i camps útils del contingut normalitzat durant 10 minuts. No es desen els textos en el registre antiabús. La reserva és atòmica: un sol enviament concurrent es publica. Si la validació falla, s’allibera la reserva perquè es pugui corregir el formulari. Les edicions i operacions idempotents de saldo conserven la seva semàntica.

Vuit incidències en 60 segons —permisos denegats, recursos inexistents, peticions massa grans, duplicats o quotes superades— activen una pausa d’escriptures de 60 segons. Reincidir eleva la pausa a 5 i 15 minuts. Les peticions durant una pausa no n’allarguen la durada; després d’un dia sense una pausa recent, l’escala es reinicia. Els errors ordinaris de formulari no compten. Consultar i tancar sessió continua disponible, respectant les quotes de lectura.

Respostes 429 amb `Retry-After`, codi i espera en segons. L’aplicació mostra l’error del servidor i conserva el formulari. No hi ha reintents automàtics d’escriptura.

## Dades i abast

Claus de compte/IP i empremtes amb SHA-256, sense text ni identificadors en clar. Neteja horària de registres caducats; historial de pauses conservat un dia. JSON màxim 128 KiB, 20 nivells i 10.000 nodes. No es confia en la validació del navegador ni en la capçalera de mida.

Es mantenen Google únic @fje.edu, comprovacions de propietat i rol, origen de peticions, capçaleres de seguretat, transaccions de saldo i moderació de fitxers. Aquests controls cobreixen l’abús de l’aplicació; no constitueixen una garantia contra qualsevol atac distribuït o compte compromès.

Referències del model: [OWASP API4: consum de recursos](https://api-security.owasp.org/editions/2023/en/0xa4-unrestricted-resource-consumption/) i [OWASP: avaluació REST](https://cheatsheetseries.owasp.org/cheatsheets/REST_Assessment_Cheat_Sheet.html).

Verificació local: 350 proves unitàries i 6 casos antiabús en Chromium, Firefox i WebKit. Inclou 45 cicles seguits de preferències, notes i refresc amb ritme d’ús humà. Auditoria, CI i publicació confirmades.

Publicació confirmada: [0.4.0](https://github.com/21052claver-ship-it/lanet/releases/tag/v0.4.0), commit 7c531808f56c1f8015aa9054024c09e206344bb4, [CI](https://github.com/21052claver-ship-it/lanet/actions/runs/38190189682), Pages bd8a013b.
