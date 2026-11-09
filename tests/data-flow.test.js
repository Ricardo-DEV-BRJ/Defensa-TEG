// Lógica pura del flujo de datos (lámina 13, src/components/data-flow.js) y su marcado.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import arquitectura from '../data/arquitectura.json';
import {
  alternarAmpliada,
  capaMasAlta,
  debeLanzarRafaga,
  duracionRafaga,
  posicionesRafaga,
  suavizar,
} from '../src/components/data-flow.js';

// Ritmo con los tokens actuales: --retardo-paso 250 ms y --duracion-flujo 900 ms.
const ritmo = { cantidad: 3, separacion: 250, viaje: 900 };
const recorrido = { desde: 600, hasta: 100 };

describe('suavizar', () => {
  it('va de 0 a 1, pasa por la mitad en la mitad y no se sale de [0, 1]', () => {
    expect([suavizar(0), suavizar(0.5), suavizar(1)]).toEqual([0, 0.5, 1]);
    expect([suavizar(-1), suavizar(2)]).toEqual([0, 1]);
  });

  it('nunca retrocede', () => {
    const valores = Array.from({ length: 101 }, (_, i) => suavizar(i / 100));
    expect(valores.every((v, i) => i === 0 || v >= valores[i - 1])).toBe(true);
  });
});

describe('ráfaga de paquetes', () => {
  it('dura 1,4 s, dentro del máximo de 1,5 s de CLAUDE.md', () => {
    expect(duracionRafaga(ritmo)).toBe(1400);
    expect(duracionRafaga(ritmo)).toBeLessThanOrEqual(1500);
  });

  it('al empezar solo se ve el primer paquete, abajo (en la captura)', () => {
    const { puntos, terminada } = posicionesRafaga(0, { ...ritmo, ...recorrido });
    expect(puntos.map((p) => p.visible)).toEqual([true, false, false]);
    expect(puntos[0].y).toBe(recorrido.desde);
    expect(terminada).toBe(false);
  });

  it('los paquetes suben: la posición vertical baja con el tiempo', () => {
    const y = (t) => posicionesRafaga(t, { ...ritmo, ...recorrido }).puntos[0].y;
    expect(y(300)).toBeLessThan(y(100));
    expect(y(800)).toBeLessThan(y(300));
    expect(y(800)).toBeGreaterThanOrEqual(recorrido.hasta);
  });

  it('a mitad de su viaje un paquete está a mitad del recorrido y opaco', () => {
    const [primero] = posicionesRafaga(ritmo.viaje / 2, { ...ritmo, ...recorrido }).puntos;
    expect(primero.y).toBe((recorrido.desde + recorrido.hasta) / 2);
    expect(primero.opacidad).toBe(1);
  });

  it('cada paquete aparece y desaparece de forma gradual', () => {
    const [alSalir] = posicionesRafaga(45, { ...ritmo, ...recorrido }).puntos;
    const [alLlegar] = posicionesRafaga(ritmo.viaje - 45, { ...ritmo, ...recorrido }).puntos;
    expect(alSalir.opacidad).toBeGreaterThan(0);
    expect(alSalir.opacidad).toBeLessThan(1);
    expect(alLlegar.opacidad).toBeGreaterThan(0);
    expect(alLlegar.opacidad).toBeLessThan(1);
  });

  it('al terminar no queda ningún paquete visible', () => {
    const { puntos, terminada } = posicionesRafaga(duracionRafaga(ritmo), {
      ...ritmo,
      ...recorrido,
    });
    expect(terminada).toBe(true);
    expect(puntos.some((p) => p.visible)).toBe(false);
  });
});

describe('cuándo lanzar una ráfaga y qué capa ampliar', () => {
  it('capaMasAlta da la capa visible más alta, o 0 si no hay', () => {
    expect(capaMasAlta([1, 2, 3])).toBe(3);
    expect(capaMasAlta([])).toBe(0);
  });

  it('solo hay ráfaga cuando aparece una capa más alta', () => {
    expect(debeLanzarRafaga(2, 3)).toBe(true);
    expect(debeLanzarRafaga(3, 3)).toBe(false);
    expect(debeLanzarRafaga(3, 2)).toBe(false);
  });

  it('un clic amplía la capa y otro clic en la misma la cierra', () => {
    expect(alternarAmpliada(null, 2)).toBe(2);
    expect(alternarAmpliada(2, 4)).toBe(4);
    expect(alternarAmpliada(4, 4)).toBeNull();
  });
});

describe('lámina 13', () => {
  const html = readFileSync(new URL('../src/slides/13-arquitectura.html', import.meta.url), 'utf8');
  const capas = [
    ...html.matchAll(
      /<li class="capa" data-capa="(\d+)"[^>]*>([\s\S]*?)<\/li>\s*(?=<li class="capa"|<\/ol>)/g,
    ),
  ];

  it('usa el componente data-flow y tiene una flecha de flujo', () => {
    expect(html).toContain('data-componente="data-flow"');
    expect(html).toMatch(/class="flujo"/);
  });

  it('tiene una capa por cada capa de arquitectura.json, y data-capa coincide con su dato', () => {
    expect(capas.map(([, n]) => Number(n)).sort()).toEqual(arquitectura.capas.map((c) => c.n));
    for (const [, n, contenido] of capas) {
      expect(contenido, `capa ${n}`).toContain(`data-dato="arquitectura.capas.${n - 1}.nombre"`);
    }
  });
});
