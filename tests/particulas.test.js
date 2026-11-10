// Lógica pura del fondo de partículas (src/core/particulas.js, ADR-015 y ADR-017).
import { describe, expect, it } from 'vitest';
import {
  cantidadIconos,
  crearAleatorio,
  crearIconos,
  dentroDeZona,
  enlaces,
  ETIQUETAS,
  ICONOS,
  moverIconos,
} from '../src/core/particulas.js';

const escenario = { ancho: 1920, alto: 1080 };
const opciones = {
  ...escenario,
  iconos: Object.keys(ICONOS),
  etiquetas: ETIQUETAS,
  aleatorio: crearAleatorio(7),
};

describe('crearAleatorio', () => {
  it('la misma semilla da la misma secuencia, en [0, 1)', () => {
    const a = crearAleatorio(2026);
    const b = crearAleatorio(2026);
    const valores = Array.from({ length: 50 }, () => a());
    expect(valores).toEqual(Array.from({ length: 50 }, () => b()));
    expect(valores.every((v) => v >= 0 && v < 1)).toBe(true);
  });

  it('otra semilla da otra secuencia', () => {
    expect(crearAleatorio(1)()).not.toBe(crearAleatorio(2)());
  });
});

describe('cantidadIconos', () => {
  it('uno cada 42 000 px² (49 en el escenario de 1920 × 1080) y nunca menos de 8', () => {
    expect(cantidadIconos(1920, 1080)).toBe(49);
    expect(cantidadIconos(100, 100)).toBe(8);
  });
});

describe('crearIconos', () => {
  const iconos = crearIconos(200, opciones);

  it('reparte íconos y etiquetas dentro del escenario', () => {
    expect(iconos).toHaveLength(200);
    for (const icono of iconos) {
      expect(icono.x).toBeGreaterThanOrEqual(0);
      expect(icono.x).toBeLessThan(escenario.ancho);
      expect(icono.y).toBeGreaterThanOrEqual(0);
      expect(icono.y).toBeLessThan(escenario.alto);
    }
  });

  it('cerca de una cuarta parte son etiquetas; el resto, íconos que existen', () => {
    const textos = iconos.filter((i) => i.tipo === 'texto');
    expect(textos.length / iconos.length).toBeGreaterThan(0.15);
    expect(textos.length / iconos.length).toBeLessThan(0.35);
    for (const icono of iconos) {
      if (icono.tipo === 'texto') expect(ETIQUETAS).toContain(icono.forma);
      else expect(ICONOS).toHaveProperty(icono.forma);
    }
  });

  it('las etiquetas no llevan anillo y solo algunos íconos lo llevan', () => {
    expect(iconos.some((i) => i.tipo === 'texto' && i.anillo)).toBe(false);
    expect(iconos.some((i) => i.anillo)).toBe(true);
  });

  it('derivan despacio (9 a 27 px por segundo) y con una opacidad propia', () => {
    for (const icono of iconos) {
      const rapidez = Math.hypot(icono.vx, icono.vy);
      expect(rapidez).toBeGreaterThanOrEqual(9);
      expect(rapidez).toBeLessThanOrEqual(27);
      expect(icono.alfa).toBeGreaterThanOrEqual(0.3);
      expect(icono.alfa).toBeLessThanOrEqual(0.7);
    }
  });
});

describe('moverIconos', () => {
  const icono = (x, y, cambios = {}) => ({
    tipo: 'icono',
    forma: 'nube',
    x,
    y,
    vx: 10,
    vy: 0,
    tam: 30,
    rot: 0,
    vrot: 0,
    alfa: 0.5,
    atenuado: 1,
    ...cambios,
  });

  it('sin cursor, cada ícono sigue su deriva', () => {
    const [i] = moverIconos([icono(100, 100)], 0.5, escenario);
    expect(i.x).toBeCloseTo(105);
    expect(i.y).toBeCloseTo(100);
  });

  it('al salir por un borde (con su margen) reaparece por el opuesto', () => {
    const [derecha] = moverIconos([icono(1920 + 39, 500)], 0.1, escenario);
    const [izquierda] = moverIconos([icono(-39, 500, { vx: -10 })], 0.1, escenario);
    expect(derecha.x).toBeCloseTo(-39);
    expect(izquierda.x).toBeCloseTo(1920 + 39);
  });

  it('el cursor aparta a los íconos cercanos, más cuanto más cerca', () => {
    const cursor = { x: 500, y: 500 };
    const quieto = (x) => icono(x, 500, { vx: 0 });
    const [cerca, lejos, fuera] = moverIconos([quieto(520), quieto(600), quieto(900)], 1 / 60, {
      ...escenario,
      cursor,
    });
    expect(cerca.x - 520).toBeGreaterThan(lejos.x - 600);
    expect(lejos.x).toBeGreaterThan(600);
    expect(fuera.x).toBe(900);
  });

  it('dentro de una zona se atenúa hasta el 10 % y fuera vuelve al 100 %', () => {
    const zonas = [{ x: 0, y: 0, ancho: 400, alto: 400 }];
    let dentro = [icono(200, 200, { vx: 0 })];
    for (let i = 0; i < 120; i++) dentro = moverIconos(dentro, 1 / 60, { ...escenario, zonas });
    expect(dentro[0].atenuado).toBeCloseTo(0.1, 2);
    let fuera = [{ ...dentro[0], x: 900 }];
    for (let i = 0; i < 120; i++) fuera = moverIconos(fuera, 1 / 60, { ...escenario, zonas });
    expect(fuera[0].atenuado).toBeCloseTo(1, 2);
  });

  it('no modifica los íconos recibidos', () => {
    const original = [icono(100, 100)];
    moverIconos(original, 1, escenario);
    expect(original[0].x).toBe(100);
  });
});

describe('dentroDeZona', () => {
  const zonas = [{ x: 10, y: 10, ancho: 100, alto: 50 }];

  it('incluye los bordes y excluye lo de afuera', () => {
    expect(dentroDeZona(10, 10, zonas)).toBe(true);
    expect(dentroDeZona(110, 60, zonas)).toBe(true);
    expect(dentroDeZona(111, 30, zonas)).toBe(false);
    expect(dentroDeZona(50, 50, [])).toBe(false);
  });
});

describe('enlaces', () => {
  it('une los pares cercanos, con más intensidad cuanto más cerca', () => {
    const pares = enlaces(
      [
        { x: 0, y: 0 },
        { x: 40, y: 0 },
        { x: 120, y: 0 },
        { x: 1000, y: 0 },
      ],
      160,
    );
    expect(pares.map(({ a, b }) => `${a}-${b}`)).toEqual(['0-1', '0-2', '1-2']);
    expect(pares[0].intensidad).toBeCloseTo(0.75);
    expect(pares[0].intensidad).toBeGreaterThan(pares[1].intensidad);
  });
});
