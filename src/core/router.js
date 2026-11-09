/**
 * Enrutador por hash (RF-04 y ADR-006): la dirección #/n corresponde a la lámina n,
 * así que recargar la página conserva la posición.
 */

const PATRON_HASH = /^#\/(\d+)$/;

// ── Lógica pura ──────────────────────────────────────────────────────────────

/**
 * Lee el número de lámina de un hash.
 * @param {string} hash por ejemplo '#/7'
 * @param {number} total número de láminas, incluidas las de reserva
 * @returns {number | null} la lámina, o null si el hash no es válido o está fuera de 1–total
 */
export function leerHash(hash, total) {
  const coincidencia = PATRON_HASH.exec(typeof hash === 'string' ? hash : '');
  if (!coincidencia) return null;
  const lamina = Number(coincidencia[1]);
  return lamina >= 1 && lamina <= total ? lamina : null;
}

/**
 * @param {number} lamina
 * @returns {string} el hash de esa lámina, por ejemplo '#/7'
 */
export function escribirHash(lamina) {
  return `#/${lamina}`;
}

// ── Vista ────────────────────────────────────────────────────────────────────

/**
 * Mantiene sincronizados la dirección y el deck en los dos sentidos:
 * - Cuando cambia la lámina, reemplaza el hash con history.replaceState. Así no se llena
 *   el historial del navegador y no se dispara hashchange (no hay ciclo).
 * - Cuando alguien edita el hash, va a esa lámina; si el hash no es válido, lo corrige.
 * La lámina inicial la decide main.js con leerHash al arrancar.
 * @param {EventTarget & { total: number, estado: { lamina: number }, irA: (n: number) => void }} deck
 * @param {Window} [ventana]
 * @returns {() => void} función que deja de escuchar
 */
export function iniciarRouter(deck, ventana = window) {
  const reemplazarHash = (lamina) => {
    const hash = escribirHash(lamina);
    if (ventana.location.hash !== hash) ventana.history.replaceState(null, '', hash);
  };

  const alCambiarHash = () => {
    const actual = deck.estado.lamina;
    const pedida = leerHash(ventana.location.hash, deck.total);
    if (pedida === null || pedida === actual) reemplazarHash(actual);
    else deck.irA(pedida);
  };

  const alCambiarLamina = (evento) => reemplazarHash(evento.detail.lamina);

  ventana.addEventListener('hashchange', alCambiarHash);
  deck.addEventListener('slidechange', alCambiarLamina);
  return () => {
    ventana.removeEventListener('hashchange', alCambiarHash);
    deck.removeEventListener('slidechange', alCambiarLamina);
  };
}
