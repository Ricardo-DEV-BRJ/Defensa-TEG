// Lógica pura del componente bar-chart (lámina 8).
import { describe, expect, it } from 'vitest';
import likert from '../data/likert.json';
import {
  aMilisegundos,
  calcularGeometria,
  calcularTiempos,
  desacuerdoDestacado,
  prepararBarras,
  PISTA,
} from '../src/components/bar-chart.js';

const item = (id, acuerdo, grupo, destacado = true) => ({
  id,
  resumen: `Ítem ${id}`,
  acuerdo_pct: acuerdo,
  destacado_lamina_8: destacado,
  grupo_lamina_8: grupo,
});

describe('prepararBarras', () => {
  const items = [item('1.1', 25, 2), item('2.3', 100, 1), item('2.5', 75, 1), item('2.4', 100, 1)];

  it('toma solo los destacados del grupo, de mayor a menor acuerdo (empates en su orden)', () => {
    expect(prepararBarras(items, 1).map((b) => b.id)).toEqual(['2.3', '2.4', '2.5']);
    expect(prepararBarras(items, 2)).toMatchObject([{ id: '1.1', texto: 'Ítem 1.1', valor: 25 }]);
  });

  it('ignora los ítems no destacados', () => {
    expect(prepararBarras([...items, item('9.9', 100, 2, false)], 2)).toHaveLength(1);
  });

  it('falla si el grupo está vacío, un valor está fuera de 0–100 o falta el resumen', () => {
    expect(() => prepararBarras(items, 3)).toThrow();
    expect(() => prepararBarras([item('1.1', 120, 1)], 1)).toThrow();
    expect(() => prepararBarras([{ ...item('1.1', 50, 1), resumen: '' }], 1)).toThrow();
  });
});

describe('calcularGeometria', () => {
  const { alto, anchoPista, filas } = calcularGeometria(
    [{ valor: 100 }, { valor: 75 }, { valor: 0 }],
    { altoFila: 64, altoBarra: 24 },
  );

  it('apila las filas y centra la barra en cada una', () => {
    expect(alto).toBe(192);
    expect(filas.map((f) => f.centro)).toEqual([32, 96, 160]);
    expect(filas[0].yBarra).toBe(20);
  });

  it('el ancho es proporcional al valor dentro de la pista', () => {
    expect(anchoPista).toBe(PISTA.fin - PISTA.inicio);
    expect(filas[0].fin).toBe(PISTA.fin);
    expect(filas[1].ancho).toBeCloseTo(anchoPista * 0.75);
    expect(filas[2].ancho).toBe(0);
  });
});

describe('tiempos', () => {
  const duraciones = { giro: 600, retardo: 250, paso: 300 };

  it('cinco filas terminan en 1,4 s o menos (máximo 1,5 s)', () => {
    const { valor } = calcularTiempos(4, duraciones);
    expect(valor.retardo + valor.duracion).toBeLessThanOrEqual(1500);
  });

  it.each([
    ['600ms', 600],
    ['0.6s', 600],
    [' 250ms ', 250],
    ['', 99],
    ['rápido', 99],
  ])('aMilisegundos(%s) → %s', (texto, esperado) => {
    expect(aMilisegundos(texto, 99)).toBe(esperado);
  });
});

describe('desacuerdo junto a la barra', () => {
  it('se muestra solo cuando el desacuerdo pesa más que el acuerdo', () => {
    expect(desacuerdoDestacado(25, 75)).toBe(true);
    expect(desacuerdoDestacado(25, 50)).toBe(true);
    expect(desacuerdoDestacado(50, 50)).toBe(false);
    expect(desacuerdoDestacado(75, 0)).toBe(false);
    expect(desacuerdoDestacado(25, undefined)).toBe(false);
  });

  it('con likert.json, en la lámina 8 solo lo llevan 1.1 (75%) y 2.6 (50%)', () => {
    const conDesacuerdo = [1, 2]
      .flatMap((grupo) => prepararBarras(likert.items, grupo))
      .filter((barra) => barra.mostrarDesacuerdo)
      .map((barra) => `${barra.id}: ${barra.desacuerdo}`);
    expect(conDesacuerdo).toEqual(['1.1: 75', '2.6: 50']);
  });
});
