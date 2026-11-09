# Defensa TEG – Modelo AgroData JM

Presentación web de 16 láminas (+4 de reserva) para la defensa del Trabajo Especial de Grado
«Diseño de un modelo sustentable de digitalización de procesos mediante Big Data para la Empresa
Agro Comercializadora JM» (UVM, Ingeniería en Computación, 2026).
Autores: Br. Rafael Pérez y Técn. Ricardo Briceño. Tutora: MSc. Yajaira Segovia.
Duración objetivo: 19 minutos (máximo 20). Se proyecta en un televisor 16:9 con respaldo eléctrico.

## Fuentes de verdad (leer antes de trabajar)
- Contenido, orden y tiempos: `docs/guion.md` y `data/slides.json`.
- Cifras: `data/*.json` (transcritas del TEG). NO inventar ni redondear datos; si falta uno, preguntar.
- Plan de desarrollo: `docs/plan-desarrollo.md`. Requisitos: `docs/requisitos.md`.
- Decisiones de arquitectura: `docs/decisiones.md` (agregar un ADR por cada decisión nueva).
- Identidad visual: `docs/identidad-visual.md`.
- Imágenes: `public/img/` (isologo UVM, figuras del TEG, capturas del sistema AgroData JM).

## Reglas técnicas
- HTML, CSS y JavaScript nativos con módulos ES. Sin frameworks (no React, Vue, Svelte, jQuery).
- Vite solo como servidor de desarrollo y empaquetador; `base: './'` para abrir el build sin servidor.
- Cero recursos remotos en tiempo de ejecución: nada de CDN, Google Fonts remotas ni APIs.
  Toda librería o fuente se guarda dentro del repositorio.
- Escenario fijo 1920×1080 escalado con `transform: scale()`; margen seguro del 5% (overscan del TV).
- Texto mínimo 28 px en el escenario; máximo 3–4 ideas por lámina.
- Colores, fuentes y espaciados solo desde `src/styles/tokens.css` (ver identidad visual).
  `#88c426` nunca como color de texto sobre fondo claro.
- Isologo UVM solo en las láminas 1 y 16, completo, sin deformar ni recolorear.
- Animaciones con CSS o Web Animations API, ≤ 1,5 s; respetar `prefers-reduced-motion`.
  Todo componente animado debe poder saltar a su estado final (tecla S).
- Separar lógica pura (testeable) de la vista en los componentes interactivos.
- Idioma de la interfaz, comentarios y commits: español.

## Comandos
- `npm run dev` – servidor de desarrollo
- `npm run build` – genera `dist/` (debe abrir con doble clic en `dist/index.html`)
- `npm test` – pruebas Vitest
- `npm run lint` – ESLint + Prettier

## Forma de trabajo
- Antes de un cambio grande (arquitectura, módulo nuevo), proponer un plan y esperar aprobación.
- Una lámina o un módulo por tarea. Una rama por función; commits convencionales
  (`feat:`, `fix:`, `content:`, `style:`, `test:`, `docs:`).
- Toda lógica de cálculo (fórmulas SS/PR/IR, deduplicación, cronómetro, router) lleva prueba en `tests/`.
- Ejecutar `npm test` y `npm run lint` antes de dar una tarea por terminada.
- Al terminar un módulo, explicar brevemente cómo funciona: los autores deben poder defenderlo ante el jurado.
