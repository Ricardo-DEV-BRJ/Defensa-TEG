// Galería de plantillas (solo desarrollo: http://localhost:5173/galeria.html).
// Reutiliza el motor para recorrer los esqueletos de src/slides/plantillas/ como láminas.
import { crearDeck } from './core/deck.js';
import { iniciarTeclado } from './core/keyboard.js';
import { iniciarRouter, leerHash } from './core/router.js';
import { iniciarEscalado } from './core/scaler.js';

const PLANTILLAS = [
  ['portada.html', 'Portada'],
  ['titulo-contenido.html', 'Título + contenido'],
  ['dos-columnas.html', 'Dos columnas'],
  ['cifra-grande.html', 'Cifra grande'],
  ['diagrama.html', 'Diagrama'],
];

const archivos = import.meta.glob('./slides/plantillas/*.html', {
  query: '?raw',
  import: 'default',
  eager: true,
});
const plantillas = Object.fromEntries(
  Object.entries(archivos).map(([ruta, html]) => [ruta.split('/').pop(), html]),
);
const laminas = PLANTILLAS.map(([archivo, titulo], indice) => ({
  id: indice + 1,
  archivo,
  titulo,
  reserva: false,
}));

const escenario = document.querySelector('.escenario');
const deck = crearDeck({ escenario, laminas, plantillas });

iniciarEscalado(escenario);
iniciarRouter(deck);
iniciarTeclado(
  {
    siguiente: () => deck.siguiente(),
    anterior: () => deck.anterior(),
    irA: (n) => deck.irA(n),
    vistaGeneral: () => deck.alternarVistaGeneral(),
    cerrar: () => deck.cerrarVistaGeneral(),
    saltarAnimacion: () => deck.saltarAlFinal(),
  },
  { escenario, maxDigitos: String(deck.total).length },
);
deck.iniciar(leerHash(window.location.hash, deck.total) ?? 1);

if (new URLSearchParams(window.location.search).has('guias')) {
  escenario.dataset.guias = '';
}
