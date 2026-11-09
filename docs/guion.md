# Guion de defensa – Modelo AgroData JM (19 min + 1 de margen)

Cada lámina responde a una **pregunta guía**. Tiempos y notas también están en `data/slides.json`.
Si van atrasados, se recortan los Caps. II y III, nunca el VI. Al minuto 10 deberían estar terminando el Cap. IV.

| Bloque | Láminas | Tiempo | Expositor |
| --- | --- | --- | --- |
| Apertura | 1 | 0:45 | Rafael Pérez |
| Cap. I – Planteamiento | 2–4 | 2:45 | Rafael Pérez |
| Cap. II – Marco teórico | 5–6 | 2:00 | Rafael Pérez |
| Cap. III – Marco metodológico | 7 | 2:15 | Ricardo Briceño |
| Cap. IV – Resultados | 8–10 | 4:00 | Ricardo Briceño |
| Cap. V – Conclusiones | 11–12 | 1:30 | Ricardo Briceño |
| Cap. VI – La propuesta | 13–16 | 5:15 | Rafael (13–14), Ricardo (15–16) |
| Cierre | 17 | 0:30 | Ricardo Briceño |
| **Total** | **17** | **19:00** | |

---

## Lámina 1 · Portada (0:45)
- **Pregunta guía:** ¿Quiénes somos y qué venimos a defender?
- **En pantalla:** título completo, isologo UVM, Facultad de Ingeniería, Ingeniería en Computación, autores (Br. Rafael Pérez, Técn. Ricardo Briceño), tutora MSc. Yajaira Segovia, Trujillo 2026.
- **Qué decir:** saludo y frase gancho: «Una PyME agrocomercial puede perder dinero sin perder un solo producto: basta con que se vaya la luz».

## Lámina 2 · Contexto y problema (1:15)
- **Pregunta guía:** ¿Qué le pasa hoy a la Empresa Agro Comercializadora JM?
- **En pantalla:** esquema causa → efecto con cuatro problemas:
  1. Fallas eléctricas → desincronización entre stock lógico y físico → ventas duplicadas y reembolsos.
  2. Precios en divisas (USDT, euros) en un Excel paralelo → riesgo de vender bajo costo.
  3. Sin control de temperatura y humedad en el almacén → riesgo de mermas por deterioro.
  4. Sin roles ni permisos de usuario → todo el personal administrativo cambia precios; y, en el mismo paso, sin Programa Sustentable formal → carpetas de despacho en papel (TEG 1.1).
- **Qué decir:** tres niveles en una frase (global: sostenibilidad + digitalización; Latinoamérica: barreras de costo y brecha academia-empresa; Venezuela: volatilidad, multimoneda, fallas de servicios) y bajar a la empresa. La desincronización no causa mermas físicas, sí pérdidas económicas.

## Lámina 3 · Objetivos (0:45)
- **Pregunta guía:** ¿Qué nos propusimos lograr?
- **En pantalla:** objetivo general y, abajo, los cuatro objetivos específicos completos, tal como están en el TEG (1.3), con el verbo resaltado: **Describir** · **Identificar** · **Determinar** · **Proponer** (`data/objetivos.json`).
- **Qué decir:** «Diseñar un modelo sustentable de digitalización de procesos mediante Big Data para optimizar la gestión logística y reducir las mermas». La conclusión retoma cada objetivo.

## Lámina 4 · Justificación, alcance y limitaciones (0:45)
- **Pregunta guía:** ¿Por qué vale la pena y hasta dónde llega?
- **En pantalla:** cuatro tarjetas con ícono (teórica, metodológica, práctica, social), cada una con una frase de apoyo que resume su apartado del TEG (1.4.1 a 1.4.4), y columnas «Incluye» / «No incluye».
- **Qué decir:** incluye diseño conceptual, lógico y estructural, desde requerimientos hasta tableros. No incluye rutas VRP/TSP (línea futura). Limitaciones: presupuesto de PyME, sin historial depurado, resistencia al cambio, brecha digital. Vínculo con el Desarrollo Humano Sustentable de la UVM.

## Lámina 5 · Antecedentes (0:50)
- **Pregunta guía:** ¿Qué dicen otros estudios y qué tomamos de cada uno?
- **En pantalla:** línea de tiempo con los 5 autores y su aporte (`data/antecedentes.json`).
- **Qué decir:** no leer. Destacar Chacón Ramírez et al. (2023) → plataforma en la nube ante cortes; Hernández Romero (2026) → enfoque de bajo costo.

## Lámina 6 · Bases teóricas, modelo integrador y bases legales (1:10)
- **Pregunta guía:** ¿Sobre qué conceptos y normas se apoya el modelo?
- **En pantalla:** Figura 1 (modelo teórico integrador) y franja de leyes.
- **Qué decir:** sostenibilidad = marco normativo; Big Data, XAI y Edge = motor tecnológico. ODS 2, 9 y 12. LOCTI (innovación, soberanía alimentaria); Infogobierno (seguridad, software libre); Mensajes de Datos art. 4 (papel → digital); Delitos Informáticos art. 6 (credenciales, bitácora); CRBV 305 y LOA art. 3.

## Lámina 7 · Cómo se investigó (2:15)
- **Pregunta guía:** ¿Cómo obtuvimos el diagnóstico y por qué es confiable?
- **En pantalla:** 1) Aplicada y proyectiva (proyecto factible), mixta, campo y documental, triangulación concurrente. 2) Censo N = 6 (2 gerentes, 4 operativos) + 100% registros del 2.º trimestre 2026. 3) Entrevista → gerentes; Likert → operativos; observación 1–4 → instalaciones; matriz de fuentes → registros. 4) Juicio de 3 expertos (Ing. Yerson Gonzales, Lic. Ana Ojeda, Lic. María Godoy).
- **Qué decir:** sin Alfa de Cronbach porque con n = 4 y un ítem por indicador sería inestable; confiabilidad por expertos y triangulación. Fases: diagnóstico (BPMN), caracterización de fuentes, diseño, factibilidad e indicadores. Decirlo con seguridad.

## Lámina 8 · Lo que dijo el personal operativo (1:30)
- **Pregunta guía:** ¿Qué percibe el personal sobre el registro de datos y lo que necesita?
- **En pantalla:** barras con los ítems destacados de `data/likert.json` (2.3 y 2.4 = 100% acuerdo; 2.5, 3.2, 3.3, 4.2 = 75% acuerdo; 1.1 = 75% desacuerdo; 2.6 = 50% desacuerdo). Pie: «n = 4, cada respuesta = 25%».
- **Qué decir:** consenso total en integrar datos y automatizar el inventario.

## Lámina 9 · Gerencia, observación y fuentes (1:15)
- **Pregunta guía:** ¿Qué confirmaron la entrevista, la observación y la matriz de fuentes?
- **En pantalla:** tres columnas desde `data/observacion.json`: entrevista; niveles 1–4 (temperatura/humedad, mermas, energía = 1; papel y consolidación = 2; equipos = 3); matriz: 1 reporte diario .xls.

## Lámina 10 · Discusión (1:15)
- **Pregunta guía:** ¿Qué aprendimos al cruzar las fuentes?
- **En pantalla:** tres tarjetas «dato → interpretación → decisión»:
  1. 75% cree estar automatizado, pero apoyo en nivel 2 → digitalización como conversión → integrar.
  2. 75% no ve necesario más almacenamiento; 1 reporte diario → Big Data por **variedad** → VPS ligero, no clúster.
  3. 50% duda de la disposición, 75% dice que los equipos sirven → barrera humana → capacitación por roles y semáforos.
- **Qué decir:** lámina clave del diagnóstico. Limitaciones: n pequeño, un ítem por indicador, sin registros históricos → la propuesta mide primero la línea base.

## Láminas 11 y 12 · Un objetivo, una conclusión (0:45 + 0:45)
- **Pregunta guía:** ¿Se cumplieron los objetivos? (11) · ¿Se cumplió el objetivo general? (12)
- **En pantalla:** las conclusiones **literales** del TEG (5.1, `data/objetivos.json`), cada una junto
  a su objetivo y con marca de cumplido. Lámina 11: objetivos 1 (Describir) y 2 (Identificar).
  Lámina 12: objetivos 3 (Determinar) y 4 (Proponer) y la conclusión general.
- **Ideas clave para decir (resumen):**

| Objetivo | Conclusión |
| --- | --- |
| 1. Describir | Digitalización como conversión: sistema local aislado, dependiente de la luz y de Excel; apoyo manual o en papel |
| 2. Identificar | Integrar fuentes heterogéneas, automatizar stock mínimo y vencimientos, prever demanda por temporada; volumen moderado → arquitectura ligera |
| 3. Determinar | Programa Sustentable en BPMN 2.0 + gobernanza por roles y bitácora + indicadores de ecoeficiencia con línea base |
| 4. Proponer | Modelo AgroData JM: 5 capas + 2 transversales, en un VPS, sin comprar equipos, USD 56,10 |

- **Qué decir:** objetivo general alcanzado, ajustado a la escala de la empresa; no se generaliza. Recomendaciones: línea base el primer mes; UPS en caja y equipo del sistema; roles y bitácora ya; capacitación; extensión UVM. Líneas futuras: LSTM + NDVI, blockchain, huella de carbono, VRP/TSP.

## Lámina 13 · Estructura del modelo y arquitectura (1:45)
- **Pregunta guía:** ¿Qué es AgroData JM y cómo fluyen los datos?
- **En pantalla:** Figura 15 / animación de capas (`data/arquitectura.json`): Captura → Integración (ETL cada 15 min existencias, diario ventas; deduplicación; multimoneda) → Almacenamiento (PostgreSQL en estrella: 3 hechos, 5 dimensiones; MinIO) → Analítica → Visualización. Transversales: gobernanza y sostenibilidad.
- **Qué decir:** tres pilares (Programa Sustentable, gobernanza, arquitectura). Docker en un VPS: si se va la luz en la empresa, datos y tableros siguen disponibles; al volver, el conector importa lo pendiente y la deduplicación frena los cobros repetidos antes del despacho.

## Lámina 14 · Procesos, gobernanza y modelos analíticos (1:30)
- **Pregunta guía:** ¿Cómo resuelve cada componente un problema del diagnóstico?
- **En pantalla:** Programa Sustentable (6 procesos BPMN; Figura 16; −80% papel) · Gobernanza (roles Gerencia, Administración, Ventas, Almacén, Soporte TI; bitácora; TLS; respaldos; ISO/IEC 27001) · Modelos: SS = z·σd·√L, PR = d̄·L + SS, IR = UV/IP. Demostración: simulador de duplicados y calculadora de stock.
- **Qué decir:** previsión con promedio móvil y suavizamiento → Holt-Winters con 24 meses; MAPE. Módulo multimoneda reemplaza el Excel y alerta si la tasa tiene más de 24 h o el margen es negativo. Mostrar captura real del sistema (`public/img/capturas-sistema/`).

## Lámina 15 · Factibilidad (1:15)
- **Pregunta guía:** ¿Se puede llevar a la práctica?
- **En pantalla:** cuatro tarjetas (`data/costos.json`): Técnica (equipos nivel 3, 75% aptos, software libre) · Económica (**USD 56,10** = 36,00 + 15,00 + 5,10; recurrente ≈ USD 87/año; 240 h + 12 h aportadas) · Operativa (respaldo gerencial, 100% a favor de automatizar; riesgo: cambio) · Legal (CRBV 28, 60, 305; facturación intacta; precios en Bs a tasa BCV).
- **Qué decir:** el retorno se calcula con la línea base; ilustración: con USD 250/mes de ahorro se recupera en menos de un mes.

## Lámina 16 · Implementación e indicadores (0:45)
- **Pregunta guía:** ¿Cómo se implementa y cómo sabremos que funcionó?
- **En pantalla:** Gantt de 24 semanas (`data/cronograma.json`) y metas: exactitud ≥ 98%, 100% duplicados detectados, 100% usuarios con rol en el mes 1, −80% papel.
- **Qué decir:** PHVA, comité quincenal, evaluaciones a 3 y 6 meses; matriz de riesgos disponible.

## Lámina 17 · Cierre (0:30)
- **Pregunta guía:** ¿Qué debe recordar el jurado?
- **En pantalla:** una frase grande, «Gracias», isologo UVM y QR.
- **Qué decir:** «Una arquitectura de datos ligera, montada sobre lo que la empresa ya tiene, por USD 56,10, ataca la causa de los reembolsos, empieza a medir mermas, papel y energía, y se puede replicar en otras PyMEs de Trujillo».

---

## Preguntas probables del jurado
1. **¿Por qué Big Data con un solo reporte diario?** No se define solo por volumen (Joyanes Aguilar, 2016); aquí es variedad: ventas, registros operativos, inspecciones y tasas multimoneda. Por eso VPS y no clúster.
2. **¿Confiables los porcentajes con 4 encuestados?** Describen a ese grupo; cada respuesta = 25%. Las conclusiones se apoyan en la triangulación.
3. **¿Por qué no Alfa de Cronbach?** n = 4 y un ítem por indicador → coeficiente inestable. Validez por 3 expertos; credibilidad por triangulación.
4. **¿El modelo elimina las ventas duplicadas?** No en la caja (el sistema administrativo no se modifica); las detecta y bloquea antes del despacho y concilia stock. Para la causa eléctrica: UPS.
5. **¿Y si se va la luz o internet en la empresa?** La plataforma vive en el VPS; al volver, importación ordenada y deduplicación. Formulario de contingencia numerado.
6. **¿Cómo predicen sin historial?** Promedio móvil y suavizamiento con criterio gerencial; Holt-Winters con 24 meses; MAPE.
7. **¿Es realista USD 56,10?** VPS 6 meses + dominio + 10%. Bajo porque no se compran equipos, software libre y 240 h aportadas por los autores. Tener a mano una estimación si la empresa pagara el desarrollo.
8. **¿Dónde está lo sustentable?** Medir y reducir mermas, papel (−80%) y energía; ODS 2, 9 y 12; dimensiones económica y social.
9. **¿Por qué no sensores IoT?** Presupuesto: inspecciones en formularios; sensores y edge como ampliación futura.
10. **¿Resistencia al cambio?** Capacitación por roles (12 h), usuarios de referencia, semáforos, operación asistida, manual (Anexo 20).
11. **¿USDT y euros tienen problemas legales?** Facturación en el sistema actual y precios en Bs a tasa BCV; otras monedas solo para costos internos.
12. **¿El sistema ya está desarrollado?** El alcance declarado es el diseño, pero hay manual de usuario y capturas. Definir antes si se muestra demo y cómo se explica.
