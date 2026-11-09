---
description: Verifica que todas las cifras visibles salgan de data/*.json
---
Busca en `src/` cualquier número, porcentaje o monto escrito directamente en HTML o JS
(por ejemplo 75%, 56,10, 24 semanas) que no provenga de `data/*.json`.
Lista cada caso con archivo y línea, y propone cómo enlazarlo al JSON correspondiente.
Comprueba además que los totales cuadren: frecuencias del Likert suman 4, costos suman 56,10,
tiempos de `slides.json` suman 1140 s.
