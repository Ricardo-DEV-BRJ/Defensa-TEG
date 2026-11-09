import { describe, expect, it } from 'vitest';
import { formatear, leerVariables, rellenarDatos, resolverDato } from '../src/core/datos.js';

const datos = {
  costos: { total: 56.1, subtotal: 51, rubros: [{ total: 36 }, { total: 15 }] },
  objetivos: { general: { verbo: 'Diseñar' } },
  'marco-legal': { ods: [{ numero: 2 }] },
};

describe('resolverDato', () => {
  it.each([
    ['costos.total', 56.1],
    ['costos.rubros.1.total', 15],
    ['objetivos.general.verbo', 'Diseñar'],
    ['marco-legal.ods.0.numero', 2],
  ])('%s → %s', (ruta, esperado) => {
    expect(resolverDato(datos, ruta)).toBe(esperado);
  });

  it.each(['costos.iva', 'costos.rubros.9.total', 'otro.total', '', undefined, 'costos.toString'])(
    'una ruta que no existe (%s) → undefined',
    (ruta) => {
      expect(resolverDato(datos, ruta)).toBeUndefined();
    },
  );
});

describe('formatear (es-VE)', () => {
  it.each([
    [56.1, 'usd', 'USD 56,10'],
    [56.1, 'decimal', '56,10'],
    [1140, 'numero', '1.140'],
    [75, 'porcentaje', '75%'],
    [2.5, 'numero', '2,5'],
    ['Diseñar', undefined, 'Diseñar'],
    [24, 'texto', '24'],
    [['a', 'b', 'c'], 'cantidad', '3'],
    [{ 1: 'x', 2: 'y', 3: 'z', 4: 'w' }, 'cantidad', '4'],
  ])('%s con formato %s → %s', (valor, formato, esperado) => {
    expect(formatear(valor, formato)).toBe(esperado);
  });

  it.each([
    ['USD 56,10', 'usd'],
    [undefined, 'texto'],
    [{ a: 1 }, 'texto'],
    [Number.NaN, 'numero'],
    [56.1, 'moneda-inventada'],
    ['tres', 'cantidad'],
    [null, 'cantidad'],
  ])('%s no sirve para el formato %s → null', (valor, formato) => {
    expect(formatear(valor, formato)).toBeNull();
  });
});

describe('leerVariables', () => {
  it('lee pares nombre=ruta separados por espacios', () => {
    expect(leerVariables(' acuerdo=likert.items.6.acuerdo_pct  neutral=a.b ')).toEqual([
      { nombre: 'acuerdo', ruta: 'likert.items.6.acuerdo_pct' },
      { nombre: 'neutral', ruta: 'a.b' },
    ]);
  });

  it.each(['', '   ', 'acuerdo', 'acuerdo=', '=a.b', 'Acuerdo=a.b', 'a=b=c', undefined])(
    '%s está mal escrito → null',
    (texto) => {
      expect(leerVariables(texto)).toBeNull();
    },
  );
});

describe('rellenarDatos', () => {
  const crearElemento = (dato, formato) => ({
    dataset: { dato, ...(formato ? { formato } : {}) },
    textContent: '',
  });

  it('pasa números a variables CSS con data-vars y marca los que no son números', () => {
    const propiedades = new Map();
    const atributos = new Map();
    const fila = {
      dataset: { vars: 'total=costos.total texto=objetivos.general.verbo' },
      style: { setProperty: (nombre, valor) => propiedades.set(nombre, valor) },
      setAttribute: (nombre, valor) => atributos.set(nombre, valor),
    };
    const raiz = { querySelectorAll: (selector) => (selector === '[data-vars]' ? [fila] : []) };

    const rotos = rellenarDatos(raiz, datos);

    expect(propiedades.get('--total')).toBe('56.1');
    expect(atributos.get('data-var-total')).toBe('56.1');
    expect(propiedades.has('--texto')).toBe(false);
    expect(rotos).toEqual(['objetivos.general.verbo']);
    expect('datoRoto' in fila.dataset).toBe(true);
  });

  it('escribe cada valor con su formato y marca los que no existen', () => {
    const total = crearElemento('costos.total', 'usd');
    const verbo = crearElemento('objetivos.general.verbo');
    const roto = crearElemento('costos.iva', 'usd');
    const raiz = {
      querySelectorAll: (selector) => (selector === '[data-dato]' ? [total, verbo, roto] : []),
    };

    const rotos = rellenarDatos(raiz, datos);

    expect(total.textContent).toBe('USD 56,10');
    expect(verbo.textContent).toBe('Diseñar');
    expect(roto.textContent).toBe('¿costos.iva?');
    expect('datoRoto' in roto.dataset).toBe(true);
    expect('datoRoto' in total.dataset).toBe(false);
    expect(rotos).toEqual(['costos.iva']);
  });
});
