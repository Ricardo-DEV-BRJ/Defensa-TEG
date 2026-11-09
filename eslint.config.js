import js from '@eslint/js';
import globals from 'globals';

export default [
  { ignores: ['dist/', 'coverage/', 'public/'] },
  js.configs.recommended,
  {
    // Código que corre en el navegador
    files: ['src/**/*.js'],
    languageOptions: { globals: globals.browser },
  },
  {
    // Configuración y pruebas corren en Node
    files: ['*.config.js', 'tests/**/*.js'],
    languageOptions: { globals: globals.node },
  },
];
