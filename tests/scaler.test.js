import { describe, expect, it } from 'vitest';
import { calcularEscala, iniciarEscalado } from '../src/core/scaler.js';

describe('calcularEscala', () => {
  it('1920×1080 (Full HD) → 1', () => {
    expect(calcularEscala(1920, 1080)).toBe(1);
  });

  it('3840×2160 (4K) → 2', () => {
    expect(calcularEscala(3840, 2160)).toBe(2);
  });

  it('1366×768 (laptop): manda el alto', () => {
    expect(calcularEscala(1366, 768)).toBeCloseTo(768 / 1080, 10);
  });

  it('1280×1024 (5:4): manda el ancho', () => {
    expect(calcularEscala(1280, 1024)).toBeCloseTo(1280 / 1920, 10);
  });

  it('2560×1080 (ultra ancha): manda el alto', () => {
    expect(calcularEscala(2560, 1080)).toBe(1);
  });

  it('acepta otro tamaño de escenario', () => {
    expect(calcularEscala(1000, 1000, 500, 250)).toBe(2);
  });

  it.each([
    [0, 1080],
    [1920, 0],
    [-1366, 768],
    [Number.NaN, 1080],
    [undefined, 1080],
    [Number.POSITIVE_INFINITY, 1080],
  ])('medidas no válidas (%s × %s) → 1', (ancho, alto) => {
    expect(calcularEscala(ancho, alto)).toBe(1);
  });
});

describe('iniciarEscalado', () => {
  function crearEntorno({
    ancho = 1366,
    alto = 768,
    offsetWidth = 1920,
    offsetHeight = 1080,
  } = {}) {
    const propiedades = new Map();
    const escenario = {
      offsetWidth,
      offsetHeight,
      style: { setProperty: (nombre, valor) => propiedades.set(nombre, valor) },
    };
    const ventana = Object.assign(new EventTarget(), { innerWidth: ancho, innerHeight: alto });
    const detener = iniciarEscalado(escenario, ventana);
    const redimensionar = (nuevoAncho, nuevoAlto) => {
      ventana.innerWidth = nuevoAncho;
      ventana.innerHeight = nuevoAlto;
      ventana.dispatchEvent(new Event('resize'));
    };
    return { escala: () => Number(propiedades.get('--escala')), redimensionar, detener };
  }

  it('escribe --escala al iniciar', () => {
    const { escala } = crearEntorno();
    expect(escala()).toBeCloseTo(768 / 1080, 10);
  });

  it('recalcula al redimensionar (por ejemplo, al entrar en pantalla completa)', () => {
    const { escala, redimensionar } = crearEntorno();
    redimensionar(3840, 2160);
    expect(escala()).toBe(2);
  });

  it('si el escenario aún no tiene tamaño, usa 1920×1080', () => {
    const { escala } = crearEntorno({ ancho: 960, alto: 540, offsetWidth: 0, offsetHeight: 0 });
    expect(escala()).toBe(0.5);
  });

  it('deja de escuchar al detener', () => {
    const { escala, redimensionar, detener } = crearEntorno({ ancho: 1920, alto: 1080 });
    detener();
    redimensionar(3840, 2160);
    expect(escala()).toBe(1);
  });
});
