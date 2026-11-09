/**
 * stock-calc: calculadora de inventario de seguridad y punto de reorden (lámina 14).
 *
 * Fórmulas del TEG 6.4.5 (Chopra y Meindl, 2013; data/arquitectura.json → formulas):
 *   SS = z × σd × √L        (1)   inventario de seguridad
 *   PR = d̄ × L + SS         (2)   punto de reorden
 * z: factor del nivel de servicio · σd: desviación estándar de la demanda diaria ·
 * L: tiempo de reposición en días · d̄: demanda diaria promedio.
 *
 * Uso en una lámina: <div class="calculadora" data-componente="stock-calc"></div>
 * Vista: un deslizador por variable (rangos en formulas.calculadora.variables) que recalcula
 * SS y PR en vivo, con los valores sustituidos en las fórmulas y una barra que muestra de qué
 * se compone el punto de reorden. Empieza (y se restablece) en formulas.ejemplo_demo.
 *
 * Parte pura (tests/stock-calc.test.js): calcularSS, calcularPR, calcular, nivelDeServicio y
 * ajustarAlDeslizador. Parte de vista: crear (contrato del ADR-006 §7).
 */
import { formatear } from '../core/datos.js';
import { fabricaDeElementos } from './comun.js';

// ── Lógica pura ──────────────────────────────────────────────────────────────

const CLAVES = ['z', 'sigma_d', 'L', 'd_media'];

function exigirNoNegativo(valores, claves) {
  for (const clave of claves) {
    const valor = valores[clave];
    if (!Number.isFinite(valor) || valor < 0) {
      throw new Error(`${clave} debe ser un número mayor o igual que 0 (recibido: ${valor})`);
    }
  }
}

/**
 * Inventario de seguridad, fórmula (1): SS = z × σd × √L.
 * @param {{ z: number, sigma_d: number, L: number }} valores
 * @returns {number}
 */
export function calcularSS({ z, sigma_d, L }) {
  exigirNoNegativo({ z, sigma_d, L }, ['z', 'sigma_d', 'L']);
  return z * sigma_d * Math.sqrt(L);
}

/**
 * Punto de reorden, fórmula (2): PR = d̄ × L + SS.
 * @param {{ d_media: number, L: number }} valores
 * @param {number} ss inventario de seguridad
 * @returns {number}
 */
export function calcularPR({ d_media, L }, ss) {
  exigirNoNegativo({ d_media, L, ss }, ['d_media', 'L', 'ss']);
  return d_media * L + ss;
}

/**
 * Todo lo que muestra la calculadora, sin redondear.
 * @param {{ z: number, sigma_d: number, L: number, d_media: number }} valores
 * @returns {{ ss: number, demandaReposicion: number, pr: number }} demandaReposicion = d̄ × L
 */
export function calcular(valores) {
  exigirNoNegativo(valores, CLAVES);
  const ss = calcularSS(valores);
  return { ss, demandaReposicion: valores.d_media * valores.L, pr: calcularPR(valores, ss) };
}

/**
 * Nivel de servicio asociado a z: probabilidad de no quedarse sin stock durante la
 * reposición, Φ(z) de la distribución normal estándar (z = 1,65 → 95 %). Usa la aproximación
 * 7.1.26 de Abramowitz y Stegun para erf (error menor que 1,5 × 10⁻⁷).
 * @param {number} z
 * @returns {number} entre 0 y 1
 */
export function nivelDeServicio(z) {
  const x = Math.abs(z) / Math.SQRT2;
  const t = 1 / (1 + 0.3275911 * x);
  const polinomio =
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t;
  const erf = 1 - polinomio * Math.exp(-x * x);
  return 0.5 * (1 + Math.sign(z) * erf);
}

/**
 * Valor que puede tomar un deslizador: dentro de [min, max] y en un múltiplo del paso.
 * @param {number} valor
 * @param {{ min: number, max: number, paso: number }} rango
 * @returns {number}
 */
export function ajustarAlDeslizador(valor, { min, max, paso }) {
  const pasos = Math.round((Math.min(Math.max(valor, min), max) - min) / paso);
  // Se redondea para no arrastrar errores de coma flotante (0,1 + 0,2).
  return Number((min + pasos * paso).toFixed(10));
}

// ── Vista ────────────────────────────────────────────────────────────────────

const UNIDADES = 'unid.';
const PORCENTAJE = new Intl.NumberFormat('es-VE', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
let instancias = 0;

/**
 * @param {HTMLElement} elemento contenedor de la lámina
 * @param {object} datos todos los data/*.json por nombre
 */
export function crear(elemento, datos) {
  const documento = elemento.ownerDocument;
  const formulas = datos.arquitectura?.formulas;
  const variables = formulas?.calculadora?.variables ?? [];
  const ejemplo = formulas?.ejemplo_demo ?? {};
  const porClave = Object.fromEntries(variables.map((variable) => [variable.clave, variable]));
  const faltante = CLAVES.find(
    (clave) =>
      !porClave[clave] ||
      !Number.isFinite(ejemplo[clave]) ||
      ajustarAlDeslizador(ejemplo[clave], porClave[clave]) !== ejemplo[clave],
  );
  if (faltante) {
    const mensaje = `formulas: la variable ${faltante} no tiene deslizador o su ejemplo no cabe en él`;
    elemento.textContent = `¿${mensaje}?`;
    elemento.dataset.datoRoto = '';
    console.warn(`stock-calc: ${mensaje}`);
    return { activar() {}, desactivar() {}, paso() {}, saltarAlFinal() {} };
  }

  // Los clics dentro de la calculadora no avanzan la lámina (ADR-006 §5).
  elemento.dataset.interactivo = '';
  const h = fabricaDeElementos(documento);
  const numero = (valor) => formatear(valor, 'numero');
  const decimal = (valor) => formatear(valor, 'decimal');
  const simbolo = (texto) => h('span', { class: 'calculadora__simbolo' }, texto);
  const prefijo = `stock-calc-${++instancias}`;
  const valores = {};
  const entradas = {};
  const lecturas = {};

  const filas = variables
    .filter((variable) => CLAVES.includes(variable.clave))
    .map((variable) => {
      const id = `${prefijo}-${variable.clave}`;
      entradas[variable.clave] = h('input', {
        type: 'range',
        class: 'calculadora__deslizador',
        id,
        min: variable.min,
        max: variable.max,
        step: variable.paso,
        oninput: (evento) => {
          valores[variable.clave] = Number(evento.target.value);
          actualizar();
        },
      });
      lecturas[variable.clave] = h('output', { class: 'calculadora__valor', for: id });
      return h(
        'div',
        { class: 'calculadora__variable' },
        h(
          'label',
          { class: 'calculadora__etiqueta', for: id },
          simbolo(variable.simbolo),
          `: ${variable.definicion}`,
        ),
        h(
          'p',
          { class: 'calculadora__lectura' },
          lecturas[variable.clave],
          variable.unidad ? ` ${variable.unidad}` : null,
        ),
        entradas[variable.clave],
      );
    });

  const servicio = h('p', { class: 'nota' });
  const expresionSS = h('p', { class: 'formula__expresion' });
  const expresionPR = h('p', { class: 'formula__expresion' });
  const segmentoDemanda = h('span', {
    class: 'calculadora__segmento calculadora__segmento--demanda',
  });
  const segmentoSS = h('span', { class: 'calculadora__segmento calculadora__segmento--ss' });
  const valorDemanda = h('strong');
  const valorSS = h('strong');

  elemento.replaceChildren(
    h(
      'p',
      { class: 'nota' },
      `Inventario de seguridad y punto de reorden según ${formulas.fuente}. Mueve un valor: el ` +
        'resultado se recalcula en el acto.',
    ),
    h(
      'div',
      { class: 'calculadora__cuerpo' },
      h(
        'section',
        { class: 'panel calculadora__entradas' },
        h('p', { class: 'etiqueta' }, 'Datos del producto'),
        filas,
        servicio,
        h(
          'button',
          { type: 'button', class: 'boton boton--secundario', onclick: () => restablecer() },
          'Restablecer el ejemplo',
        ),
      ),
      h(
        'section',
        { class: 'panel calculadora__resultados' },
        h('p', { class: 'etiqueta' }, 'Resultado'),
        h(
          'div',
          { class: 'formula' },
          h(
            'p',
            { class: 'formula__nombre' },
            'Inventario de seguridad · SS = ',
            simbolo(formulas.SS),
          ),
          expresionSS,
        ),
        h(
          'div',
          { class: 'formula' },
          h('p', { class: 'formula__nombre' }, 'Punto de reorden · PR = ', simbolo(formulas.PR)),
          expresionPR,
        ),
        h(
          'div',
          { class: 'calculadora__barra', 'aria-hidden': 'true' },
          segmentoDemanda,
          segmentoSS,
        ),
        h(
          'ul',
          { class: 'calculadora__leyenda' },
          h(
            'li',
            {},
            h('span', { class: 'calculadora__muestra calculadora__muestra--demanda' }),
            // El texto va en un solo elemento: en la fila flexible, cada nodo suelto se separaría.
            h('span', {}, 'Demanda durante la reposición (', simbolo('d̄ × L'), '): ', valorDemanda),
          ),
          h(
            'li',
            {},
            h('span', { class: 'calculadora__muestra calculadora__muestra--ss' }),
            h('span', {}, 'Inventario de seguridad: ', valorSS),
          ),
        ),
        h('p', { class: 'nota' }, formulas.calculadora.alerta),
      ),
    ),
  );

  function actualizar() {
    const { z, sigma_d, L, d_media } = valores;
    const { ss, demandaReposicion, pr } = calcular(valores);
    for (const clave of CLAVES) lecturas[clave].textContent = numero(valores[clave]);
    servicio.textContent = `Con z = ${numero(z)}, nivel de servicio ≈ ${PORCENTAJE.format(nivelDeServicio(z) * 100)}%`;
    expresionSS.replaceChildren(
      `SS = ${numero(z)} × ${numero(sigma_d)} × √${numero(L)} = `,
      h('strong', {}, `${decimal(ss)} ${UNIDADES}`),
    );
    expresionPR.replaceChildren(
      `PR = ${numero(d_media)} × ${numero(L)} + ${decimal(ss)} = `,
      h('strong', {}, `${decimal(pr)} ${UNIDADES}`),
    );
    // Cada tramo crece en proporción a su parte del punto de reorden.
    segmentoDemanda.style.flexGrow = String(demandaReposicion);
    segmentoSS.style.flexGrow = String(ss);
    valorDemanda.textContent = `${decimal(demandaReposicion)} ${UNIDADES}`;
    valorSS.textContent = `${decimal(ss)} ${UNIDADES}`;
  }

  function restablecer() {
    for (const clave of CLAVES) {
      valores[clave] = ejemplo[clave];
      entradas[clave].value = String(ejemplo[clave]);
    }
    actualizar();
  }

  restablecer();
  return {
    // Cada vez que se entra a la lámina, la calculadora vuelve al ejemplo.
    activar: restablecer,
    desactivar() {
      if (elemento.contains(documento.activeElement)) documento.activeElement.blur();
      restablecer();
    },
    paso() {},
    // No anima nada: el resultado se recalcula al instante.
    saltarAlFinal() {},
  };
}
