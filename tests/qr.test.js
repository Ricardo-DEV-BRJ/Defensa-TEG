// Generador del QR de la lámina 17 (scripts/generar-qr.mjs, ADR-009).
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { generarSvg, leerColor, textoVisible, validarUrl } from '../scripts/generar-qr.mjs';

describe('textoVisible', () => {
  it.each([
    ['https://github.com/usuario/repositorio', 'github.com/usuario/repositorio'],
    ['http://www.ejemplo.org/', 'ejemplo.org'],
    ['https://ejemplo.org/ruta/?q=1', 'ejemplo.org/ruta/?q=1'],
  ])('%s → %s', (url, esperado) => {
    expect(textoVisible(url)).toBe(esperado);
  });
});

describe('validarUrl', () => {
  it.each([
    ['https://github.com/usuario/repositorio', 'https://github.com/usuario/repositorio'],
    ['  http://ejemplo.org  ', 'http://ejemplo.org/'],
  ])('acepta %s', (texto, esperado) => {
    expect(validarUrl(texto)).toBe(esperado);
  });

  it.each([
    '',
    undefined,
    'hola',
    'github.com/usuario',
    'ftp://ejemplo.org',
    'javascript:alert(1)',
  ])('rechaza %s', (texto) => {
    expect(validarUrl(texto)).toBeNull();
  });
});

describe('leerColor', () => {
  const tokens = readFileSync(new URL('../src/styles/tokens.css', import.meta.url), 'utf8');

  it('lee de tokens.css los colores del texto y del fondo', () => {
    expect(leerColor(tokens, 'color-texto')).toMatch(/^#[0-9a-f]{6}$/);
    expect(leerColor(tokens, 'color-fondo')).toMatch(/^#[0-9a-f]{6}$/);
  });

  it('falla si el token no existe o no es un #rrggbb', () => {
    expect(() => leerColor(tokens, 'no-existe')).toThrow();
    expect(() => leerColor(tokens, 'color-neutro-grafico')).toThrow(); // es un color-mix()
  });
});

describe('generarSvg', () => {
  it('dibuja un SVG con los dos colores pedidos', async () => {
    const colores = { oscuro: '#000000', claro: '#ffffff' };
    const svg = await generarSvg('https://ejemplo.org', colores);
    expect(svg.trimStart().startsWith('<svg')).toBe(true);
    expect(svg).toContain(colores.oscuro);
    expect(svg).toContain(colores.claro);
  });

  it('una URL distinta da un dibujo distinto', async () => {
    const colores = { oscuro: '#000000', claro: '#ffffff' };
    const a = await generarSvg('https://ejemplo.org/a', colores);
    const b = await generarSvg('https://ejemplo.org/b', colores);
    expect(a).not.toBe(b);
  });
});
