/**
 * Panel de controles (ADR-016): botones flotantes abajo al centro del escenario para usar la
 * presentación con el ratón: lámina anterior, contador, lámina siguiente, mapa de láminas (la
 * vista general, tecla O) y pantalla completa (tecla F).
 *
 * Aparece al mover el ratón y se oculta, junto con el puntero, cuando el ratón queda quieto
 * --controles-espera; no se oculta mientras el cursor está encima o un botón tiene el foco. Las
 * teclas no lo muestran: con el presentador inalámbrico nunca aparece. No se imprime.
 *
 * Parte pura (tests/controles.test.js): debeOcultar y textoContador. Parte de vista:
 * iniciarControles.
 */
import { aMilisegundos } from '../components/comun.js';

// ── Lógica pura ──────────────────────────────────────────────────────────────

/**
 * ¿Se oculta el panel? Solo si el ratón lleva quieto al menos «espera» y el panel no está en uso.
 * @param {{ inactivoMs: number, espera: number, sobrePanel?: boolean, conFoco?: boolean }} estado
 * @returns {boolean}
 */
export function debeOcultar({ inactivoMs, espera, sobrePanel = false, conFoco = false }) {
  return inactivoMs >= espera && !sobrePanel && !conFoco;
}

/**
 * Texto del contador: «8 / 17» en las principales; las de reserva no cuentan en el total.
 * @param {number} lamina
 * @param {number} principales cantidad de láminas principales
 * @returns {string}
 */
export function textoContador(lamina, principales) {
  return lamina > principales ? `${lamina} · reserva` : `${lamina} / ${principales}`;
}

// ── Vista ────────────────────────────────────────────────────────────────────

const SVG = 'http://www.w3.org/2000/svg';

// Íconos de trazo en una cuadrícula de 24 × 24 (sin fuentes de íconos ni recursos externos).
const ICONOS = {
  anterior: ['M15 5 8 12l7 7'],
  siguiente: ['m9 5 7 7-7 7'],
  mapa: ['M4 4h7v7H4z', 'M13 4h7v7h-7z', 'M4 13h7v7H4z', 'M13 13h7v7h-7z'],
  ampliar: ['M4 9V4h5', 'M20 9V4h-5', 'M4 15v5h5', 'M20 15v5h-5'],
  reducir: ['M9 4v5H4', 'M15 4v5h5', 'M9 20v-5H4', 'M15 20v-5h5'],
};

function icono(documento, nombre) {
  const svg = documento.createElementNS(SVG, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('class', 'controles__icono');
  for (const trazo of ICONOS[nombre]) {
    const camino = documento.createElementNS(SVG, 'path');
    camino.setAttribute('d', trazo);
    svg.append(camino);
  }
  return svg;
}

/**
 * Crea el panel dentro del escenario.
 * @param {HTMLElement} escenario
 * @param {object} opciones
 * @param {EventTarget} opciones.deck emite slidechange
 * @param {number} opciones.principales cantidad de láminas principales (para el contador)
 * @param {{ anterior(): void, siguiente(): void, vistaGeneral(): void,
 *   pantallaCompleta(): void }} opciones.acciones
 * @param {Window} [opciones.ventana]
 */
export function iniciarControles(escenario, { deck, principales, acciones, ventana = window }) {
  const documento = escenario.ownerDocument;
  const espera = aMilisegundos(
    ventana.getComputedStyle(escenario).getPropertyValue('--controles-espera'),
    2500,
  );

  const panel = documento.createElement('nav');
  panel.className = 'controles';
  panel.setAttribute('aria-label', 'Controles de la presentación');

  const boton = (nombre, etiqueta, accion) => {
    const nodo = documento.createElement('button');
    nodo.type = 'button';
    nodo.className = 'controles__boton';
    nodo.title = etiqueta;
    nodo.setAttribute('aria-label', etiqueta);
    nodo.append(icono(documento, nombre));
    nodo.addEventListener('click', (evento) => {
      accion();
      // Con el ratón, el foco vuelve al documento: Espacio y las flechas siguen siendo del deck.
      if (evento.detail > 0) nodo.blur();
    });
    return nodo;
  };

  const contador = documento.createElement('span');
  contador.className = 'controles__contador';
  contador.setAttribute('aria-live', 'polite');
  const mapa = boton('mapa', 'Mapa de láminas (O)', () => acciones.vistaGeneral());
  const completa = boton('ampliar', 'Pantalla completa (F)', () => acciones.pantallaCompleta());
  panel.append(
    boton('anterior', 'Lámina anterior (←)', () => acciones.anterior()),
    contador,
    boton('siguiente', 'Lámina siguiente (→)', () => acciones.siguiente()),
    mapa,
    completa,
  );
  escenario.append(panel);

  // Estado de los botones: contador, mapa abierto y pantalla completa.
  deck.addEventListener('slidechange', (evento) => {
    contador.textContent = textoContador(evento.detail.lamina, principales);
  });
  const pintarMapa = () =>
    mapa.setAttribute('aria-pressed', String(escenario.dataset.modo === 'vista-general'));
  new ventana.MutationObserver(pintarMapa).observe(escenario, {
    attributes: true,
    attributeFilter: ['data-modo'],
  });
  pintarMapa();
  const pintarCompleta = () => {
    const activa = Boolean(documento.fullscreenElement);
    const etiqueta = activa ? 'Salir de pantalla completa (F)' : 'Pantalla completa (F)';
    completa.replaceChildren(icono(documento, activa ? 'reducir' : 'ampliar'));
    completa.title = etiqueta;
    completa.setAttribute('aria-label', etiqueta);
  };
  documento.addEventListener('fullscreenchange', pintarCompleta);

  // Aparecer con el ratón; ocultarse (con el puntero) cuando queda quieto.
  let ultimoMovimiento = 0;
  let sobrePanel = false;
  let temporizador = 0;

  function ocultarSiCorresponde() {
    const estado = {
      inactivoMs: ventana.performance.now() - ultimoMovimiento,
      espera,
      sobrePanel,
      conFoco: panel.contains(documento.activeElement),
    };
    if (debeOcultar(estado)) {
      panel.removeAttribute('data-visible');
      documento.body.setAttribute('data-cursor-oculto', '');
    } else {
      temporizador = ventana.setTimeout(ocultarSiCorresponde, espera);
    }
  }

  function mostrar() {
    ultimoMovimiento = ventana.performance.now();
    panel.setAttribute('data-visible', '');
    documento.body.removeAttribute('data-cursor-oculto');
    ventana.clearTimeout(temporizador);
    temporizador = ventana.setTimeout(ocultarSiCorresponde, espera);
  }

  documento.addEventListener('pointermove', mostrar);
  documento.addEventListener('pointerdown', mostrar);
  panel.addEventListener('pointerenter', () => (sobrePanel = true));
  panel.addEventListener('pointerleave', () => (sobrePanel = false));
  // Quien llega con Tab al panel también lo ve.
  panel.addEventListener('focusin', mostrar);
  panel.addEventListener('focusout', mostrar);
}
