/**
 * Escalado del escenario (ADR-005 y ADR-006).
 *
 * El escenario mide siempre 1920×1080 px (tokens.css) y se escala con transform: scale()
 * para caber completo en cualquier pantalla sin deformarse. El margen seguro del 5 % es
 * relleno interno del escenario (tokens.css), así que se escala junto con él.
 */

export const ANCHO_ESCENARIO = 1920;
export const ALTO_ESCENARIO = 1080;

const esMedidaValida = (valor) => Number.isFinite(valor) && valor > 0;

// ── Lógica pura ──────────────────────────────────────────────────────────────

/**
 * Factor de escala para que el escenario quepa completo en la ventana.
 * Manda el lado que se queda corto (el menor de los dos cocientes); en el otro lado
 * quedan bandas vacías, como en un televisor que muestra una película.
 * @param {number} anchoVentana
 * @param {number} altoVentana
 * @param {number} [ancho] ancho del escenario sin escalar
 * @param {number} [alto] alto del escenario sin escalar
 * @returns {number} factor de escala; 1 si alguna medida no es válida
 */
export function calcularEscala(
  anchoVentana,
  altoVentana,
  ancho = ANCHO_ESCENARIO,
  alto = ALTO_ESCENARIO,
) {
  if (![anchoVentana, altoVentana, ancho, alto].every(esMedidaValida)) return 1;
  return Math.min(anchoVentana / ancho, altoVentana / alto);
}

// ── Vista ────────────────────────────────────────────────────────────────────

/**
 * Aplica la escala al escenario ahora y cada vez que cambia el tamaño de la ventana
 * (también al entrar y salir de pantalla completa). Solo escribe la variable CSS
 * --escala; el centrado y el transform están en layout.css.
 * @param {HTMLElement} escenario
 * @param {Window} [ventana]
 * @returns {() => void} función que deja de escuchar los cambios de tamaño
 */
export function iniciarEscalado(escenario, ventana = window) {
  const aplicar = () => {
    // offsetWidth/offsetHeight dan el tamaño sin transformar, que define tokens.css.
    const escala = calcularEscala(
      ventana.innerWidth,
      ventana.innerHeight,
      escenario.offsetWidth || ANCHO_ESCENARIO,
      escenario.offsetHeight || ALTO_ESCENARIO,
    );
    escenario.style.setProperty('--escala', String(escala));
  };

  aplicar();
  ventana.addEventListener('resize', aplicar);
  return () => ventana.removeEventListener('resize', aplicar);
}
