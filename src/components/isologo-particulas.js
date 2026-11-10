/**
 * isologo-particulas: el isologo UVM de la portada formado por partículas (ADR-017), adaptado del
 * prototipo docs/referencias/particulas-uvm.html.
 *
 * Cada partícula toma el color de su punto del isologo (no se recolorea) y un «muelle» la lleva a
 * su sitio: al entrar a la portada las partículas llegan desde todo el escenario y arman el logo,
 * que luego «respira» (menos de medio píxel). El cursor las aparta y un clic sobre el isologo lo
 * dispersa; se vuelve a armar solo. En reposo el isologo queda completo.
 *
 * Uso: <div class="isologo-particulas" data-componente="isologo-particulas" data-interactivo
 *        data-imagen="img/uvm-isologo-particulas.png"> <img class="isologo" …> </div>
 * data-imagen es la versión con el interior transparente (solo los trazos se vuelven partículas);
 * el <img> es el isologo oficial y se ve tal cual con movimiento reducido, al imprimir, en la
 * vista general fuera de la portada o si el navegador no deja leer los píxeles (file://).
 * La tecla S y la llegada con «anterior» dejan el logo armado al instante.
 *
 * Parte pura (tests/isologo-particulas.test.js): pasoDeMuestreo, objetivosDesdePixeles, mezclar,
 * moverPuntoLogo y dispersar. Parte de vista: crear (ADR-006 §7).
 */
import { movimientoReducido } from './comun.js';

// ── Lógica pura ──────────────────────────────────────────────────────────────

/**
 * Tamaño de celda (px) para no pasar de maxParticulas: «llenos» son las celdas cubiertas del logo
 * medido a la mitad de su tamaño (cada una vale 4 px²). Nunca menos de 2 px.
 * @param {number} llenos
 * @param {number} maxParticulas
 */
export function pasoDeMuestreo(llenos, maxParticulas) {
  return Math.max(2, Math.sqrt((llenos * 4) / maxParticulas));
}

const hex = (canal) => canal.toString(16).padStart(2, '0');

/**
 * Una partícula por cada celda del logo reducido cuya opacidad supera el umbral, con el color y la
 * opacidad de esa celda (las celdas del borde salen semitransparentes: suavizan el texto del
 * anillo).
 * @param {Uint8ClampedArray | number[]} datos píxeles RGBA del logo reducido (gw × gh)
 * @param {number} gw ancho en celdas
 * @param {number} gh alto en celdas
 * @param {{ x0: number, y0: number, celdaX: number, celdaY: number, umbral?: number }} ubicacion
 * @returns {{ x: number, y: number, color: string, alfa: number }[]}
 */
export function objetivosDesdePixeles(datos, gw, gh, { x0, y0, celdaX, celdaY, umbral = 40 }) {
  const objetivos = [];
  for (let j = 0; j < gh; j++) {
    for (let i = 0; i < gw; i++) {
      const k = (j * gw + i) * 4;
      if (datos[k + 3] <= umbral) continue;
      objetivos.push({
        x: x0 + (i + 0.5) * celdaX,
        y: y0 + (j + 0.5) * celdaY,
        color: `#${hex(datos[k])}${hex(datos[k + 1])}${hex(datos[k + 2])}`,
        // Opacidad con dos decimales (como el prototipo): pocos tonos distintos que dibujar.
        alfa: Math.round((datos[k + 3] / 255) * 100) / 100,
      });
    }
  }
  return objetivos;
}

/**
 * Mezcla una lista (Fisher-Yates): el armado se ve más orgánico. Devuelve una copia.
 * @template T
 * @param {T[]} lista
 * @param {() => number} [aleatorio]
 * @returns {T[]}
 */
export function mezclar(lista, aleatorio = Math.random) {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(aleatorio() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

/**
 * Un cuadro de una partícula (como el prototipo, por cuadro): el muelle la atrae a su sitio
 * (tx, ty) con su rigidez k por «retorno» (0 justo tras un clic, 1 normal), con una leve
 * respiración; el cursor la aparta y la velocidad se amortigua. MODIFICA p (son miles por cuadro:
 * no se crean objetos nuevos) y lo devuelve.
 * @param {{ x: number, y: number, vx: number, vy: number, tx: number, ty: number, k: number,
 *   fase: number }} p
 * @param {number} t milisegundos (para la respiración)
 * @param {{ retorno?: number, cursor?: { x: number, y: number } | null, radio?: number }} [opciones]
 */
export function moverPuntoLogo(p, t, { retorno = 1, cursor = null, radio = 110 } = {}) {
  const ox = Math.sin(t * 0.0015 + p.fase) * 0.35;
  const oy = Math.cos(t * 0.0013 + p.fase) * 0.35;
  const k = p.k * retorno;
  p.vx += (p.tx + ox - p.x) * k;
  p.vy += (p.ty + oy - p.y) * k;
  if (cursor) {
    const dx = p.x - cursor.x;
    const dy = p.y - cursor.y;
    const d2 = dx * dx + dy * dy;
    if (d2 < radio * radio && d2 > 0.01) {
      const d = Math.sqrt(d2);
      const fuerza = (1 - d / radio) * 2.2;
      p.vx += (dx / d) * fuerza;
      p.vy += (dy / d) * fuerza;
    }
  }
  p.vx *= 0.86;
  p.vy *= 0.86;
  p.x += p.vx;
  p.y += p.vy;
  return p;
}

/**
 * Clic en (x, y): cada partícula sale despedida, más fuerte cuanto más cerca del clic (con un
 * tope), con un poco de azar. MODIFICA las partículas.
 * @param {object[]} puntos
 * @param {number} x
 * @param {number} y
 * @param {() => number} [aleatorio]
 */
export function dispersar(puntos, x, y, aleatorio = Math.random) {
  for (const p of puntos) {
    const dx = p.x - x;
    const dy = p.y - y;
    const d = Math.hypot(dx, dy) || 1;
    const fuerza = Math.min(45, 4000 / (d + 60));
    p.vx += (dx / d) * fuerza + (aleatorio() * 4 - 2);
    p.vy += (dy / d) * fuerza + (aleatorio() * 4 - 2);
  }
  return puntos;
}

// ── Vista ────────────────────────────────────────────────────────────────────

const MAX_PARTICULAS = 8000;
const UMBRAL = 40;

/**
 * @param {HTMLElement} elemento el contenedor .isologo-particulas (con el <img> dentro)
 */
export function crear(elemento) {
  const documento = elemento.ownerDocument;
  const ventana = documento.defaultView;
  const nada = { activar() {}, desactivar() {}, paso() {}, saltarAlFinal() {} };
  const oficial = elemento.querySelector('img');
  // Las partículas vuelan por toda la lámina (también por el margen): el lienzo la cubre entera.
  const zona = elemento.closest('.lamina') ?? elemento.parentElement;
  if (!oficial || !zona || !elemento.dataset.imagen) return nada;

  const lienzo = documento.createElement('canvas');
  lienzo.className = 'isologo-particulas__lienzo';
  lienzo.setAttribute('aria-hidden', 'true');
  zona.append(lienzo);
  const contexto = lienzo.getContext('2d');
  const muestreo = documento.createElement('canvas');
  const contextoMuestreo = muestreo.getContext('2d', { willReadFrequently: true });
  if (!contexto || !contextoMuestreo) return nada;

  let activo = false;
  let imagen = null;
  const carga = new ventana.Image();
  carga.decoding = 'async';
  carga.addEventListener('load', () => {
    imagen = carga;
    if (activo) empezar();
  });
  carga.src = elemento.dataset.imagen;

  let ancho = 0;
  let alto = 0;
  let tamPunto = 2;
  let puntos = [];
  let medida = '';
  let retorno = 1;
  let cursor = null;
  let cuadroPendiente = 0;

  // Medidas en px del escenario (la portada está escalada con el resto).
  const escala = () => zona.getBoundingClientRect().width / zona.offsetWidth || 1;
  const enEscenario = (evento) => {
    const caja = zona.getBoundingClientRect();
    const factor = escala();
    return { x: (evento.clientX - caja.left) / factor, y: (evento.clientY - caja.top) / factor };
  };

  function leerPixeles(w, h) {
    muestreo.width = w;
    muestreo.height = h;
    contextoMuestreo.imageSmoothingEnabled = true;
    contextoMuestreo.imageSmoothingQuality = 'high';
    contextoMuestreo.clearRect(0, 0, w, h);
    contextoMuestreo.drawImage(imagen, 0, 0, w, h);
    try {
      return contextoMuestreo.getImageData(0, 0, w, h).data;
    } catch {
      // Abierto con doble clic (file://): el navegador no deja leer los píxeles.
      console.warn('isologo-particulas: no se pudieron leer los píxeles; se muestra el isologo.');
      imagen = null;
      return null;
    }
  }

  // Objetivos en el lugar exacto que ocupa el isologo oficial.
  function prepararObjetivos() {
    ancho = zona.offsetWidth;
    alto = zona.offsetHeight;
    const factor = escala();
    const cajaZona = zona.getBoundingClientRect();
    const cajaLogo = oficial.getBoundingClientRect();
    const x0 = (cajaLogo.left - cajaZona.left) / factor;
    const y0 = (cajaLogo.top - cajaZona.top) / factor;
    const w = cajaLogo.width / factor;
    const h = cajaLogo.height / factor;
    const clave = [ancho, alto, x0, y0, w, h].map(Math.round).join('×');
    if (clave === medida) return true;

    const mitad = leerPixeles(Math.max(1, Math.round(w / 2)), Math.max(1, Math.round(h / 2)));
    if (!mitad) return false;
    let llenos = 0;
    for (let i = 3; i < mitad.length; i += 4) if (mitad[i] > 128) llenos++;
    const paso = pasoDeMuestreo(llenos, MAX_PARTICULAS);
    tamPunto = Math.max(1.4, paso * 0.9);
    const gw = Math.max(1, Math.round(w / paso));
    const gh = Math.max(1, Math.round(h / paso));
    const datos = leerPixeles(gw, gh);
    if (!datos) return false;
    const objetivos = mezclar(
      objetivosDesdePixeles(datos, gw, gh, {
        x0,
        y0,
        celdaX: w / gw,
        celdaY: h / gh,
        umbral: UMBRAL,
      }),
    );
    puntos = objetivos
      .map((o, i) => ({
        ...(puntos[i] ?? { x: 0, y: 0, vx: 0, vy: 0 }),
        tx: o.x,
        ty: o.y,
        color: o.color,
        alfa: o.alfa,
        clave: `${o.color}${o.alfa}`,
        k: 0.025 + Math.random() * 0.035,
        fase: Math.random() * Math.PI * 2,
      }))
      // Dibujar agrupadas por color: el pincel cambia pocas veces por cuadro, no 8000.
      .sort((a, b) => (a.clave < b.clave ? -1 : a.clave > b.clave ? 1 : 0));
    const dpr = Math.min(ventana.devicePixelRatio || 1, 2);
    lienzo.width = Math.round(ancho * dpr);
    lienzo.height = Math.round(alto * dpr);
    contexto.setTransform(dpr, 0, 0, dpr, 0, 0);
    medida = clave;
    return true;
  }

  function pintar() {
    contexto.clearRect(0, 0, ancho, alto);
    const m = tamPunto / 2;
    let clave = '';
    for (const p of puntos) {
      if (p.clave !== clave) {
        clave = p.clave;
        contexto.globalAlpha = p.alfa;
        contexto.fillStyle = p.color;
      }
      contexto.fillRect(p.x - m, p.y - m, tamPunto, tamPunto);
    }
    contexto.globalAlpha = 1;
  }

  function cuadro(t) {
    retorno = Math.min(1, retorno + 0.012);
    for (const p of puntos) moverPuntoLogo(p, t, { retorno, cursor });
    pintar();
    cuadroPendiente = ventana.requestAnimationFrame(cuadro);
  }

  function detener() {
    ventana.cancelAnimationFrame(cuadroPendiente);
    elemento.removeAttribute('data-activo');
    contexto.clearRect(0, 0, ancho, alto);
  }

  // Al entrar: las partículas salen de puntos al azar de la portada y arman el logo.
  function empezar() {
    if (!activo || !imagen || movimientoReducido(ventana) || !prepararObjetivos()) return;
    for (const p of puntos) {
      p.x = Math.random() * ancho;
      p.y = Math.random() * alto;
      p.vx = 0;
      p.vy = 0;
    }
    retorno = 1;
    elemento.setAttribute('data-activo', '');
    ventana.cancelAnimationFrame(cuadroPendiente);
    cuadroPendiente = ventana.requestAnimationFrame(cuadro);
  }

  zona.addEventListener('pointermove', (evento) => {
    if (evento.pointerType === 'mouse') cursor = enEscenario(evento);
  });
  zona.addEventListener('pointerleave', () => {
    cursor = null;
  });
  // Clic o toque sobre el isologo: se dispersa (el clic no pasa de lámina: data-interactivo).
  elemento.addEventListener('pointerdown', (evento) => {
    if (!elemento.hasAttribute('data-activo')) return;
    const { x, y } = enEscenario(evento);
    retorno = 0;
    dispersar(puntos, x, y);
  });

  return {
    activar() {
      activo = true;
      empezar();
    },
    desactivar() {
      activo = false;
      detener();
    },
    paso() {},
    // Estado final: el logo armado, sin el viaje de las partículas.
    saltarAlFinal() {
      if (!elemento.hasAttribute('data-activo')) return;
      retorno = 1;
      for (const p of puntos) {
        p.x = p.tx;
        p.y = p.ty;
        p.vx = 0;
        p.vy = 0;
      }
      pintar();
    },
  };
}
