/**
 * counter: una cifra que cuenta desde 0 hasta su valor al aparecer (lámina 15: USD 56,10).
 *
 * Uso: se agrega a un elemento que ya muestra su dato con data-dato y data-formato:
 *   <p class="cifra" data-componente="counter" data-dato="costos.total" data-formato="usd">
 * El valor final sale de los datos (data/costos.json) con la misma ruta y el mismo formato, así
 * que sin animación (tecla S, volver con «anterior», movimiento reducido, vista general o PDF)
 * la cifra ya está en su estado final. La cuenta dura --duracion-conteo (menos de 1,5 s) y
 * frena al llegar, con requestAnimationFrame.
 *
 * Parte pura (tests/counter.test.js): valorEnInstante. Parte de vista: crear (ADR-006 §7).
 */
import { formatear, resolverDato } from '../core/datos.js';
import { aMilisegundos, alRevelarse, movimientoReducido } from './comun.js';

// ── Lógica pura ──────────────────────────────────────────────────────────────

/**
 * Valor que muestra el contador a los t ms: sube rápido y frena al final (cúbica de salida),
 * en centavos, y llega exactamente al valor final.
 * @param {number} t
 * @param {{ hasta: number, duracion: number, desde?: number }} opciones
 * @returns {number}
 */
export function valorEnInstante(t, { hasta, duracion, desde = 0 }) {
  if (t >= duracion) return hasta;
  if (t <= 0) return desde;
  const avance = 1 - (1 - t / duracion) ** 3;
  return Math.round((desde + (hasta - desde) * avance) * 100) / 100;
}

// ── Vista ────────────────────────────────────────────────────────────────────

/**
 * @param {HTMLElement} elemento la cifra, con data-dato y data-formato
 * @param {object} datos todos los data/*.json por nombre
 */
export function crear(elemento, datos) {
  const ventana = elemento.ownerDocument.defaultView;
  const hasta = resolverDato(datos, elemento.dataset.dato);
  const formato = elemento.dataset.formato ?? 'numero';
  if (typeof hasta !== 'number' || formatear(hasta, formato) === null) {
    console.warn(`counter: data-dato="${elemento.dataset.dato}" no es un número`);
    return { activar() {}, desactivar() {}, paso() {}, saltarAlFinal() {} };
  }
  const duracion = aMilisegundos(
    ventana.getComputedStyle(elemento).getPropertyValue('--duracion-conteo'),
    1200,
  );
  // Los lectores de pantalla leen el valor final, no cada cuadro de la cuenta.
  elemento.setAttribute('aria-label', formatear(hasta, formato));

  let cuadroPendiente = 0;
  const escribir = (valor) => {
    elemento.textContent = formatear(valor, formato);
  };

  function detener() {
    ventana.cancelAnimationFrame(cuadroPendiente);
    cuadroPendiente = 0;
    escribir(hasta);
  }

  function animar() {
    detener();
    if (movimientoReducido(ventana)) return;
    let inicio = null;
    escribir(0); // antes del primer cuadro, para que no se vea un instante el valor final
    const cuadro = (ahora) => {
      inicio ??= ahora;
      const t = ahora - inicio;
      escribir(valorEnInstante(t, { hasta, duracion }));
      cuadroPendiente = t < duracion ? ventana.requestAnimationFrame(cuadro) : 0;
    };
    cuadroPendiente = ventana.requestAnimationFrame(cuadro);
  }

  return alRevelarse(elemento, { animar, detener });
}
