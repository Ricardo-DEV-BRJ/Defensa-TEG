/**
 * dedup-sim: simulador de corte de luz y ventas duplicadas (lámina 14).
 *
 * Regla (data/arquitectura.json → deduplicacion; TEG 6.4.2 y 6.4.4.2): dos ventas con igual
 * cliente, productos, cantidades y monto registradas en menos de intervalo_sugerido_segundos
 * (60 s, valor de demostración) son un posible duplicado. La segunda queda con el despacho
 * bloqueado y solo el rol rol_que_anula (Administración) puede anularla.
 *
 * Uso en una lámina: <div class="simulador" data-componente="dedup-sim"></div>
 * Vista: «Simular corte de luz» → la caja emite dos ventas iguales que quedan en cola →
 * «Volver la luz» → el pipeline las importa en orden, marca la duplicada en rojo y bloquea su
 * despacho → se elige un rol y se intenta anularla.
 *
 * Parte pura (tests/dedup-sim.test.js): claveVenta, esPosibleDuplicado, importarVentas,
 * puedeAnular, anularVenta, puedeDespachar, ventasDelCorte, estadoInicial, simular y
 * calcularTiempos. Parte de vista: crear (contrato del ADR-006 §7).
 */
import { formatear } from '../core/datos.js';
import { fabricaDeElementos, leerDuraciones, movimientoReducido } from './comun.js';

// ── Lógica pura ──────────────────────────────────────────────────────────────

const normalizar = (texto) => String(texto).trim().toLowerCase();

/**
 * Lo que debe coincidir para que dos ventas sean «iguales»: cliente, productos con sus
 * cantidades (sin importar el orden de las líneas) y monto en centavos.
 * @param {{ cliente: string, productos: { producto: string, cantidad: number }[],
 *   monto: number }} venta
 * @returns {string}
 */
export function claveVenta({ cliente, productos, monto }) {
  const lineas = productos.map(({ producto, cantidad }) => `${normalizar(producto)}×${cantidad}`);
  return [normalizar(cliente), lineas.sort().join(';'), Math.round(monto * 100)].join('|');
}

/**
 * ¿`venta` repite a `previa` dentro del intervalo? El intervalo es estricto: «en menos de».
 * @param {{ segundo: number }} previa
 * @param {{ segundo: number }} venta
 * @param {number} intervaloSegundos
 * @returns {boolean}
 */
export function esPosibleDuplicado(previa, venta, intervaloSegundos) {
  return (
    claveVenta(previa) === claveVenta(venta) &&
    Math.abs(venta.segundo - previa.segundo) < intervaloSegundos
  );
}

/**
 * Importa las ventas en el orden en que se registraron (etapa de deduplicación del pipeline).
 * Una venta que repite a otra ya importada queda como «duplicado» y con el despacho bloqueado;
 * duplicadoDe apunta a la primera venta de la serie.
 * @param {object[]} ventas cada una con id y segundo (instante de registro, en s)
 * @param {number} intervaloSegundos
 * @returns {object[]} las ventas con estado ('valida' | 'duplicado'), duplicadoDe y despacho
 *   ('liberado' | 'bloqueado')
 */
export function importarVentas(ventas, intervaloSegundos) {
  if (!Number.isFinite(intervaloSegundos) || intervaloSegundos <= 0) {
    throw new Error('el intervalo de deduplicación debe ser un número de segundos mayor que 0');
  }
  const enOrden = [...ventas].sort((a, b) => a.segundo - b.segundo); // sort es estable
  const importadas = [];
  for (const venta of enOrden) {
    const previa = importadas.find((otra) => esPosibleDuplicado(otra, venta, intervaloSegundos));
    importadas.push(
      previa
        ? {
            ...venta,
            estado: 'duplicado',
            duplicadoDe: previa.duplicadoDe ?? previa.id,
            despacho: 'bloqueado',
          }
        : { ...venta, estado: 'valida', duplicadoDe: null, despacho: 'liberado' },
    );
  }
  return importadas;
}

/**
 * @param {string} rol
 * @param {string} rolQueAnula
 * @returns {boolean}
 */
export function puedeAnular(rol, rolQueAnula) {
  return rol === rolQueAnula;
}

/**
 * Intenta anular una venta marcada como duplicado.
 * @param {object[]} ventas resultado de importarVentas
 * @param {string} id
 * @param {string} rol rol de quien lo intenta
 * @param {string} rolQueAnula único rol autorizado
 * @returns {{ ok: boolean, motivo: null | 'no-existe' | 'no-es-duplicado' | 'sin-permiso',
 *   ventas: object[] }} ventas sin cambios si no se pudo
 */
export function anularVenta(ventas, id, rol, rolQueAnula) {
  const venta = ventas.find((otra) => otra.id === id);
  if (!venta) return { ok: false, motivo: 'no-existe', ventas };
  if (venta.estado !== 'duplicado') return { ok: false, motivo: 'no-es-duplicado', ventas };
  if (!puedeAnular(rol, rolQueAnula)) return { ok: false, motivo: 'sin-permiso', ventas };
  const anulada = { ...venta, estado: 'anulada', despacho: 'cancelado', anuladaPor: rol };
  return {
    ok: true,
    motivo: null,
    ventas: ventas.map((otra) => (otra.id === id ? anulada : otra)),
  };
}

/**
 * @param {{ despacho: string }} venta
 * @returns {boolean} solo una venta liberada sale del almacén
 */
export function puedeDespachar(venta) {
  return venta.despacho === 'liberado';
}

/**
 * Las dos ventas iguales que emite la caja durante el corte de luz.
 * @param {{ cliente: string, productos: object[], monto_usd: number,
 *   segundos_entre_ventas: number }} ejemplo arquitectura.deduplicacion.ejemplo_demo
 * @returns {object[]}
 */
export function ventasDelCorte({ cliente, productos, monto_usd: monto, segundos_entre_ventas }) {
  const venta = (id, segundo) => ({
    id,
    segundo,
    cliente,
    productos: productos.map((linea) => ({ ...linea })),
    monto,
  });
  return [venta('V-001', 0), venta('V-002', segundos_entre_ventas)];
}

/** @returns {{ fase: 'con-luz' | 'sin-luz' | 'importado', caja: object[],
 *   importadas: object[], resultado: object | null }} */
export function estadoInicial() {
  return { fase: 'con-luz', caja: [], importadas: [], resultado: null };
}

/**
 * Paso de la simulación. Una acción fuera de su fase no cambia nada.
 * @param {ReturnType<typeof estadoInicial>} estado
 * @param {{ tipo: 'cortar-luz' | 'volver-luz' | 'anular' | 'reiniciar', id?: string,
 *   rol?: string }} accion
 * @param {{ ejemplo: object, intervaloSegundos: number, rolQueAnula: string }} config
 */
export function simular(estado, accion, config) {
  switch (accion.tipo) {
    case 'cortar-luz':
      if (estado.fase !== 'con-luz') return estado;
      return { ...estadoInicial(), fase: 'sin-luz', caja: ventasDelCorte(config.ejemplo) };
    case 'volver-luz':
      if (estado.fase !== 'sin-luz') return estado;
      return {
        ...estado,
        fase: 'importado',
        importadas: importarVentas(estado.caja, config.intervaloSegundos),
      };
    case 'anular': {
      if (estado.fase !== 'importado') return estado;
      const { ok, motivo, ventas } = anularVenta(
        estado.importadas,
        accion.id,
        accion.rol,
        config.rolQueAnula,
      );
      return {
        ...estado,
        importadas: ventas,
        resultado: { ok, motivo, id: accion.id, rol: accion.rol },
      };
    }
    case 'reiniciar':
      return estadoInicial();
    default:
      return estado;
  }
}

/**
 * Tiempos de la fila i al importar: aparece en el pipeline y luego en el despacho.
 * Con 2 filas y los tokens actuales (250 y 300 ms) todo termina en 1,1 s (máximo 1,5 s).
 * @param {number} indice
 * @param {{ retardo: number, paso: number }} duraciones en ms
 */
export function calcularTiempos(indice, { retardo, paso }) {
  const inicio = indice * 2 * retardo;
  return {
    pipeline: { retardo: inicio, duracion: paso },
    despacho: { retardo: inicio + paso, duracion: paso },
  };
}

// ── Vista ────────────────────────────────────────────────────────────────────

const TEXTO_DESPACHO = { liberado: 'Liberado', bloqueado: 'Bloqueado', cancelado: 'Anulada' };

/**
 * @param {HTMLElement} elemento contenedor de la lámina
 * @param {object} datos todos los data/*.json por nombre
 */
export function crear(elemento, datos) {
  const documento = elemento.ownerDocument;
  const ventana = documento.defaultView;
  const dedup = datos.arquitectura?.deduplicacion;
  const roles = datos.arquitectura?.modelo?.gobernanza?.roles ?? [];
  const config = {
    ejemplo: dedup?.ejemplo_demo,
    intervaloSegundos: dedup?.intervalo_sugerido_segundos,
    rolQueAnula: dedup?.rol_que_anula,
  };
  const problema = !config.ejemplo
    ? 'falta deduplicacion.ejemplo_demo'
    : !Number.isFinite(config.intervaloSegundos)
      ? 'falta deduplicacion.intervalo_sugerido_segundos'
      : !roles.includes(config.rolQueAnula)
        ? 'rol_que_anula no está en gobernanza.roles'
        : null;
  if (problema) {
    elemento.textContent = `¿arquitectura: ${problema}?`;
    elemento.dataset.datoRoto = '';
    console.warn(`dedup-sim: ${problema}`);
    return { activar() {}, desactivar() {}, paso() {}, saltarAlFinal() {} };
  }

  // Los clics dentro del simulador no avanzan la lámina (ADR-006 §5).
  elemento.dataset.interactivo = '';
  const duraciones = leerDuraciones(ventana.getComputedStyle(elemento));
  const intervalo = formatear(config.intervaloSegundos, 'numero');
  let estado = estadoInicial();
  let rol = roles.includes(config.ejemplo.rol_inicial) ? config.ejemplo.rol_inicial : roles[0];
  let animaciones = [];

  const h = fabricaDeElementos(documento);

  const detalle = (venta) =>
    venta.productos.map(({ producto, cantidad }) => `${cantidad} × ${producto}`).join(' · ');

  function despachar(accion, enfocar) {
    estado = simular(estado, accion, config);
    pintar(accion.tipo);
    elemento.querySelector(`[data-accion="${enfocar}"]`)?.focus();
  }

  function caja() {
    const sinLuz = estado.fase === 'sin-luz';
    return h(
      'section',
      { class: 'panel simulador__etapa' },
      h('p', { class: 'etiqueta' }, 'Caja (punto de venta)'),
      h(
        'p',
        { class: 'simulador__luz', 'data-luz': sinLuz ? 'sin' : 'con' },
        sinLuz ? 'Sin luz: las ventas quedan en cola' : 'Con luz',
      ),
      h(
        'ol',
        { class: 'simulador__lista' },
        estado.caja.map((venta) =>
          h(
            'li',
            { class: 'simulador__ticket', 'data-animar': 'caja' },
            h('strong', {}, `${venta.id} · ${venta.segundo === 0 ? '0' : `+${venta.segundo}`} s`),
            h('span', {}, `${venta.cliente} · ${formatear(venta.monto, 'usd')}`),
            h('span', { class: 'nota' }, detalle(venta)),
          ),
        ),
      ),
    );
  }

  function pipeline() {
    const filas = estado.importadas.map((venta) => {
      const original = estado.importadas.find((otra) => otra.id === venta.duplicadoDe);
      const marcada = venta.estado !== 'valida';
      return h(
        'li',
        {
          class: `simulador__fila simulador__fila--${marcada ? 'duplicado' : 'valida'}`,
          'data-animar': 'pipeline',
        },
        h('strong', {}, venta.id),
        marcada
          ? h(
              'span',
              {},
              h('span', { class: 'texto-alerta' }, `Posible duplicado de ${venta.duplicadoDe}`),
              h(
                'span',
                { class: 'nota simulador__porque' },
                `misma venta ${venta.segundo - original.segundo} s después (menos de ${intervalo} s)`,
              ),
            )
          : h('span', {}, 'Válida'),
      );
    });
    return h(
      'section',
      { class: 'panel simulador__etapa' },
      h('p', { class: 'etiqueta' }, 'Pipeline: deduplicación'),
      filas.length
        ? h('ol', { class: 'simulador__lista' }, filas)
        : h('p', { class: 'nota' }, 'Importa las ventas en orden cuando vuelve la luz.'),
    );
  }

  function despacho() {
    const filas = estado.importadas.map((venta) =>
      h(
        'li',
        {
          class: `simulador__fila simulador__fila--${venta.despacho}`,
          'data-animar': 'despacho',
          'data-id': venta.id,
        },
        h('strong', {}, venta.id),
        h(
          'span',
          {},
          TEXTO_DESPACHO[venta.despacho],
          venta.despacho === 'bloqueado'
            ? h('span', { class: 'nota simulador__porque' }, `espera a ${config.rolQueAnula}`)
            : null,
          venta.despacho === 'cancelado'
            ? h('span', { class: 'nota simulador__porque' }, `por ${venta.anuladaPor}`)
            : null,
        ),
      ),
    );
    return h(
      'section',
      { class: 'panel simulador__etapa' },
      h('p', { class: 'etiqueta' }, 'Despacho'),
      filas.length
        ? h('ol', { class: 'simulador__lista' }, filas)
        : h('p', { class: 'nota' }, 'Solo sale lo que el pipeline libera.'),
    );
  }

  function mensaje() {
    const resultado = estado.resultado;
    if (!resultado) return null;
    const texto = resultado.ok
      ? `${resultado.id} anulada por ${resultado.rol}: no se despacha dos veces.`
      : resultado.motivo === 'sin-permiso'
        ? `${resultado.rol} no puede anularla: solo ${config.rolQueAnula}.`
        : `${resultado.id} ya no está bloqueada.`;
    return h(
      'p',
      { class: `simulador__mensaje${resultado.ok ? '' : ' texto-alerta'}`, role: 'status' },
      texto,
    );
  }

  function controles() {
    const boton = (accion, texto, alHacerClic, secundario = false) =>
      h(
        'button',
        {
          type: 'button',
          class: `boton${secundario ? ' boton--secundario' : ''}`,
          'data-accion': accion,
          onclick: alHacerClic,
        },
        texto,
      );
    if (estado.fase === 'con-luz') {
      return [
        boton('cortar-luz', 'Simular corte de luz', () =>
          despachar({ tipo: 'cortar-luz' }, 'volver-luz'),
        ),
      ];
    }
    if (estado.fase === 'sin-luz') {
      return [
        boton('volver-luz', 'Volver la luz', () => despachar({ tipo: 'volver-luz' }, 'anular')),
      ];
    }
    const bloqueada = estado.importadas.find((venta) => venta.despacho === 'bloqueado');
    return [
      bloqueada
        ? h(
            'label',
            { class: 'simulador__rol' },
            'Rol',
            h(
              'select',
              { onchange: (evento) => (rol = evento.target.value) },
              roles.map((nombre) =>
                h('option', { value: nombre, selected: nombre === rol }, nombre),
              ),
            ),
          )
        : null,
      bloqueada
        ? boton('anular', `Anular ${bloqueada.id}`, () =>
            despachar({ tipo: 'anular', id: bloqueada.id, rol }, 'anular'),
          )
        : null,
      boton('reiniciar', 'Reiniciar', () => despachar({ tipo: 'reiniciar' }, 'cortar-luz'), true),
    ];
  }

  function pintar(accion = null) {
    cancelar();
    const regla = h(
      'p',
      { class: 'nota' },
      `Regla: igual cliente, productos, cantidades y monto en menos de ${intervalo} s ` +
        `(valor de demostración) → posible duplicado: se bloquea el despacho y solo ` +
        `${config.rolQueAnula} puede anularla.`,
    );
    const nuevo = mensaje();
    elemento.replaceChildren(
      regla,
      h('div', { class: 'simulador__etapas' }, caja(), pipeline(), despacho()),
      h('div', { class: 'simulador__controles' }, controles(), nuevo),
    );
    animar(accion);
  }

  // Solo se anima lo que acaba de cambiar; el dibujo sin animar ya es el estado final.
  function animar(accion) {
    if (!accion || movimientoReducido(ventana)) return;
    const aparecer = (nodo, retardo, duracion) =>
      animaciones.push(
        nodo.animate(
          [
            { opacity: 0, transform: 'translateY(0.5em)' },
            { opacity: 1, transform: 'none' },
          ],
          {
            duration: duracion,
            delay: retardo,
            easing: 'ease-out',
            fill: 'backwards',
          },
        ),
      );
    if (accion === 'cortar-luz') {
      elemento.querySelectorAll('[data-animar="caja"]').forEach((nodo, i) => {
        aparecer(nodo, i * duraciones.retardo, duraciones.paso);
      });
    }
    if (accion === 'volver-luz') {
      const pipelineFilas = elemento.querySelectorAll('[data-animar="pipeline"]');
      const despachoFilas = elemento.querySelectorAll('[data-animar="despacho"]');
      pipelineFilas.forEach((nodo, i) => {
        const t = calcularTiempos(i, duraciones);
        aparecer(nodo, t.pipeline.retardo, t.pipeline.duracion);
        aparecer(despachoFilas[i], t.despacho.retardo, t.despacho.duracion);
      });
    }
    if (accion === 'anular' && estado.resultado?.ok) {
      const fila = elemento.querySelector(
        `[data-animar="despacho"][data-id="${estado.resultado.id}"]`,
      );
      if (fila) aparecer(fila, 0, duraciones.paso);
    }
    const aviso = elemento.querySelector('.simulador__mensaje');
    if (accion === 'anular' && aviso) aparecer(aviso, 0, duraciones.paso);
  }

  function cancelar() {
    for (const animacion of animaciones) animacion.cancel();
    animaciones = [];
  }

  function reiniciar() {
    if (elemento.contains(documento.activeElement)) documento.activeElement.blur();
    estado = estadoInicial();
    rol = roles.includes(config.ejemplo.rol_inicial) ? config.ejemplo.rol_inicial : roles[0];
    pintar();
  }

  pintar();
  return {
    // Cada vez que se entra a la lámina, la demostración empieza de cero.
    activar: reiniciar,
    desactivar: reiniciar,
    paso() {},
    saltarAlFinal: cancelar,
  };
}
