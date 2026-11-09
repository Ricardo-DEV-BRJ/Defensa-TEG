---
description: Revisa una lámina contra el guion, los datos y las reglas visuales
argument-hint: <número de lámina>
---
Revisa la lámina $ARGUMENTS sin modificar nada todavía y entrega una lista de hallazgos:

- ¿Responde a su «pregunta guía» de `data/slides.json` de un vistazo?
- ¿Cada cifra coincide exactamente con `data/*.json` y `docs/guion.md`?
- ¿Tiene más de 4 ideas o texto menor a 28 px?
- ¿Desborda el escenario o invade el margen seguro del 5%?
- ¿Usa solo variables de `tokens.css`? ¿Usa `#88c426` como texto?
- ¿Contraste AA? ¿Transmite algo solo con color (rojo/verde) sin etiqueta?
- ¿Funciona con `prefers-reduced-motion` y con la tecla S (estado final)?

Después pregunta qué hallazgos corregir.
