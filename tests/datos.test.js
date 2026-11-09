// Coherencia interna de data/*.json (lo que revisa /verificar-datos, ahora en cada npm test).
// Los tiempos de slides.json se comprueban en tests/slides.test.js.
import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import arquitectura from '../data/arquitectura.json';
import costos from '../data/costos.json';
import cronograma from '../data/cronograma.json';
import likert from '../data/likert.json';
import marcoLegal from '../data/marco-legal.json';
import metodologia from '../data/metodologia.json';
import objetivos from '../data/objetivos.json';
import slides from '../data/slides.json';
import { formatear, leerVariables, resolverDato } from '../src/core/datos.js';

const centavos = (valor) => Math.round(valor * 100) / 100;
const sumar = (lista) => lista.reduce((total, valor) => total + valor, 0);

describe('likert.json', () => {
  it.each(likert.items.map((item) => [item.id, item]))(
    'ítem %s: una frecuencia por alternativa y suman n',
    (_id, item) => {
      expect(item.frecuencias).toHaveLength(likert.alternativas.length);
      expect(sumar(item.frecuencias)).toBe(likert.n);
    },
  );

  it.each(likert.items.map((item) => [item.id, item]))(
    'ítem %s: los porcentajes declarados salen de las frecuencias',
    (_id, item) => {
      const [totalDes, des, neutral, de, totalDe] = item.frecuencias.map(
        (f) => (f / likert.n) * 100,
      );
      expect(item.desacuerdo_pct).toBe(totalDes + des);
      expect(item.neutral_pct).toBe(neutral);
      expect(item.acuerdo_pct).toBe(de + totalDe);
    },
  );

  it('n es el estrato operativo de metodologia.json', () => {
    const operativos = metodologia.poblacion.estratos.find((e) => e.estrato === 'Operativo');
    expect(likert.n).toBe(operativos.n);
  });
});

describe('costos.json', () => {
  it('en cada rubro con precio, cantidad × unitario = total', () => {
    for (const rubro of costos.rubros.filter((r) => r.cantidad !== null && r.unitario > 0)) {
      expect(centavos(rubro.cantidad * rubro.unitario), rubro.rubro).toBe(rubro.total);
    }
  });

  it('los rubros suman el subtotal', () => {
    expect(centavos(sumar(costos.rubros.map((r) => r.total)))).toBe(costos.subtotal);
  });

  it('la contingencia es el porcentaje declarado del subtotal', () => {
    expect(centavos((costos.subtotal * costos.contingencia_pct) / 100)).toBe(costos.contingencia);
  });

  it('el total es subtotal + contingencia = 56,10', () => {
    expect(centavos(costos.subtotal + costos.contingencia)).toBe(costos.total);
    expect(costos.total).toBe(56.1);
  });

  it('el recurrente anual es VPS (12 meses) + dominio, y el mensual es su doceava parte', () => {
    const { vps, dominio, total } = costos.recurrente_anual;
    const servidor = costos.rubros.find((r) => r.rubro.startsWith('Servidor'));
    expect(vps).toBe(centavos(servidor.unitario * 12));
    expect(centavos(vps + dominio)).toBe(total);
    expect(centavos(total / 12)).toBe(costos.ejemplo_pri.costo_recurrente_mensual);
  });

  it('con el ahorro supuesto, la inversión se recupera en menos de un mes', () => {
    const { ahorro_mensual_supuesto: ahorro, costo_recurrente_mensual: recurrente } =
      costos.ejemplo_pri;
    expect(costos.total / (ahorro - recurrente)).toBeLessThan(1);
  });
});

describe('metodologia.json', () => {
  it('el total del censo es la suma de los estratos', () => {
    const { total, estratos } = metodologia.poblacion;
    expect(sumar(estratos.map((e) => e.n))).toBe(total);
  });
});

describe('arquitectura.json', () => {
  it('el ejemplo de la calculadora da el SS y el PR esperados', () => {
    const { z, sigma_d, L, d_media, SS_esperado, PR_esperado } = arquitectura.formulas.ejemplo_demo;
    const ss = z * sigma_d * Math.sqrt(L);
    expect(centavos(ss)).toBe(SS_esperado);
    expect(centavos(d_media * L + ss)).toBe(PR_esperado);
  });

  it('la reducción de papel del Programa Sustentable coincide con la meta del cronograma', () => {
    const meta = cronograma.metas.find((m) => m.indicador.includes('papel'));
    const pct = arquitectura.modelo.programa_sustentable.reduccion_papel_pct;
    expect(meta.meta).toContain(`${pct}%`);
  });
});

describe('cronograma.json', () => {
  const { fases, metas, total_semanas, total_quincenas, total_meses } = cronograma;

  it('las semanas equivalen a las quincenas de la Tabla 24 y se reparten en meses enteros', () => {
    expect(total_semanas).toBe(total_quincenas * 2);
    expect(total_semanas % total_meses).toBe(0);
  });

  it('cada fase cabe en el plazo, dura al menos una semana y no empieza antes que la anterior', () => {
    fases.forEach((fase, i) => {
      expect(fase.inicio, fase.fase).toBeGreaterThanOrEqual(1);
      expect(fase.fin, fase.fase).toBeGreaterThanOrEqual(fase.inicio);
      expect(fase.fin, fase.fase).toBeLessThanOrEqual(total_semanas);
      if (i > 0) expect(fase.inicio, fase.fase).toBeGreaterThanOrEqual(fases[i - 1].inicio);
    });
    expect(fases[0].inicio).toBe(1);
    expect(Math.max(...fases.map((fase) => fase.fin))).toBe(total_semanas);
  });

  it('cada fase se solapa con la anterior («se solapan deliberadamente», TEG 6.6.2)', () => {
    for (let i = 1; i < fases.length; i++) {
      expect(fases[i].inicio, fases[i].fase).toBeLessThanOrEqual(fases[i - 1].fin);
    }
  });

  it('la cifra y el complemento que se muestran salen del texto literal de la Tabla 25', () => {
    for (const meta of metas.filter((m) => m.cifra)) {
      expect(meta.meta, meta.indicador).toContain(meta.cifra.match(/\d+%/)[0]);
      if (meta.complemento) {
        expect(`${meta.meta} ${meta.formula}`, meta.indicador).toContain(meta.complemento);
      }
    }
  });
});

describe('marco-legal.json', () => {
  const esEnteroPositivo = (valor) => Number.isInteger(valor) && valor > 0;

  it('ODS y artículos son enteros positivos', () => {
    expect(marcoLegal.ods.map((o) => o.numero).every(esEnteroPositivo)).toBe(true);
    for (const ley of marcoLegal.leyes) expect(ley.articulos.every(esEnteroPositivo)).toBe(true);
    const crbv = marcoLegal.factibilidad_legal.crbv.map((a) => a.articulo);
    expect(crbv.every(esEnteroPositivo)).toBe(true);
  });
});

describe('objetivos.json', () => {
  const sinPunto = (texto) => texto.replace(/\.$/, '');

  it('el objetivo general en pantalla es el del TEG (solo cambian mayúsculas)', () => {
    const { verbo, complemento, texto_teg: teg } = objetivos.general;
    expect(`${verbo} ${complemento}`.toLowerCase()).toBe(sinPunto(teg).toLowerCase());
  });

  it('cada objetivo específico en pantalla es exactamente el del TEG', () => {
    for (const { verbo, complemento, texto_teg: teg } of objetivos.especificos) {
      expect(`${verbo} ${complemento}`, verbo).toBe(sinPunto(teg));
    }
  });

  it('la lámina 3 muestra completos el objetivo general y los cuatro específicos', () => {
    const html = readFileSync(new URL('../src/slides/03-objetivos.html', import.meta.url), 'utf8');
    expect(html).toContain('data-dato="objetivos.general.complemento"');
    objetivos.especificos.forEach((_, i) => {
      expect(html).toContain(`data-dato="objetivos.especificos.${i}.complemento"`);
    });
  });

  it('las láminas 11 y 12 muestran literales las cuatro conclusiones y la general', () => {
    const html = [11, 12]
      .map((id) => slides.laminas.find((l) => l.id === id).archivo)
      .map((archivo) => readFileSync(new URL(`../src/slides/${archivo}`, import.meta.url), 'utf8'))
      .join('\n');
    objetivos.especificos.forEach((_, i) => {
      expect(html).toContain(`data-dato="objetivos.especificos.${i}.conclusion_teg"`);
    });
    expect(html).toContain('data-dato="objetivos.general.conclusion_teg"');
  });
});

describe('slides.json', () => {
  it('ningún texto cita un número de respuestas o ítems distinto del cuestionario', () => {
    const textos = slides.laminas.flatMap((l) => [l.titulo, l.pregunta, l.notas]);
    const citados = textos.flatMap((t) => [...t.matchAll(/(\d+)\s+(?:respuestas|ítems)/g)]);
    for (const [frase, numero] of citados) {
      expect(Number(numero), frase).toBe(likert.items.length);
    }
  });
});

describe('enlaces data-dato de las láminas', () => {
  // Todos los data/*.json, con la misma forma que arma main.js.
  const carpetaDatos = new URL('../data/', import.meta.url);
  const datos = Object.fromEntries(
    readdirSync(carpetaDatos)
      .filter((archivo) => archivo.endsWith('.json'))
      .map((archivo) => [
        archivo.replace(/\.json$/, ''),
        JSON.parse(readFileSync(new URL(archivo, carpetaDatos), 'utf8')),
      ]),
  );
  const carpetaLaminas = new URL('../src/slides/', import.meta.url);
  const enlaces = readdirSync(carpetaLaminas)
    .filter((archivo) => archivo.endsWith('.html'))
    .flatMap((archivo) => {
      const html = readFileSync(new URL(archivo, carpetaLaminas), 'utf8');
      return [...html.matchAll(/<[^>]*data-dato="([^"]+)"[^>]*>/g)].map(([etiqueta, ruta]) => ({
        archivo,
        ruta,
        formato: etiqueta.match(/data-formato="([^"]+)"/)?.[1],
      }));
    });

  it('cada data-dato de src/slides/ existe y sirve para su formato', () => {
    const rotos = enlaces.filter(
      ({ ruta, formato }) => formatear(resolverDato(datos, ruta), formato) === null,
    );
    expect(rotos.map(({ archivo, ruta }) => `${archivo}: ${ruta}`)).toEqual([]);
  });

  it('cada data-vars de src/slides/ está bien escrito y apunta a números', () => {
    const problemas = readdirSync(carpetaLaminas)
      .filter((archivo) => archivo.endsWith('.html'))
      .flatMap((archivo) => {
        const html = readFileSync(new URL(archivo, carpetaLaminas), 'utf8');
        return [...html.matchAll(/data-vars="([^"]+)"/g)].flatMap(([, texto]) => {
          const variables = leerVariables(texto);
          if (!variables) return [`${archivo}: ${texto}`];
          return variables
            .filter(({ ruta }) => typeof resolverDato(datos, ruta) !== 'number')
            .map(({ ruta }) => `${archivo}: ${ruta}`);
        });
      });
    expect(problemas).toEqual([]);
  });
});

describe('lámina 8 (bar-chart)', () => {
  const html = readFileSync(
    new URL('../src/slides/08-resultados-personal.html', import.meta.url),
    'utf8',
  );
  const destacados = likert.items.filter((item) => item.destacado_lamina_8);
  const gruposEnLamina = [...html.matchAll(/data-componente="bar-chart" data-grupo="(\d+)"/g)].map(
    ([, grupo]) => Number(grupo),
  );

  it('cada ítem destacado tiene resumen para pantalla y un grupo (paso) de la lámina', () => {
    for (const item of destacados) {
      expect(item.resumen, item.id).toBeTruthy();
      expect(gruposEnLamina, item.id).toContain(item.grupo_lamina_8);
    }
  });

  it('la lámina tiene un gráfico por grupo, y ningún grupo queda vacío', () => {
    const gruposEnDatos = [...new Set(destacados.map((item) => item.grupo_lamina_8))].sort();
    expect([...gruposEnLamina].sort()).toEqual(gruposEnDatos);
  });

  it('solo los ítems destacados tienen grupo', () => {
    const conGrupo = likert.items.filter((item) => 'grupo_lamina_8' in item);
    expect(conGrupo).toEqual(destacados);
  });
});

describe('lámina 16 (Gantt)', () => {
  const html = readFileSync(
    new URL('../src/slides/16-implementacion.html', import.meta.url),
    'utf8',
  );

  it('las filas las arma el componente gantt desde cronograma.json, no el HTML', () => {
    expect(html).toContain('data-componente="gantt"');
    expect(html).toContain('<ol class="gantt__filas"></ol>');
    expect(html).not.toMatch(/cronograma\.fases\.\d+\.inicio/);
  });
});
