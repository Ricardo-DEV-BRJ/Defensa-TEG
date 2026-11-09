# Registro de decisiones de arquitectura (ADR)

Formato: contexto → decisión → consecuencias. Agregar una entrada por cada decisión nueva.

## ADR-001 · Presentación web en lugar de PowerPoint
- **Contexto:** se quiere demostrar que la ingeniería se aplica también a la forma de comunicar el trabajo.
- **Decisión:** aplicación web estática propia (HTML, CSS, JS).
- **Consecuencias:** más trabajo inicial; a cambio, interactividad que muestra la lógica del modelo y un repositorio como evidencia.

## ADR-002 · JavaScript nativo sin frameworks
- **Contexto:** 16 láminas, dos desarrolladores, plazo corto.
- **Decisión:** módulos ES nativos; Vite solo para desarrollo y build. reveal.js queda como plan B.
- **Consecuencias:** cero dependencias en producción; el motor es propio y explicable ante el jurado.

## ADR-003 · Funcionamiento sin conexión
- **Contexto:** la sala puede no tener internet.
- **Decisión:** ningún recurso remoto; fuentes y librerías dentro del repositorio; build con `base: './'`.
- **Consecuencias:** coherente con el TEG (resiliencia ante fallas del entorno).

## ADR-004 · Contenido separado del motor
- **Contexto:** las cifras del TEG pueden corregirse hasta el último momento.
- **Decisión:** textos, tiempos y datos en `data/*.json`; el motor solo los renderiza.
- **Consecuencias:** una corrección se hace en un solo lugar; se puede verificar automáticamente.

## ADR-005 · Escenario fijo 1920×1080 escalado
- **Contexto:** se proyecta en un televisor de resolución desconocida, con posible overscan.
- **Decisión:** escenario fijo con `transform: scale()` y margen seguro del 5%.
- **Consecuencias:** diseño predecible en cualquier pantalla 16:9.
