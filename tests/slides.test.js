import { describe, expect, it } from 'vitest';
import slides from '../data/slides.json';

const principales = slides.laminas.filter((lamina) => !lamina.reserva);
const reserva = slides.laminas.filter((lamina) => lamina.reserva);

describe('data/slides.json', () => {
  it('numera las láminas de 1 a 20 sin saltos', () => {
    const ids = slides.laminas.map((lamina) => lamina.id);
    expect(ids).toEqual(Array.from({ length: 20 }, (_, i) => i + 1));
  });

  it('tiene 16 láminas principales y las de reserva son la 17 a la 20', () => {
    expect(principales).toHaveLength(16);
    expect(reserva.map((lamina) => lamina.id)).toEqual([17, 18, 19, 20]);
  });

  it('los tiempos de las principales suman la duración objetivo y las de reserva no suman', () => {
    const total = principales.reduce((suma, lamina) => suma + lamina.segundos, 0);
    expect(total).toBe(slides.duracion_objetivo_segundos);
    expect(reserva.every((lamina) => lamina.segundos === 0)).toBe(true);
  });
});
