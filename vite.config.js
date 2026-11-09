import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const ruta = (archivo) => fileURLToPath(new URL(archivo, import.meta.url));

export default defineConfig({
  // Rutas relativas en el build para abrir dist/ sin servidor (ADR-003).
  base: './',
  build: {
    // Vite 8 usa Rolldown: `rolldownOptions` reemplaza a `rollupOptions`.
    rolldownOptions: {
      input: {
        index: ruta('./index.html'), // vista del proyector
        presenter: ruta('./presenter.html'), // vista del presentador
      },
    },
  },
  test: {
    include: ['tests/**/*.test.js'],
  },
});
