/**
 * bar-chart: barras horizontales en SVG con el % de acuerdo de los ítems Likert (lámina 8).
 *
 * Uso en una lámina: <div class="barras" data-componente="bar-chart" data-grupo="1"></div>
 * Dibuja los ítems de data/likert.json con destacado_lamina_8 y grupo_lamina_8 igual a
 * data-grupo, de mayor a menor acuerdo. Las barras crecen desde la base (Web Animations) cuando
 * su fragmento se vuelve visible; la tecla S, volver con «anterior» y el movimiento reducido las
 * dejan en su estado final. Contrato del ADR-006 §7: crear(elemento, datos) devuelve
 * { activar, desactivar, paso, saltarAlFinal }.
 *
 * Parte pura (tests/bar-chart.test.js): prepararBarras, calcularGeometria, calcularTiempos y
 * aMilisegundos (re-exportada de comun.js). Parte de vista: crear.
 */
import { formatear } from '../core/datos.js';
import { aMilisegundos, alRevelarse, leerDuraciones, movimientoReducido } from './comun.js';

export { aMilisegundos };

const SVG = 'http://www.w3.org/2000/svg';

// Pista de las barras en % del ancho del gráfico; a la izquierda van los textos.
export const PISTA = { inicio: 52, fin: 92 };

// ── Lógica pura ──────────────────────────────────────────────────────────────

/**
 * ¿Se muestra el desacuerdo junto a la barra? Solo cuando pesa más que el acuerdo: ahí el % de
 * acuerdo solo cuenta la mitad de la historia (ADR-014).
 * @param {number} acuerdo
 * @param {number} desacuerdo
 * @returns {boolean}
 */
export function desacuerdoDestacado(acuerdo, desacuerdo) {
  return Number.isFinite(desacuerdo) && desacuerdo > acuerdo;
}

/**
 * Ítems destacados de un grupo, de mayor a menor acuerdo (empates: orden del cuestionario).
 * @param {object[]} items likert.items
 * @param {number} grupo valor de grupo_lamina_8
 * @returns {{ id: string, texto: string, valor: number, desacuerdo: number,
 *   mostrarDesacuerdo: boolean }[]}
 */
export function prepararBarras(items, grupo) {
  const barras = (items ?? [])
    .filter((item) => item.destacado_lamina_8 && item.grupo_lamina_8 === grupo)
    .map((item) => ({
      id: item.id,
      texto: item.resumen,
      valor: item.acuerdo_pct,
      desacuerdo: item.desacuerdo_pct,
      mostrarDesacuerdo: desacuerdoDestacado(item.acuerdo_pct, item.desacuerdo_pct),
    }));
  if (barras.length === 0) throw new Error(`no hay ítems destacados en el grupo ${grupo}`);
  for (const { id, texto, valor } of barras) {
    if (!Number.isFinite(valor) || valor < 0 || valor > 100) {
      throw new Error(`el ítem ${id} no tiene un acuerdo_pct entre 0 y 100`);
    }
    if (typeof texto !== 'string' || texto === '')
      throw new Error(`el ítem ${id} no tiene resumen`);
  }
  return barras.sort((a, b) => b.valor - a.valor); // sort es estable
}

/**
 * Posición de cada fila: «centro» y «yBarra» en px; «x», «ancho» y «fin» en % del ancho.
 * @param {{ valor: number }[]} barras
 * @param {{ altoFila: number, altoBarra: number, inicio?: number, fin?: number }} medidas
 */
export function calcularGeometria(
  barras,
  { altoFila, altoBarra, inicio = PISTA.inicio, fin = PISTA.fin },
) {
  const anchoPista = fin - inicio;
  return {
    alto: barras.length * altoFila,
    anchoPista,
    filas: barras.map((barra, i) => {
      const centro = i * altoFila + altoFila / 2;
      const ancho = (anchoPista * barra.valor) / 100;
      return {
        ...barra,
        centro,
        yBarra: centro - altoBarra / 2,
        x: inicio,
        ancho,
        fin: inicio + ancho,
      };
    }),
  };
}

/**
 * Tiempos de la fila i: la barra crece y luego aparece su valor. Con 5 filas y los tokens
 * actuales (600, 250, 300 ms) la última termina a los 1,4 s (máximo 1,5 s).
 * @param {number} indice
 * @param {{ giro: number, retardo: number, paso: number }} duraciones en ms
 */
export function calcularTiempos(indice, { giro, retardo, paso }) {
  const inicio = (indice * retardo) / 2;
  return {
    barra: { retardo: inicio, duracion: giro },
    valor: { retardo: inicio + giro, duracion: paso },
  };
}

// ── Vista ────────────────────────────────────────────────────────────────────

// «75% en desacuerdo»: el rojo nunca va solo, siempre con la palabra.
const textoDesacuerdo = (desacuerdo) => `${formatear(desacuerdo, 'porcentaje')} en desacuerdo`;

/**
 * Dibuja el gráfico dentro de `elemento` (debe estar ya en el documento, para leer los tokens).
 * @param {HTMLElement} elemento
 * @param {object} datos todos los data/*.json por nombre
 */
export function crear(elemento, datos) {
  const documento = elemento.ownerDocument;
  const ventana = documento.defaultView;
  const nada = { activar() {}, desactivar() {}, paso() {}, saltarAlFinal() {} };

  let barras;
  try {
    barras = prepararBarras(datos.likert?.items, Number(elemento.dataset.grupo));
  } catch (error) {
    elemento.textContent = `¿likert: ${error.message}?`;
    elemento.dataset.datoRoto = '';
    console.warn(`bar-chart: ${error.message}`);
    return nada;
  }

  const estilo = ventana.getComputedStyle(elemento);
  const token = (nombre, porDefecto) => estilo.getPropertyValue(nombre).trim() || porDefecto;
  const px = (nombre, porDefecto) => parseFloat(token(nombre, '')) || porDefecto;
  const radio = px('--radio-barra', 4);
  const separacion = px('--espacio-xs', 8);
  const geometria = calcularGeometria(barras, {
    altoFila: px('--grafico-fila-alto', 64),
    altoBarra: px('--barra-alto', 24),
  });
  const duraciones = leerDuraciones(estilo);

  const nodo = (etiqueta, atributos = {}, texto) => {
    const n = documento.createElementNS(SVG, etiqueta);
    for (const [nombre, valor] of Object.entries(atributos)) n.setAttribute(nombre, String(valor));
    if (texto !== undefined) n.textContent = texto;
    return n;
  };
  const pct = (valor) => `${valor}%`;

  const svg = nodo('svg', {
    class: 'barras__svg',
    width: '100%',
    height: geometria.alto,
    role: 'img',
  });
  svg.setAttribute(
    'aria-label',
    `Porcentaje de acuerdo: ${barras
      .map(
        (b) =>
          `${b.id} ${b.texto}, ${formatear(b.valor, 'porcentaje')}` +
          (b.mostrarDesacuerdo ? ` (${textoDesacuerdo(b.desacuerdo)})` : ''),
      )
      .join('; ')}`,
  );

  const filas = geometria.filas.map((fila) => {
    const grupo = nodo('g', { class: 'barras__fila' });
    const texto = nodo('text', { class: 'barras__texto', x: 0, y: fila.centro });
    texto.append(
      nodo('tspan', { class: 'barras__id' }, fila.id),
      nodo('tspan', { dx: separacion }, fila.texto),
    );
    const caja = { y: fila.yBarra, height: px('--barra-alto', 24) };
    const pista = nodo('rect', {
      class: 'barras__pista',
      x: pct(fila.x),
      width: pct(geometria.anchoPista),
      ...caja,
    });
    const barra = nodo('g', { class: 'barras__barra' });
    if (fila.valor > 0) {
      // Extremo de datos redondeado; la base, recta (un cuadro tapa las esquinas de la base).
      barra.append(
        nodo('rect', { x: pct(fila.x), width: pct(fila.ancho), rx: radio, ...caja }),
        nodo('rect', { x: pct(fila.x), width: radio, ...caja }),
      );
    }
    const valor = nodo(
      'text',
      { class: 'barras__valor', x: pct(fila.fin), dx: separacion, y: fila.centro },
      formatear(fila.valor, 'porcentaje'),
    );
    if (fila.mostrarDesacuerdo) {
      valor.append(
        nodo(
          'tspan',
          { class: 'barras__desacuerdo', dx: separacion },
          `· ${textoDesacuerdo(fila.desacuerdo)}`,
        ),
      );
    }
    grupo.append(texto, pista, barra, valor);
    svg.append(grupo);
    return { barra, valor };
  });
  elemento.replaceChildren(svg);

  let animaciones = [];
  const cancelar = () => {
    for (const animacion of animaciones) animacion.cancel();
    animaciones = [];
  };
  function animar() {
    cancelar();
    if (movimientoReducido(ventana)) return;
    filas.forEach(({ barra, valor }, i) => {
      const t = calcularTiempos(i, duraciones);
      animaciones.push(
        barra.animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], {
          duration: t.barra.duracion,
          delay: t.barra.retardo,
          easing: 'ease-out',
          fill: 'backwards',
        }),
        valor.animate([{ opacity: 0 }, { opacity: 1 }], {
          duration: t.valor.duracion,
          delay: t.valor.retardo,
          fill: 'backwards',
        }),
      );
    });
  }

  // El dibujo estático ya es el estado final: animar solo agrega el crecimiento.
  return alRevelarse(elemento, { animar, detener: cancelar });
}
