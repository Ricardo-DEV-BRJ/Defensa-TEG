// Genera el código QR de la lámina 17 (cierre) como un SVG estático (ADR-009).
// Uso: npm run qr -- https://ejemplo.org/ruta
// Escribe public/img/qr.svg con los colores de tokens.css y guarda la URL en data/cierre.json.
// Se ejecuta en desarrollo: la presentación solo muestra la imagen, sin internet ni librerías.
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import QRCode from 'qrcode';

const raiz = new URL('../', import.meta.url);

/**
 * Devuelve la URL normalizada si es una dirección http o https válida; si no, null.
 * @param {unknown} texto
 * @returns {string | null}
 */
export function validarUrl(texto) {
  try {
    const url = new URL(String(texto ?? '').trim());
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : null;
  } catch {
    return null;
  }
}

/**
 * Texto que se lee bajo el QR: la URL sin «https://», sin «www.» y sin la barra final.
 * @param {string} url una URL ya validada
 * @returns {string}
 */
export function textoVisible(url) {
  return url
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/$/, '');
}

/**
 * Lee de tokens.css un color escrito como #rrggbb.
 * @param {string} tokensCss contenido de src/styles/tokens.css
 * @param {string} nombre nombre del token sin los guiones iniciales (color-texto)
 * @returns {string} el color en minúsculas
 */
export function leerColor(tokensCss, nombre) {
  const encontrado = tokensCss.match(new RegExp(`--${nombre}\\s*:\\s*(#[0-9a-f]{6})\\b`, 'i'));
  if (!encontrado) throw new Error(`tokens.css no define --${nombre} como #rrggbb`);
  return encontrado[1].toLowerCase();
}

/**
 * Dibuja el QR como texto SVG. Corrección de errores M (15 %) y el margen de 4 módulos que
 * piden los lectores.
 * @param {string} url
 * @param {{ oscuro: string, claro: string }} colores
 * @returns {Promise<string>}
 */
export function generarSvg(url, { oscuro, claro }) {
  return QRCode.toString(url, {
    type: 'svg',
    errorCorrectionLevel: 'M',
    margin: 4,
    color: { dark: oscuro, light: claro },
  });
}

async function principal() {
  const url = validarUrl(process.argv[2]);
  if (!url) {
    console.error('Uso: npm run qr -- https://…   (la URL debe empezar por http:// o https://)');
    process.exitCode = 1;
    return;
  }
  const tokens = readFileSync(new URL('src/styles/tokens.css', raiz), 'utf8');
  const svg = await generarSvg(url, {
    oscuro: leerColor(tokens, 'color-texto'),
    claro: leerColor(tokens, 'color-fondo'),
  });
  writeFileSync(new URL('public/img/qr.svg', raiz), svg);
  const cierre = { qr: { url, texto: textoVisible(url), archivo: 'img/qr.svg' } };
  writeFileSync(new URL('data/cierre.json', raiz), `${JSON.stringify(cierre, null, 2)}\n`);
  console.log(`QR listo para ${url}: public/img/qr.svg y data/cierre.json.`);
  console.log('Falta mostrarlo: en src/slides/17-cierre.html, cambia el comentario «QR» por:');
  console.log(`  <figure class="plantilla-cierre__qr">
    <img src="img/qr.svg" alt="Código QR" />
    <figcaption data-dato="cierre.qr.texto"></figcaption>
  </figure>`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await principal();
}
