/**
 * Fondo de partículas de todo el documento (ADR-015 y ADR-017), adaptado del prototipo
 * docs/referencias/particulas-uvm.html: íconos lineales de datos y tecnología (barras, nube, base
 * de datos, CPU…) y etiquetas (KPI, ETL, SQL…) que flotan despacio, unidos por una red de líneas
 * finas, y que se apartan del cursor.
 *
 * Dos temas, según la lámina actual: sobre el fondo claro van en petróleo y muy tenues; en las
 * láminas con data-fondo="oscuro" (fondo petróleo del prototipo) usan los colores del prototipo:
 * íconos claros, etiquetas verde y celeste, red celeste. Detrás de los textos e imágenes de la
 * lámina (y de los bloques marcados con data-atenuar-fondo) los íconos casi desaparecen: el fondo
 * nunca se cruza con lo que hay que leer.
 *
 * Es una animación continua (excepción a la regla de 1,5 s, ADR-015): con prefers-reduced-motion
 * queda una imagen fija, se pausa con la pestaña oculta y en la vista general, no se imprime, y la
 * tecla E la apaga y la enciende.
 *
 * Parte pura (tests/particulas.test.js): crearAleatorio, cantidadIconos, crearIconos,
 * dentroDeZona, moverIconos y enlaces. Parte de vista: iniciarParticulas.
 */

/** Íconos de trazo en una retícula de 24 × 24 (atributo «d» de SVG), los del prototipo. */
export const ICONOS = {
  barras: 'M3 21h18M5.5 12h3v6h-3zM10.5 7h3v11h-3zM15.5 10h3v8h-3z',
  tendencia: 'M3 17l6-6 4 4 8-8M15 7h6v6',
  circular: 'M12 3a9 9 0 1 0 9 9h-9zM15 1.5a7.5 7.5 0 0 1 7.5 7.5H15z',
  velocimetro: 'M3.5 17a8.5 8.5 0 1 1 17 0M12 17l4-5M12 17h.01',
  pulso: 'M2 12h4l3-8 5 16 3-8h5',
  porcentaje:
    'M19 5L5 19M7 4.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 1 0 0-5zM17 14.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 1 0 0-5z',
  cpu: 'M7 7h10v10H7zM10 10h4v4h-4zM10 3v4M14 3v4M10 17v4M14 17v4M3 10h4M3 14h4M17 10h4M17 14h4',
  codigo: 'M8 7l-5 5 5 5M16 7l5 5-5 5M13.5 4l-3 16',
  nube: 'M7 19h10a4.5 4.5 0 0 0 .6-8.96A6 6 0 0 0 6.3 9.6 4.7 4.7 0 0 0 7 19z',
  baseDatos:
    'M4 6c0-1.66 3.58-3 8-3s8 1.34 8 3-3.58 3-8 3-8-1.34-8-3zM4 6v12c0 1.66 3.58 3 8 3s8-1.34 8-3V6M4 12c0 1.66 3.58 3 8 3s8-1.34 8-3',
  servidor: 'M3 4h18v6H3zM3 14h18v6H3zM7 7h.01M7 17h.01M11 7h6M11 17h6',
  wifi: 'M2 8.5a15 15 0 0 1 20 0M5.5 12.5a10 10 0 0 1 13 0M9 16.2a5 5 0 0 1 6 0M12 20h.01',
  globo:
    'M12 3a9 9 0 1 0 0 18 9 9 0 1 0 0-18zM3 12h18M12 3c2.4 2.5 3.6 5.5 3.6 9s-1.2 6.5-3.6 9c-2.4-2.5-3.6-5.5-3.6-9S9.6 5.5 12 3z',
  bombillo:
    'M9.5 18h5M10.5 21h3M12 3a6 6 0 0 0-3.6 10.8c.7.6 1.1 1.3 1.1 2.2v.5h5V16c0-.9.4-1.6 1.1-2.2A6 6 0 0 0 12 3z',
  birrete: 'M2 9.5l10-5 10 5-10 5zM6 11.5v4.5c0 1.6 2.7 3 6 3s6-1.4 6-3v-4.5M22 9.5v5.5',
};

/** Etiquetas decorativas que flotan (sin cifras: si las hubiera, tendrían que ser datos reales). */
export const ETIQUETAS = ['KPI', 'ROI', 'API', 'SQL', 'DATA', 'Σ', 'Δ%', 'IoT', 'BI', 'ETL'];

// ── Lógica pura ──────────────────────────────────────────────────────────────

/**
 * Generador de números pseudoaleatorios con semilla (mulberry32): la misma semilla da siempre el
 * mismo fondo, en cada ensayo y en las pruebas.
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
 * Cuántos íconos caben: uno cada «densidad» px² (como el prototipo), y nunca menos de 8.
 * @param {number} ancho
 * @param {number} alto
 * @param {number} [densidad]
 */
export function cantidadIconos(ancho, alto, densidad = 42000) {
  return Math.max(8, Math.round((ancho * alto) / densidad));
}

/**
 * Íconos y etiquetas repartidos por el escenario. Velocidades en px por segundo (el prototipo
 * movía 0,15–0,45 px por cuadro: 9–27 px/s a 60 cuadros por segundo).
 * @param {number} cantidad
 * @param {{ ancho: number, alto: number, iconos: string[], etiquetas: string[],
 *   aleatorio?: () => number, proporcionTexto?: number, proporcionAnillos?: number }} opciones
 */
export function crearIconos(
  cantidad,
  { ancho, alto, iconos, etiquetas, aleatorio, proporcionTexto = 0.25, proporcionAnillos = 0.35 },
) {
  const azar = aleatorio ?? Math.random;
  const entre = (minimo, maximo) => minimo + azar() * (maximo - minimo);
  const elegir = (lista) => lista[Math.floor(azar() * lista.length)];
  return Array.from({ length: cantidad }, () => {
    const esTexto = etiquetas.length > 0 && (iconos.length === 0 || azar() < proporcionTexto);
    const anillo = !esTexto && azar() < proporcionAnillos;
    const angulo = azar() * Math.PI * 2;
    const rapidez = entre(9, 27);
    return {
      tipo: esTexto ? 'texto' : 'icono',
      forma: esTexto ? elegir(etiquetas) : elegir(iconos),
      tono: Math.floor(azar() * 2), // cuál de los dos colores de etiqueta
      anillo,
      x: azar() * ancho,
      y: azar() * alto,
      vx: Math.cos(angulo) * rapidez,
      vy: Math.sin(angulo) * rapidez,
      tam: entre(20, 34) * (anillo ? 1.25 : 1),
      rot: entre(-0.3, 0.3),
      vrot: entre(-0.12, 0.12), // radianes por segundo
      alfa: entre(0.3, 0.7),
      atenuado: 1,
    };
  });
}

/**
 * ¿El punto cae dentro de alguna zona rectangular?
 * @param {number} x
 * @param {number} y
 * @param {{ x: number, y: number, ancho: number, alto: number }[]} zonas
 */
export function dentroDeZona(x, y, zonas) {
  return zonas.some((z) => x >= z.x && x <= z.x + z.ancho && y >= z.y && y <= z.y + z.alto);
}

/**
 * Un paso de dt segundos: cada ícono deriva y gira, el cursor lo empuja si está a menos de
 * «radio», al salir por un borde reaparece por el opuesto y, dentro de una zona, se atenúa
 * poco a poco hasta el 10 % (fuera vuelve al 100 %).
 * @param {object[]} iconos
 * @param {number} dt segundos
 * @param {{ ancho: number, alto: number, cursor?: { x: number, y: number } | null,
 *   radio?: number, zonas?: object[] }} opciones
 * @returns {object[]} íconos nuevos (no modifica los recibidos)
 */
export function moverIconos(iconos, dt, { ancho, alto, cursor = null, radio = 154, zonas = [] }) {
  const cuadros = dt * 60; // el prototipo medía por cuadro: se conserva su ritmo a cualquier tasa
  return iconos.map((icono) => {
    let { x, y } = icono;
    if (cursor) {
      const dx = x - cursor.x;
      const dy = y - cursor.y;
      const distancia = Math.hypot(dx, dy);
      if (distancia > 0 && distancia < radio) {
        const empuje = ((radio - distancia) / radio) * 2.5 * cuadros;
        x += (dx / distancia) * empuje;
        y += (dy / distancia) * empuje;
      }
    }
    x += icono.vx * dt;
    y += icono.vy * dt;
    const margen = icono.tam * 1.3;
    if (x < -margen) x = ancho + margen;
    else if (x > ancho + margen) x = -margen;
    if (y < -margen) y = alto + margen;
    else if (y > alto + margen) y = -margen;
    const objetivo = dentroDeZona(x, y, zonas) ? 0.1 : 1;
    const atenuado = icono.atenuado + (objetivo - icono.atenuado) * Math.min(1, 0.08 * cuadros);
    return { ...icono, x, y, rot: icono.rot + icono.vrot * dt, atenuado };
  });
}

/**
 * Pares de puntos a menos de «distancia»: se unen con una línea más visible cuanto más cerca.
 * @param {{ x: number, y: number }[]} puntos
 * @param {number} distancia
 * @returns {{ a: number, b: number, intensidad: number }[]} intensidad entre 0 y 1
 */
export function enlaces(puntos, distancia) {
  const pares = [];
  for (let a = 0; a < puntos.length; a++) {
    for (let b = a + 1; b < puntos.length; b++) {
      const d = Math.hypot(puntos[a].x - puntos[b].x, puntos[a].y - puntos[b].y);
      if (d < distancia) pares.push({ a, b, intensidad: 1 - d / distancia });
    }
  }
  return pares;
}

// ── Vista ────────────────────────────────────────────────────────────────────

const DISTANCIA_RED = 170;
const RADIO_CURSOR = 154;
const MARGEN_ZONA = 24;
// Lo que el fondo no debe cruzar: textos, imágenes y bloques marcados a mano.
const SELECTOR_ATENUAR =
  '[data-atenuar-fondo], h2, h3, p, li, dt, dd, figcaption, blockquote, td, th, img, svg';
// Cada cuántos cuadros se vuelven a medir las zonas (los pasos aparecen con una transición).
const CUADROS_POR_MEDIDA = 30;
const FUENTE = '700 {tam}px "Barlow Condensed", "Segoe UI", sans-serif';

/**
 * Crea el lienzo detrás de las láminas y lo anima.
 * @param {HTMLElement} escenario
 * @param {{ deck?: EventTarget, ventana?: Window }} [opciones] deck: para seguir el tema y las
 *   zonas de la lámina actual (slidechange y fragment)
 * @returns {{ actualizar(): void }} actualizar: volver a pintar tras encender o apagar los efectos
 */
export function iniciarParticulas(escenario, { deck, ventana = window } = {}) {
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

  const token = (nombre) => ventana.getComputedStyle(escenario).getPropertyValue(nombre).trim();
  const TEMAS = {
    // Fondo claro: todo en petróleo y muy tenue (el acento nunca como texto sobre claro).
    claro: {
      icono: token('--color-primario'),
      etiquetas: [token('--color-primario'), token('--color-secundario')],
      red: token('--color-primario'),
      intensidad: 0.35,
    },
    // Fondo petróleo: los colores del prototipo.
    oscuro: {
      icono: token('--color-fondo'),
      etiquetas: [token('--color-acento'), token('--color-celeste')],
      red: token('--color-celeste'),
      intensidad: 1,
    },
  };
  const caminos = Object.fromEntries(
    Object.entries(ICONOS).map(([nombre, d]) => [nombre, new ventana.Path2D(d)]),
  );
  const reducido = ventana.matchMedia?.('(prefers-reduced-motion: reduce)');
  let iconos = crearIconos(cantidadIconos(ancho, alto), {
    ancho,
    alto,
    iconos: Object.keys(ICONOS),
    etiquetas: ETIQUETAS,
    aleatorio: crearAleatorio(2026),
  });
  let cursor = null;
  let tema = TEMAS.claro;
  let zonas = [];
  let anterior = null;
  let cuadroPendiente = 0;
  let cuadros = 0;

  const apagado = () =>
    escenario.hasAttribute('data-sin-efectos') || escenario.dataset.modo === 'vista-general';
  const escala = () => escenario.getBoundingClientRect().width / ancho || 1;

  // Tema y zonas de la lámina actual, en px del escenario.
  function leerLamina() {
    const lamina = escenario.querySelector('.lamina[data-actual]');
    tema = lamina?.querySelector(':scope > [data-fondo="oscuro"]') ? TEMAS.oscuro : TEMAS.claro;
    const caja = escenario.getBoundingClientRect();
    const factor = escala();
    const seVe = (nodo) =>
      nodo.checkVisibility?.({ opacityProperty: true, visibilityProperty: true }) ?? true;
    zonas = [...(lamina?.querySelectorAll(SELECTOR_ATENUAR) ?? [])]
      .filter(seVe)
      .map((nodo) => nodo.getBoundingClientRect())
      .filter((r) => r.width && r.height)
      .map((r) => ({
        x: (r.left - caja.left) / factor - MARGEN_ZONA,
        y: (r.top - caja.top) / factor - MARGEN_ZONA,
        ancho: r.width / factor + MARGEN_ZONA * 2,
        alto: r.height / factor + MARGEN_ZONA * 2,
      }));
  }
  // Con movimiento reducido no hay cuadros: la imagen fija se repinta con el tema nuevo.
  const alCambiar = () => {
    leerLamina();
    if (reducido?.matches) pintar();
  };
  deck?.addEventListener('slidechange', alCambiar);
  deck?.addEventListener('fragment', alCambiar);

  // El escenario está escalado: las coordenadas del ratón se pasan a px del escenario.
  escenario.addEventListener('pointermove', (evento) => {
    if (evento.pointerType !== 'mouse') return;
    const caja = escenario.getBoundingClientRect();
    const factor = escala();
    cursor = { x: (evento.clientX - caja.left) / factor, y: (evento.clientY - caja.top) / factor };
  });
  escenario.addEventListener('pointerleave', () => {
    cursor = null;
  });

  function pintarIcono(icono) {
    contexto.save();
    contexto.globalAlpha = icono.alfa * icono.atenuado * tema.intensidad;
    contexto.translate(icono.x, icono.y);
    contexto.rotate(icono.rot);
    if (icono.tipo === 'texto') {
      contexto.fillStyle = tema.etiquetas[icono.tono];
      contexto.font = FUENTE.replace('{tam}', String(Math.round(icono.tam * 0.8)));
      contexto.textAlign = 'center';
      contexto.textBaseline = 'middle';
      contexto.fillText(icono.forma, 0, 0);
    } else {
      const s = icono.tam / 24;
      contexto.scale(s, s);
      contexto.strokeStyle = tema.icono;
      contexto.lineCap = 'round';
      contexto.lineJoin = 'round';
      let interior = 1;
      if (icono.anillo) {
        contexto.lineWidth = 1.5;
        contexto.beginPath();
        contexto.arc(0, 0, 16, 0, Math.PI * 2);
        contexto.stroke();
        interior = 0.66;
        contexto.scale(interior, interior);
      }
      contexto.translate(-12, -12);
      contexto.lineWidth = 2 / interior;
      contexto.stroke(caminos[icono.forma]);
    }
    contexto.restore();
  }

  function pintar() {
    contexto.clearRect(0, 0, ancho, alto);
    if (apagado()) return;
    contexto.lineWidth = 1;
    contexto.strokeStyle = tema.red;
    for (const { a, b, intensidad } of enlaces(iconos, DISTANCIA_RED)) {
      const atenuado = Math.min(iconos[a].atenuado, iconos[b].atenuado);
      contexto.globalAlpha = intensidad * 0.22 * atenuado * tema.intensidad;
      contexto.beginPath();
      contexto.moveTo(iconos[a].x, iconos[a].y);
      contexto.lineTo(iconos[b].x, iconos[b].y);
      contexto.stroke();
    }
    for (const icono of iconos) pintarIcono(icono);
    contexto.globalAlpha = 1;
  }

  function cuadro(ahora) {
    // Con la pestaña oculta el navegador no llama a este cuadro: la animación se pausa sola.
    const dt = anterior === null ? 0 : Math.min((ahora - anterior) / 1000, 0.05);
    anterior = ahora;
    if (++cuadros % CUADROS_POR_MEDIDA === 0) leerLamina();
    if (!apagado()) {
      iconos = moverIconos(iconos, dt, { ancho, alto, cursor, radio: RADIO_CURSOR, zonas });
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
  return {
    actualizar() {
      leerLamina();
      pintar();
    },
  };
}
