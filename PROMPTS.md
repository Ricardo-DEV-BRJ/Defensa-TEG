# Secuencia de prompts para Claude Code

Copiar y pegar uno por sesión o por tarea, en orden. Revisar y probar en el navegador antes de pasar al siguiente.
Cuando el prompt diga «plan», usar el modo de planificación (Shift + Tab) y aprobar el plan antes de que escriba código.

---

## Fase 0 · Arranque
**0.1**
> Lee CLAUDE.md, docs/guion.md, docs/plan-desarrollo.md, docs/requisitos.md, docs/decisiones.md, docs/identidad-visual.md y los archivos de data/. Resume en 10 líneas lo que entendiste del proyecto y dime si ves contradicciones o datos faltantes. No escribas código.

**0.2**
> Inicializa el proyecto: package.json con Vite, Vitest, ESLint y Prettier (scripts dev, build, preview, test, lint), vite.config.js con base './' y entradas index.html y presenter.html, y la estructura de carpetas de docs/plan-desarrollo.md. No borres ni modifiques docs/, data/ ni public/. Crea un index.html mínimo que muestre "Hola" en el escenario. Luego ejecuta npm run dev y npm test.

**0.3** (en la terminal, no en Claude Code)
```
git add . && git commit -m "chore: estructura inicial" && git push
```

## Fase 1 · Motor base
**1.1 (plan)**
> Propón la arquitectura del motor (deck, router, keyboard, scaler) con sus interfaces y eventos (slidechange, fragment). Escríbela como ADR-006 en docs/decisiones.md. Espera mi aprobación.

**1.2**
> Implementa src/core/scaler.js (escenario 1920×1080, transform: scale, margen seguro del 5%) y src/core/router.js (#/n) con pruebas en tests/.

**1.3**
> Implementa deck.js y keyboard.js según RF-01 a RF-05 de docs/requisitos.md. Genera las 16 láminas desde data/slides.json mostrando solo número y título. Las de reserva (17–20) solo accesibles por número.

## Fase 2 · Sistema visual
**2.1**
> Crea src/styles/tokens.css con la paleta y reglas de docs/identidad-visual.md. Configura @font-face con Barlow Condensed y Barlow desde public/fonts/ (yo coloco los .woff2). Crea las plantillas de lámina: portada, título + contenido, dos columnas, cifra grande y diagrama.

## Fase 3 · Contenido
**3.x** (repetir por lámina, de la 1 a la 16)
> /nueva-lamina 1

Después de cada bloque de láminas:
> /revisar-lamina 1

Al terminar las 16:
> /verificar-datos

## Fase 4 · Componentes interactivos
**4.1**
> Implementa src/components/bar-chart.js en SVG que lea data/likert.json y dibuje barras horizontales animadas de % de acuerdo para los ítems con destacado_lamina_8. Úsalo en la lámina 8.

**4.2**
> Implementa src/components/dedup-sim.js para la lámina 13. Lógica pura separada de la vista según data/arquitectura.json → deduplicacion: dos ventas con igual cliente, productos, cantidades y monto en menos de 60 s se marcan como duplicado y bloquean el despacho; solo el rol administrador puede anularla. Vista: botón "Simular corte de luz" → la caja emite dos ventas iguales → al "volver la luz" el pipeline las importa en orden, marca la duplicada en rojo y bloquea el despacho. Pruebas Vitest de la lógica.

**4.3**
> Implementa src/components/stock-calc.js: deslizadores para z, σd, L y d̄ que recalculan SS = z·σd·√L y PR = d̄·L + SS en vivo. Prueba con el ejemplo de data/arquitectura.json (SS ≈ 11,43; PR ≈ 71,43).

**4.4**
> Implementa src/components/data-flow.js para la lámina 12: las 5 capas de data/arquitectura.json apiladas, puntos de datos que suben de captura a visualización con requestAnimationFrame, y clic en una capa para expandir sus componentes. Debe pausar con prefers-reduced-motion y saltar al estado final con la tecla S.

**4.5**
> Implementa counter.js (lámina 14 con data/costos.json), gantt.js (lámina 15 con data/cronograma.json) y level-meter.js (lámina 9 con data/observacion.json).

## Fase 5 · Presentador, cronómetro y PDF
**5.1**
> Implementa presenter.html y src/core/sync.js con BroadcastChannel: lámina actual y siguiente en miniatura, pregunta guía, notas, expositor y cronómetro (src/core/timer.js) con semáforo verde/ámbar 80%/rojo 100% y adelanto/atraso acumulado. Pruebas del timer.

**5.2**
> Implementa el modo ensayo (src/core/rehearsal.js) que guarde la duración real de cada lámina en localStorage y permita exportarla como JSON.

**5.3**
> Crea src/styles/print.css: una lámina por página 16:9, componentes en estado final, sin láminas de reserva.

## Fase 6 · Calidad y ensayos
**6.1**
> Revisa todo el proyecto como lo haría un jurado de ingeniería: accesibilidad, rendimiento, código muerto, consistencia con docs/guion.md y cumplimiento de docs/requisitos.md. Lista los problemas por prioridad antes de corregir.

**6.2** (tras cada ensayo)
> /ensayo ensayos/ensayo-1.json

**6.3**
> Explícame cómo funciona cada módulo de src/core y src/components en lenguaje sencillo, para poder defenderlo. Agrega un resumen a docs/decisiones.md.

## Fase 7 · Publicación
**7.1**
> Crea .github/workflows/deploy.yml para publicar dist/ en GitHub Pages en cada push a main. Completa el README con capturas, instrucciones, atajos de teclado y licencia. Crea la lámina de reserva 20 "Cómo se construyó esta presentación".

**7.2** (en la terminal)
```
npm run build
git tag v1.0-defensa && git push --tags
```
Copiar la carpeta `dist/` y el PDF a dos memorias USB y probar en otra computadora sin internet.
