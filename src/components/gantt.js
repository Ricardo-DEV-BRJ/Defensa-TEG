/**
 * gantt: cronograma de implementación de la lámina 16, armado desde data/cronograma.json.
 *
 * Uso: <div class="gantt" data-fragment="1" data-vars="total=… meses=…" data-componente="gantt">
 * con una <ol class="gantt__filas"> vacía. El componente crea una fila por fase (número, nombre,
 * barra de la semana de inicio a la de fin y rótulo «semanas a–b»), así que una fase nueva en
 * los datos aparece sola. Las barras se ubican con las variables CSS --inicio, --fin y --total, y
 * crecen con las transiciones CSS del bloque «gantt» (la tecla S y el movimiento reducido ya las
 * cubren). Clic, Enter o Espacio en una fase muestra sus actividades (Tabla 24) en un recuadro
 * debajo del cronograma; otro clic en la misma fase, o en el recuadro, lo cierra.
 *
 * Parte pura (tests/gantt.test.js): rotuloAntes y filasDelGantt. Parte de vista: crear
 * (ADR-006 §7).
 */
import { alternarAmpliada, fabricaDeElementos, hacerBoton } from './comun.js';

// ── Lógica pura ──────────────────────────────────────────────────────────────

// Semanas que ocupa el rótulo «semanas 17–24» a la derecha de una barra (unas 3,5 en 1920 px).
const SEMANAS_DEL_ROTULO = 4;

/**
 * ¿El rótulo va antes de la barra? Solo cuando después de ella no queda sitio para él.
 * @param {number} fin última semana de la fase
 * @param {number} total semanas del cronograma
 * @param {number} [margen] semanas que necesita el rótulo
 * @returns {boolean}
 */
export function rotuloAntes(fin, total, margen = SEMANAS_DEL_ROTULO) {
  return total - fin < margen;
}

/**
 * Filas del cronograma, en el orden de los datos.
 * @param {{ total_semanas: number, fases: object[] }} cronograma data/cronograma.json
 * @returns {{ fase: string, nombre: string, inicio: number, fin: number,
 *   actividades: string[], rotuloAntes: boolean }[]}
 */
export function filasDelGantt({ total_semanas: total, fases }) {
  if (!Number.isInteger(total) || total < 1) throw new Error('total_semanas no es válido');
  if (!Array.isArray(fases) || fases.length === 0) throw new Error('no hay fases');
  return fases.map(({ fase, nombre, inicio, fin, actividades = [] }) => {
    const valida = Number.isInteger(inicio) && Number.isInteger(fin);
    if (!valida || inicio < 1 || fin < inicio || fin > total) {
      throw new Error(`la fase ${fase} no cabe en las semanas 1 a ${total}`);
    }
    return { fase, nombre, inicio, fin, actividades, rotuloAntes: rotuloAntes(fin, total) };
  });
}

// ── Vista ────────────────────────────────────────────────────────────────────

/**
 * @param {HTMLElement} elemento el bloque .gantt
 * @param {object} datos todos los data/*.json por nombre
 */
export function crear(elemento, datos) {
  const documento = elemento.ownerDocument;
  const lista = elemento.querySelector('.gantt__filas');
  let filas;
  try {
    if (!lista) throw new Error('falta la lista .gantt__filas');
    filas = filasDelGantt(datos.cronograma ?? {});
  } catch (error) {
    elemento.dataset.datoRoto = '';
    elemento.append(`¿cronograma: ${error.message}?`);
    console.warn(`gantt: ${error.message}`);
    return { activar() {}, desactivar() {}, paso() {}, saltarAlFinal() {} };
  }

  const h = fabricaDeElementos(documento);
  const semanas = ({ inicio, fin }) => `semanas ${inicio}–${fin}`;
  const titulo = h('p', { class: 'etiqueta' });
  const actividades = h('ul', { class: 'lista-compacta' });
  const detalle = h('div', { class: 'gantt__detalle', hidden: true }, titulo, actividades);
  let abierta = null;

  const nodos = filas.map((fila, i) => {
    const nodo = h(
      'li',
      { class: `gantt__fila${fila.rotuloAntes ? ' gantt__fila--rotulo-antes' : ''}` },
      h('span', { class: 'gantt__numero' }, `Fase ${fila.fase}`),
      h('span', { class: 'gantt__nombre' }, fila.nombre),
      h(
        'span',
        { class: 'gantt__pista' },
        h('span', { class: 'gantt__barra' }),
        h('span', { class: 'gantt__semanas' }, semanas(fila)),
      ),
    );
    nodo.style.setProperty('--inicio', String(fila.inicio));
    nodo.style.setProperty('--fin', String(fila.fin));
    hacerBoton(nodo, 'Ver las actividades de esta fase', () =>
      mostrar(alternarAmpliada(abierta, i)),
    );
    return nodo;
  });
  lista.replaceChildren(...nodos);
  elemento.append(detalle);
  hacerBoton(detalle, 'Cerrar las actividades', () => mostrar(null));

  function mostrar(indice) {
    abierta = indice;
    nodos.forEach((nodo, i) => nodo.setAttribute('aria-expanded', String(i === indice)));
    detalle.hidden = indice === null;
    if (indice === null) return;
    const fila = filas[indice];
    titulo.textContent = `Fase ${fila.fase} · ${semanas(fila)} · actividades`;
    actividades.replaceChildren(...fila.actividades.map((actividad) => h('li', {}, actividad)));
  }

  function cerrar() {
    mostrar(null);
    if (elemento.contains(documento.activeElement)) documento.activeElement.blur();
  }

  mostrar(null);
  return {
    activar() {},
    desactivar: cerrar,
    // Si el cronograma deja de verse (← hasta el paso 0), el recuadro se cierra.
    paso() {
      if (!elemento.hasAttribute('data-visible')) cerrar();
    },
    // Las barras crecen con transiciones CSS, que la tecla S ya termina desde el deck.
    saltarAlFinal() {},
  };
}
