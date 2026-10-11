# Cartell visual · R31

Petició de Marc del 10 d’octubre de 2026: anunci només amb imatge si es vol, text gran que ocupi la peça, una mica més de mida i més presència de fusta. Retallador visual per triar exactament la zona de la imatge.

## Ordre d’execució

Una sola tasca activa: T18-01 → T18-02 → T18-03 → T18-04 → T18-05. Cada pas es tanca amb evidències i s’anota a l’historial abans de continuar. El registre general és la font dels estats.

- [x] T18-01 · Diagnosi i decisions d’UX.
- [x] T18-02 · Validació de contingut i geometria compartida.
- [x] T18-03 · Formats, fusta, editor i previsualització.
- [x] T18-04 · Unitats/API, ús real aïllat, crop i responsive.
- [x] T18-05 · Publicació, còpia i ZIP verificat.

## Decisions

El formulari anterior exigia títol i mostrava la imatge a 30 × 30 px dins d’un cartell de 236 × 44 px. Es passa a una peça aproximada de 272 × 56 px, situada a la mateixa barra. Al mòbil ocupa l’espai disponible sense tapar saldo, avisos o perfil. Mostrar/amagar i el detall continuen disponibles.

Tres formats explícits: **Només imatge**, **Text gran**, **Imatge i text**. La signatura i el context es consulten al detall, deixant tota la superfície al contingut principal. Els anuncis anteriors continuen interpretant-se segons el títol i el fitxer que ja tenen. No cal una migració ni alterar les regles d’ofertes.

La foto es carrega primer al navegador. L’editor mostra la imatge completa, una finestra de retall amb vores/guies, zoom, arrossegament, nanses i alternativa de teclat. La previsualització utilitza la mateixa proporció que el cartell real. Només es puja el PNG resultant en publicar; l’original no es publica. El títol és opcional per a una imatge sola; un anunci buit continua sent invàlid.

## Criteris de verificació

Geometria correcta en fotos verticals, horitzontals i molt amples, sense zones fora de la foto. Pan i zoom conserven el punt seleccionat dins dels límits. Imatge sola sense text obligatori; text gran sense foto; combinació amb lectura clara. Exportació coherent amb la previsualització, càrrega/format/error i canvi de foto controlats, crop desat en la imatge publicada, doble enviament i conflicte d’ofertes protegits. Focus, teclat i mides de 320 a 1536 px. Les publicacions de prova es fan en una base aïllada; producció es comprova en lectura.

## Evidències

`output/board-creative/` conserva diagnosi, captures i informes. Els anuncis i les notes de producció no es modifiquen per provar el canvi.

Tancament: 80/80 tasques generals verificades, cap activa ni pendent. Versió pública `5bf1215d-d236-4f26-8f59-73a05c2faf53`, 47 recursos amb SHA-256 idèntic. SQL restaurat amb 38 taules idèntiques i còpia D1/R2 de 14 fitxers contrastada. El paquet base acredita 921 fitxers rellegits; el ZIP final incorpora aquesta checklist tancada. Les limitacions de permisos del navegador consten a `docs/VERIFICATION.md`.
