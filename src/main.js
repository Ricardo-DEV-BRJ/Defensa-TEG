// Punto de entrada de la vista del proyector (index.html): el único lugar donde se conectan
// los módulos del motor (ADR-006).
import slides from '../data/slides.json';
import { crearDeck } from './core/deck.js';
import { iniciarTeclado } from './core/keyboard.js';
import { iniciarRouter, leerHash } from './core/router.js';
import { iniciarEscalado } from './core/scaler.js';

// HTML de cada lámina, incluido en el bundle para no usar fetch (ADR-006 §8).
// Clave: nombre del archivo, como en el campo «archivo» de slides.json.
const archivos = import.meta.glob('./slides/*.html', {
  query: '?raw',
  import: 'default',
  eager: true,
});
const plantillas = Object.fromEntries(
  Object.entries(archivos).map(([ruta, html]) => [ruta.split('/').pop(), html]),
);

const escenario = document.querySelector('.escenario');
const deck = crearDeck({ escenario, laminas: slides.laminas, plantillas });

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
  { escenario },
);

// La lámina inicial sale del hash para que recargar conserve la posición (RF-04).
// El router ya escucha, así que el primer slidechange escribe #/n en la dirección.
deck.iniciar(leerHash(window.location.hash, deck.total) ?? 1);

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
