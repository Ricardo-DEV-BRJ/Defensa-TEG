/**
 * Datos en las láminas (ADR-006 §7 y RNF-07): ninguna cifra ni texto del TEG se escribe a mano.
 *
 *   <span data-dato="costos.total" data-formato="usd"></span>   →   USD 56,10
 *
 * La ruta empieza por el nombre del archivo de data/ (sin .json) y sigue por sus claves;
 * los elementos de una lista se piden por posición: "objetivos.especificos.0.verbo".
 *
 * Para dibujar (barras, medidores), los números pasan a variables CSS y, para los casos en
 * que el CSS necesita comparar valores (cuántos segmentos llenar), también a un atributo:
 *
 *   <li data-vars="acuerdo=likert.items.6.acuerdo_pct">
 *     →   style="--acuerdo: 100"   y   data-var-acuerdo="100"
 */

const NUMERO = new Intl.NumberFormat('es-VE');
const DECIMAL = new Intl.NumberFormat('es-VE', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const esNumero = (valor) => typeof valor === 'number' && Number.isFinite(valor);

// ── Lógica pura ──────────────────────────────────────────────────────────────

/**
 * Busca un valor dentro de los datos siguiendo una ruta con puntos.
 * @param {object} datos por ejemplo { costos: {...}, objetivos: {...} }
 * @param {string} ruta por ejemplo 'costos.total'
 * @returns {unknown} el valor, o undefined si la ruta no existe
 */
export function resolverDato(datos, ruta) {
  if (typeof ruta !== 'string' || ruta === '') return undefined;
  let valor = datos;
  for (const clave of ruta.split('.')) {
    if (valor === null || typeof valor !== 'object' || !Object.hasOwn(valor, clave)) {
      return undefined;
    }
    valor = valor[clave];
  }
  return valor;
}

/**
 * Da formato venezolano a un valor.
 * @param {unknown} valor
 * @param {string} [formato] texto (por defecto), numero, decimal, porcentaje, usd o cantidad
 *   (cuántos elementos tiene una lista u objeto: «3 expertos» sin escribir el 3 a mano)
 * @returns {string | null} el texto, o null si el valor no sirve para ese formato
 */
export function formatear(valor, formato = 'texto') {
  if (formato === 'texto') {
    return typeof valor === 'string' || esNumero(valor) ? String(valor) : null;
  }
  if (formato === 'cantidad') {
    if (Array.isArray(valor)) return NUMERO.format(valor.length);
    if (valor !== null && typeof valor === 'object') {
      return NUMERO.format(Object.keys(valor).length);
    }
    return null;
  }
  if (!esNumero(valor)) return null;
  switch (formato) {
    case 'numero':
      return NUMERO.format(valor);
    case 'decimal':
      return DECIMAL.format(valor);
    case 'porcentaje':
      return `${NUMERO.format(valor)}%`;
    case 'usd':
      return `USD ${DECIMAL.format(valor)}`;
    default:
      return null;
  }
}

const NOMBRE_VARIABLE = /^[a-z][a-z0-9-]*$/;

/**
 * Lee un atributo data-vars: pares «nombre=ruta» separados por espacios.
 * @param {string} texto por ejemplo 'acuerdo=likert.items.6.acuerdo_pct neutral=…'
 * @returns {{ nombre: string, ruta: string }[] | null} null si algún par está mal escrito
 */
export function leerVariables(texto) {
  if (typeof texto !== 'string' || texto.trim() === '') return null;
  const pares = texto
    .trim()
    .split(/\s+/)
    .map((par) => par.split('='));
  const validos = pares.every(
    (partes) => partes.length === 2 && NOMBRE_VARIABLE.test(partes[0]) && partes[1] !== '',
  );
  return validos ? pares.map(([nombre, ruta]) => ({ nombre, ruta })) : null;
}

// ── Vista ────────────────────────────────────────────────────────────────────

/**
 * Escribe en cada elemento [data-dato] su valor con formato. Un dato que no existe o no
 * sirve para su formato se muestra como «¿ruta?» y se marca con data-dato-roto: un error
 * de datos se ve en pantalla, no se oculta.
 * @param {ParentNode} raiz normalmente el escenario
 * @param {object} datos
 * @returns {string[]} las rutas que no se pudieron resolver
 */
export function rellenarDatos(raiz, datos) {
  const rotos = [];
  for (const elemento of raiz.querySelectorAll('[data-dato]')) {
    const ruta = elemento.dataset.dato;
    const texto = formatear(resolverDato(datos, ruta), elemento.dataset.formato);
    if (texto === null) {
      elemento.textContent = `¿${ruta}?`;
      elemento.dataset.datoRoto = '';
      rotos.push(ruta);
    } else {
      elemento.textContent = texto;
      delete elemento.dataset.datoRoto;
    }
  }

  // data-vars: solo números (anchos, niveles); lo demás es un dato roto.
  for (const elemento of raiz.querySelectorAll('[data-vars]')) {
    const variables = leerVariables(elemento.dataset.vars);
    if (!variables) {
      elemento.dataset.datoRoto = '';
      rotos.push(elemento.dataset.vars);
      continue;
    }
    for (const { nombre, ruta } of variables) {
      const valor = resolverDato(datos, ruta);
      if (esNumero(valor)) {
        elemento.style.setProperty(`--${nombre}`, String(valor));
        elemento.setAttribute(`data-var-${nombre}`, String(valor));
      } else {
        elemento.dataset.datoRoto = '';
        rotos.push(ruta);
      }
    }
  }
  return rotos;
}
