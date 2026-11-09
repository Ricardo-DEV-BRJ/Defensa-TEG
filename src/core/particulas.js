/**
 * Partículas de fondo (ADR-015): una «red de datos» muy tenue detrás de todas las láminas. Los
 * puntos derivan despacio, se unen con líneas finas cuando están cerca y se apartan del cursor.
 *
 * Es la única animación continua de la presentación (excepción a la regla de 1,5 s, ADR-015):
 * no se anima con prefers-reduced-motion (queda una imagen fija), se pausa con la pestaña oculta
 * y en la vista general, no se imprime, y la tecla E la apaga y la enciende.
 *
 * Parte pura (tests/particulas.test.js): crearAleatorio, crearParticulas, moverParticulas y
 * enlaces. Parte de vista: iniciarParticulas.
 */

// ── Lógica pura ──────────────────────────────────────────────────────────────

/**
 * Generador de números pseudoaleatorios con semilla (mulberry32): la misma semilla da siempre la
 * misma red, en cada ensayo y en las pruebas.
 * @param {number} semilla
 * @returns {() => number} un número en [0, 1) por llamada
 */
export function crearAleatorio(semilla) {
  let estado = semilla >>> 0;
  return () => {
    estado = (estado + 0x6d2b79f5) >>> 0;
    let t = estado;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Puntos repartidos por el escenario, cada uno con su deriva (vx0, vy0) en px por segundo.
 * @param {number} cantidad
 * @param {{ ancho: number, alto: number, velocidad?: [number, number],
 *   aleatorio?: () => number }} opciones
 */
export function crearParticulas(cantidad, { ancho, alto, velocidad = [6, 14], aleatorio }) {
  const azar = aleatorio ?? Math.random;
  return Array.from({ length: cantidad }, () => {
    const angulo = azar() * Math.PI * 2;
    const rapidez = velocidad[0] + azar() * (velocidad[1] - velocidad[0]);
    const vx0 = Math.cos(angulo) * rapidez;
    const vy0 = Math.sin(angulo) * rapidez;
    return { x: azar() * ancho, y: azar() * alto, vx: vx0, vy: vy0, vx0, vy0 };
  });
}

/**
 * Un paso de dt segundos. El cursor empuja hacia afuera a los puntos que están a menos de
 * «radio» (más fuerte cuanto más cerca); después cada punto vuelve poco a poco a su deriva. Al
 * salir por un borde, el punto entra por el opuesto.
 * @param {object[]} particulas
 * @param {number} dt segundos
 * @param {{ ancho: number, alto: number, cursor?: { x: number, y: number } | null,
 *   radio?: number, empuje?: number, retorno?: number }} opciones
 * @returns {object[]} partículas nuevas (no modifica las recibidas)
 */
export function moverParticulas(
  particulas,
  dt,
  { ancho, alto, cursor = null, radio = 180, empuje = 900, retorno = 1.5 },
) {
  const vuelta = (valor, limite) => ((valor % limite) + limite) % limite;
  return particulas.map((p) => {
    let { vx, vy } = p;
    if (cursor) {
      const dx = p.x - cursor.x;
      const dy = p.y - cursor.y;
      const distancia = Math.hypot(dx, dy);
      if (distancia > 0 && distancia < radio) {
        const fuerza = (1 - distancia / radio) * empuje * dt;
        vx += (dx / distancia) * fuerza;
        vy += (dy / distancia) * fuerza;
      }
    }
    const k = Math.min(1, retorno * dt);
    vx += (p.vx0 - vx) * k;
    vy += (p.vy0 - vy) * k;
    return { ...p, x: vuelta(p.x + vx * dt, ancho), y: vuelta(p.y + vy * dt, alto), vx, vy };
  });
}

/**
 * Pares de puntos a menos de «distancia»: se unen con una línea más visible cuanto más cerca.
 * @param {{ x: number, y: number }[]} particulas
 * @param {number} distancia
 * @returns {{ a: number, b: number, intensidad: number }[]} intensidad entre 0 y 1
 */
export function enlaces(particulas, distancia) {
  const pares = [];
  for (let a = 0; a < particulas.length; a++) {
    for (let b = a + 1; b < particulas.length; b++) {
      const d = Math.hypot(particulas[a].x - particulas[b].x, particulas[a].y - particulas[b].y);
      if (d < distancia) pares.push({ a, b, intensidad: 1 - d / distancia });
    }
  }
  return pares;
}

// ── Vista ────────────────────────────────────────────────────────────────────

const CANTIDAD = 70;
const DISTANCIA_ENLACE = 160;
const RADIO_CURSOR = 180;
const RADIO_PUNTO = 3;
// Muy tenue: el fondo no debe competir con el texto de las láminas.
const ALFA_PUNTO = 0.35;
const ALFA_LINEA = 0.14;

/**
 * Crea el lienzo detrás de las láminas y lo anima.
 * @param {HTMLElement} escenario
 * @param {{ ventana?: Window }} [opciones]
 * @returns {{ actualizar(): void }} actualizar: volver a pintar tras encender o apagar los efectos
 */
export function iniciarParticulas(escenario, { ventana = window } = {}) {
  const documento = escenario.ownerDocument;
  const lienzo = documento.createElement('canvas');
  lienzo.className = 'particulas';
  lienzo.setAttribute('aria-hidden', 'true');
  const ancho = escenario.offsetWidth;
  const alto = escenario.offsetHeight;
  lienzo.width = ancho;
  lienzo.height = alto;
  escenario.prepend(lienzo);
  const contexto = lienzo.getContext('2d');
  if (!contexto) return { actualizar() {} };

  const estilo = ventana.getComputedStyle(escenario);
  const colores = {
    puntos: estilo.getPropertyValue('--color-acento').trim(),
    lineas: estilo.getPropertyValue('--color-primario').trim(),
  };
  const reducido = ventana.matchMedia?.('(prefers-reduced-motion: reduce)');
  let particulas = crearParticulas(CANTIDAD, { ancho, alto, aleatorio: crearAleatorio(2026) });
  let cursor = null;
  let anterior = null;
  let cuadroPendiente = 0;

  const apagado = () =>
    escenario.hasAttribute('data-sin-efectos') || escenario.dataset.modo === 'vista-general';

  // El escenario está escalado: las coordenadas del ratón se pasan a px del escenario.
  escenario.addEventListener('pointermove', (evento) => {
    if (evento.pointerType !== 'mouse') return;
    const caja = escenario.getBoundingClientRect();
    const escala = caja.width / ancho || 1;
    cursor = { x: (evento.clientX - caja.left) / escala, y: (evento.clientY - caja.top) / escala };
  });
  escenario.addEventListener('pointerleave', () => {
    cursor = null;
  });

  function pintar() {
    contexto.clearRect(0, 0, ancho, alto);
    if (apagado()) return;
    contexto.lineWidth = 1;
    contexto.strokeStyle = colores.lineas;
    for (const { a, b, intensidad } of enlaces(particulas, DISTANCIA_ENLACE)) {
      contexto.globalAlpha = ALFA_LINEA * intensidad;
      contexto.beginPath();
      contexto.moveTo(particulas[a].x, particulas[a].y);
      contexto.lineTo(particulas[b].x, particulas[b].y);
      contexto.stroke();
    }
    if (cursor && !reducido?.matches) {
      contexto.strokeStyle = colores.puntos;
      for (const p of particulas) {
        const d = Math.hypot(p.x - cursor.x, p.y - cursor.y);
        if (d >= RADIO_CURSOR) continue;
        contexto.globalAlpha = ALFA_LINEA * (1 - d / RADIO_CURSOR);
        contexto.beginPath();
        contexto.moveTo(cursor.x, cursor.y);
        contexto.lineTo(p.x, p.y);
        contexto.stroke();
      }
    }
    contexto.globalAlpha = ALFA_PUNTO;
    contexto.fillStyle = colores.puntos;
    contexto.beginPath();
    for (const p of particulas) {
      contexto.moveTo(p.x + RADIO_PUNTO, p.y);
      contexto.arc(p.x, p.y, RADIO_PUNTO, 0, Math.PI * 2);
    }
    contexto.fill();
    contexto.globalAlpha = 1;
  }

  function cuadro(ahora) {
    // Con la pestaña oculta el navegador no llama a este cuadro: la animación se pausa sola.
    const dt = anterior === null ? 0 : Math.min((ahora - anterior) / 1000, 0.05);
    anterior = ahora;
    if (!apagado()) {
      particulas = moverParticulas(particulas, dt, { ancho, alto, cursor, radio: RADIO_CURSOR });
    }
    pintar();
    cuadroPendiente = ventana.requestAnimationFrame(cuadro);
  }

  // Con movimiento reducido: una imagen fija, sin cuadros.
  function arrancar() {
    ventana.cancelAnimationFrame(cuadroPendiente);
    anterior = null;
    if (reducido?.matches) pintar();
    else cuadroPendiente = ventana.requestAnimationFrame(cuadro);
  }

  reducido?.addEventListener?.('change', arrancar);
  arrancar();
  return { actualizar: pintar };
}
