// Lógica pura del panel de controles (src/core/controles.js, ADR-016).
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import slides from '../data/slides.json';
import { debeOcultar, textoContador } from '../src/core/controles.js';

describe('debeOcultar', () => {
  const espera = 2500;

  it('se oculta cuando el ratón lleva quieto el tiempo de espera', () => {
    expect(debeOcultar({ inactivoMs: 2500, espera })).toBe(true);
    expect(debeOcultar({ inactivoMs: 4000, espera })).toBe(true);
  });

  it('no se oculta antes de tiempo', () => {
    expect(debeOcultar({ inactivoMs: 2499, espera })).toBe(false);
  });

  it('no se oculta con el cursor encima ni con un botón enfocado', () => {
    expect(debeOcultar({ inactivoMs: 9000, espera, sobrePanel: true })).toBe(false);
    expect(debeOcultar({ inactivoMs: 9000, espera, conFoco: true })).toBe(false);
  });
});

describe('textoContador', () => {
  const principales = slides.laminas.filter((lamina) => !lamina.reserva).length;

  it('cuenta sobre las láminas principales', () => {
    expect(principales).toBe(17);
    expect(textoContador(1, principales)).toBe('1 / 17');
    expect(textoContador(17, principales)).toBe('17 / 17');
  });

  it('las de reserva se marcan como reserva, fuera del total', () => {
    expect(textoContador(18, principales)).toBe('18 · reserva');
  });
});

describe('estilos del panel', () => {
  it('el tiempo de espera es un token y el panel no se imprime', () => {
    const tokens = readFileSync(new URL('../src/styles/tokens.css', import.meta.url), 'utf8');
    const print = readFileSync(new URL('../src/styles/print.css', import.meta.url), 'utf8');
    expect(tokens).toMatch(/--controles-espera:\s*\d+ms/);
    expect(print).toContain('.controles');
  });
});
