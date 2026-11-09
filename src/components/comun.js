/**
 * Utilidades compartidas por los componentes de src/components/ (lógica pura).
 */

/**
 * «600ms» → 600, «0.6s» → 600; cualquier otra cosa → porDefecto.
 * @param {string} texto
 * @param {number} porDefecto
 * @returns {number}
 */
export function aMilisegundos(texto, porDefecto) {
  const partes = String(texto ?? '')
    .trim()
    .match(/^(\d+(?:\.\d+)?)(ms|s)$/);
  if (!partes) return porDefecto;
  return partes[2] === 's' ? Number(partes[1]) * 1000 : Number(partes[1]);
}

/**
 * Duraciones de movimiento de tokens.css, leídas del estilo calculado de un elemento.
 * @param {CSSStyleDeclaration} estilo
 * @returns {{ giro: number, retardo: number, paso: number }} en milisegundos
 */
export function leerDuraciones(estilo) {
  const token = (nombre) => estilo.getPropertyValue(nombre);
  return {
    giro: aMilisegundos(token('--duracion-giro'), 600),
    retardo: aMilisegundos(token('--retardo-paso'), 250),
    paso: aMilisegundos(token('--duracion-paso'), 300),
  };
}

/**
 * ¿El usuario pidió reducir el movimiento?
 * @param {Window} ventana
 * @returns {boolean}
 */
export function movimientoReducido(ventana) {
  return Boolean(ventana.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
}

/**
 * Devuelve h(etiqueta, atributos, ...hijos) para armar elementos HTML sin innerHTML:
 * h('button', { type: 'button', onclick: alHacerClic }, 'Texto'). Un atributo con una función
 * se vuelve un oyente (onclick → click); null, undefined y false se omiten; true deja el
 * atributo vacío. Los hijos pueden ser textos, elementos o listas de ellos.
 * @param {Document} documento
 */
export function fabricaDeElementos(documento) {
  return (etiqueta, atributos = {}, ...hijos) => {
    const nodo = documento.createElement(etiqueta);
    for (const [nombre, valor] of Object.entries(atributos)) {
      if (valor === null || valor === undefined || valor === false) continue;
      if (typeof valor === 'function') nodo.addEventListener(nombre.slice(2), valor);
      else nodo.setAttribute(nombre, valor === true ? '' : String(valor));
    }
    nodo.append(...hijos.flat().filter((hijo) => hijo !== null && hijo !== undefined));
    return nodo;
  };
}

/**
 * Contrato del ADR-006 §7 para un componente que se anima cuando aparece su fragmento:
 * anima una vez al hacerse visible; si se oculta, se detiene y volverá a animar al reaparecer.
 * `detener` debe dejar el estado final (el dibujo sin animar ya es el estado final).
 * @param {HTMLElement} elemento
 * @param {{ animar: () => void, detener: () => void }} acciones
 * @returns {{ activar(): void, desactivar(): void, paso(): void, saltarAlFinal(): void }}
 */
export function alRevelarse(elemento, { animar, detener }) {
  let animado = false;
  const visible = () => elemento.closest('[data-fragment]')?.hasAttribute('data-visible') ?? true;
  return {
    activar() {
      animado = false;
    },
    desactivar() {
      detener();
      animado = false;
    },
    paso() {
      if (!visible()) {
        detener();
        animado = false;
      } else if (!animado) {
        animado = true;
        animar();
      }
    },
    saltarAlFinal() {
      detener();
      animado = visible();
    },
  };
}

/**
 * Hace que un elemento que no es <button> se comporte como uno: foco con Tab, Enter y Espacio
 * lo activan, y su clic no avanza la lámina (ADR-006 §5; keyboard.js trata role=button como
 * botón).
 * @param {HTMLElement} nodo
 * @param {string} etiqueta texto de ayuda (title)
 * @param {() => void} accion
 */
export function hacerBoton(nodo, etiqueta, accion) {
  nodo.setAttribute('role', 'button');
  nodo.setAttribute('tabindex', '0');
  nodo.setAttribute('title', etiqueta);
  nodo.dataset.interactivo = '';
  nodo.addEventListener('click', accion);
  nodo.addEventListener('keydown', (evento) => {
    if (evento.key !== 'Enter' && evento.key !== ' ') return;
    evento.preventDefault();
    accion();
  });
}

/**
 * Clic en el elemento n: lo amplía, o lo cierra si ya estaba ampliado.
 * @param {number | null} actual
 * @param {number} n
 * @returns {number | null}
 */
export function alternarAmpliada(actual, n) {
  return actual === n ? null : n;
}
