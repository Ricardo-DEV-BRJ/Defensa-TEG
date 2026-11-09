// Impresión y PDF (RF-10): src/styles/print.css y su conexión con el deck.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const leer = (ruta) => readFileSync(new URL(`../${ruta}`, import.meta.url), 'utf8');
const print = leer('src/styles/print.css');
const tokens = leer('src/styles/tokens.css');
const token = (nombre) => tokens.match(new RegExp(`--${nombre}:\\s*([^;]+);`))[1].trim();

describe('print.css', () => {
  it('la página mide lo mismo que el escenario (16:9) y no tiene márgenes', () => {
    const pagina = print.match(/@page\s*\{([^}]*)\}/)[1];
    expect(pagina).toMatch(
      new RegExp(`size:\\s*${token('escenario-ancho')}\\s+${token('escenario-alto')}`),
    );
    expect(pagina).toMatch(/margin:\s*0/);
    expect(parseFloat(token('escenario-ancho')) / parseFloat(token('escenario-alto'))).toBeCloseTo(
      16 / 9,
      5,
    );
  });

  it('pone cada lámina principal en su página y no imprime la reserva', () => {
    expect(print).toMatch(/\.lamina\[data-reserva\]\s*\{\s*display:\s*none/);
    expect(print).toMatch(
      /\.lamina:not\(\[data-reserva\]\) ~ \.lamina:not\(\[data-reserva\]\)\s*\{\s*break-before:\s*page/,
    );
  });

  it('muestra todos los fragmentos e imprime los fondos', () => {
    expect(print).toMatch(
      /\[data-fragment\]\s*\{\s*opacity:\s*1 !important;\s*visibility:\s*visible/,
    );
    expect(print).toMatch(/print-color-adjust:\s*exact/);
  });

  it('oculta lo que solo sirve en vivo (demostraciones, recuadro del Gantt, paquetes, guías)', () => {
    for (const selector of ['.demo', '.gantt__detalle', '.flujo__paquetes', '.ir-a']) {
      expect(print).toContain(selector);
    }
  });

  it('se carga en la vista del proyector', () => {
    expect(leer('index.html')).toContain('href="/src/styles/print.css"');
  });
});

describe('estado final al imprimir', () => {
  it('main.js prepara la impresión en beforeprint y la deshace en afterprint', () => {
    const main = leer('src/main.js');
    expect(main).toMatch(/addEventListener\('beforeprint', \(\) => deck\.prepararImpresion\(\)\)/);
    expect(main).toMatch(/addEventListener\('afterprint', \(\) => deck\.terminarImpresion\(\)\)/);
  });
});
