import { describe, expect, it } from 'vitest';
import { ESPERA_IR_A_MS, ESTADO_INICIAL, interpretarTecla } from '../src/core/keyboard.js';

const tecla = (key, extra = {}) => ({ key, ...extra });
const accionDe = (key, extra, contexto) =>
  interpretarTecla(tecla(key, extra), ESTADO_INICIAL, contexto).accion;

/** Presiona varias teclas seguidas y devuelve el último resultado. */
function secuencia(teclas, { ahora = 0, paso = 100, maxDigitos } = {}) {
  let estado = ESTADO_INICIAL;
  let r;
  teclas.forEach((key, i) => {
    r = interpretarTecla(tecla(key), estado, { ahora: ahora + i * paso, maxDigitos });
    estado = r.estado;
  });
  return r;
}

describe('mapa de teclas (RF-02 y RF-05)', () => {
  it.each([
    ['ArrowRight', 'siguiente'],
    [' ', 'siguiente'],
    ['PageDown', 'siguiente'],
    ['ArrowLeft', 'anterior'],
    ['PageUp', 'anterior'],
    ['o', 'vistaGeneral'],
    ['O', 'vistaGeneral'],
    ['f', 'pantallaCompleta'],
    ['b', 'pantallaNegra'],
    ['B', 'pantallaNegra'],
    ['.', 'pantallaNegra'],
    ['p', 'abrirPresentador'],
    ['t', 'reiniciarCronometro'],
    ['s', 'saltarAnimacion'],
    ['Escape', 'cerrar'],
    ['Enter', 'cerrar'],
  ])('%s → %s', (key, accion) => {
    const r = interpretarTecla(tecla(key), ESTADO_INICIAL);
    expect(r.accion).toBe(accion);
    expect(r.consumida).toBe(true);
  });

  it('una tecla sin función no hace nada ni anula al navegador', () => {
    const r = interpretarTecla(tecla('x'), ESTADO_INICIAL);
    expect(r.accion).toBeNull();
    expect(r.consumida).toBe(false);
  });

  it('ignora las combinaciones con Ctrl, Alt o Meta', () => {
    expect(accionDe('ArrowRight', { ctrlKey: true })).toBeNull();
    expect(accionDe('f', { altKey: true })).toBeNull();
    expect(accionDe('b', { metaKey: true })).toBeNull();
  });

  it('ignora la repetición de una tecla sostenida', () => {
    expect(accionDe('ArrowRight', { repeat: true })).toBeNull();
  });
});

describe('foco en controles', () => {
  it('con el foco en un campo o deslizador, solo AvPág y RePág navegan', () => {
    const enControl = { enControl: true };
    expect(accionDe('ArrowRight', {}, enControl)).toBeNull();
    expect(accionDe('s', {}, enControl)).toBeNull();
    expect(accionDe('PageDown', {}, enControl)).toBe('siguiente');
    expect(accionDe('PageUp', {}, enControl)).toBe('anterior');
  });

  it('con el foco en un botón, Espacio y Enter son del botón', () => {
    const enBoton = { enBoton: true };
    const espacio = interpretarTecla(tecla(' '), ESTADO_INICIAL, enBoton);
    expect(espacio.accion).toBeNull();
    expect(espacio.consumida).toBe(false);
    expect(accionDe('Enter', {}, enBoton)).toBeNull();
    expect(accionDe('ArrowRight', {}, enBoton)).toBe('siguiente');
  });
});

describe('ir a lámina (G + número + Enter)', () => {
  it('G 1 8 Enter → irA 18', () => {
    const r = secuencia(['g', '1', '8', 'Enter']);
    expect(r.accion).toBe('irA');
    expect(r.argumento).toBe(18);
    expect(r.estado).toEqual(ESTADO_INICIAL);
  });

  it('acepta G mayúscula y muestra los dígitos mientras se escriben', () => {
    expect(secuencia(['G', '1']).estado.digitos).toBe('1');
  });

  it('los dígitos no hacen nada fuera de la secuencia', () => {
    expect(secuencia(['1', '8', 'Enter']).accion).toBe('cerrar');
  });

  it('Retroceso borra el último dígito', () => {
    expect(secuencia(['g', '1', '8', 'Backspace', 'Enter']).argumento).toBe(1);
  });

  it('acepta como máximo maxDigitos cifras (2 con 20 láminas)', () => {
    expect(secuencia(['g', '1', '2', '3', 'Enter'], { maxDigitos: 2 }).argumento).toBe(12);
  });

  it('sin maxDigitos no limita las cifras', () => {
    expect(secuencia(['g', '1', '2', '3', 'Enter']).argumento).toBe(123);
  });

  it('Enter sin dígitos solo cancela', () => {
    const r = secuencia(['g', 'Enter']);
    expect(r.accion).toBeNull();
    expect(r.estado).toEqual(ESTADO_INICIAL);
  });

  it('Esc cancela', () => {
    const r = secuencia(['g', '5', 'Escape']);
    expect(r.accion).toBeNull();
    expect(r.estado).toEqual(ESTADO_INICIAL);
  });

  it('otra tecla cancela la secuencia y hace lo suyo', () => {
    const r = secuencia(['g', '5', 'ArrowRight']);
    expect(r.accion).toBe('siguiente');
    expect(r.estado).toEqual(ESTADO_INICIAL);
  });

  it(`se cancela si pasan más de ${ESPERA_IR_A_MS} ms entre teclas`, () => {
    const g = interpretarTecla(tecla('g'), ESTADO_INICIAL, { ahora: 0 });
    const tarde = interpretarTecla(tecla('5'), g.estado, { ahora: ESPERA_IR_A_MS + 1 });
    expect(tarde.accion).toBeNull();
    expect(tarde.estado).toEqual(ESTADO_INICIAL);
  });

  it('cada tecla reinicia la espera', () => {
    const r = secuencia(['g', '1', '8', 'Enter'], { paso: ESPERA_IR_A_MS - 1 });
    expect(r.argumento).toBe(18);
  });
});
