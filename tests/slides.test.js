import { describe, expect, it } from 'vitest';
import slides from '../data/slides.json';

const principales = slides.laminas.filter((lamina) => !lamina.reserva);
const reserva = slides.laminas.filter((lamina) => lamina.reserva);

describe('data/slides.json', () => {
  it('numera las láminas de 1 a 21 sin saltos', () => {
    const ids = slides.laminas.map((lamina) => lamina.id);
    expect(ids).toEqual(Array.from({ length: 21 }, (_, i) => i + 1));
  });

  it('tiene 17 láminas principales y las de reserva son la 18 a la 21, al final', () => {
    expect(principales).toHaveLength(17);
    expect(reserva.map((lamina) => lamina.id)).toEqual([18, 19, 20, 21]);
  });

  it('el archivo de cada lámina empieza por su número con dos cifras', () => {
    for (const { id, archivo } of slides.laminas) {
      expect(archivo.startsWith(`${String(id).padStart(2, '0')}-`), archivo).toBe(true);
    }
  });

  it('los tiempos de las principales suman la duración objetivo y las de reserva no suman', () => {
    const total = principales.reduce((suma, lamina) => suma + lamina.segundos, 0);
    expect(total).toBe(slides.duracion_objetivo_segundos);
    expect(reserva.every((lamina) => lamina.segundos === 0)).toBe(true);
  });
});
