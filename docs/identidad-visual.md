# Identidad visual de referencia

La presentación tiene identidad propia del proyecto AgroData JM; la de la UVM es solo referencia
institucional (el TEG es un trabajo de los estudiantes, no un producto de la universidad).
Fuente: Manual de identidad de la Universidad Valle del Momboy.

## Reglas
- Isologo UVM (`public/img/uvm-isologo.png`) solo en las láminas 1 y 17 (portada y cierre).
- El isologo se usa completo (árbol + anillo de texto), sin cambiar colores, estirar ni recortar.
  Versiones permitidas por el manual: color, positivo, escala de grises y negativo.
- Tema claro (se proyecta en un televisor).

## Paleta (`src/styles/tokens.css`)
Contraste medido sobre `#f7f9f8`.

| Token | Color | Origen | Uso | Contraste |
| --- | --- | --- | --- | --- |
| `--color-texto` | `#13282b` | Proyecto | Texto principal | 14,5:1 |
| `--color-primario` | `#1d555b` | UVM (petróleo) | Títulos, capas, barras | 7,9:1 |
| `--color-acento` | `#88c426` | UVM (verde Higuerón) | Solo formas/gráficos. **Nunca texto** | 2,0:1 |
| `--color-alerta` | `#860000` | UVM (rojo semilla) | Duplicados, nivel 1, semáforo rojo | 9,9:1 |
| `--color-exito-texto` | `#4f7d17` | Proyecto | Texto/cifras en verde | 4,6:1 |
| `--color-advertencia` | `#b06f00` | Proyecto | Semáforo ámbar (formas con etiqueta) | 3,9:1 |
| `--color-secundario` | `#5c6b6d` | Proyecto | Notas, fuentes, «n = 4» | 5,3:1 |
| `--color-fondo` | `#f7f9f8` | Proyecto | Fondo de lámina | — |

Descartados del manual: `#bcd4de` (ilegible sobre claro) y `#809e3e` (redundante).

## Tipografía
- **Barlow Condensed** Regular y Bold (fuente corporativa del manual; licencia SIL OFL, gratuita) para títulos y textos cortos.
- **Barlow** Regular para párrafos y notas (misma familia).
- Descargar los `.woff2` y guardarlos en `public/fonts/` (no enlazar Google Fonts remoto).
- Los archivos instalados son el subconjunto «latin» de fontsource (Barlow Condensed 400/700,
  Barlow 400/700). No incluyen → ← ↑ ≥ ≤ ≈ √ σ ●: esos símbolos se ven con la fuente de respaldo
  del sistema. En diagramas, conviene dibujar las flechas como formas SVG.
- **Britannic Bold** (tipografía del isologo) es comercial: no se usa; el logo va como imagen.

## Imágenes disponibles
- `public/img/figuras-teg/`: Figura 1 (modelo teórico), 15 (arquitectura), 16 (BPMN venta y despacho), 17 (modelo en estrella), 18 (prototipo del tablero).
- `public/img/capturas-sistema/`: 16 capturas del sistema AgroData JM tomadas del Anexo 20 (tablero ejecutivo, pagos y monedas, bitácora, etc.). Revisar cuáles usar en la lámina 14.

## Láminas con fondo petróleo (ADR-017)
- Portada y cierre llevan el fondo del prototipo de partículas (`data-fondo="oscuro"`, token
  `--fondo-oscuro`): petróleo `#1d555b` con un brillo celeste suave.
- Sobre ese fondo: texto principal en `--color-fondo` (7,9:1) y secundario en celeste UVM
  `--color-celeste` `#bcd4de` («Celeste Valle», 5,3:1). El verde acento sigue siendo solo forma.
- En la portada, el isologo se forma con partículas de sus propios colores; al imprimir o con
  movimiento reducido se usa el isologo oficial.
