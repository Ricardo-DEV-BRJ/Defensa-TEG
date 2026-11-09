// Lógica pura del cronograma (lámina 16, src/components/gantt.js).
import { describe, expect, it } from 'vitest';
import cronograma from '../data/cronograma.json';
import { filasDelGantt, rotuloAntes } from '../src/components/gantt.js';

describe('filasDelGantt con data/cronograma.json', () => {
  const filas = filasDelGantt(cronograma);

  it('una fila por fase, en el orden de los datos, con sus semanas y actividades', () => {
    expect(filas.map((f) => f.fase)).toEqual(cronograma.fases.map((f) => f.fase));
    filas.forEach((fila, i) => {
      const fase = cronograma.fases[i];
      expect(fila).toMatchObject({ nombre: fase.nombre, inicio: fase.inicio, fin: fase.fin });
      expect(fila.actividades).toEqual(fase.actividades);
    });
  });

  it('solo la fase que termina en la última semana lleva el rótulo antes de la barra', () => {
    expect(filas.map((f) => f.rotuloAntes)).toEqual(
      cronograma.fases.map((f) => f.fin === cronograma.total_semanas),
    );
  });
});

describe('rotuloAntes', () => {
  it('va después de la barra si quedan al menos 4 semanas; si no, antes', () => {
    expect(rotuloAntes(18, 24)).toBe(false);
    expect(rotuloAntes(20, 24)).toBe(false);
    expect(rotuloAntes(21, 24)).toBe(true);
    expect(rotuloAntes(24, 24)).toBe(true);
  });
});

describe('filasDelGantt con datos que no sirven', () => {
  const base = { total_semanas: 24, fases: [{ fase: 'I', nombre: 'A', inicio: 1, fin: 4 }] };

  it('acepta una fase sin actividades', () => {
    expect(filasDelGantt(base)[0].actividades).toEqual([]);
  });

  it.each([
    ['una fase que termina después del plazo', { inicio: 20, fin: 25 }],
    ['una fase que termina antes de empezar', { inicio: 5, fin: 3 }],
    ['una semana 0', { inicio: 0, fin: 3 }],
    ['semanas que no son enteras', { inicio: 1.5, fin: 3 }],
  ])('rechaza %s', (_, cambio) => {
    expect(() => filasDelGantt({ ...base, fases: [{ ...base.fases[0], ...cambio }] })).toThrow();
  });

  it('rechaza un cronograma sin fases o sin plazo', () => {
    expect(() => filasDelGantt({ total_semanas: 24, fases: [] })).toThrow();
    expect(() => filasDelGantt({ fases: base.fases })).toThrow();
  });
});
