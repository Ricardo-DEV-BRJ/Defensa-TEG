/**
 * Inclinación 3D con el cursor (ADR-015): paneles y tarjetas se inclinan unos grados hacia donde
 * está el ratón, con una sombra que se desplaza, y vuelven a plano al salir. Solo responde al
 * ratón (no hay animación continua), no actúa con prefers-reduced-motion, en la vista general ni
 * con los efectos apagados (tecla E), y nunca toca el isologo ni los paneles con controles (las
 * demostraciones de la lámina 14).
 *
 * Parte pura (tests/inclinacion.test.js): calcularInclinacion. Parte de vista:
 * iniciarInclinacion.
 */

/** Elementos que se inclinan. El isologo no está: no se puede deformar (CLAUDE.md). */
export const SELECTOR_INCLINABLE = [
  '.panel',
  '.tarjeta-icono',
  '.hito__tarjeta',
  '.integrador__caja',
  '.fuente__caja',
  '.cadena__paso',
  '.transversal',
].join(', ');

// ── Lógica pura ──────────────────────────────────────────────────────────────

/**
 * Giro y sombra para un cursor en (px, py), medidos de 0 a 1 dentro del elemento. El lado del
 * cursor se hunde: a la derecha gira en Y positivo; arriba, en X positivo. La sombra va hacia el
 * lado contrario. En el centro, todo vale 0.
 * @param {number} px
 * @param {number} py
 * @param {{ maxGrados?: number, maxSombra?: number }} [limites] maxSombra en px
 * @returns {{ rotX: number, rotY: number, sombraX: number, sombraY: number }}
 */
export function calcularInclinacion(px, py, { maxGrados = 6, maxSombra = 12 } = {}) {
  const centrado = (valor) => Math.min(Math.max(Number.isFinite(valor) ? valor : 0.5, 0), 1) - 0.5;
  const x = centrado(px) * 2;
  const y = centrado(py) * 2;
  const limpio = (valor) => (Object.is(valor, -0) ? 0 : valor);
  return {
    rotX: limpio(-y * maxGrados),
    rotY: limpio(x * maxGrados),
    sombraX: limpio(-x * maxSombra),
    sombraY: limpio(-y * maxSombra),
  };
}

// ── Vista ────────────────────────────────────────────────────────────────────

// Lo que dura la vuelta a plano (--duracion-inclinacion) antes de quitar el atributo.
const VUELTA_MS = 200;

/**
 * Escribe en un elemento las variables CSS de una inclinación.
 * @param {HTMLElement} elemento
 * @param {ReturnType<typeof calcularInclinacion>} giro
 */
export function aplicarInclinacion(elemento, { rotX, rotY, sombraX, sombraY }) {
  elemento.style.setProperty('--inclinar-x', `${rotX.toFixed(2)}deg`);
  elemento.style.setProperty('--inclinar-y', `${rotY.toFixed(2)}deg`);
  elemento.style.setProperty('--sombra-x', `${sombraX.toFixed(1)}px`);
  elemento.style.setProperty('--sombra-y', `${sombraY.toFixed(1)}px`);
}

/**
 * Activa la inclinación de los elementos inclinables del escenario.
 * @param {HTMLElement} escenario
 * @param {{ ventana?: Window }} [opciones]
 */
export function iniciarInclinacion(escenario, { ventana = window } = {}) {
  const reducido = ventana.matchMedia?.('(prefers-reduced-motion: reduce)');
  let actual = null;
  const pendientes = new WeakMap();

  const permitido = () =>
    !reducido?.matches &&
    !escenario.hasAttribute('data-sin-efectos') &&
    escenario.dataset.modo !== 'vista-general';

  // Vuelve a plano con la transición y, al terminar, quita el atributo: así el elemento recupera
  // sus propias transiciones (por ejemplo, el escalonado de las metas).
  function soltar(elemento) {
    if (!elemento) return;
    aplicarInclinacion(elemento, calcularInclinacion(0.5, 0.5));
    pendientes.set(
      elemento,
      ventana.setTimeout(() => elemento.removeAttribute('data-inclinado'), VUELTA_MS),
    );
  }

  escenario.addEventListener('pointermove', (evento) => {
    const objetivo =
      evento.pointerType === 'mouse' && permitido()
        ? evento.target.closest?.(SELECTOR_INCLINABLE)
        : null;
    const elemento = objetivo && !objetivo.closest('.demo') ? objetivo : null;
    if (elemento !== actual) {
      soltar(actual);
      actual = elemento;
    }
    if (!elemento) return;
    ventana.clearTimeout(pendientes.get(elemento));
    const caja = elemento.getBoundingClientRect();
    elemento.setAttribute('data-inclinado', '');
    aplicarInclinacion(
      elemento,
      calcularInclinacion(
        (evento.clientX - caja.left) / caja.width,
        (evento.clientY - caja.top) / caja.height,
      ),
    );
  });

  escenario.addEventListener('pointerleave', () => {
    soltar(actual);
    actual = null;
  });
}
