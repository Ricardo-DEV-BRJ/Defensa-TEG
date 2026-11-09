---
description: Crea una lámina a partir del guion
argument-hint: <número de lámina>
---
Crea la lámina número $ARGUMENTS.

1. Lee su entrada en `data/slides.json` y su sección en `docs/guion.md`.
2. Crea `src/slides/<archivo>` usando la plantilla de lámina que mejor se ajuste
   (portada, título + contenido, dos columnas, cifra grande, diagrama).
3. Pon en pantalla solo lo indicado en «En pantalla» del guion; las notas van a `slides.json`, no a la lámina.
4. Toma toda cifra de `data/*.json`; no escribas números a mano.
5. Marca con `data-fragment="n"` los elementos que deben aparecer paso a paso.
6. Verifica que el contenido quepa en el escenario 1920×1080 dentro del margen seguro del 5%.
7. Resume qué creaste y qué queda pendiente (por ejemplo, el componente interactivo).
