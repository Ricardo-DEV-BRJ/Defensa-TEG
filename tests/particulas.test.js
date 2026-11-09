// Lógica pura de las partículas de fondo (src/core/particulas.js, ADR-015).
import { describe, expect, it } from 'vitest';
import {
  crearAleatorio,
  crearParticulas,
  enlaces,
  moverParticulas,
} from '../src/core/particulas.js';

const escenario = { ancho: 1920, alto: 1080 };

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

describe('crearParticulas', () => {
  const particulas = crearParticulas(70, { ...escenario, aleatorio: crearAleatorio(7) });

  it('reparte los puntos dentro del escenario con su deriva', () => {
    expect(particulas).toHaveLength(70);
    for (const p of particulas) {
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.x).toBeLessThan(escenario.ancho);
      expect(p.y).toBeGreaterThanOrEqual(0);
      expect(p.y).toBeLessThan(escenario.alto);
      expect([p.vx, p.vy]).toEqual([p.vx0, p.vy0]);
    }
  });

  it('se mueven despacio: entre 6 y 14 px por segundo', () => {
    for (const p of particulas) {
      const rapidez = Math.hypot(p.vx0, p.vy0);
      expect(rapidez).toBeGreaterThanOrEqual(6);
      expect(rapidez).toBeLessThanOrEqual(14);
    }
  });
});

describe('moverParticulas', () => {
  const punto = (x, y, vx0 = 10, vy0 = 0) => ({ x, y, vx: vx0, vy: vy0, vx0, vy0 });

  it('sin cursor, cada punto sigue su deriva', () => {
    const [p] = moverParticulas([punto(100, 100)], 0.5, escenario);
    expect(p.x).toBeCloseTo(105);
    expect(p.y).toBeCloseTo(100);
  });

  it('al salir por un borde entra por el opuesto', () => {
    const [derecha] = moverParticulas([punto(1919, 500)], 1, escenario);
    const [arriba] = moverParticulas([punto(500, 2, 0, -10)], 1, escenario);
    expect(derecha.x).toBeCloseTo(9);
    expect(arriba.y).toBeCloseTo(1072);
  });

  it('el cursor aparta a los puntos cercanos, más cuanto más cerca', () => {
    const cursor = { x: 500, y: 500 };
    const quieto = (x) => punto(x, 500, 0, 0);
    const [cerca, lejos, fuera] = moverParticulas([quieto(520), quieto(640), quieto(900)], 0.1, {
      ...escenario,
      cursor,
    });
    expect(cerca.vx).toBeGreaterThan(lejos.vx);
    expect(lejos.vx).toBeGreaterThan(0);
    expect(fuera.vx).toBe(0);
  });

  it('después del empujón vuelve poco a poco a su deriva (unos 5 s)', () => {
    let p = [{ ...punto(100, 100), vx: 300 }];
    for (let i = 0; i < 60; i++) p = moverParticulas(p, 1 / 60, escenario);
    expect(p[0].vx).toBeGreaterThan(10); // al segundo aún va más rápido: el regreso es suave
    for (let i = 0; i < 240; i++) p = moverParticulas(p, 1 / 60, escenario);
    expect(p[0].vx).toBeCloseTo(10, 0);
  });

  it('no modifica las partículas recibidas', () => {
    const original = [punto(100, 100)];
    moverParticulas(original, 1, escenario);
    expect(original[0].x).toBe(100);
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
