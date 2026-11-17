// Cifras de la lámina 21 (data/construccion.json) frente al repositorio (ADR-018).
// Si falla «está al día», ejecuta: npm run metricas
import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import construccion from '../data/construccion.json';
import slides from '../data/slides.json';
import paquete from '../package.json';
import {
  contarComponentes,
  contarDecisiones,
  direccionesDelRepositorio,
} from '../scripts/metricas.mjs';

const raiz = new URL('../', import.meta.url);
const leer = (ruta) => readFileSync(new URL(ruta, raiz), 'utf8');

describe('lógica de scripts/metricas.mjs', () => {
  it('cuenta los encabezados «## ADR-n», no las menciones', () => {
    expect(contarDecisiones('## ADR-001 · A\ntexto ADR-002\n## ADR-003 · B\n### ADR-4')).toBe(2);
  });

  it('comun.js no es un componente', () => {
    expect(contarComponentes(['bar-chart.js', 'comun.js', 'gantt.js', 'notas.md'])).toBe(2);
  });

  it.each([
    [
      'https://github.com/Usuario/Repo.git',
      'https://github.com/Usuario/Repo',
      'https://usuario.github.io/Repo/',
    ],
    [
      'git@github.com:Usuario/Repo.git',
      'https://github.com/Usuario/Repo',
      'https://usuario.github.io/Repo/',
    ],
  ])('direcciones a partir de %s', (remoto, repositorio, sitio) => {
    expect(direccionesDelRepositorio(remoto)).toEqual({ repositorio, sitio });
  });

  it('un remoto que no es de GitHub no da direcciones', () => {
    expect(direccionesDelRepositorio('https://ejemplo.org/repo.git')).toBeNull();
  });
});

describe('data/construccion.json está al día (si falla: npm run metricas)', () => {
  it('decisiones = ADR de docs/decisiones.md', () => {
    expect(construccion.decisiones).toBe(contarDecisiones(leer('docs/decisiones.md')));
  });

  it('componentes y módulos del motor = archivos de src/components y src/core', () => {
    expect(construccion.componentes).toBe(
      contarComponentes(readdirSync(new URL('src/components', raiz))),
    );
    expect(construccion.modulos_motor).toBe(
      readdirSync(new URL('src/core', raiz)).filter((n) => n.endsWith('.js')).length,
    );
  });

  it('láminas principales y de reserva = data/slides.json', () => {
    expect(construccion.laminas_principales).toBe(slides.laminas.filter((l) => !l.reserva).length);
    expect(construccion.laminas_reserva).toBe(slides.laminas.filter((l) => l.reserva).length);
  });

  it('librerías en tiempo de ejecución = dependencias de package.json (cero)', () => {
    expect(construccion.dependencias_en_ejecucion).toBe(
      Object.keys(paquete.dependencies ?? {}).length,
    );
    expect(construccion.dependencias_en_ejecucion).toBe(0);
  });

  it('las pruebas y los commits son números positivos medidos', () => {
    expect(Number.isInteger(construccion.pruebas) && construccion.pruebas > 0).toBe(true);
    expect(Number.isInteger(construccion.commits) && construccion.commits > 0).toBe(true);
  });
});

describe('lámina de reserva 21', () => {
  const entrada = slides.laminas.find((lamina) => lamina.id === 21);

  it('existe, es de reserva y toma sus cifras de construccion.json', () => {
    expect(entrada.reserva).toBe(true);
    const html = leer(`src/slides/${entrada.archivo}`);
    for (const campo of ['pruebas', 'componentes', 'decisiones', 'dependencias_en_ejecucion']) {
      expect(html).toContain(`data-dato="construccion.${campo}"`);
    }
  });
});
