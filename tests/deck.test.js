import { describe, expect, it } from 'vitest';
import slides from '../data/slides.json';
import {
  anteriorEstado,
  esFragmentoVisible,
  gruposDeFragmentos,
  irAEstado,
  siguienteEstado,
  vecinaPrincipal,
} from '../src/core/deck.js';

/** 16 principales + 4 de reserva; `pasos` indica los fragmentos de algunas láminas. */
function crearEstructura(pasos = {}, { principales = 16, reservas = 4 } = {}) {
  return Array.from({ length: principales + reservas }, (_, i) => ({
    pasos: pasos[i + 1] ?? 0,
    reserva: i >= principales,
  }));
}

const estado = (lamina, fragmento = 0) => ({ lamina, fragmento });

describe('siguienteEstado', () => {
  const estructura = crearEstructura({ 2: 2, 16: 1, 17: 1 });

  it('revela los fragmentos uno por uno y luego pasa a la siguiente lámina', () => {
    expect(siguienteEstado(estado(2, 0), estructura)).toEqual(estado(2, 1));
    expect(siguienteEstado(estado(2, 1), estructura)).toEqual(estado(2, 2));
    expect(siguienteEstado(estado(2, 2), estructura)).toEqual(estado(3, 0));
  });

  it('en una lámina sin fragmentos pasa directo a la siguiente', () => {
    expect(siguienteEstado(estado(3), estructura)).toEqual(estado(4));
  });

  it('en la 16 revela su fragmento, pero nunca entra a la reserva', () => {
    expect(siguienteEstado(estado(16, 0), estructura)).toEqual(estado(16, 1));
    expect(siguienteEstado(estado(16, 1), estructura)).toEqual(estado(16, 1));
  });

  it('en una lámina de reserva solo revela fragmentos', () => {
    expect(siguienteEstado(estado(17, 0), estructura)).toEqual(estado(17, 1));
    expect(siguienteEstado(estado(17, 1), estructura)).toEqual(estado(17, 1));
    expect(siguienteEstado(estado(18, 0), estructura)).toEqual(estado(18, 0));
  });
});

describe('anteriorEstado', () => {
  const estructura = crearEstructura({ 2: 2, 17: 1 });

  it('oculta los fragmentos uno por uno', () => {
    expect(anteriorEstado(estado(2, 2), estructura)).toEqual(estado(2, 1));
    expect(anteriorEstado(estado(2, 1), estructura)).toEqual(estado(2, 0));
  });

  it('vuelve a la lámina anterior en su estado final', () => {
    expect(anteriorEstado(estado(3, 0), estructura)).toEqual(estado(2, 2));
    expect(anteriorEstado(estado(2, 0), estructura)).toEqual(estado(1, 0));
  });

  it('en la 1 no hace nada', () => {
    expect(anteriorEstado(estado(1, 0), estructura)).toEqual(estado(1, 0));
  });

  it('en una lámina de reserva solo oculta fragmentos', () => {
    expect(anteriorEstado(estado(17, 1), estructura)).toEqual(estado(17, 0));
    expect(anteriorEstado(estado(17, 0), estructura)).toEqual(estado(17, 0));
  });
});

describe('irAEstado', () => {
  const estructura = crearEstructura();

  it.each([1, 5, 16, 18, 20])('lámina %i → paso 0', (n) => {
    expect(irAEstado(n, estructura)).toEqual(estado(n, 0));
  });

  it.each([0, 21, -3, 1.5, Number.NaN, '5', undefined])('%s no es una lámina → null', (n) => {
    expect(irAEstado(n, estructura)).toBeNull();
  });
});

describe('vecinaPrincipal', () => {
  it('encuentra la vecina y se detiene en los extremos', () => {
    const estructura = crearEstructura();
    expect(vecinaPrincipal(5, estructura, 1)).toBe(6);
    expect(vecinaPrincipal(5, estructura, -1)).toBe(4);
    expect(vecinaPrincipal(16, estructura, 1)).toBeNull();
    expect(vecinaPrincipal(1, estructura, -1)).toBeNull();
  });

  it('salta una lámina de reserva aunque esté en medio', () => {
    const estructura = [{ reserva: false }, { reserva: true }, { reserva: false }];
    expect(vecinaPrincipal(1, estructura, 1)).toBe(3);
    expect(vecinaPrincipal(3, estructura, -1)).toBe(1);
  });
});

describe('fragmentos', () => {
  it('agrupa los valores de data-fragment sin repetir y en orden', () => {
    expect(gruposDeFragmentos(['2', '1', '2', '3'])).toEqual([1, 2, 3]);
    expect(gruposDeFragmentos(['3', '1'])).toEqual([1, 3]);
    expect(gruposDeFragmentos([])).toEqual([]);
  });

  it('descarta valores que no son enteros ≥ 1', () => {
    expect(gruposDeFragmentos(['', 'a', '0', '-1', '1.5', undefined])).toEqual([]);
  });

  it('muestra cada grupo a partir de su paso', () => {
    const grupos = [1, 3]; // dos pasos: primero los «1», después los «3»
    expect(esFragmentoVisible('1', 0, grupos)).toBe(false);
    expect(esFragmentoVisible('1', 1, grupos)).toBe(true);
    expect(esFragmentoVisible('3', 1, grupos)).toBe(false);
    expect(esFragmentoVisible('3', 2, grupos)).toBe(true);
  });

  it('un valor no válido se muestra siempre', () => {
    expect(esFragmentoVisible('a', 0, [1])).toBe(true);
  });
});

describe('con data/slides.json', () => {
  const estructura = slides.laminas.map((lamina) => ({ pasos: 0, reserva: lamina.reserva }));

  it('avanzando desde la 1 se recorren todas las principales en orden y se para en la última', () => {
    const principales = slides.laminas.filter((lamina) => !lamina.reserva).map((l) => l.id);
    const visitadas = [1];
    let actual = estado(1);
    for (let i = 0; i < 40; i++) {
      actual = siguienteEstado(actual, estructura);
      if (actual.lamina !== visitadas.at(-1)) visitadas.push(actual.lamina);
    }
    expect(visitadas).toEqual(principales);
  });
});
