# Plan de desarrollo – Presentación web de la defensa

## Principios
- Funciona sin internet (USB, doble clic o servidor local).
- Contenido separado del motor (`data/*.json`).
- Cada animación explica algo; nada decorativo.
- Hecha para un televisor 16:9: escenario 1920×1080 escalado, margen seguro 5%, texto ≥ 28 px.
- Coherente con el TEG: capas, datos como fuente única, software libre, costo USD 0.

## Stack
JS nativo (módulos ES) + Vite (dev/build) · CSS con variables, Grid, `clamp()`, `@media print` ·
SVG a mano para gráficos · Web Animations API / `requestAnimationFrame` · BroadcastChannel ·
Vitest, ESLint, Prettier · Git + GitHub Pages · fuentes Barlow locales.
Plan B si falta tiempo: reveal.js descargado localmente.

## Estructura objetivo
```
src/core/        deck.js, router.js, keyboard.js, scaler.js, sync.js, timer.js, rehearsal.js
src/components/  bar-chart.js, data-flow.js, dedup-sim.js, stock-calc.js, gantt.js, counter.js, level-meter.js
src/slides/      01-portada.html … 16-cierre.html, 17–20 reserva
src/styles/      tokens.css, layout.css, components.css, print.css
src/main.js      index.html (proyector) · presenter.html (presentador)
tests/           router, timer, fórmulas, deduplicación
.github/workflows/deploy.yml
```

## Motor
| Módulo | Responsabilidad | Prioridad |
| --- | --- | --- |
| deck | Cargar láminas desde `slides.json`, estado actual, fragmentos | Imprescindible |
| router | `#/n` ↔ lámina n | Imprescindible |
| keyboard | Navegación y atajos (ver `docs/requisitos.md` RF-05) | Imprescindible |
| scaler | Escenario 1920×1080 escalado | Imprescindible |
| sync + presenter | Vista de presentador sincronizada | Alta |
| timer | Cronómetro por lámina con semáforo | Alta |
| rehearsal | Modo ensayo y exportación JSON | Media |
| print.css | Exportación a PDF | Media |

## Mapa lámina por lámina (★ = demostración clave)
| # | Idea visual / interacción | Componente |
| --- | --- | --- |
| 1 | Título que se escribe; isologo UVM | counter (máquina de escribir) |
| 2 | Causa → efecto en SVG por fragmentos | SVG + fragmentos |
| 3 | 4 objetivos como pipeline | Grid + fragmentos |
| 4 | Tarjetas que se voltean; Incluye / No incluye | CSS 3D |
| 5 | Línea de tiempo 2023→2026 | SVG (antecedentes.json) |
| 6 | Figura 1 redibujada; leyes conectadas | SVG + stroke-dashoffset |
| 7 | Triangulación: 4 fuentes → diagnóstico; N = 6 | SVG + counter |
| 8 | Barras Likert que crecen | bar-chart (likert.json) |
| 9 | Medidores de nivel 1–4 | level-meter (observacion.json) |
| 10 | Tarjetas dato → interpretación → decisión | Fragmentos |
| 11 | Tabla de objetivos con checks | Fragmentos + SVG |
| 12 ★ | Capas con paquetes de datos que suben; clic expande tecnologías | data-flow (arquitectura.json) |
| 13 ★ | Simulador de corte de luz + calculadora SS/PR | dedup-sim, stock-calc |
| 14 ★ | Contador 0 → USD 56,10 con desglose | counter (costos.json) |
| 15 | Gantt de 24 semanas + metas | gantt (cronograma.json) |
| 16 | Frase final, Gracias, QR | QR generado localmente |
| 17–20 | Reserva: Likert completo, roles, riesgos, cómo se construyó | — |

## Fases (contar hacia atrás desde la fecha de defensa)
| Fase | Días | Criterio de terminado |
| --- | --- | --- |
| 0. Arranque | 1 | `npm run dev` funciona; primer commit en GitHub |
| 1. Motor base | 2–3 | Navegación 1–16 con teclado y presentador; recarga conserva lámina |
| 2. Sistema visual | 3–4 | Láminas usan solo `tokens.css`; contraste AA |
| 3. Contenido | 4–6 | Cada cifra coincide con el TEG (uno transcribe, otro verifica) |
| 4. Componentes | 6–9 | Pruebas de SS/PR y deduplicación pasan |
| 5. Presentador y cronómetro | 9–10 | Dos ventanas sincronizadas; PDF de 16 páginas |
| 6. Calidad y ensayos | 11–14 | Dos ensayos seguidos en 18:30–19:30; Lighthouse ≥ 90; prueba en el TV de la sala |
| 7. Publicación | 15 | GitHub Pages, `dist/` en 2 USB, PDF, etiqueta `v1.0-defensa` |

## Git
Rama `main` siempre funcional · una rama por función (`feat/router`, `content/cap-iv`) ·
commits convencionales · PR revisado por el compañero · Issues por lámina y módulo en el milestone «Defensa».

## Día de la defensa
| Riesgo | Mitigación |
| --- | --- |
| Sin internet | Build local; la presentación no usa red. TV con respaldo eléctrico; laptop cargada y conectada |
| Falla la laptop | 2 USB con `dist/` + PDF |
| TV recorta bordes o cambia colores | «Ajustar a pantalla» / «Just Scan» y modo «PC» o «Juego»; margen 5%; probar con su HDMI |
| Presentador no abre en segunda pantalla | Practicar pantalla extendida (Win + P); plan B: notas impresas y cronómetro en el teléfono |
| Animación trabada | Tecla S; animaciones ≤ 1,5 s |
| Se acaba el tiempo | Cronómetro por lámina; recortar Caps. II y III |

Antes de entrar: laptop cargada, notificaciones y actualizaciones desactivadas, presentación en
pantalla completa y presentador sincronizado; cable HDMI y adaptador; presentador inalámbrico.
Valores ensayados para la calculadora: z = 1,65, σd = 4, L = 3, d̄ = 20 → SS ≈ 11,43, PR ≈ 71,43.
