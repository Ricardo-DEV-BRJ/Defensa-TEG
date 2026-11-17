// Lógica pura del contador (lámina 15, src/components/counter.js).
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import costos from '../data/costos.json';
import { valorEnInstante } from '../src/components/counter.js';

const opciones = { hasta: costos.total, duracion: 1200 };

describe('valorEnInstante', () => {
  it(`empieza en 0 y termina exactamente en USD ${costos.total}`, () => {
    expect(valorEnInstante(0, opciones)).toBe(0);
    expect(valorEnInstante(opciones.duracion, opciones)).toBe(costos.total);
    expect(valorEnInstante(opciones.duracion + 500, opciones)).toBe(costos.total);
  });

  it('nunca baja ni pasa del valor final', () => {
    const valores = Array.from({ length: 121 }, (_, i) => valorEnInstante(i * 10, opciones));
    expect(valores.every((v, i) => i === 0 || v >= valores[i - 1])).toBe(true);
    expect(Math.max(...valores)).toBe(costos.total);
  });

  it('sube rápido y frena al final: a mitad del tiempo ya pasó la mitad del valor', () => {
    expect(valorEnInstante(opciones.duracion / 2, opciones)).toBeGreaterThan(costos.total / 2);
  });

  it('muestra centavos enteros (sin decimales sueltos de coma flotante)', () => {
    for (let t = 0; t <= opciones.duracion; t += 37) {
      const valor = valorEnInstante(t, opciones);
      expect(Math.round(valor * 100) / 100).toBe(valor);
    }
  });

  it('la cuenta dura menos de 1,5 s (CLAUDE.md)', () => {
    const tokens = readFileSync(new URL('../src/styles/tokens.css', import.meta.url), 'utf8');
    const duracion = Number(tokens.match(/--duracion-conteo:\s*(\d+)ms/)?.[1]);
    expect(duracion).toBeGreaterThan(0);
    expect(duracion).toBeLessThanOrEqual(1500);
  });
});

describe('lámina 15', () => {
  it('la cifra del costo total usa el contador con su dato y su formato', () => {
    const html = readFileSync(
      new URL('../src/slides/15-factibilidad.html', import.meta.url),
      'utf8',
    );
    expect(html).toMatch(
      /data-componente="counter"\s+data-dato="costos\.total"\s+data-formato="usd"/,
    );
  });
});
