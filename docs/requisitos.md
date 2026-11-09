# Requisitos de la presentación web

## Funcionales
| ID | Requisito |
| --- | --- |
| RF-01 | Mostrar las 16 láminas en el orden de `data/slides.json`; las de reserva (17–20) solo por número. |
| RF-02 | Navegar con → / espacio / clic / AvPag (avanzar) y ← / RePag (retroceder), compatible con presentador inalámbrico. |
| RF-03 | Mostrar fragmentos paso a paso dentro de una lámina (`data-fragment`). |
| RF-04 | URL por lámina (`#/n`); recargar conserva la posición. |
| RF-05 | Teclas: O vista general, F pantalla completa, B pantalla negra, P abrir presentador, T reiniciar cronómetro, S saltar animación al estado final, G + número + Enter ir a lámina. |
| RF-06 | Vista de presentador (`presenter.html`) sincronizada por BroadcastChannel: lámina actual y siguiente, pregunta guía, notas, expositor, cronómetro. |
| RF-07 | Cronómetro total y por lámina con colores verde / ámbar (80%) / rojo (100%) e indicador de adelanto o atraso acumulado. |
| RF-08 | Modo ensayo: registrar duración real por lámina en localStorage y exportarla como JSON. |
| RF-09 | Componentes interactivos: barras Likert, flujo de datos por capas, simulador de duplicados, calculadora SS/PR, contador, Gantt. |
| RF-10 | Exportar a PDF con `@media print` (una lámina por página, componentes en estado final). |
| RF-11 | Barra de progreso con marcas por capítulo. |

## No funcionales
| ID | Requisito |
| --- | --- |
| RNF-01 | Funciona sin internet; ningún recurso remoto. |
| RNF-02 | `dist/index.html` abre con doble clic (sin servidor) en Chrome y Firefox recientes. |
| RNF-03 | Escenario 1920×1080 escalado; correcto en 1920×1080 y 3840×2160; margen seguro 5%. |
| RNF-04 | Texto ≥ 28 px en el escenario; contraste WCAG AA; nada comunicado solo por color. |
| RNF-05 | Animaciones ≤ 1,5 s; respeta `prefers-reduced-motion`. |
| RNF-06 | Cambio de lámina < 100 ms; Lighthouse ≥ 90 en rendimiento y accesibilidad. |
| RNF-07 | Cifras solo desde `data/*.json`. |
| RNF-08 | Lógica cubierta por pruebas Vitest (router, cronómetro, fórmulas, deduplicación). |
| RNF-09 | Código en español, ESLint + Prettier sin errores. |
