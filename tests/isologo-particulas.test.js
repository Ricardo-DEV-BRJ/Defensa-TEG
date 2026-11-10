// Lógica pura del isologo en partículas (src/components/isologo-particulas.js, ADR-017).
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { crearAleatorio } from '../src/core/particulas.js';
import {
  dispersar,
  mezclar,
  moverPuntoLogo,
  objetivosDesdePixeles,
  pasoDeMuestreo,
} from '../src/components/isologo-particulas.js';

describe('pasoDeMuestreo', () => {
  it('elige la celda para no pasar del máximo de partículas, nunca menor que 2 px', () => {
    // 50 000 celdas llenas a media resolución = 200 000 px² de logo; con 8000 partículas → 5 px.
    expect(pasoDeMuestreo(50000, 8000)).toBe(5);
    expect(pasoDeMuestreo(10, 8000)).toBe(2);
  });
});

describe('objetivosDesdePixeles', () => {
  // Logo de 2 × 2 celdas: verde opaco, transparente, rojo a media opacidad, casi transparente.
  const datos = [100, 197, 0, 255, 0, 0, 0, 0, 134, 0, 0, 128, 255, 255, 255, 30];
  const objetivos = objetivosDesdePixeles(datos, 2, 2, { x0: 10, y0: 20, celdaX: 4, celdaY: 4 });

  it('crea una partícula por celda que supera el umbral de opacidad', () => {
    expect(objetivos).toHaveLength(2);
  });

  it('cada partícula va al centro de su celda, con el color y la opacidad del isologo', () => {
    expect(objetivos[0]).toEqual({ x: 12, y: 22, color: '#64c500', alfa: 1 });
    expect(objetivos[1]).toMatchObject({ x: 12, y: 26, color: '#860000' });
    expect(objetivos[1].alfa).toBeCloseTo(128 / 255);
  });
});

describe('mezclar', () => {
  it('devuelve los mismos elementos en otro orden, sin tocar la lista original', () => {
    const lista = Array.from({ length: 50 }, (_, i) => i);
    const mezclada = mezclar(lista, crearAleatorio(3));
    expect([...mezclada].sort((a, b) => a - b)).toEqual(lista);
    expect(mezclada).not.toEqual(lista);
    expect(lista[0]).toBe(0);
  });
});

describe('moverPuntoLogo', () => {
  const punto = (cambios = {}) => ({
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    tx: 100,
    ty: 50,
    k: 0.04,
    fase: 0,
    ...cambios,
  });

  it('el muelle lleva la partícula a su sitio (con la respiración de menos de medio píxel)', () => {
    const p = punto();
    for (let t = 0; t < 400; t++) moverPuntoLogo(p, t * 16);
    expect(Math.hypot(p.x - p.tx, p.y - p.ty)).toBeLessThan(0.6);
  });

  it('con retorno 0 (justo tras un clic) no la atrae', () => {
    const p = punto();
    moverPuntoLogo(p, 0, { retorno: 0 });
    expect([p.x, p.y]).toEqual([0, 0]);
  });

  it('el cursor la aparta de su sitio', () => {
    const p = punto({ x: 100, y: 50 });
    moverPuntoLogo(p, 0, { cursor: { x: 90, y: 50 } });
    expect(p.x).toBeGreaterThan(100);
  });
});

describe('dispersar', () => {
  it('lanza las partículas lejos del clic, más fuerte las más cercanas', () => {
    const cerca = { x: 110, y: 100, vx: 0, vy: 0 };
    const lejos = { x: 400, y: 100, vx: 0, vy: 0 };
    dispersar([cerca, lejos], 100, 100, () => 0.5);
    expect(cerca.vx).toBeGreaterThan(lejos.vx);
    expect(lejos.vx).toBeGreaterThan(0);
    expect(cerca.vy).toBeCloseTo(0);
  });
});

describe('portada', () => {
  const html = readFileSync(new URL('../src/slides/01-portada.html', import.meta.url), 'utf8');

  it('forma el isologo con partículas y conserva el isologo oficial para cuando no se animan', () => {
    expect(html).toContain('data-componente="isologo-particulas"');
    expect(html).toContain('data-imagen="img/uvm-isologo-particulas.png"');
    expect(html).toContain('src="img/uvm-isologo.png"');
  });

  it('el clic sobre el isologo es suyo (no pasa de lámina)', () => {
    expect(html).toMatch(/class="isologo-particulas"[\s\S]*?data-interactivo/);
  });
});
