// Lógica pura de los medidores de nivel (lámina 9, src/components/level-meter.js).
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import observacion from '../data/observacion.json';
import { segmentosLlenos, tiempoDeSegmento } from '../src/components/level-meter.js';

const MAXIMO = Object.keys(observacion.escala).length;

describe('segmentosLlenos', () => {
  it('la escala de observacion.json tiene 4 niveles', () => {
    expect(MAXIMO).toBe(4);
  });

  it.each([1, 2, 3, 4])('nivel %i → %i segmentos llenos', (nivel) => {
    expect(segmentosLlenos(nivel, MAXIMO)).toBe(nivel);
  });

  it.each([0, 5, 2.5, '3', null, undefined])('un nivel fuera de la escala (%s) → 0', (nivel) => {
    expect(segmentosLlenos(nivel, MAXIMO)).toBe(0);
  });

  it('todos los indicadores de observacion.json tienen un nivel válido', () => {
    const niveles = observacion.areas.flatMap((area) => area.indicadores.map((i) => i.nivel));
    expect(niveles.every((nivel) => segmentosLlenos(nivel, MAXIMO) > 0)).toBe(true);
  });
});

describe('tiempoDeSegmento', () => {
  const duraciones = { retardo: 250, paso: 300 };

  it('los segmentos de un medidor entran uno tras otro, y cada medidor un poco después', () => {
    expect(tiempoDeSegmento(0, 1, duraciones).retardo).toBeGreaterThan(
      tiempoDeSegmento(0, 0, duraciones).retardo,
    );
    expect(tiempoDeSegmento(1, 0, duraciones).retardo).toBeGreaterThan(
      tiempoDeSegmento(0, 0, duraciones).retardo,
    );
  });

  it('con los medidores de la lámina 9 todo termina en 1,5 s o menos', () => {
    const html = readFileSync(
      new URL('../src/slides/09-gerencia-observacion-fuentes.html', import.meta.url),
      'utf8',
    );
    const lista = html.match(/<ul class="niveles"[^>]*>([\s\S]*?)<\/ul>\s*<!--/)[1];
    const medidores = (lista.match(/class="medidor"/g) ?? []).length;
    expect(medidores).toBe(6);
    const ultimo = tiempoDeSegmento(medidores - 1, MAXIMO - 1, duraciones);
    expect(ultimo.retardo + ultimo.duracion).toBeLessThanOrEqual(1500);
  });
});

describe('lámina 9', () => {
  it('la lista de indicadores usa el componente level-meter; la leyenda no', () => {
    const html = readFileSync(
      new URL('../src/slides/09-gerencia-observacion-fuentes.html', import.meta.url),
      'utf8',
    );
    expect(html).toContain('<ul class="niveles" data-componente="level-meter">');
    expect(html).toContain('<ul class="escala-niveles">');
  });
});
