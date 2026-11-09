/**
 * Teclado y clic (RF-02, RF-05 y ADR-006).
 *
 * Parte pura: interpretarTecla traduce una tecla en una acción y lleva el estado de la
 * secuencia «ir a» (G + número + Enter).
 * Parte de vista: escucha keydown y clic en el documento, muestra el indicador «Ir a lámina»
 * y ejecuta las acciones que main.js le entrega. No conoce al deck.
 */

/** Cuánto espera la secuencia «ir a» entre teclas antes de cancelarse. */
export const ESPERA_IR_A_MS = 3000;

/** Fuera de la secuencia «ir a». */
export const ESTADO_INICIAL = Object.freeze({ digitos: null, desde: 0 });

const TECLAS = new Map([
  ['ArrowRight', 'siguiente'],
  [' ', 'siguiente'],
  ['PageDown', 'siguiente'],
  ['ArrowLeft', 'anterior'],
  ['PageUp', 'anterior'],
  ['o', 'vistaGeneral'],
  ['f', 'pantallaCompleta'],
  ['b', 'pantallaNegra'],
  ['.', 'pantallaNegra'], // lo envían muchos presentadores inalámbricos
  ['p', 'abrirPresentador'],
  ['t', 'reiniciarCronometro'],
  ['s', 'saltarAnimacion'],
  ['e', 'alternarEfectos'], // partículas y 3D (ADR-015)
  ['Escape', 'cerrar'],
  ['Enter', 'cerrar'],
]);

/** Botones de un presentador inalámbrico: navegan aunque el foco esté en un control. */
const TECLAS_DEL_PRESENTADOR = new Set(['PageDown', 'PageUp']);

/** Un clic dentro de estos elementos no avanza la lámina. */
export const SELECTOR_INTERACTIVO =
  'a, button, input, select, textarea, label, summary, [data-interactivo]';
const SELECTOR_CONTROL = 'input, select, textarea, [contenteditable=""], [contenteditable="true"]';
// role=button: elementos que se comportan como botón sin serlo (capas de la lámina 13).
const SELECTOR_BOTON = 'button, a[href], summary, [role="button"]';

// ── Lógica pura ──────────────────────────────────────────────────────────────

const normalizar = (tecla) => (tecla.length === 1 ? tecla.toLowerCase() : tecla);

const resultado = (accion, argumento, estado, consumida) => ({
  accion,
  argumento,
  estado,
  consumida,
});

function interpretarIrA(clave, digitos, ahora, maxDigitos) {
  const continuar = (nuevos) => resultado(null, null, { digitos: nuevos, desde: ahora }, true);
  if (/^\d$/.test(clave)) {
    return continuar(digitos.length < maxDigitos ? digitos + clave : digitos);
  }
  if (clave === 'Backspace') return continuar(digitos.slice(0, -1));
  if (clave === 'Enter') {
    return digitos
      ? resultado('irA', Number(digitos), ESTADO_INICIAL, true)
      : resultado(null, null, ESTADO_INICIAL, true);
  }
  if (clave === 'Escape') return resultado(null, null, ESTADO_INICIAL, true);
  return null; // otra tecla: cancela «ir a» y se interpreta normalmente
}

/**
 * Traduce una tecla en una acción.
 * @param {{ key: string, ctrlKey?: boolean, altKey?: boolean, metaKey?: boolean, repeat?: boolean }} tecla
 *   normalmente el KeyboardEvent
 * @param {{ digitos: string | null, desde: number }} estado secuencia «ir a» en curso
 * @param {{ ahora?: number, enControl?: boolean, enBoton?: boolean, maxDigitos?: number }} [contexto]
 *   ahora: milisegundos actuales; enControl: el foco está en un campo o deslizador;
 *   enBoton: el foco está en un botón o enlace; maxDigitos: cifras del número de láminas
 *   (main.js lo calcula desde slides.json; sin límite si no se indica)
 * @returns {{ accion: string | null, argumento: number | null, estado: object, consumida: boolean }}
 *   consumida indica si hay que anular el comportamiento normal del navegador
 */
export function interpretarTecla(
  tecla,
  estado,
  { ahora = 0, enControl = false, enBoton = false, maxDigitos = Infinity } = {},
) {
  const ignorar = resultado(null, null, estado, false);
  // Ctrl, Alt o Meta: atajos del navegador y del sistema (Ctrl+R, Alt+Tab).
  // repeat: una tecla sostenida no debe saltarse láminas.
  if (tecla.ctrlKey || tecla.altKey || tecla.metaKey || tecla.repeat) return ignorar;
  const clave = normalizar(tecla.key);

  // En un campo o deslizador, las teclas son del control; solo el presentador inalámbrico navega.
  if (enControl) {
    return TECLAS_DEL_PRESENTADOR.has(clave)
      ? resultado(TECLAS.get(clave), null, ESTADO_INICIAL, true)
      : ignorar;
  }
  // Espacio y Enter sobre un botón lo activan; no deben además cambiar de lámina.
  if (enBoton && (clave === ' ' || clave === 'Enter')) return ignorar;

  if (estado.digitos !== null && ahora - estado.desde <= ESPERA_IR_A_MS) {
    const enIrA = interpretarIrA(clave, estado.digitos, ahora, maxDigitos);
    if (enIrA) return enIrA;
  }
  if (clave === 'g') return resultado(null, null, { digitos: '', desde: ahora }, true);

  const accion = TECLAS.get(clave);
  return accion
    ? resultado(accion, null, ESTADO_INICIAL, true)
    : resultado(null, null, ESTADO_INICIAL, false);
}

// ── Vista ────────────────────────────────────────────────────────────────────

/**
 * Conecta el teclado y el clic con las acciones.
 * @param {Record<string, (argumento?: number) => void>} acciones por ejemplo { siguiente, irA };
 *   las acciones que falten (presentador, cronómetro) se ignoran
 * @param {{ documento?: Document, escenario?: HTMLElement, reloj?: () => number, maxDigitos?: number }} [opciones]
 * @returns {() => void} función que deja de escuchar
 */
export function iniciarTeclado(
  acciones,
  { documento = document, escenario, reloj = Date.now, maxDigitos = Infinity } = {},
) {
  let estado = ESTADO_INICIAL;
  let temporizador;

  const indicador = documento.createElement('div');
  indicador.className = 'ir-a';
  indicador.setAttribute('role', 'status');
  indicador.hidden = true;
  (escenario ?? documento.body).append(indicador);

  const pintarIndicador = () => {
    indicador.hidden = estado.digitos === null;
    indicador.textContent = `Ir a lámina: ${estado.digitos ?? ''}_`;
  };

  // Si pasan 3 s sin teclas, la secuencia «ir a» se cancela y el indicador desaparece.
  const programarCancelacion = () => {
    clearTimeout(temporizador);
    if (estado.digitos === null) return;
    temporizador = setTimeout(() => {
      estado = ESTADO_INICIAL;
      pintarIndicador();
    }, ESPERA_IR_A_MS);
  };

  const alPresionar = (evento) => {
    const activo = documento.activeElement;
    const enControl = Boolean(activo?.matches?.(SELECTOR_CONTROL));
    const enBoton = Boolean(activo?.matches?.(SELECTOR_BOTON));
    const r = interpretarTecla(evento, estado, { ahora: reloj(), enControl, enBoton, maxDigitos });
    estado = r.estado;
    pintarIndicador();
    programarCancelacion();
    if (r.consumida) evento.preventDefault();
    if (!r.accion) return;
    if (enControl) activo.blur(); // el deslizador no debe seguir capturando las flechas
    acciones[r.accion]?.(r.argumento);
  };

  const alHacerClic = (evento) => {
    if (evento.button !== 0) return;
    if (evento.target?.closest?.(SELECTOR_INTERACTIVO)) return;
    acciones.siguiente?.();
  };

  documento.addEventListener('keydown', alPresionar);
  documento.addEventListener('click', alHacerClic);
  return () => {
    clearTimeout(temporizador);
    documento.removeEventListener('keydown', alPresionar);
    documento.removeEventListener('click', alHacerClic);
    indicador.remove();
  };
}
