// Lógica pura de la inclinación 3D con el cursor (src/core/inclinacion.js, ADR-015).
import { describe, expect, it } from 'vitest';
import { calcularInclinacion, SELECTOR_INCLINABLE } from '../src/core/inclinacion.js';

describe('calcularInclinacion', () => {
  it('con el cursor en el centro no gira ni hace sombra', () => {
    expect(calcularInclinacion(0.5, 0.5)).toEqual({ rotX: 0, rotY: 0, sombraX: 0, sombraY: 0 });
  });

  it('el lado del cursor se hunde hasta el máximo (6° por omisión)', () => {
    expect(calcularInclinacion(1, 0.5)).toMatchObject({ rotX: 0, rotY: 6 });
    expect(calcularInclinacion(0, 0.5)).toMatchObject({ rotY: -6 });
    expect(calcularInclinacion(0.5, 0)).toMatchObject({ rotX: 6, rotY: 0 });
    expect(calcularInclinacion(0.5, 1)).toMatchObject({ rotX: -6 });
  });

  it('la sombra va hacia el lado contrario al cursor', () => {
    const { sombraX, sombraY } = calcularInclinacion(1, 1);
    expect(sombraX).toBeLessThan(0);
    expect(sombraY).toBeLessThan(0);
  });

  it('fuera del elemento o con medidas no válidas no pasa del máximo', () => {
    expect(calcularInclinacion(3, -2)).toEqual(calcularInclinacion(1, 0));
    expect(calcularInclinacion(Number.NaN, Number.NaN)).toEqual(calcularInclinacion(0.5, 0.5));
  });

  it('acepta otro máximo', () => {
    expect(calcularInclinacion(1, 0, { maxGrados: 8 })).toMatchObject({ rotX: 8, rotY: 8 });
  });
});

describe('SELECTOR_INCLINABLE', () => {
  it('no incluye el isologo, que no se puede deformar (CLAUDE.md)', () => {
    expect(SELECTOR_INCLINABLE).not.toMatch(/isologo/);
  });
});
