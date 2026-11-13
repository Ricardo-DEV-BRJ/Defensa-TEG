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
(tareas 1.2 y 1.3) y datos (con la lámina 3). Pendiente de aprobar: §8 (presentador como vista de `index.html` y fuentes).

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
interpretarTecla(tecla, estado, { ahora, enControl, enBoton, maxDigitos })
  → { accion, argumento, estado, consumida }   // consumida: anular la acción del navegador
iniciarTeclado(acciones, { documento = document, escenario, reloj = Date.now, maxDigitos })
  → detener()   // maxDigitos = cifras del total de láminas, calculado en main.js

// scaler.js
calcularEscala(anchoVentana, altoVentana, ancho = 1920, alto = 1080) → número
//   min(anchoVentana/ancho, altoVentana/alto); medida no válida → 1
iniciarEscalado(escenario, ventana = window) → detener()

// datos.js
resolverDato(datos, ruta) → valor | undefined   // 'objetivos.especificos.0.verbo'
formatear(valor, formato) → texto | null   // texto (por defecto), numero, decimal, porcentaje, usd,
                                           // cantidad (elementos de una lista u objeto)
rellenarDatos(raiz, datos) → rutas no encontradas   // main.js lo llama una vez sobre el escenario
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
- Secuencia principal 1–17; la reserva 18–21 queda fuera de ella (ADR-008).
- **Siguiente:** si quedan fragmentos, revela el próximo; si no, pasa a la lámina siguiente en el
  paso 0. En la última principal completa no hace nada (no vuelve al inicio).
- **Anterior:** si hay fragmentos visibles, oculta el último; si no, va a la lámina anterior **en su
  estado final** (todos los fragmentos visibles y componentes terminados). En la 1 no hace nada.
- **Ir a n** (G + número, hash, vista general): lámina n en el paso 0; fuera de 1–21 se ignora.
- **Reserva:** solo se llega por número (RF-01): G + número o el hash. Dentro de una lámina de
  reserva, → y ← solo revelan u ocultan sus fragmentos; para salir se usa G + número.
- **Vista general (O):** cuadrícula de las principales (5 por fila, al 16 % de su tamaño). → y ← mueven la
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
- Si el foco está en un `input`, `select` o `textarea` (calculadora de la lámina 14), solo AvPág y
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
  (válido, 0, 21, texto, vacío); navegación (fragmentos, bordes 1 y última principal, reserva, estado final al
  retroceder); teclado (mapa, modificadores, repetición, foco en un control, G + número con Enter,
  Esc y tiempo agotado); datos (rutas válidas e inválidas, formato es-VE).
- Pendiente al cerrar la Fase 1: probar a mano en Firefox el doble clic, las fuentes y la
  comunicación entre ventanas.

## ADR-007 · Sistema visual: tokens, plantillas y reglas comprobadas
- **Contexto:** las láminas deben verse coherentes y respetar `docs/identidad-visual.md` y las
  reglas de CLAUDE.md (texto ≥ 28 px, `#88c426` nunca como texto, isologo solo en la portada y el
  cierre) sin depender de que alguien lo revise a mano cada vez.
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
    la portada y en la última lámina principal (cierre) y dimensionado solo por el alto.
  - A las fuentes instaladas (subconjunto «latin») les faltan → ← ↑ ≥ ≤ ≈ √ σ ●; los dibuja la fuente
    de respaldo de la lista (Segoe UI en Windows).
- **Consecuencias:** un cambio de color o de tamaño se hace en un solo archivo, y una regla rota
  hace fallar `npm test`. Las cifras de las plantillas usan `data-dato`, que no tiene efecto hasta
  implementar `src/core/datos.js` (ADR-006 §7); hace falta antes de la Fase 3.

## ADR-008 · Conclusiones literales en dos láminas (17 principales)
- **Contexto:** el guion resumía las conclusiones en una línea por objetivo. Los autores pidieron
  mostrar en pantalla las conclusiones literales del TEG (5.1), porque no usarán notas a la vista;
  suman unas 420 palabras y no caben legibles (≥ 28 px) en una sola lámina.
- **Decisión:** dividir el Cap. V en dos láminas: la 11 (objetivos 1 y 2) y la nueva 12 (objetivos
  3 y 4 y conclusión general), con el texto tomado de `data/objetivos.json` → `conclusion_teg`.
  Las láminas siguientes se renumeran: propuesta 13–16, cierre 17, reserva 18–21. Los 90 s de la
  antigua lámina 11 se reparten en 45 + 45, así que el total sigue en 19:00.
- **Consecuencias:** se actualizaron `slides.json`, guion, requisitos (RF-01), plan, identidad
  visual, CLAUDE.md, `PROMPTS.md`, este registro y las pruebas, que ahora derivan de los datos la
  primera y la última lámina principal (isologo, recorrido completo). La vista general pasa a 5
  miniaturas por fila para que quepan las 17. El contexto del ADR-002 («16 láminas») se deja como
  estaba, porque describe el momento de esa decisión.

## ADR-009 · QR del cierre generado en desarrollo como SVG estático
- **Contexto:** el guion pide un QR en la lámina 17. CLAUDE.md prohíbe recursos remotos en tiempo
  de ejecución (nada de servicios web de QR) y pide guardar todo dentro del repositorio. Al
  9-11-2026 la URL todavía no está definida.
- **Decisión:**
  - `scripts/generar-qr.mjs` (`npm run qr -- <url>`) usa la dependencia de desarrollo `qrcode`
    1.5.4 (MIT, versión exacta) para escribir `public/img/qr.svg` con los colores `--color-texto`
    y `--color-fondo` de `tokens.css`, con corrección de errores M y el margen de 4 módulos.
  - La URL y el texto que se lee bajo el QR (sin `https://`) quedan en `data/cierre.json`.
  - La lámina muestra el SVG con `<img>` y el texto con `data-dato`: la presentación no carga
    ninguna librería de QR.
- **Consecuencias:** la presentación sigue sin dependencias en tiempo de ejecución y el SVG se
  versiona con el repositorio. Si cambia la URL, hay que volver a ejecutar el comando. Mientras
  no haya URL, la lámina 17 no muestra el QR: en su lugar hay un comentario «QR», y el script
  imprime el bloque `<figure>` que lo reemplaza. Las funciones puras del script (`validarUrl`,
  `textoVisible`, `leerColor`, `generarSvg`) se prueban en `tests/qr.test.js`.

## ADR-010 · Componentes en el deck y simulador de duplicados (lámina 14)
- **Contexto:** la Fase 4 empieza por los componentes interactivos. El contrato del ADR-006 §7
  (`crear` → `activar`, `desactivar`, `paso`, `saltarAlFinal`) estaba diseñado, pero el deck aún no
  lo cumplía. La lámina 14 ya llena el escenario con tres paneles y el simulador necesita espacio.
- **Decisión:**
  - `crearDeck` recibe `datos` y `componentes` (`{ 'bar-chart': módulo, 'dedup-sim': módulo }`,
    armado en `main.js`). Cada elemento `data-componente="nombre"` recibe
    `módulo.crear(elemento, datos)` cuando las láminas ya están en el documento; uno que falte o
    falle se avisa en la consola y no detiene al resto.
  - Qué método llamar en cada cambio lo decide una función pura, `llamadasAComponentes`:
    desactivar al salir, activar al entrar y pasar el paso; al llegar con «anterior», el mismo
    «saltar al final» de la tecla S (componentes y transiciones CSS).
  - `src/components/dedup-sim.js` separa la lógica pura (clave de venta, detección con intervalo
    estricto, importación en orden, anulación por rol y la simulación como función de estado) de
    la vista, que se vuelve a dibujar desde el estado tras cada acción.
  - En la lámina 14 el simulador es el paso 4 y ocupa el lugar de los tres paneles (`:has()`); con ←
    vuelven los paneles. En la vista general se ven los paneles, que son el contenido de la lámina.
    El simulador se reinicia cada vez que se entra a la lámina y sus clics no avanzan
    (`data-interactivo`).
  - Datos en `arquitectura.json → deduplicacion`: `rol_que_anula` = «Administración» (TEG 6.4.2:
    «el administrador, quien es el único rol autorizado para anularla»; Tabla 18) y una venta de
    ejemplo marcada como ficticia (`ejemplo_demo`). El intervalo sigue siendo el de demostración
    (60 s).
- **Consecuencias:** cualquier componente nuevo solo tiene que exportar `crear` y registrarse en
  `main.js`. Las utilidades compartidas (tiempos, movimiento reducido, `fabricaDeElementos`)
  viven en `src/components/comun.js`. La calculadora de stock (`stock-calc.js`) es el paso 5 de
  la lámina 14: todo paso con la clase `.demo` reemplaza a los paneles y, si hay varios visibles,
  solo se ve el último. Sus rangos están en `arquitectura.json → formulas.calculadora` (de
  demostración; las definiciones son las del TEG 6.4.5). Queda pendiente llamar a
  `saltarAlFinal` antes de imprimir (con `print.css`).

## ADR-011 · Flujo de datos de la lámina 13 en ráfagas, no en bucle
- **Contexto:** `PROMPTS.md` 4.4 pide puntos de datos que suban de la captura a la visualización
  con `requestAnimationFrame`, clic en una capa para ver sus componentes, pausa con
  `prefers-reduced-motion` y salto al estado final con S. CLAUDE.md limita las animaciones a
  1,5 s, y un flujo sin fin compite con el expositor por la atención del jurado.
- **Decisión:**
  - Las capas siguen en el HTML de la lámina (el deck cuenta sus pasos al crearla);
    `data-flow.js` les agrega el comportamiento. `data-capa` numera las capas (1 = captura) y una
    prueba comprueba que coincide con su `data-dato`.
  - El flujo va en **ráfagas**: cuando aparece una capa nueva, 3 paquetes suben por la flecha
    desde la captura hasta la capa más alta visible en 1,4 s (`--retardo-paso` y el token nuevo
    `--duracion-flujo`). Un clic en la flecha repite la ráfaga. Al retroceder no hay ráfaga.
  - Movimiento reducido: no se lanza ninguna ráfaga. Tecla S y llegada con «anterior»: la
    ráfaga se detiene en su estado final (los paquetes ya llegaron y no queda nada visible).
  - Clic, Enter o Espacio en una capa la amplía (componentes en lista grande) y deja las demás
    con número y nombre; otro clic la cierra. Al salir de la lámina se cierra.
  - Las capas y la flecha son `role="button"` con `tabindex="0"`; `keyboard.js` trata
    `[role="button"]` como un botón (Espacio y Enter son del elemento, las flechas navegan).
- **Consecuencias:** la posición de cada paquete en el tiempo es una función pura
  (`posicionesRafaga`) con pruebas, igual que cuándo lanzar una ráfaga y qué capa ampliar. Si se
  quisiera un flujo continuo, bastaría con relanzar la ráfaga al terminar, pero rompería la regla
  de 1,5 s.

## ADR-012 · counter, gantt y level-meter mejoran lo que ya se ve
- **Contexto:** `PROMPTS.md` 4.5 pide `counter.js` (lámina 15), `gantt.js` (16) y `level-meter.js`
  (9). Las tres láminas ya mostraban sus datos con HTML y CSS, y la defensa es el 17-11-2026: hay
  que animarlas sin arriesgar lo que funciona.
- **Decisión:**
  - Los tres siguen el contrato del ADR-006 §7 con un ciclo común, `alRevelarse` (en
    `src/components/comun.js`): animan una vez cuando aparece su fragmento, se detienen si se
    oculta, y la tecla S, la llegada con «anterior» y el movimiento reducido dejan el estado
    final. `bar-chart` usa el mismo ciclo.
  - **counter:** se agrega a la cifra que ya tiene `data-dato` y `data-formato`; cuenta de 0 al
    valor de `costos.json` en `--duracion-conteo` (1,2 s) con `requestAnimationFrame`. Sin
    animación, la cifra ya es la final.
  - **level-meter:** se agrega a la lista de indicadores; lee cada nivel de `observacion.json` por
    la ruta de su `data-vars` y pinta los segmentos llenos uno tras otro, desde el gris de
    «vacío» (Web Animations, 1,3 s). La leyenda no se anima.
  - **gantt:** arma las filas desde `cronograma.json` (antes eran cinco filas copiadas a mano) y
    deja el crecimiento de las barras a las transiciones CSS que ya existían. El rótulo
    «semanas a–b» va antes de la barra si después no quedan 4 semanas. Clic, Enter o Espacio en una
    fase muestra sus actividades (Tabla 24) en un recuadro bajo el cronograma; mientras está
    abierto, las metas se ocultan.
  - `hacerBoton` y `alternarAmpliada` pasan a `comun.js` para que `data-flow` y `gantt` los
    compartan.
- **Consecuencias:** la lógica de cada uno (`valorEnInstante`, `segmentosLlenos`,
  `tiempoDeSegmento`, `filasDelGantt`, `rotuloAntes`) tiene pruebas. La lámina 16 ya no tiene
  `data-dato` en las filas del cronograma: los textos los escribe `gantt.js` desde los datos.

## ADR-013 · Impresión y PDF: print.css más un estado final preparado por el deck
- **Contexto:** RF-10 pide exportar a PDF con `@media print`: una lámina por página, 16:9,
  componentes en estado final y sin la reserva. Muchos estados ocultos dependen de que un
  fragmento no tenga `data-visible` (barras en cero, tarjetas giradas, cadenas, metas), así que
  forzar la opacidad con CSS no basta.
- **Decisión:**
  - `src/styles/print.css` (cargado en `index.html`, reglas dentro de `@media print`): página de
    1920 × 1080 px sin márgenes (`@page`), escenario sin escala, cada lámina principal en su
    página con salto antes de cada una salvo la primera (sin página en blanco al final), reserva
    oculta, fondos impresos (`print-color-adjust: exact`), sin transiciones ni animaciones, y sin
    lo que solo sirve en vivo: demostraciones de la lámina 14 (salen sus paneles), recuadro de
    actividades del Gantt, paquetes del flujo, guías, pantalla negra e «Ir a lámina».
  - `deck.prepararImpresion()` en `beforeprint`: cierra la vista general, marca todos los
    fragmentos de todas las láminas como visibles y, en cada componente, llama a `desactivar`
    (cierra recuadros, capas ampliadas y demostraciones) y a `saltarAlFinal`; termina las
    animaciones. `deck.terminarImpresion()` en `afterprint`: la lámina actual vuelve a su paso,
    sin animar.
  - Las reglas que en pantalla reemplazan los paneles de la 14 y ocultan las metas bajo el
    recuadro del Gantt quedan dentro de `@media screen`.
- **Consecuencias:** Ctrl+P → «Guardar como PDF» da 17 páginas de 1440 × 810 pt (16:9),
  verificado con Chrome. Si un navegador no disparara `beforeprint`, `print.css` igual muestra
  todos los fragmentos, aunque algún estado interno podría quedar a medias.

## ADR-014 · Lámina 8 con barras de % de acuerdo (bar-chart) en lugar de la barra divergente
- **Contexto:** la lámina 8 se construyó con una barra apilada divergente en CSS (desacuerdo ·
  neutral · acuerdo). `PROMPTS.md` 4.1 pide un componente `bar-chart.js` en SVG con barras
  horizontales animadas del % de acuerdo de los ítems con `destacado_lamina_8`, usado en esa lámina.
- **Decisión:**
  - La lámina 8 usa dos `bar-chart`, uno por paso: «Lo que necesitan» y «Cómo están hoy». Cada
    ítem destacado de `likert.json` lleva `grupo_lamina_8` (1 o 2) para saber en qué paso va; las
    barras se ordenan de mayor a menor acuerdo.
  - Una nota sobre el gráfico dice qué mide («de acuerdo o totalmente de acuerdo»); con un solo
    color de datos no hace falta leyenda.
  - El desacuerdo, que la barra divergente mostraba, se escribe junto a la barra («· 75% en
    desacuerdo», en rojo y con la palabra) cuando pesa más que el acuerdo: hoy, 1.1 (75%) y 2.6
    (50%). La regla sale de los datos (`desacuerdoDestacado`), no de una lista de ítems.
  - Se borraron los estilos de la barra divergente y de su leyenda. El token
    `--color-neutro-grafico` se conserva para la lámina de reserva 18 (cuestionario completo).
- **Consecuencias:** el % de acuerdo no oculta un desacuerdo mayoritario. El neutral no se muestra
  en la lámina; el detalle completo de cada ítem queda para la reserva 18.

## ADR-015 · Efectos: partículas de fondo, inclinación 3D y capas 3D (excepción a la regla de 1,5 s)
- **Contexto:** los autores pidieron (10-11-2026) elementos 3D y partículas interactivas con el
  cursor. Eligieron partículas muy tenues detrás de todas las láminas, tarjetas que se inclinan y
  las capas de la lámina 13 en 3D. Las partículas son una animación continua: CLAUDE.md limita las
  animaciones a 1,5 s.
- **Decisión:**
  - **Excepción:** las partículas de fondo son la única animación continua permitida. Se pausan con
    la pestaña oculta y en la vista general, no se animan con `prefers-reduced-motion` (queda una
    imagen fija), no se imprimen, y la tecla **E** apaga y enciende todos los efectos
    (`data-sin-efectos` en el escenario).
  - **Partículas** (`src/core/particulas.js`): un `<canvas>` de 1920 × 1080 detrás de las láminas
    (z-index −1 dentro del escenario), 70 puntos con semilla fija, color acento a 35 % de opacidad,
    líneas petróleo a 14 % como máximo entre puntos a menos de 160 px; el cursor aparta los puntos
    a menos de 180 px y vuelven a su deriva en unos 5 s. Va a 60 cuadros por segundo sin GPU.
  - **Inclinación** (`src/core/inclinacion.js`): paneles y tarjetas (lista en
    `SELECTOR_INCLINABLE`) giran hasta 6° hacia el cursor, se achican al 95 % y proyectan una
    sombra hacia el lado contrario; al salir vuelven a plano en 150 ms y se quita el atributo,
    para que recuperen sus propias transiciones. Solo con ratón. No incluye el isologo (no se puede
    deformar) ni los paneles de las demostraciones de la lámina 14.
  - **Capas 3D** (en `data-flow.js`): en reposo, planas; con el ratón encima, la pila gira hasta
    6°, se achica al 92 % y cada capa se adelanta 5 px por nivel. El achique y los ángulos se
    midieron en el navegador: nada sale del margen seguro ni toca los transversales.
  - La lógica (generador con semilla, movimiento de partículas, enlaces, cálculo de la
    inclinación) es pura y tiene pruebas.
- **Consecuencias:** las partículas pasan por detrás de los textos que no están en una caja con
  fondo; si en el TV distraen o el equipo va lento, la tecla E los apaga sin recargar. La
  impresión sale plana y sin partículas.

## ADR-016 · Panel de controles para el ratón que se oculta solo
- **Contexto:** los autores pidieron (10-11-2026) un panel con botones atractivos para poner la
  pantalla completa y ver el mapa de láminas, que desaparezca si el cursor no se mueve.
- **Decisión:**
  - `src/core/controles.js` crea, dentro del escenario (escala igual que las láminas), una franja
    petróleo translúcida abajo al centro, dentro del margen seguro, con botones redondos de ícono
    SVG: anterior, contador («8 / 17»; las de reserva dicen «18 · reserva»), siguiente, mapa de
    láminas (vista general, O) y pantalla completa (F, con ícono de entrar o salir).
  - Aparece al mover el ratón o hacer clic, y se desvanece junto con el puntero cuando el ratón
    queda quieto `--controles-espera` (2,5 s); no se oculta con el cursor encima ni con un botón
    enfocado (Tab). Las teclas no lo muestran: con el presentador inalámbrico nunca aparece.
  - Los botones llaman a las mismas acciones del deck que el teclado. Tras un clic el foco vuelve
    al documento, para que Espacio y las flechas sigan pasando láminas. El botón del mapa queda en
    verde mientras la vista general está abierta. No se imprime.
  - La decisión de ocultar (`debeOcultar`) y el texto del contador (`textoContador`) son puros y
    tienen pruebas.
- **Consecuencias:** mientras está visible tapa una franja del pie de la lámina; desaparece a los
  2,5 s de dejar quieto el ratón.

## ADR-017 · Partículas del prototipo UVM: isologo en partículas, fondo de íconos y láminas petróleo
- **Contexto:** los autores aportaron (10-11-2026) el prototipo `particulas-uvm.html` y pidieron
  (1) el isologo de la portada formado con sus partículas, (2) que su fondo de partículas sea el de
  todo el documento y (3) adoptar su fondo petróleo en algunas láminas. El prototipo carga Google
  Fonts, incrusta el logo en base64 (108 KB) y escribe colores a mano, y estando en `src/` rompía
  tres reglas visuales y el lint.
- **Decisión:**
  - El prototipo pasa a `docs/referencias/particulas-uvm.html` (referencia, fuera de la
    presentación). Su logo con el interior transparente se guarda como
    `public/img/uvm-isologo-particulas.png`: con el isologo oficial (interior blanco opaco) las
    partículas formarían un disco blanco.
  - **Isologo en partículas** (`src/components/isologo-particulas.js`, portada): cada partícula toma
    el color de su punto del isologo (no se recolorea), llega desde toda la lámina al entrar y lo
    arma; respira menos de medio píxel, el cursor la aparta y un clic sobre el isologo lo dispersa
    (`data-interactivo`: no pasa de lámina). **Excepción a la regla del isologo «sin deformar»**,
    pedida por los autores: en reposo queda completo y con sus colores; con movimiento reducido, al
    imprimir, fuera de la portada o si el navegador no deja leer los píxeles (`file://`) se ve el
    isologo oficial. La tecla S y la llegada con «anterior» lo dejan armado. Las partículas se
    dibujan agrupadas por color (61 cuadros por segundo sin GPU; 39 sin agrupar).
  - **Fondo de todo el documento** (`src/core/particulas.js`, reemplaza la red de puntos del
    ADR-015): los 15 íconos de trazo, las etiquetas (KPI, ETL, SQL…) y la red del prototipo, uno
    cada 42 000 px². Tema claro: petróleo al 35 %. Tema oscuro: los colores del prototipo (íconos
    claros, etiquetas verde y celeste, red celeste). Detrás de títulos, párrafos, listas, tablas e
    imágenes (y de lo marcado con `data-atenuar-fondo`) los íconos bajan al 10 %; las zonas se
    miden cada medio segundo para seguir a los pasos.
  - **Fondo petróleo** (`data-fondo="oscuro"`): el degradado del prototipo (`--fondo-oscuro`) en la
    portada y el cierre, con textos en el color claro (7,9:1) y en celeste UVM (`--color-celeste`,
    5,3:1). Va en el escenario mientras la lámina está en pantalla (detrás del lienzo de
    partículas) y en la propia lámina en la vista general y en el PDF. Otra lámina lo adopta con
    el mismo atributo.
  - La lógica (muestreo del logo, objetivos con su color, muelle, dispersión, íconos, zonas) es pura
    y tiene pruebas.
- **Consecuencias:** las etiquetas del lienzo son decorativas (sin cifras). El fondo sigue siendo la
  única animación continua (ADR-015) y la tecla E lo apaga. La revisión automática ignora los
  lienzos decorativos (`canvas[aria-hidden]`) al medir el margen seguro.

## ADR-018 · Publicación en GitHub Pages, cifras medidas del repositorio y licencia
- **Contexto:** los autores pidieron (10-11-2026) publicar `dist/` en GitHub Pages en cada push a
  `main`, completar el README (capturas, instrucciones, atajos, licencia) y crear la lámina de
  reserva 21, «Cómo se construyó esta presentación», cuyas cifras (pruebas, componentes,
  decisiones, commits) no pueden escribirse a mano.
- **Decisión:**
  - `.github/workflows/deploy.yml`: en cada push a `main` (o a mano) instala con `npm ci`, ejecuta
    `npm run lint` y `npm test` (si algo falla, no se publica), construye `dist/` y lo publica con
    las acciones oficiales de Pages (`configure-pages`, `upload-pages-artifact`, `deploy-pages`).
    El build ya usa rutas relativas (`base: './'`), así que funciona en la subcarpeta del sitio.
    Requisito en GitHub: Settings → Pages → Source: «GitHub Actions».
  - `scripts/metricas.mjs` (`npm run metricas`) mide el repositorio y escribe
    `data/construccion.json`: ejecuta Vitest para contar las pruebas, cuenta componentes, módulos
    del motor, ADR, dependencias en tiempo de ejecución, láminas y commits, y deriva las direcciones
    del repositorio y del sitio del remoto de git. `tests/construccion.test.js` falla si alguna
    cifra estructural quedó vieja (por ejemplo, un ADR nuevo sin volver a medir).
  - Lámina 21: el motor como cadena (contenido → motor → láminas), cuatro cifras de
    `construccion.json` y la pila técnica. El puntaje de Lighthouse no se muestra: aún no se midió
    (Fase 6).
  - Licencia elegida por los autores: **MIT para el código**; el contenido del TEG, los textos de
    las láminas, las capturas del sistema y el isologo UVM, con todos los derechos reservados. Las
    fuentes Barlow conservan su SIL OFL 1.1, cuyo texto se publica junto a ellas en `public/fonts/`.
- **Consecuencias:** antes de la defensa (y tras agregar pruebas o commits) conviene ejecutar
  `npm run metricas` para que la lámina 21 muestre las cifras del día. Cada push a `main`
  publica el sitio: lo que esté en `main` es público.

## ADR-019 · Modelo propuesto frente al prototipo del Anexo 20
- **Contexto:** al comparar la defensa con el Manual de usuario del sistema (TEG, Anexo 20,
  pp. 214–247) aparecieron diferencias con el Cap. VI: el prototipo no tiene formularios de
  captura ni conciliación física del inventario; los posibles duplicados se listan en Calidad
  de datos y no bloquean el despacho; la sincronización es diaria (02:00) con recálculo cada
  15 min; la base de datos es MariaDB (el TEG propone PostgreSQL; confirmado por los autores el
  11-11-2026); el despliegue en VPS con Docker no consta en el manual; la parte ambiental y el
  papel evitado figuran como fase futura (p. 222).
- **Decisión:** la presentación sigue mostrando el modelo del Cap. VI, pero distingue en
  pantalla lo que ya funciona en el prototipo de lo que se implementa por fases:
  - `data/arquitectura.json`: cada capa y transversal tiene `en_prototipo` (1 / 0) en paralelo a
    `componentes`; se separan «Conciliación y anomalías» y «Vencimientos y ambiente» en sus
    partes, la base de datos dice MariaDB y el ETL describe la sincronización real.
  - Láminas 13 y 14: cada componente lleva `data-vars="prototipo=…"`; el CSS pone ■ (prototipo) o
    □ con texto secundario (por fases): cambia la forma, no solo el color. El pie de la lámina 13
    explica las dos marcas.
  - Simulador de duplicados: ventana de 15 min (`intervalo_sugerido_segundos` = 900, Anexo 20,
    p. 246), texto «proceso propuesto (Figura 16)» y aclaración de que el prototipo lista los
    posibles duplicados en Calidad de datos antes del cierre de caja. `textoIntervalo()` da
    «15 min» en lugar de «900 s».
  - Láminas 14 y 16: el −80 % de papel y los indicadores son metas de la implementación
    (Tabla 25). Lámina 15: el software libre del prototipo (MariaDB, MinIO, Node.js).
  - Notas de las láminas 13 a 17 y `docs/guion.md` ajustados con el mismo criterio.
- **Consecuencias:** la defensa no afirma nada que el prototipo no haga, y el jurado ve qué parte
  del modelo ya está validada. Si el prototipo se despliega en el VPS antes de la defensa, basta
  cambiar a 1 el estado de «Docker en VPS» en `data/arquitectura.json`.

## ADR-020 · Problema General al inicio de la lámina 2
- **Contexto:** los autores pidieron (13-11-2026) que el problema de la investigación aparezca en
  pantalla para leerlo y que el jurado entienda mejor de qué se habla. Eligieron solo la pregunta
  del Problema General (TEG 1.2.1, pág. 27) y dentro de la lámina 2, sin renumerar.
- **Decisión:**
  - `data/objetivos.json → problema_general`: texto literal y fuente; como en el objetivo general,
    «Big Data» y «Empresa Agro Comercializadora JM» van en mayúsculas.
  - Lámina 2: un `.pregunta-entrada` antes de las cadenas. En pantalla, al llegar (paso 0) se ve la
    pregunta y no las cadenas; con el primer fragmento, las cadenas la reemplazan (`:has()`, sin
    JavaScript ni pasos nuevos). En la vista general y al imprimir se ven las cadenas.
  - Tiempos: la lámina 2 pasa de 75 a 85 s y la 5 (antecedentes, que no se leen) de 50 a 40 s; el
    total sigue en 1.140 s.
- **Consecuencias:** la navegación de la lámina 2 no cambia (cuatro pasos); al volver desde la
  lámina 3 se llega con las cadenas visibles, como antes.

