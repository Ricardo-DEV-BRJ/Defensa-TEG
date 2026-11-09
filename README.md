# Defensa TEG – Modelo AgroData JM

Presentación web (HTML, CSS y JavaScript) para la defensa del Trabajo Especial de Grado
«Diseño de un modelo sustentable de digitalización de procesos mediante Big Data para la
Empresa Agro Comercializadora JM» — Universidad Valle del Momboy, Ingeniería en Computación, 2026.

Autores: Br. Rafael Pérez · Técn. Ricardo Briceño — Tutora: MSc. Yajaira Segovia.

## Contenido de este kit
| Ruta | Qué es |
| --- | --- |
| `CLAUDE.md` | Reglas del proyecto que Claude Code lee automáticamente |
| `PROMPTS.md` | Secuencia de prompts por fase para Claude Code |
| `docs/guion.md` | Guion de defensa (fuente de verdad del contenido) |
| `docs/plan-desarrollo.md` | Stack, estructura, motor, mapa de láminas, fases y contingencias |
| `docs/requisitos.md` | Requisitos funcionales y no funcionales |
| `docs/decisiones.md` | Registro de decisiones de arquitectura (ADR) |
| `docs/identidad-visual.md` | Paleta, tipografía y reglas del isologo |
| `data/*.json` | Cifras transcritas del TEG (slides, Likert, observación, costos, cronograma, arquitectura, antecedentes, metodología, marco legal). Los que tienen `"verificado_contra_teg": false` salen del guion y falta contrastarlos |
| `.claude/commands/` | Comandos `/nueva-lamina`, `/revisar-lamina`, `/verificar-datos`, `/ensayo` |
| `public/img/` | Isologo UVM, figuras del TEG y capturas del sistema AgroData JM |

## Uso (una vez construida)
```
npm install
npm run dev       # desarrollo
npm test          # pruebas
npm run build     # genera dist/ (abre con doble clic en dist/index.html)
npm run qr -- https://…   # genera el QR del cierre (public/img/qr.svg y data/cierre.json)
```

## Atajos de teclado
→ / espacio / AvPag: avanzar · ← / RePag: retroceder · O: vista general · F: pantalla completa ·
B: pantalla negra · P: presentador · T: reiniciar cronómetro · S: saltar animación · G + número + Enter: ir a lámina.
