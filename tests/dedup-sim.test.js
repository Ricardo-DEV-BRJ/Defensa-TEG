// Lógica pura del simulador de duplicados (lámina 14, src/components/dedup-sim.js).
import { describe, expect, it } from 'vitest';
import arquitectura from '../data/arquitectura.json';
import {
  anularVenta,
  calcularTiempos,
  claveVenta,
  esPosibleDuplicado,
  estadoInicial,
  importarVentas,
  puedeAnular,
  puedeDespachar,
  simular,
  textoIntervalo,
  ventasDelCorte,
} from '../src/components/dedup-sim.js';

const { deduplicacion } = arquitectura;
const INTERVALO = deduplicacion.intervalo_sugerido_segundos;
const ADMIN = deduplicacion.rol_que_anula;

const venta = (id, segundo, cambios = {}) => ({
  id,
  segundo,
  cliente: 'Cliente 1',
  productos: [
    { producto: 'Producto A', cantidad: 2 },
    { producto: 'Producto B', cantidad: 1 },
  ],
  monto: 45,
  ...cambios,
});

describe('claveVenta', () => {
  it('no depende del orden de las líneas, de mayúsculas ni de espacios', () => {
    const otra = venta('V-2', 0, {
      cliente: ' cliente 1 ',
      productos: [
        { producto: 'producto b', cantidad: 1 },
        { producto: 'PRODUCTO A', cantidad: 2 },
      ],
    });
    expect(claveVenta(otra)).toBe(claveVenta(venta('V-1', 0)));
  });

  it('compara el monto en centavos (sin errores de coma flotante)', () => {
    expect(claveVenta(venta('V-1', 0, { monto: 0.1 + 0.2 }))).toBe(
      claveVenta(venta('V-2', 0, { monto: 0.3 })),
    );
  });
});

describe('esPosibleDuplicado', () => {
  it(`igual cliente, productos, cantidades y monto en menos de ${INTERVALO} s → sí`, () => {
    expect(esPosibleDuplicado(venta('V-1', 0), venta('V-2', INTERVALO - 1), INTERVALO)).toBe(true);
  });

  it(`a los ${INTERVALO} s justos o más → no («en menos de»)`, () => {
    expect(esPosibleDuplicado(venta('V-1', 0), venta('V-2', INTERVALO), INTERVALO)).toBe(false);
  });

  it.each([
    ['otro cliente', { cliente: 'Cliente 2' }],
    ['otro producto', { productos: [{ producto: 'Producto C', cantidad: 2 }] }],
    [
      'otra cantidad',
      {
        productos: [
          { producto: 'Producto A', cantidad: 3 },
          { producto: 'Producto B', cantidad: 1 },
        ],
      },
    ],
    ['otro monto', { monto: 45.01 }],
  ])('con %s → no', (_, cambios) => {
    expect(esPosibleDuplicado(venta('V-1', 0), venta('V-2', 5, cambios), INTERVALO)).toBe(false);
  });
});

describe('importarVentas', () => {
  it('importa en orden de registro: la primera es válida y la repetida, duplicado bloqueado', () => {
    const [primera, segunda] = importarVentas([venta('V-2', 12), venta('V-1', 0)], INTERVALO);
    expect(primera).toMatchObject({ id: 'V-1', estado: 'valida', despacho: 'liberado' });
    expect(segunda).toMatchObject({
      id: 'V-2',
      estado: 'duplicado',
      duplicadoDe: 'V-1',
      despacho: 'bloqueado',
    });
    expect([primera, segunda].map(puedeDespachar)).toEqual([true, false]);
  });

  it('en una serie, cada repetición apunta a la primera venta', () => {
    const importadas = importarVentas(
      [venta('V-1', 0), venta('V-2', 50), venta('V-3', 100)],
      INTERVALO,
    );
    expect(importadas.map((v) => v.duplicadoDe)).toEqual([null, 'V-1', 'V-1']);
  });

  it('dos ventas iguales separadas por el intervalo o más son dos ventas válidas', () => {
    const importadas = importarVentas([venta('V-1', 0), venta('V-2', INTERVALO)], INTERVALO);
    expect(importadas.every((v) => v.estado === 'valida')).toBe(true);
  });

  it('no modifica las ventas recibidas', () => {
    const ventas = [venta('V-1', 0), venta('V-2', 1)];
    importarVentas(ventas, INTERVALO);
    expect(ventas[1]).not.toHaveProperty('estado');
  });

  it.each([0, -5, Number.NaN, undefined])('rechaza un intervalo no válido (%s)', (intervalo) => {
    expect(() => importarVentas([venta('V-1', 0)], intervalo)).toThrow();
  });
});

describe('anularVenta', () => {
  const importadas = importarVentas([venta('V-1', 0), venta('V-2', 12)], INTERVALO);
  const roles = arquitectura.modelo.gobernanza.roles;

  it(`solo ${ADMIN} puede anular (TEG 6.4.2 y Tabla 18)`, () => {
    expect(roles.filter((rol) => puedeAnular(rol, ADMIN))).toEqual([ADMIN]);
  });

  it('con otro rol no cambia nada y explica el motivo', () => {
    for (const rol of roles.filter((r) => r !== ADMIN)) {
      const resultado = anularVenta(importadas, 'V-2', rol, ADMIN);
      expect(resultado).toMatchObject({ ok: false, motivo: 'sin-permiso' });
      expect(resultado.ventas).toBe(importadas);
    }
  });

  it(`${ADMIN} la anula: queda cancelada y no se despacha`, () => {
    const { ok, ventas } = anularVenta(importadas, 'V-2', ADMIN, ADMIN);
    expect(ok).toBe(true);
    expect(ventas[1]).toMatchObject({
      estado: 'anulada',
      despacho: 'cancelado',
      anuladaPor: ADMIN,
    });
    expect(puedeDespachar(ventas[1])).toBe(false);
    expect(ventas[0]).toBe(importadas[0]);
  });

  it('una venta válida o inexistente no se anula', () => {
    expect(anularVenta(importadas, 'V-1', ADMIN, ADMIN).motivo).toBe('no-es-duplicado');
    expect(anularVenta(importadas, 'V-9', ADMIN, ADMIN).motivo).toBe('no-existe');
  });
});

describe('simulación con los datos de arquitectura.json', () => {
  const config = {
    ejemplo: deduplicacion.ejemplo_demo,
    intervaloSegundos: INTERVALO,
    rolQueAnula: ADMIN,
  };

  it('el rol que anula existe en la gobernanza y la venta de ejemplo se repite dentro del intervalo', () => {
    expect(arquitectura.modelo.gobernanza.roles).toContain(ADMIN);
    expect(deduplicacion.ejemplo_demo.segundos_entre_ventas).toBeLessThan(INTERVALO);
  });

  it('la caja emite dos ventas iguales con distinto id', () => {
    const [a, b] = ventasDelCorte(deduplicacion.ejemplo_demo);
    expect(a.id).not.toBe(b.id);
    expect(claveVenta(a)).toBe(claveVenta(b));
  });

  it('corte de luz → vuelve la luz → la segunda queda bloqueada → otro rol no puede → Administración sí', () => {
    let estado = simular(estadoInicial(), { tipo: 'cortar-luz' }, config);
    expect(estado).toMatchObject({ fase: 'sin-luz', importadas: [] });
    expect(estado.caja).toHaveLength(2);

    estado = simular(estado, { tipo: 'volver-luz' }, config);
    expect(estado.fase).toBe('importado');
    expect(estado.importadas.map((v) => v.despacho)).toEqual(['liberado', 'bloqueado']);

    estado = simular(estado, { tipo: 'anular', id: 'V-002', rol: 'Ventas' }, config);
    expect(estado.resultado).toMatchObject({ ok: false, motivo: 'sin-permiso' });
    expect(estado.importadas[1].despacho).toBe('bloqueado');

    estado = simular(estado, { tipo: 'anular', id: 'V-002', rol: ADMIN }, config);
    expect(estado.resultado.ok).toBe(true);
    expect(estado.importadas[1].despacho).toBe('cancelado');

    expect(simular(estado, { tipo: 'reiniciar' }, config)).toEqual(estadoInicial());
  });

  it('una acción fuera de su fase no cambia el estado', () => {
    const inicial = estadoInicial();
    expect(simular(inicial, { tipo: 'volver-luz' }, config)).toBe(inicial);
    expect(simular(inicial, { tipo: 'anular', id: 'V-002', rol: ADMIN }, config)).toBe(inicial);
    expect(simular(inicial, { tipo: 'otra' }, config)).toBe(inicial);
  });
});

describe('calcularTiempos', () => {
  it('las dos filas importadas terminan de aparecer en 1,5 s o menos', () => {
    const { despacho } = calcularTiempos(1, { retardo: 250, paso: 300 });
    expect(despacho.retardo + despacho.duracion).toBeLessThanOrEqual(1500);
  });
});

describe('textoIntervalo', () => {
  it.each([
    [900, '15 min'],
    [60, '1 min'],
    [45, '45 s'],
    [90, '90 s'],
  ])('%s s → %s', (segundos, esperado) => {
    expect(textoIntervalo(segundos)).toBe(esperado);
  });

  it('la ventana de los datos es la del prototipo: 15 minutos (Anexo 20, p. 246)', () => {
    expect(INTERVALO).toBe(900);
  });
});
