// Lógica pura de la calculadora de stock (lámina 14, src/components/stock-calc.js).
import { describe, expect, it } from 'vitest';
import arquitectura from '../data/arquitectura.json';
import {
  ajustarAlDeslizador,
  calcular,
  calcularPR,
  calcularSS,
  nivelDeServicio,
} from '../src/components/stock-calc.js';

const { ejemplo_demo: ejemplo, calculadora } = arquitectura.formulas;
const centavos = (valor) => Math.round(valor * 100) / 100;

describe('fórmulas del TEG 6.4.5 con el ejemplo de arquitectura.json', () => {
  it(`SS = z × σd × √L = ${ejemplo.SS_esperado}`, () => {
    expect(centavos(calcularSS(ejemplo))).toBe(ejemplo.SS_esperado);
  });

  it(`PR = d̄ × L + SS = ${ejemplo.PR_esperado}`, () => {
    expect(centavos(calcularPR(ejemplo, calcularSS(ejemplo)))).toBe(ejemplo.PR_esperado);
  });

  it('calcular devuelve SS, la demanda durante la reposición (d̄ × L) y PR', () => {
    const { ss, demandaReposicion, pr } = calcular(ejemplo);
    expect(centavos(ss)).toBe(ejemplo.SS_esperado);
    expect(demandaReposicion).toBe(ejemplo.d_media * ejemplo.L);
    expect(pr).toBeCloseTo(demandaReposicion + ss, 10);
  });
});

describe('comportamiento de las fórmulas', () => {
  it('SS crece con la raíz de L: cuadruplicar L duplica SS', () => {
    expect(calcularSS({ ...ejemplo, L: ejemplo.L * 4 })).toBeCloseTo(2 * calcularSS(ejemplo), 10);
  });

  it('SS es proporcional a z y a σd', () => {
    expect(calcularSS({ ...ejemplo, z: ejemplo.z * 2 })).toBeCloseTo(2 * calcularSS(ejemplo), 10);
    expect(calcularSS({ ...ejemplo, sigma_d: 0 })).toBe(0);
  });

  it('sin variabilidad (σd = 0) el punto de reorden es solo d̄ × L', () => {
    expect(calcular({ ...ejemplo, sigma_d: 0 }).pr).toBe(ejemplo.d_media * ejemplo.L);
  });

  it.each([
    ['z negativo', { z: -1 }],
    ['σd no numérico', { sigma_d: Number.NaN }],
    ['L negativo', { L: -2 }],
    ['d̄ ausente', { d_media: undefined }],
  ])('rechaza %s', (_, cambio) => {
    expect(() => calcular({ ...ejemplo, ...cambio })).toThrow();
  });
});

describe('nivelDeServicio (Φ de la normal estándar)', () => {
  it.each([
    [0, 0.5],
    [1.28, 0.8997],
    [1.65, 0.9505],
    [1.96, 0.975],
    [2.33, 0.9901],
    [-1.65, 0.0495],
  ])('z = %s → %s', (z, esperado) => {
    expect(nivelDeServicio(z)).toBeCloseTo(esperado, 4);
  });
});

describe('deslizadores de arquitectura.json', () => {
  it('hay uno por variable de las fórmulas, con rango y paso válidos', () => {
    expect(calculadora.variables.map((v) => v.clave)).toEqual(['z', 'sigma_d', 'L', 'd_media']);
    for (const { clave, min, max, paso } of calculadora.variables) {
      expect(min, clave).toBeGreaterThanOrEqual(0);
      expect(max, clave).toBeGreaterThan(min);
      expect(paso, clave).toBeGreaterThan(0);
    }
  });

  it('el valor del ejemplo cabe exactamente en cada deslizador', () => {
    for (const variable of calculadora.variables) {
      expect(ajustarAlDeslizador(ejemplo[variable.clave], variable), variable.clave).toBe(
        ejemplo[variable.clave],
      );
    }
  });

  it('ajustarAlDeslizador limita al rango y redondea al paso', () => {
    const rango = { min: 0, max: 3, paso: 0.01 };
    expect(ajustarAlDeslizador(5, rango)).toBe(3);
    expect(ajustarAlDeslizador(-1, rango)).toBe(0);
    expect(ajustarAlDeslizador(1.6549, rango)).toBe(1.65);
    expect(ajustarAlDeslizador(0.1 + 0.2, rango)).toBe(0.3);
  });
});
