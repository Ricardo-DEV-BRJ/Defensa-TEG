/**
 * level-meter: medidores de nivel (1 a 4) que se llenan segmento a segmento (lámina 9).
 *
 * Uso: en la lista de indicadores, <ul class="niveles" data-componente="level-meter">, con un
 * .medidor por indicador cuyo data-vars="nivel=observacion.areas.…" apunta a su nivel en
 * data/observacion.json. El color y los segmentos llenos ya los dibuja el CSS según el nivel:
 * este componente solo hace que, al aparecer el panel, los segmentos llenos entren uno tras
 * otro (Web Animations). La tecla S, volver con «anterior» y el movimiento reducido dejan los
 * medidores llenos. Los medidores de la leyenda (fuera de la lista) no se animan.
 *
 * Parte pura (tests/level-meter.test.js): segmentosLlenos y tiempoDeSegmento. Parte de vista:
 * crear (ADR-006 §7).
 */
import { leerVariables, resolverDato } from '../core/datos.js';
import { alRevelarse, leerDuraciones, movimientoReducido } from './comun.js';

// ── Lógica pura ──────────────────────────────────────────────────────────────

/**
 * Cuántos segmentos se llenan para un nivel. Un nivel que no es un entero de 1 al máximo da 0:
 * un medidor vacío se nota, uno lleno por error no.
 * @param {unknown} nivel
 * @param {number} maximo segmentos del medidor (la escala de observacion.json tiene 4)
 * @returns {number}
 */
export function segmentosLlenos(nivel, maximo) {
  return Number.isInteger(nivel) && nivel >= 1 && nivel <= maximo ? nivel : 0;
}

/**
 * Cuándo entra el segmento j del medidor i: los medidores y los segmentos se escalonan medio
 * retardo cada uno. Con 6 medidores de 4 segmentos y los tokens actuales (250 y 300 ms), el
 * último termina a los 1,3 s (máximo 1,5 s).
 * @param {number} medidor índice del medidor en la lista
 * @param {number} segmento índice del segmento dentro del medidor
 * @param {{ retardo: number, paso: number }} duraciones en ms
 */
export function tiempoDeSegmento(medidor, segmento, { retardo, paso }) {
  return { retardo: ((medidor + segmento) * retardo) / 2, duracion: paso };
}

// ── Vista ────────────────────────────────────────────────────────────────────

/**
 * @param {HTMLElement} elemento la lista .niveles
 * @param {object} datos todos los data/*.json por nombre
 */
export function crear(elemento, datos) {
  const ventana = elemento.ownerDocument.defaultView;
  const maximo = Object.keys(datos.observacion?.escala ?? {}).length || 4;
  const duraciones = leerDuraciones(ventana.getComputedStyle(elemento));

  // Nivel de cada medidor según los datos (la misma ruta de su data-vars).
  const medidores = [...elemento.querySelectorAll('.medidor[data-vars]')].map((medidor) => {
    const ruta = leerVariables(medidor.dataset.vars)?.find(
      ({ nombre }) => nombre === 'nivel',
    )?.ruta;
    const llenos = segmentosLlenos(resolverDato(datos, ruta), maximo);
    if (!llenos) console.warn(`level-meter: el nivel de «${ruta}» no está entre 1 y ${maximo}`);
    return [...medidor.querySelectorAll('.medidor__segmentos > span')].slice(0, llenos);
  });

  let animaciones = [];
  const detener = () => {
    for (const animacion of animaciones) animacion.cancel();
    animaciones = [];
  };

  function animar() {
    detener();
    if (movimientoReducido(ventana)) return;
    // Cada segmento lleno parte del gris de un segmento vacío y se pinta de su color: mientras
    // espera su turno, el medidor conserva su forma completa.
    const vacio = ventana.getComputedStyle(elemento).getPropertyValue('--color-vacio-grafico');
    medidores.forEach((segmentos, i) => {
      segmentos.forEach((segmento, j) => {
        const t = tiempoDeSegmento(i, j, duraciones);
        const color = ventana.getComputedStyle(segmento).backgroundColor;
        animaciones.push(
          segmento.animate([{ backgroundColor: vacio.trim() }, { backgroundColor: color }], {
            duration: t.duracion,
            delay: t.retardo,
            easing: 'ease-out',
            fill: 'backwards',
          }),
        );
      });
    });
  }

  // El dibujo estático ya es el estado final: animar solo agrega el llenado.
  return alRevelarse(elemento, { animar, detener });
}
