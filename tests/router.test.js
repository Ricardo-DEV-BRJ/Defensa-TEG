import { describe, expect, it, vi } from 'vitest';
import { escribirHash, iniciarRouter, leerHash } from '../src/core/router.js';

const TOTAL = 20;

describe('leerHash', () => {
  it.each([
    ['#/1', 1],
    ['#/7', 7],
    ['#/20', 20],
    ['#/07', 7],
  ])('%s → %i', (hash, esperado) => {
    expect(leerHash(hash, TOTAL)).toBe(esperado);
  });

  it.each([
    '#/0',
    '#/21',
    '#/-1',
    '#/1.5',
    '#/abc',
    '#/',
    '#7',
    '#/7/',
    ' #/7',
    '',
    undefined,
    null,
  ])('%s → null', (hash) => {
    expect(leerHash(hash, TOTAL)).toBeNull();
  });
});

describe('escribirHash', () => {
  it('escribe #/n', () => {
    expect(escribirHash(7)).toBe('#/7');
  });

  it('ida y vuelta con leerHash en las 20 láminas', () => {
    for (let lamina = 1; lamina <= TOTAL; lamina++) {
      expect(leerHash(escribirHash(lamina), TOTAL)).toBe(lamina);
    }
  });
});

describe('iniciarRouter', () => {
  function crearEntorno({ lamina = 1, hash = '#/1' } = {}) {
    const ventana = Object.assign(new EventTarget(), {
      location: { hash },
      history: {
        replaceState: vi.fn((_estado, _titulo, url) => {
          ventana.location.hash = url;
        }),
      },
    });
    const deck = Object.assign(new EventTarget(), {
      total: TOTAL,
      estado: { lamina },
      irA: vi.fn(),
    });
    const detener = iniciarRouter(deck, ventana);
    const editarHash = (nuevo) => {
      ventana.location.hash = nuevo;
      ventana.dispatchEvent(new Event('hashchange'));
    };
    const cambiarLamina = (nueva) => {
      deck.estado.lamina = nueva;
      deck.dispatchEvent(new CustomEvent('slidechange', { detail: { lamina: nueva } }));
    };
    return { ventana, deck, detener, editarHash, cambiarLamina };
  }

  it('al editar el hash va a esa lámina', () => {
    const { deck, ventana, editarHash } = crearEntorno();
    editarHash('#/5');
    expect(deck.irA).toHaveBeenCalledWith(5);
    expect(ventana.history.replaceState).not.toHaveBeenCalled();
  });

  it('permite llegar por hash a las láminas de reserva', () => {
    const { deck, editarHash } = crearEntorno();
    editarHash('#/18');
    expect(deck.irA).toHaveBeenCalledWith(18);
  });

  it('no hace nada si el hash ya es el de la lámina actual', () => {
    const { deck, ventana, editarHash } = crearEntorno({ lamina: 4, hash: '#/4' });
    editarHash('#/4');
    expect(deck.irA).not.toHaveBeenCalled();
    expect(ventana.history.replaceState).not.toHaveBeenCalled();
  });

  it('corrige un hash no válido con la lámina actual', () => {
    const { deck, ventana, editarHash } = crearEntorno({ lamina: 3, hash: '#/3' });
    editarHash('#/99');
    expect(deck.irA).not.toHaveBeenCalled();
    expect(ventana.location.hash).toBe('#/3');
  });

  it('normaliza los ceros a la izquierda', () => {
    const { deck, ventana, editarHash } = crearEntorno({ lamina: 7, hash: '#/7' });
    editarHash('#/07');
    expect(deck.irA).not.toHaveBeenCalled();
    expect(ventana.location.hash).toBe('#/7');
  });

  it('al cambiar la lámina reemplaza el hash sin agregar historial', () => {
    const { ventana, cambiarLamina } = crearEntorno();
    cambiarLamina(8);
    expect(ventana.history.replaceState).toHaveBeenCalledWith(null, '', '#/8');
    expect(ventana.location.hash).toBe('#/8');
  });

  it('deja de escuchar al detener', () => {
    const { deck, ventana, detener, editarHash, cambiarLamina } = crearEntorno();
    detener();
    editarHash('#/5');
    cambiarLamina(9);
    expect(deck.irA).not.toHaveBeenCalled();
    expect(ventana.history.replaceState).not.toHaveBeenCalled();
  });
});
