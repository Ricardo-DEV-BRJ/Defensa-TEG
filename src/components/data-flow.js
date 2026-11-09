/**
 * data-flow: flujo de datos por la arquitectura de capas (lámina 13).
 *
 * Las cinco capas y los transversales están en el HTML de la lámina (data-dato desde
 * data/arquitectura.json), porque el deck cuenta sus pasos al crear las láminas: una capa por
 * paso, de la captura (abajo) a la visualización (arriba). Este componente les agrega:
 *  - Paquetes de datos: cuando aparece una capa nueva, una ráfaga de paquetes sube por la flecha
 *    «Flujo de datos» desde la captura hasta la capa más alta visible, con requestAnimationFrame.
 *    Dura menos de 1,5 s (CLAUDE.md); un clic en la flecha la repite. Con prefers-reduced-motion
 *    no se mueve nada, y la tecla S la lleva a su estado final (la ráfaga ya llegó).
 *  - Clic en una capa (o Enter / Espacio con el foco en ella): la amplía con sus componentes en
 *    lista; las demás muestran solo número y nombre. Otro clic la cierra.
 *
 * Uso: <div class="arquitectura" data-componente="data-flow"> con un .flujo y capas
 * <li class="capa" data-capa="n">, n = 1 (captura) … 5 (visualización).
 *
 * Parte pura (tests/data-flow.test.js): suavizar, duracionRafaga, posicionesRafaga,
 * capaMasAlta, debeLanzarRafaga y alternarAmpliada. Parte de vista: crear (ADR-006 §7).
 */
import { aMilisegundos, leerDuraciones, movimientoReducido } from './comun.js';

// ── Lógica pura ──────────────────────────────────────────────────────────────

/** Curva de velocidad: arranca y llega suave (cúbica de entrada y salida). */
export function suavizar(p) {
  const x = Math.min(Math.max(p, 0), 1);
  return x < 0.5 ? 4 * x ** 3 : 1 - (-2 * x + 2) ** 3 / 2;
}

/**
 * Tiempo total de una ráfaga: el último paquete sale (cantidad − 1) × separación después del
 * primero y tarda «viaje» en llegar.
 * @param {{ cantidad: number, separacion: number, viaje: number }} ritmo en ms
 */
export function duracionRafaga({ cantidad, separacion, viaje }) {
  return (cantidad - 1) * separacion + viaje;
}

/**
 * Dónde está cada paquete a los t ms de empezar la ráfaga. «desde» y «hasta» son posiciones
 * verticales en px (desde > hasta: los datos suben). Cada paquete aparece al salir y se
 * desvanece al llegar.
 * @param {number} t
 * @param {{ cantidad: number, separacion: number, viaje: number, desde: number,
 *   hasta: number }} opciones
 * @returns {{ puntos: { y: number, opacidad: number, visible: boolean }[],
 *   terminada: boolean }}
 */
export function posicionesRafaga(t, { cantidad, separacion, viaje, desde, hasta }) {
  const puntos = Array.from({ length: cantidad }, (_, i) => {
    const p = (t - i * separacion) / viaje;
    if (p < 0 || p >= 1) return { y: desde, opacidad: 0, visible: false };
    const opacidad = Math.min(1, p / 0.15, (1 - p) / 0.2);
    return { y: desde + (hasta - desde) * suavizar(p), opacidad, visible: true };
  });
  return { puntos, terminada: t >= duracionRafaga({ cantidad, separacion, viaje }) };
}

/**
 * @param {number[]} visibles números de las capas visibles
 * @returns {number} la más alta, o 0 si no hay ninguna
 */
export function capaMasAlta(visibles) {
  return visibles.length ? Math.max(...visibles) : 0;
}

/**
 * Solo hay ráfaga cuando aparece una capa más alta (al avanzar), no al retroceder.
 * @param {number} anterior capa más alta antes del cambio
 * @param {number} nueva capa más alta después del cambio
 */
export function debeLanzarRafaga(anterior, nueva) {
  return nueva > anterior;
}

/**
 * Clic en la capa n: la amplía, o la cierra si ya estaba ampliada.
 * @param {number | null} actual
 * @param {number} n
 * @returns {number | null}
 */
export function alternarAmpliada(actual, n) {
  return actual === n ? null : n;
}

// ── Vista ────────────────────────────────────────────────────────────────────

const CANTIDAD = 3;

/**
 * @param {HTMLElement} elemento la .arquitectura de la lámina
 */
export function crear(elemento) {
  const documento = elemento.ownerDocument;
  const ventana = documento.defaultView;
  const flujo = elemento.querySelector('.flujo');
  const capas = [...elemento.querySelectorAll('.capa[data-capa]')].map((nodo) => ({
    n: Number(nodo.dataset.capa),
    nodo,
  }));
  const primera = capas.find((capa) => capa.n === 1);
  if (!flujo || !primera) {
    console.warn('data-flow: faltan la flecha .flujo o la capa data-capa="1"');
    return { activar() {}, desactivar() {}, paso() {}, saltarAlFinal() {} };
  }

  const estilo = ventana.getComputedStyle(elemento);
  const ritmo = {
    cantidad: CANTIDAD,
    separacion: leerDuraciones(estilo).retardo,
    viaje: aMilisegundos(estilo.getPropertyValue('--duracion-flujo'), 900),
  };

  // Paquetes: puntos encima de la flecha, movidos con transform en cada cuadro.
  const capaPaquetes = documento.createElement('div');
  capaPaquetes.className = 'flujo__paquetes';
  capaPaquetes.setAttribute('aria-hidden', 'true');
  const paquetes = Array.from({ length: CANTIDAD }, () => {
    const paquete = documento.createElement('span');
    paquete.className = 'paquete';
    capaPaquetes.append(paquete);
    return paquete;
  });
  flujo.append(capaPaquetes);

  let rafaga = null;
  let cuadroPendiente = 0;
  let ultimaAlta = 0;
  let ampliada = null;

  const visibles = () =>
    capas.filter(({ nodo }) => nodo.hasAttribute('data-visible')).map(({ n }) => n);

  // Recorrido en px dentro de la flecha: del pie de la captura al borde de arriba de la capa
  // destino. Las medidas de pantalla se dividen por la escala del escenario.
  function recorrido(hastaCapa) {
    const caja = flujo.getBoundingClientRect();
    const escala = flujo.offsetHeight ? caja.height / flujo.offsetHeight : 1;
    const destino = capas.find(({ n }) => n === hastaCapa).nodo.getBoundingClientRect();
    return {
      desde: (primera.nodo.getBoundingClientRect().bottom - caja.top) / escala,
      hasta: (destino.top - caja.top) / escala,
    };
  }

  function pintarPaquetes(puntos) {
    paquetes.forEach((paquete, i) => {
      const punto = puntos[i];
      paquete.style.opacity = punto?.visible ? String(punto.opacidad) : '0';
      if (punto?.visible)
        paquete.style.transform = `translate(-50%, -50%) translateY(${punto.y}px)`;
    });
  }

  function detener() {
    ventana.cancelAnimationFrame(cuadroPendiente);
    rafaga = null;
    pintarPaquetes([]);
  }

  function lanzar() {
    const alta = capaMasAlta(visibles());
    if (!alta || movimientoReducido(ventana)) return;
    detener();
    rafaga = { inicio: null, ...ritmo, ...recorrido(alta) };
    cuadroPendiente = ventana.requestAnimationFrame(cuadro);
  }

  function cuadro(ahora) {
    if (!rafaga) return;
    rafaga.inicio ??= ahora;
    const { puntos, terminada } = posicionesRafaga(ahora - rafaga.inicio, rafaga);
    if (terminada) return detener();
    pintarPaquetes(puntos);
    cuadroPendiente = ventana.requestAnimationFrame(cuadro);
  }

  function ampliar(n) {
    ampliada = n;
    elemento.toggleAttribute('data-ampliada', ampliada !== null);
    for (const capa of capas) {
      capa.nodo.setAttribute('aria-expanded', String(capa.n === ampliada));
    }
  }

  // Botones sin <button> (las capas tienen bloques dentro): Enter y Espacio los activan.
  function comoBoton(nodo, etiqueta, accion) {
    nodo.setAttribute('role', 'button');
    nodo.setAttribute('tabindex', '0');
    nodo.setAttribute('title', etiqueta);
    nodo.dataset.interactivo = ''; // el clic no avanza la lámina (ADR-006 §5)
    nodo.addEventListener('click', accion);
    nodo.addEventListener('keydown', (evento) => {
      if (evento.key !== 'Enter' && evento.key !== ' ') return;
      evento.preventDefault();
      accion();
    });
  }

  for (const capa of capas) {
    comoBoton(capa.nodo, 'Ampliar o cerrar los componentes de esta capa', () =>
      ampliar(alternarAmpliada(ampliada, capa.n)),
    );
  }
  comoBoton(flujo, 'Repetir el flujo de datos', lanzar);
  flujo.setAttribute('aria-label', 'Repetir el flujo de datos');
  ampliar(null);

  return {
    activar() {
      ultimaAlta = capaMasAlta(visibles());
    },
    desactivar() {
      detener();
      ampliar(null);
      if (elemento.contains(documento.activeElement)) documento.activeElement.blur();
      ultimaAlta = 0;
    },
    paso() {
      const alta = capaMasAlta(visibles());
      if (ampliada !== null && !visibles().includes(ampliada)) ampliar(null);
      if (debeLanzarRafaga(ultimaAlta, alta)) lanzar();
      ultimaAlta = alta;
    },
    // Estado final de la ráfaga: los paquetes ya llegaron y no queda nada en movimiento.
    saltarAlFinal() {
      detener();
      ultimaAlta = capaMasAlta(visibles());
    },
  };
}
