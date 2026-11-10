// Cifras de la lámina de reserva 21 («Cómo se construyó esta presentación»), medidas en el propio
// repositorio: pruebas (ejecuta Vitest), componentes, módulos del motor, decisiones (ADR),
// dependencias en tiempo de ejecución, láminas, commits y direcciones del repositorio y del sitio.
// Uso: npm run metricas   → escribe data/construccion.json (ADR-018).
// Nada se escribe a mano: tests/construccion.test.js comprueba que el archivo siga al día.
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = fileURLToPath(new URL('../', import.meta.url));
const leer = (ruta) => readFileSync(join(raiz, ruta), 'utf8');

// ── Lógica pura ──────────────────────────────────────────────────────────────

/**
 * Cuántas decisiones registra docs/decisiones.md (encabezados «## ADR-n»).
 * @param {string} texto
 */
export function contarDecisiones(texto) {
  return (texto.match(/^## ADR-\d+/gm) ?? []).length;
}

/**
 * Archivos de src/components/ que son componentes (comun.js son utilidades compartidas).
 * @param {string[]} archivos nombres de archivo
 */
export function contarComponentes(archivos) {
  return archivos.filter((nombre) => nombre.endsWith('.js') && nombre !== 'comun.js').length;
}

/**
 * Direcciones públicas a partir del remoto de git (HTTPS o SSH de GitHub).
 * @param {string} remoto por ejemplo https://github.com/Usuario/Repo.git
 * @returns {{ repositorio: string, sitio: string } | null}
 */
export function direccionesDelRepositorio(remoto) {
  const partes = String(remoto)
    .trim()
    .match(/github\.com[/:]([^/]+)\/(.+?)(?:\.git)?\/?$/);
  if (!partes) return null;
  const [, usuario, repo] = partes;
  return {
    repositorio: `https://github.com/${usuario}/${repo}`,
    sitio: `https://${usuario.toLowerCase()}.github.io/${repo}/`,
  };
}

// ── Medición ─────────────────────────────────────────────────────────────────

function medirPruebas() {
  const carpeta = mkdtempSync(join(tmpdir(), 'metricas-'));
  const salida = join(carpeta, 'vitest.json');
  try {
    const vitest = join(raiz, 'node_modules', 'vitest', 'vitest.mjs');
    spawnSync(process.execPath, [vitest, 'run', '--reporter=json', `--outputFile=${salida}`], {
      cwd: raiz,
      stdio: 'ignore',
    });
    const informe = JSON.parse(readFileSync(salida, 'utf8'));
    if (informe.numFailedTests > 0) throw new Error(`${informe.numFailedTests} pruebas fallan`);
    return { pruebas: informe.numTotalTests, archivos_de_prueba: informe.testResults.length };
  } finally {
    rmSync(carpeta, { recursive: true, force: true });
  }
}

function git(...argumentos) {
  return execFileSync('git', argumentos, { cwd: raiz, encoding: 'utf8' }).trim();
}

function medir() {
  const slides = JSON.parse(leer('data/slides.json'));
  const paquete = JSON.parse(leer('package.json'));
  const direcciones = direccionesDelRepositorio(git('remote', 'get-url', 'origin'));
  return {
    fuente: 'Generado con npm run metricas (scripts/metricas.mjs) a partir del repositorio',
    fecha: new Date().toISOString().slice(0, 10),
    ...medirPruebas(),
    componentes: contarComponentes(readdirSync(join(raiz, 'src/components'))),
    modulos_motor: readdirSync(join(raiz, 'src/core')).filter((n) => n.endsWith('.js')).length,
    decisiones: contarDecisiones(leer('docs/decisiones.md')),
    dependencias_en_ejecucion: Object.keys(paquete.dependencies ?? {}).length,
    laminas_principales: slides.laminas.filter((lamina) => !lamina.reserva).length,
    laminas_reserva: slides.laminas.filter((lamina) => lamina.reserva).length,
    commits: Number(git('rev-list', '--count', 'HEAD')),
    repositorio: direcciones?.repositorio ?? null,
    sitio: direcciones?.sitio ?? null,
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const metricas = medir();
  writeFileSync(join(raiz, 'data/construccion.json'), `${JSON.stringify(metricas, null, 2)}\n`);
  console.log('data/construccion.json actualizado:');
  console.log(metricas);
}
