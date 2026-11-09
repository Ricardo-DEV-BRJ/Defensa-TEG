// Reglas de docs/identidad-visual.md y CLAUDE.md comprobadas sobre los archivos del proyecto.
import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import slides from '../data/slides.json';

const raiz = new URL('../', import.meta.url);
const leer = (ruta) => readFileSync(new URL(ruta, raiz), 'utf8');
const listar = (carpeta, { recursivo = false } = {}) =>
  readdirSync(new URL(carpeta, raiz), { recursive: recursivo })
    .map((archivo) => `${carpeta}${String(archivo).replaceAll('\\', '/')}`)
    .filter((ruta) => /\.(css|html|js)$/.test(ruta));

const tokensCss = leer('src/styles/tokens.css');
const tokens = Object.fromEntries(
  [...tokensCss.matchAll(/--([\w-]+)\s*:\s*([^;]+);/g)].map(([, nombre, valor]) => [
    nombre,
    valor.trim(),
  ]),
);

// Fila de la tabla de paleta: | `--color-texto` | `#13282b` | origen | uso | 14,5:1 |
const paleta = [
  ...leer('docs/identidad-visual.md').matchAll(
    /\|\s*`--(color-[\w-]+)`\s*\|\s*`(#[0-9a-f]{6})`\s*\|[^|]*\|[^|]*\|\s*([\d,]+):1\s*\|/gi,
  ),
].map(([, nombre, hex, contraste]) => ({
  nombre,
  hex,
  contraste: Number(contraste.replace(',', '.')),
}));

// Contraste WCAG 2.x entre dos colores #rrggbb.
function luminancia(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const canal = parseInt(hex.slice(i, i + 2), 16) / 255;
    return canal <= 0.03928 ? canal / 12.92 : ((canal + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contraste(a, b) {
  const [clara, oscura] = [luminancia(a), luminancia(b)].sort((x, y) => y - x);
  return (clara + 0.05) / (oscura + 0.05);
}

// Archivos que no son tokens.css: estilos, láminas, plantillas y código.
const archivosFuente = [
  ...listar('src/', { recursivo: true }),
  'index.html',
  'presenter.html',
  'galeria.html',
].filter((ruta) => ruta !== 'src/styles/tokens.css');
const contenido = Object.fromEntries(archivosFuente.map((ruta) => [ruta, leer(ruta)]));
const quienes = (patron) => archivosFuente.filter((ruta) => patron.test(contenido[ruta]));

describe('paleta', () => {
  it('tokens.css tiene exactamente los 7 colores con contraste de identidad-visual.md', () => {
    expect(paleta).toHaveLength(7);
    for (const { nombre, hex } of paleta) expect(tokens[nombre]?.toLowerCase()).toBe(hex);
  });

  it('el fondo de lámina es el documentado', () => {
    expect(leer('docs/identidad-visual.md')).toContain(`\`${tokens['color-fondo']}\``);
  });

  it('el contraste documentado coincide con el calculado', () => {
    for (const { nombre, contraste: documentado } of paleta) {
      const calculado = contraste(tokens[nombre], tokens['color-fondo']);
      expect(Number(calculado.toFixed(1)), nombre).toBe(documentado);
    }
  });

  it.each([
    'color-texto',
    'color-primario',
    'color-alerta',
    'color-exito-texto',
    'color-secundario',
  ])('%s sirve para texto (AA, ≥ 4,5:1)', (nombre) => {
    expect(contraste(tokens[nombre], tokens['color-fondo'])).toBeGreaterThanOrEqual(4.5);
  });

  it('el ámbar, solo para formas con etiqueta, llega a 3:1', () => {
    expect(contraste(tokens['color-advertencia'], tokens['color-fondo'])).toBeGreaterThanOrEqual(3);
  });
});

describe('uso de los tokens', () => {
  it('fuera de tokens.css no hay colores escritos a mano', () => {
    expect(quienes(/#[0-9a-f]{3}(?:[0-9a-f]{3})?(?:[0-9a-f]{2})?\b|\b(?:rgba?|hsla?)\(/i)).toEqual(
      [],
    );
  });

  it('el verde acento nunca se usa como color de texto', () => {
    // color: siempre es texto. fill: solo es texto si la regla apunta a <text> o <tspan> de SVG;
    // como relleno de una forma (íconos, marcas) el acento está permitido.
    const comoColor = /(?:^|[^-\w])color\s*:\s*var\(--color-acento\)/m;
    const comoRelleno = /(?:^|[^-\w])fill\s*:\s*var\(--color-acento\)/m;
    const reglasCss = (css) => [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)];
    const rellenaTexto = (css) =>
      reglasCss(css).some(
        ([, selector, cuerpo]) => comoRelleno.test(cuerpo) && /\b(?:text|tspan)\b/.test(selector),
      );
    expect(quienes(comoColor)).toEqual([]);
    expect(tokensCss).not.toMatch(comoColor);
    expect(archivosFuente.filter((ruta) => rellenaTexto(contenido[ruta]))).toEqual([]);
    expect(quienes(/<(?:text|tspan)[^>]*fill="[^"]*acento/)).toEqual([]);
  });

  it('ningún tamaño de letra de tokens.css es menor que 28 px', () => {
    const tamanos = Object.entries(tokens).filter(([nombre]) => nombre.startsWith('texto-'));
    expect(tamanos.length).toBeGreaterThan(0);
    for (const [nombre, valor] of tamanos) {
      expect(Number.parseFloat(valor), nombre).toBeGreaterThanOrEqual(28);
    }
  });

  it('fuera de tokens.css, tamaños de letra y espaciados no se escriben en px', () => {
    const enPx =
      /(?:font-size|margin|padding|gap|inset|top|right|bottom|left)[\w-]*\s*:\s*[^;{}]*\d+px/;
    expect(quienes(enPx)).toEqual([]);
  });

  it('las láminas y plantillas no usan estilos en línea', () => {
    const laminas = archivosFuente.filter((ruta) => ruta.startsWith('src/slides/'));
    expect(laminas.filter((ruta) => /\sstyle\s*=/.test(contenido[ruta]))).toEqual([]);
  });
});

describe('isologo UVM', () => {
  it('solo aparece en la primera lámina (portada) y en la última principal (cierre)', () => {
    const principales = slides.laminas.filter((lamina) => !lamina.reserva);
    const permitidas = [principales[0], principales.at(-1)].map(
      (lamina) => `src/slides/${lamina.archivo}`,
    );
    const laminas = listar('src/slides/'); // sin recorrer src/slides/plantillas/
    const conIsologo = laminas.filter((ruta) => contenido[ruta].includes('uvm-isologo'));
    expect(conIsologo.filter((ruta) => !permitidas.includes(ruta))).toEqual([]);
  });

  it('se dimensiona solo por el alto, para no deformarlo', () => {
    const regla = leer('src/styles/plantillas.css').match(/\.isologo\s*\{([^}]*)\}/)?.[1] ?? '';
    expect(regla).toMatch(/height\s*:\s*var\(--isologo-alto\)/);
    expect(regla).toMatch(/width\s*:\s*auto/);
  });
});
