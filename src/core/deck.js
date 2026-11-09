/**
 * Deck: estado de la presentación y vista de las láminas (RF-01, RF-03, RF-05 y ADR-006).
 *
 * Parte pura: reglas de navegación sobre la «estructura», un arreglo con los pasos y el tipo
 * de cada lámina (la lámina n está en estructura[n - 1]).
 * Parte de vista: crea una sección por lámina, muestra la actual, revela fragmentos y emite
 * los eventos slidechange y fragment.
 */

/**
 * @typedef {{ lamina: number, fragmento: number }} Estado
 * @typedef {{ pasos: number, reserva: boolean }} InfoLamina
 */

// ── Lógica pura ──────────────────────────────────────────────────────────────

/**
 * Lámina principal más cercana en una dirección, saltando las de reserva.
 * @param {number} lamina
 * @param {InfoLamina[]} estructura
 * @param {1 | -1} direccion
 * @returns {number | null} null si no hay más láminas principales en esa dirección
 */
export function vecinaPrincipal(lamina, estructura, direccion) {
  for (let n = lamina + direccion; n >= 1 && n <= estructura.length; n += direccion) {
    if (!estructura[n - 1].reserva) return n;
  }
  return null;
}

/**
 * Avanzar: revela el próximo fragmento o pasa a la siguiente lámina principal (paso 0).
 * En una lámina de reserva solo revela fragmentos: a la reserva se entra y se sale por número.
 * @param {Estado} estado
 * @param {InfoLamina[]} estructura
 * @returns {Estado}
 */
export function siguienteEstado(estado, estructura) {
  const { lamina, fragmento } = estado;
  const actual = estructura[lamina - 1];
  if (fragmento < actual.pasos) return { lamina, fragmento: fragmento + 1 };
  if (actual.reserva) return estado;
  const destino = vecinaPrincipal(lamina, estructura, 1);
  return destino === null ? estado : { lamina: destino, fragmento: 0 };
}

/**
 * Retroceder: oculta el último fragmento o vuelve a la lámina principal anterior en su
 * estado final (todos sus fragmentos visibles).
 * @param {Estado} estado
 * @param {InfoLamina[]} estructura
 * @returns {Estado}
 */
export function anteriorEstado(estado, estructura) {
  const { lamina, fragmento } = estado;
  if (fragmento > 0) return { lamina, fragmento: fragmento - 1 };
  if (estructura[lamina - 1].reserva) return estado;
  const destino = vecinaPrincipal(lamina, estructura, -1);
  return destino === null ? estado : { lamina: destino, fragmento: estructura[destino - 1].pasos };
}

/**
 * Ir a una lámina por número (G + número, hash o vista general), en el paso 0.
 * Es la única forma de llegar a las láminas de reserva.
 * @param {number} n
 * @param {InfoLamina[]} estructura
 * @returns {Estado | null} null si n no es una lámina válida
 */
export function irAEstado(n, estructura) {
  return Number.isInteger(n) && n >= 1 && n <= estructura.length
    ? { lamina: n, fragmento: 0 }
    : null;
}

const esValorDeFragmento = (valor) => {
  const numero = Number(valor);
  return valor !== '' && Number.isInteger(numero) && numero >= 1;
};

/**
 * Pasos de una lámina a partir de sus atributos data-fragment: los valores válidos
 * (enteros ≥ 1), sin repetir y en orden. Elementos con el mismo número aparecen juntos.
 * @param {string[]} valores
 * @returns {number[]} por ejemplo ['2', '1', '2'] → [1, 2]
 */
export function gruposDeFragmentos(valores) {
  const numeros = valores.filter(esValorDeFragmento).map(Number);
  return [...new Set(numeros)].sort((a, b) => a - b);
}

/**
 * ¿Se ve el elemento data-fragment="valor" cuando la lámina va en el paso `fragmento`?
 * Un valor no válido se muestra siempre, para que un error de marcado no oculte contenido.
 * @param {string} valor
 * @param {number} fragmento paso actual (0 = ningún fragmento visible)
 * @param {number[]} grupos resultado de gruposDeFragmentos
 * @returns {boolean}
 */
export function esFragmentoVisible(valor, fragmento, grupos) {
  if (!esValorDeFragmento(valor)) return true;
  if (fragmento <= 0 || grupos.length === 0) return false;
  return Number(valor) <= grupos[Math.min(fragmento, grupos.length) - 1];
}

/**
 * Qué métodos de los componentes hay que llamar en un cambio de estado (ADR-006 §7):
 * al salir de una lámina, desactivar los suyos; al entrar, activar los de la nueva y pasarles
 * el paso actual, salvo si se llega con «anterior», que deja la lámina en su estado final.
 * @param {Estado | null} previo
 * @param {Estado} nuevo
 * @param {'inicio' | 'secuencia' | 'salto'} origen
 * @returns {{ lamina: number, metodo: 'activar' | 'desactivar' | 'paso' | 'saltarAlFinal',
 *   argumento?: number }[]}
 */
export function llamadasAComponentes(previo, nuevo, origen) {
  const { lamina, fragmento } = nuevo;
  if (previo?.lamina === lamina) return [{ lamina, metodo: 'paso', argumento: fragmento }];
  const vuelveAtras = origen === 'secuencia' && previo !== null && lamina < previo.lamina;
  return [
    ...(previo ? [{ lamina: previo.lamina, metodo: 'desactivar' }] : []),
    { lamina, metodo: 'activar' },
    vuelveAtras
      ? { lamina, metodo: 'saltarAlFinal' }
      : { lamina, metodo: 'paso', argumento: fragmento },
  ];
}

// ── Vista ────────────────────────────────────────────────────────────────────

/**
 * Crea el deck dentro del escenario: una sección por lámina, en el orden de slides.json.
 * @param {object} opciones
 * @param {HTMLElement} opciones.escenario
 * @param {object[]} opciones.laminas entradas de data/slides.json
 * @param {Record<string, string>} [opciones.plantillas] HTML de src/slides/ por nombre de archivo
 * @param {object} [opciones.datos] todos los data/*.json por nombre, para los componentes
 * @param {Record<string, { crear: Function }>} [opciones.componentes] módulos de src/components/
 *   por el nombre que usan las láminas en data-componente
 * @returns {EventTarget & object} el deck (ver ADR-006 para su interfaz)
 */
export function crearDeck({ escenario, laminas, plantillas = {}, datos = {}, componentes = {} }) {
  const documento = escenario.ownerDocument;
  const vistas = laminas.map((info, indice) =>
    crearVista(documento, info, indice + 1, plantillas[info.archivo]),
  );
  const estructura = vistas.map((vista) => ({
    pasos: vista.grupos.length,
    reserva: Boolean(vista.info.reserva),
  }));
  escenario.append(...vistas.map((vista) => vista.seccion));
  escenario.dataset.modo = 'normal';
  // Los componentes se crean con las láminas ya en el documento, para que lean los tokens.
  vistas.forEach((vista, indice) => {
    vista.componentes = montarComponentes(vista.seccion, indice + 1, datos, componentes);
  });
  const llamar = (lamina, metodo, argumento) => {
    for (const componente of vistas[lamina - 1].componentes) componente[metodo]?.(argumento);
  };

  const deck = new EventTarget();
  let estado = null;
  let modo = 'normal';
  let negro = false;

  const emitir = (tipo, detalle) => deck.dispatchEvent(new CustomEvent(tipo, { detail: detalle }));

  // Muestra la lámina actual y sus fragmentos. Al llegar a una lámina que estaba oculta
  // (display: none), el navegador no anima: aparece directamente en el paso que corresponde.
  function pintar() {
    const vista = vistas[estado.lamina - 1];
    for (const otra of vistas) otra.seccion.toggleAttribute('data-actual', otra === vista);
    for (const elemento of vista.fragmentos) {
      const visible = esFragmentoVisible(elemento.dataset.fragment, estado.fragmento, vista.grupos);
      elemento.toggleAttribute('data-visible', visible);
    }
  }

  function cambiar(nuevo, origen) {
    const previo = estado;
    if (!nuevo || (previo?.lamina === nuevo.lamina && previo?.fragmento === nuevo.fragmento)) {
      return;
    }
    estado = nuevo;
    pintar();
    for (const llamada of llamadasAComponentes(previo, estado, origen)) {
      // Llegar con «anterior» es como pulsar S: también termina las transiciones CSS que el
      // navegador empiece al mostrar la lámina (por ejemplo, las de @starting-style).
      if (llamada.metodo === 'saltarAlFinal') saltarAlFinal();
      else llamar(llamada.lamina, llamada.metodo, llamada.argumento);
    }
    const { lamina, fragmento } = estado;
    const pasos = estructura[lamina - 1].pasos;
    if (previo?.lamina !== lamina) {
      const info = { ...vistas[lamina - 1].info };
      emitir('slidechange', {
        lamina,
        anterior: previo?.lamina ?? null,
        fragmento,
        pasos,
        origen,
        info,
      });
    } else {
      const direccion = fragmento > previo.fragmento ? 'adelante' : 'atras';
      emitir('fragment', { lamina, fragmento, pasos, direccion });
    }
  }

  function alternarNegro() {
    negro = !negro;
    documento.body.toggleAttribute('data-negro', negro);
  }

  // Con la pantalla en negro, la primera tecla de navegación solo quita el negro.
  function quitarNegro() {
    if (!negro) return false;
    alternarNegro();
    return true;
  }

  function moverEnVistaGeneral(direccion) {
    const destino = vecinaPrincipal(estado.lamina, estructura, direccion);
    if (destino !== null) cambiar({ lamina: destino, fragmento: 0 }, 'salto');
  }

  function siguiente() {
    if (quitarNegro()) return;
    if (modo === 'vista-general') moverEnVistaGeneral(1);
    else cambiar(siguienteEstado(estado, estructura), 'secuencia');
  }

  function anterior() {
    if (quitarNegro()) return;
    if (modo === 'vista-general') moverEnVistaGeneral(-1);
    else cambiar(anteriorEstado(estado, estructura), 'secuencia');
  }

  function irA(n) {
    quitarNegro();
    cambiar(irAEstado(n, estructura), 'salto');
  }

  function alternarVistaGeneral() {
    modo = modo === 'normal' ? 'vista-general' : 'normal';
    escenario.dataset.modo = modo;
  }

  function cerrarVistaGeneral() {
    if (modo === 'vista-general') alternarVistaGeneral();
  }

  // Tecla S: los componentes de la lámina actual pasan a su estado final, y las animaciones CSS
  // y Web Animations que queden se terminan.
  function saltarAlFinal() {
    if (!estado) return;
    llamar(estado.lamina, 'saltarAlFinal');
    for (const animacion of vistas[estado.lamina - 1].seccion.getAnimations({ subtree: true })) {
      if (animacion.effect?.getComputedTiming().iterations === Infinity) continue;
      try {
        animacion.finish();
      } catch {
        // Una animación sin estado final alcanzable se deja como está.
      }
    }
  }

  function iniciar(n = 1) {
    cambiar(irAEstado(n, estructura) ?? { lamina: 1, fragmento: 0 }, 'inicio');
  }

  // En la vista general, el clic elige una lámina y no llega al teclado (no avanza).
  escenario.addEventListener('click', (evento) => {
    if (modo !== 'vista-general') return;
    evento.stopPropagation();
    const seccion = evento.target.closest?.('.lamina:not([data-reserva])');
    if (!seccion) return;
    cerrarVistaGeneral();
    irA(Number(seccion.dataset.lamina));
  });

  Object.defineProperties(deck, {
    total: { value: vistas.length },
    estado: { get: () => estado && { ...estado } },
    modo: { get: () => modo },
    negro: { get: () => negro },
  });
  return Object.assign(deck, {
    iniciar,
    siguiente,
    anterior,
    irA,
    saltarAlFinal,
    alternarVistaGeneral,
    cerrarVistaGeneral,
    alternarNegro,
  });
}

function crearVista(documento, info, numero, html) {
  const seccion = documento.createElement('section');
  seccion.className = 'lamina';
  seccion.dataset.lamina = String(numero);
  if (info.reserva) seccion.dataset.reserva = '';
  seccion.setAttribute('aria-label', `Lámina ${numero}: ${info.titulo}`);

  if (typeof html === 'string') seccion.innerHTML = html;
  else seccion.append(crearProvisional(documento, numero, info.titulo));

  const fragmentos = [...seccion.querySelectorAll('[data-fragment]')];
  const valores = fragmentos.map((elemento) => elemento.dataset.fragment);
  for (const valor of valores.filter((v) => !esValorDeFragmento(v))) {
    console.warn(
      `Lámina ${numero}: data-fragment="${valor}" no es un entero ≥ 1; se muestra siempre.`,
    );
  }
  return { info, seccion, fragmentos, grupos: gruposDeFragmentos(valores) };
}

// Crea los componentes de una lámina: cada elemento data-componente="nombre" recibe
// componentes[nombre].crear(elemento, datos). Uno que falte o falle se avisa y no detiene al resto.
function montarComponentes(seccion, numero, datos, componentes) {
  return [...seccion.querySelectorAll('[data-componente]')].flatMap((elemento) => {
    const nombre = elemento.dataset.componente;
    const modulo = componentes[nombre];
    if (!modulo) {
      console.warn(`Lámina ${numero}: no hay un componente «${nombre}».`);
      return [];
    }
    try {
      return [modulo.crear(elemento, datos)];
    } catch (error) {
      console.warn(`Lámina ${numero}: el componente «${nombre}» falló al crearse.`, error);
      return [];
    }
  });
}

// Lámina sin archivo en src/slides/: solo número y título (tarea 1.3).
function crearProvisional(documento, numero, titulo) {
  const contenedor = documento.createElement('div');
  contenedor.className = 'lamina-provisional';
  const etiquetaNumero = documento.createElement('p');
  etiquetaNumero.className = 'lamina-provisional__numero';
  etiquetaNumero.textContent = String(numero);
  const etiquetaTitulo = documento.createElement('h2');
  etiquetaTitulo.className = 'lamina-provisional__titulo';
  etiquetaTitulo.textContent = titulo;
  contenedor.append(etiquetaNumero, etiquetaTitulo);
  return contenedor;
}
