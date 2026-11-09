// Punto de entrada de la vista del proyector (index.html): el único lugar donde se conectan
// los módulos del motor (ADR-006).
import { crearDeck } from './core/deck.js';
import { rellenarDatos } from './core/datos.js';
import { iniciarTeclado } from './core/keyboard.js';
import { iniciarRouter, leerHash } from './core/router.js';
import { iniciarEscalado } from './core/scaler.js';
import * as barChart from './components/bar-chart.js';
import * as counter from './components/counter.js';
import * as dataFlow from './components/data-flow.js';
import * as dedupSim from './components/dedup-sim.js';
import * as gantt from './components/gantt.js';
import * as levelMeter from './components/level-meter.js';
import * as stockCalc from './components/stock-calc.js';

// Todo data/*.json y el HTML de cada lámina entran al bundle para no usar fetch (ADR-006 §8).
// Claves: nombre del archivo sin extensión (datos) y nombre con extensión (plantillas).
const porNombre = (archivos, quitarExtension) =>
  Object.fromEntries(
    Object.entries(archivos).map(([ruta, contenido]) => {
      const nombre = ruta.split('/').pop();
      return [quitarExtension ? nombre.replace(/\.json$/, '') : nombre, contenido];
    }),
  );
const datos = porNombre(
  import.meta.glob('../data/*.json', { import: 'default', eager: true }),
  true,
);
const plantillas = porNombre(
  import.meta.glob('./slides/*.html', { query: '?raw', import: 'default', eager: true }),
  false,
);

// Componentes interactivos por el nombre que usan las láminas en data-componente (ADR-006 §7).
const componentes = {
  'bar-chart': barChart,
  counter,
  'data-flow': dataFlow,
  'dedup-sim': dedupSim,
  gantt,
  'level-meter': levelMeter,
  'stock-calc': stockCalc,
};

const escenario = document.querySelector('.escenario');
const deck = crearDeck({
  escenario,
  laminas: datos.slides.laminas,
  plantillas,
  datos,
  componentes,
});

// Cifras y textos del TEG desde data/*.json (data-dato="archivo.ruta").
for (const ruta of rellenarDatos(escenario, datos)) {
  console.warn(`Dato no encontrado o con formato inválido: data-dato="${ruta}"`);
}

iniciarEscalado(escenario);
iniciarRouter(deck);
iniciarTeclado(
  {
    siguiente: () => deck.siguiente(),
    anterior: () => deck.anterior(),
    irA: (n) => deck.irA(n),
    vistaGeneral: () => deck.alternarVistaGeneral(),
    cerrar: () => deck.cerrarVistaGeneral(),
    pantallaNegra: () => deck.alternarNegro(),
    saltarAnimacion: () => deck.saltarAlFinal(),
    pantallaCompleta: alternarPantallaCompleta,
    // abrirPresentador (P) y reiniciarCronometro (T) llegan en la Fase 5.
  },
  // G + número acepta tantas cifras como tenga el total de láminas (20 → 2).
  { escenario, maxDigitos: String(deck.total).length },
);

// La lámina inicial sale del hash para que recargar conserve la posición (RF-04).
// El router ya escucha, así que el primer slidechange escribe #/n en la dirección.
deck.iniciar(leerHash(window.location.hash, deck.total) ?? 1);

// Imprimir o guardar como PDF (Ctrl+P, RF-10): todas las láminas principales en su estado final
// (print.css las pone una por página); al cerrar el diálogo, todo vuelve a como estaba.
window.addEventListener('beforeprint', () => deck.prepararImpresion());
window.addEventListener('afterprint', () => deck.terminarImpresion());

// ?guias en la dirección dibuja el margen seguro del 5 % para revisar las láminas.
if (new URLSearchParams(window.location.search).has('guias')) {
  escenario.dataset.guias = '';
}

function alternarPantallaCompleta() {
  const promesa = document.fullscreenElement
    ? document.exitFullscreen()
    : document.documentElement.requestFullscreen();
  // El navegador puede negarla (por ejemplo, dentro de un iframe): no es un error del motor.
  promesa.catch(() => {});
}
