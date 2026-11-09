# Registro de decisiones de arquitectura (ADR)

Formato: contexto → decisión → consecuencias. Agregar una entrada por cada decisión nueva.

## ADR-001 · Presentación web en lugar de PowerPoint
- **Contexto:** se quiere demostrar que la ingeniería se aplica también a la forma de comunicar el trabajo.
- **Decisión:** aplicación web estática propia (HTML, CSS, JS).
- **Consecuencias:** más trabajo inicial; a cambio, interactividad que muestra la lógica del modelo y un repositorio como evidencia.

## ADR-002 · JavaScript nativo sin frameworks
- **Contexto:** 16 láminas, dos desarrolladores, plazo corto.
- **Decisión:** módulos ES nativos; Vite solo para desarrollo y build. reveal.js queda como plan B.
- **Consecuencias:** cero dependencias en producción; el motor es propio y explicable ante el jurado.

## ADR-003 · Funcionamiento sin conexión
- **Contexto:** la sala puede no tener internet.
- **Decisión:** ningún recurso remoto; fuentes y librerías dentro del repositorio; build con `base: './'`.
- **Consecuencias:** coherente con el TEG (resiliencia ante fallas del entorno).

## ADR-004 · Contenido separado del motor
- **Contexto:** las cifras del TEG pueden corregirse hasta el último momento.
- **Decisión:** textos, tiempos y datos en `data/*.json`; el motor solo los renderiza.
- **Consecuencias:** una corrección se hace en un solo lugar; se puede verificar automáticamente.

## ADR-005 · Escenario fijo 1920×1080 escalado
- **Contexto:** se proyecta en un televisor de resolución desconocida, con posible overscan.
- **Decisión:** escenario fijo con `transform: scale()` y margen seguro del 5%.
- **Consecuencias:** diseño predecible en cualquier pantalla 16:9.

## ADR-006 · Arquitectura del motor: deck, router, keyboard y scaler
**Estado:** propuesta (9 de noviembre de 2026). Implementado: scaler, router, deck y keyboard
(tareas 1.2 y 1.3). Pendiente de aprobar: §8 (presentador como vista de `index.html` y fuentes).

### Contexto
El motor debe cubrir RF-01 a RF-05 y RF-11, servir de base al presentador, el cronómetro, el ensayo
y el PDF (RF-06 a RF-10) sin rehacerse, y abrir con doble clic (RNF-02). Prueba hecha el 9-11-2026
con Chrome 156 headless sobre `file://`:

| Recurso abierto desde `file://` | Chrome 156 |
| --- | --- |
| `<script type="module" src="…">`, con o sin `crossorigin` | Bloqueado |
| `<script type="module">` con el código en línea | Funciona |
| `<script src="…">` clásico | Funciona |
| `<link rel="stylesheet" crossorigin>` (lo que Vite genera hoy) | Bloqueado |
| `<link rel="stylesheet">` sin `crossorigin` | Funciona |
| `fetch()` de un JSON | Bloqueado |
| `@font-face` con un archivo local | Funciona |
| `localStorage`, `BroadcastChannel` y `postMessage` entre dos ventanas | Funcionan |

Firefox 157 no pudo automatizarse en esta máquina; se verifica a mano al cerrar la Fase 1.

### Decisión

**1. Módulos.** Cada archivo de `src/core/` tiene arriba funciones puras (probadas en `tests/`) y
abajo una función `iniciar…` o `crear…` delgada que las conecta con el DOM. Los módulos no se
importan entre sí: `main.js` es el único que los conoce y los conecta.

| Módulo | Lógica pura | Vista |
| --- | --- | --- |
| `deck.js` | Estado de navegación: siguiente, anterior, ir a; conteo de pasos | Crea las láminas, muestra la actual, revela fragmentos, emite eventos |
| `router.js` | `'#/7'` ↔ `7` | `hashchange` → `deck.irA`; `slidechange` → `history.replaceState` |
| `keyboard.js` | Tecla → acción, incluida la secuencia G + número + Enter | Escucha `keydown` y clic; ejecuta acciones |
| `scaler.js` | Factor de escala para que 1920×1080 quepa en la ventana | Escribe `--escala` en el escenario al cargar y al redimensionar |
| `datos.js` (nuevo) | Resuelve `"costos.total"` en los JSON y da formato es-VE (`56,10`) | Rellena los `data-dato` de cada lámina |

**2. Interfaces.**
```js
// deck.js — estado = { lamina, fragmento }; estructura[n - 1] = { pasos, reserva } de la lámina n
siguienteEstado(estado, estructura)          → estado
anteriorEstado(estado, estructura)           → estado
irAEstado(n, estructura)                     → estado | null   // null si n está fuera de 1–20
vecinaPrincipal(lamina, estructura, ±1)      → número | null   // salta las de reserva
gruposDeFragmentos(valores)                  → número[]        // pasos = cantidad de grupos
esFragmentoVisible(valor, fragmento, grupos) → booleano
crearDeck({ escenario, laminas, plantillas }) → deck   // datos y componentes: fases 3 y 4
//   deck es un EventTarget con: total, estado, modo ('normal' | 'vista-general'), negro,
//   iniciar(n), siguiente(), anterior(), irA(n), saltarAlFinal(), alternarVistaGeneral(),
//   cerrarVistaGeneral(), alternarNegro()

// router.js
leerHash(hash, total) → número | null   // '#/7' → 7; '#/0', '#/21', '#/x', '' → null
escribirHash(n)       → '#/n'
iniciarRouter(deck, ventana = window) → detener()

// keyboard.js
interpretarTecla(tecla, estado, { ahora, enControl, enBoton })
  → { accion, argumento, estado, consumida }   // consumida: anular la acción del navegador
iniciarTeclado(acciones, { documento = document, escenario, reloj = Date.now }) → detener()

// scaler.js
calcularEscala(anchoVentana, altoVentana, ancho = 1920, alto = 1080) → número
//   min(anchoVentana/ancho, altoVentana/alto); medida no válida → 1
iniciarEscalado(escenario, ventana = window) → detener()

// datos.js
resolverDato(datos, ruta) → valor | undefined
formatear(valor, formato) → texto   // formatos: numero, decimal, porcentaje, usd
```

**3. Eventos.** El deck es un `EventTarget` nativo y emite `CustomEvent` cuyo `detail` es un objeto
plano, para que la Fase 5 lo reenvíe tal cual al presentador.

| Evento | Cuándo | `detail` |
| --- | --- | --- |
| `slidechange` | Cambia la lámina, incluido el arranque | `{ lamina, anterior, fragmento, pasos, origen, info }` |
| `fragment` | Cambia el paso dentro de la misma lámina | `{ lamina, fragmento, pasos, direccion }` |

- `origen`: `'inicio'`, `'secuencia'` (→ ←) o `'salto'` (G, hash, vista general). El ensayo usa esta distinción.
- `direccion`: `'adelante'` o `'atras'`.
- `info`: la entrada de `slides.json` (título, capítulo, expositor, pregunta, notas, segundos, reserva).
- Escuchan: router, componentes, barra de progreso (RF-11) y, en la Fase 5, cronómetro, presentador
  y ensayo. Solo se agregan eventos nuevos cuando una fase los necesite.

```
teclado / clic ── acción ──▶ ┌──────┐ ── slidechange ─▶ router (#/n), barra de progreso
hashchange ────── irA ─────▶ │ deck │ ── fragment ────▶ componentes de la lámina actual
                             └──────┘                 ─▶ Fase 5: cronómetro, presentador, ensayo
resize ─▶ scaler (independiente)
```

**4. Navegación.**
- Secuencia principal 1–16; la reserva 17–20 queda fuera de ella.
- **Siguiente:** si quedan fragmentos, revela el próximo; si no, pasa a la lámina siguiente en el
  paso 0. En la 16 completa no hace nada (no vuelve al inicio).
- **Anterior:** si hay fragmentos visibles, oculta el último; si no, va a la lámina anterior **en su
  estado final** (todos los fragmentos visibles y componentes terminados). En la 1 no hace nada.
- **Ir a n** (G + número, hash, vista general): lámina n en el paso 0; fuera de 1–20 se ignora.
- **Reserva:** solo se llega por número (RF-01): G + número o el hash. Dentro de una lámina de
  reserva, → y ← solo revelan u ocultan sus fragmentos; para salir se usa G + número.
- **Vista general (O):** cuadrícula de las 16 principales a 1/5 de su tamaño. → y ← mueven la
  selección de lámina en lámina; un clic elige y cierra; O, Esc o Enter cierran.
- **Fragmentos:** `data-fragment="n"` con n ≥ 1; los elementos con el mismo n aparecen juntos y los
  pasos son los valores distintos en orden. El deck marca `data-visible` y el CSS hace la transición
  (≤ 1,5 s; sin transición con `prefers-reduced-motion`).

**5. Teclado y clic.**

| Tecla | Acción |
| --- | --- |
| →, Espacio, AvPág | Siguiente |
| ←, RePág | Anterior |
| O | Vista general |
| F | Pantalla completa |
| B, y `.` como alias (lo envían muchos presentadores inalámbricos) | Pantalla negra |
| P | Abrir presentador |
| T | Reiniciar cronómetro |
| S | Saltar animación al estado final |
| G, dígitos, Enter | Ir a lámina (Retroceso borra; Esc o 3 s sin teclas cancela) |
| Esc, Enter | Cerrar la vista general |

- Ignora teclas con Ctrl, Alt o Meta (Ctrl+R y Alt+Tab siguen funcionando) y las repeticiones de
  tecla sostenida al navegar.
- Si el foco está en un `input`, `select` o `textarea` (calculadora de la lámina 13), solo AvPág y
  RePág navegan, y primero quitan el foco; las demás teclas son del control.
- Con el foco en un botón, Espacio y Enter son del botón (lo activan) y no cambian de lámina.
- El clic avanza solo si no cae dentro de `a, button, input, select, textarea, label, [data-interactivo]`.
- Con la pantalla en negro, una tecla de navegación solo quita el negro; no avanza.
- `keyboard.js` no conoce al deck: recibe un mapa `acciones` desde `main.js`. Las acciones que aún no
  existen (presentador, cronómetro) se ignoran.

**6. Escalado.** `.escenario` queda centrado con `transform: translate(-50%, -50%) scale(var(--escala))`.
`scaler.js` solo escribe `--escala`, al cargar y en `resize` (incluye entrar y salir de pantalla
completa). Mide el escenario con `offsetWidth`/`offsetHeight`, así que su tamaño se define solo en
`tokens.css`. El margen seguro del 5% es relleno interno del escenario definido en `tokens.css`; con
`?guias` en la dirección se dibuja como línea punteada para revisar las láminas.

**7. Láminas, datos y componentes.**
- Las 20 láminas se crean al inicio como `<section class="lamina" data-lamina="n">` y solo la actual
  es visible: el cambio tarda < 100 ms (RNF-06), y la vista general y el PDF necesitan todas en el DOM.
- El HTML de `src/slides/*.html` entra al bundle con `import.meta.glob(…, { query: '?raw', eager: true })`.
  Si falta un archivo, el deck muestra número y título (sirve para la tarea 1.3).
- Cifras: `<span data-dato="costos.total" data-formato="usd"></span>`. Si la ruta no existe se muestra
  `¿costos.total?` y se avisa en consola: un dato roto se ve, no se oculta.
- Componentes: elemento con `data-componente="bar-chart"`. Cada módulo de `src/components/` exporta
  `crear(elemento, datos)` y devuelve `{ activar(), desactivar(), paso(n), saltarAlFinal() }`. El deck
  llama `activar`/`desactivar` al entrar y salir de su lámina (nada se anima fuera de pantalla),
  `paso(n)` en cada `fragment`, y `saltarAlFinal()` con la tecla S, al llegar con «anterior» y antes
  de imprimir.
- La tecla S además termina las animaciones CSS y Web Animations de la lámina actual con
  `getAnimations({ subtree: true })` y `finish()`, salvo las infinitas.

**8. Carga sin servidor.**
- Ningún `fetch` en tiempo de ejecución: los JSON y las láminas se importan y quedan dentro del bundle.
- Un plugin propio de Vite (`scripts/vite-incrustar.js`, unas 30 líneas, solo en `build`) mete el JS
  en un `<script type="module">` en línea y el CSS en un `<style>`, sin atributos `crossorigin`.
  `dist/index.html` queda autocontenido; las imágenes siguen en `dist/img/`.
- El presentador es una vista de la misma página: P abre `index.html?vista=presentador`. Con dos
  entradas, Vite generaría un archivo de código compartido que se cargaría por `import` y quedaría
  bloqueado. `presenter.html` queda como redirección de una línea, para conservar el nombre de RF-06.
  En la Fase 5, la sincronización usa `postMessage` con la ventana que abrió al presentador (no
  depende del origen) y `BroadcastChannel` como complemento.
- Las fuentes siguen en `public/fonts/` (Chrome las carga desde `file://`). Si fallan en Firefox, el
  plugin las incrusta como data URI.
- `npm run verificar:build` abre `dist/index.html` en Chrome headless por `file://` y comprueba que
  el motor arrancó.

**Alternativas descartadas:** cargar láminas o datos con `fetch` (bloqueado en `file://`); dos builds
separados para proyector y presentador (duplica configuración); una dependencia para incrustar el
bundle (lo resuelven unas 30 líneas propias que se pueden explicar); framework o librería de eventos
(`EventTarget` basta; ADR-002).

### Consecuencias
- Cada módulo tiene una parte pura con pruebas y una vista delgada; `main.js` es el único lugar donde
  se ve el motor completo conectado.
- El mismo `dist/` sirve para doble clic, USB y GitHub Pages.
- Las fases 4 y 5 se montan escuchando eventos, sin modificar el motor.
- Las 20 láminas viven siempre en el DOM y `dist/index.html` crece al incrustar JS y CSS; ambos costos
  son irrelevantes a esta escala.
- Cambian `vite.config.js` (plugin; `presenter.html` sin JS) y la redacción de RF-06 en
  `docs/requisitos.md` (presentador como vista de `index.html`).
- Pruebas previstas: escala (1920×1080 → 1; 3840×2160 → 2; 1366×768; valores inválidos); hash
  (válido, 0, 21, texto, vacío); navegación (fragmentos, bordes 1 y 16, reserva, estado final al
  retroceder); teclado (mapa, modificadores, repetición, foco en un control, G + número con Enter,
  Esc y tiempo agotado); datos (rutas válidas e inválidas, formato es-VE).
- Pendiente al cerrar la Fase 1: probar a mano en Firefox el doble clic, las fuentes y la
  comunicación entre ventanas.

## ADR-007 · Sistema visual: tokens, plantillas y reglas comprobadas
- **Contexto:** las 16 láminas deben verse coherentes y respetar `docs/identidad-visual.md` y las
  reglas de CLAUDE.md (texto ≥ 28 px, `#88c426` nunca como texto, isologo solo en las láminas 1 y
  16) sin depender de que alguien lo revise a mano cada vez.
- **Decisión:**
  - `src/styles/tokens.css` concentra la paleta, las fuentes (`@font-face` locales), los tamaños de
    letra, los espaciados y las medidas del escenario.
  - Cinco plantillas (portada, título + contenido, dos columnas, cifra grande y diagrama) como
    clases de `src/styles/plantillas.css`, con esqueletos HTML en `src/slides/plantillas/`, que el
    deck no carga como láminas. `/galeria.html` (solo en desarrollo; no entra al build) las recorre
    con el mismo motor.
  - `tests/reglas-visuales.test.js` comprueba: paleta y contrastes iguales a los documentados; AA
    en los colores de texto; ningún color, tamaño de letra ni espaciado escrito a mano fuera de
    `tokens.css`; el acento nunca como color de texto; láminas sin estilos en línea; isologo solo en
    las láminas 1 y 16 y dimensionado solo por el alto.
  - A las fuentes instaladas (subconjunto «latin») les faltan → ← ↑ ≥ ≤ ≈ √ σ ●; los dibuja la fuente
    de respaldo de la lista (Segoe UI en Windows).
- **Consecuencias:** un cambio de color o de tamaño se hace en un solo archivo, y una regla rota
  hace fallar `npm test`. Las cifras de las plantillas usan `data-dato`, que no tiene efecto hasta
  implementar `src/core/datos.js` (ADR-006 §7); hace falta antes de la Fase 3.
