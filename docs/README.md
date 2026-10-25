# My Med History — documentación para revisión

Estado: **diseño propuesto para revisión; la implementación posterior siguió en `apps/`, `services/` y `packages/` a petición del usuario**. La carpeta estaba vacía al iniciar el trabajo documental. Durante la revisión aparecieron un prototipo React/Vite, dependencias y un build producidos fuera de esta entrega; se conservaron intactos.

## Orden de lectura

1. [Análisis funcional](producto/analisis-funcional.md): propósito, épicas, pantallas y navegación.
2. [Diseño técnico](superpowers/specs/2026-10-25-my-med-history-design.md): decisiones, límites, datos y contratos.
3. [Casos y criterios de evaluación](qa/casos-evaluacion.md): datos ficticios, fuentes y puertas de calidad.
4. [Plan de implementación](superpowers/plans/2026-10-25-my-med-history-implementation.md): tareas, archivos, interfaces y pruebas.

El análisis funcional exportado originalmente fuera del repositorio se reproduce aquí para que la documentación viaje con el proyecto; no se ha eliminado el original.

## Decisiones a revisar

- Una instalación local y un paciente, sin login; no sirve para exposición pública o acceso compartido.
- NestJS modular más un servicio documental Python/FastAPI/PaddleOCR, sin Redis.
- PostgreSQL con pgvector; archivos privados en volumen local.
- OpenAI por API, modelo inicial `gpt-5.4-mini-2026-03-17` y embeddings `text-embedding-3-small`, configurables y sujetos a evaluación.
- Modo demo predeterminado sin API key y modo live optativo; ningún consumo de pago al arrancar.
- Corpus de demostración reducido, con documentos españoles identificados como tales; no representa una autorización o ficha peruana.
- Resumen de consulta determinista para no añadir inferencias a las vivencias registradas.

Las versiones registradas se comprobaron en documentación o registros públicos el 2026-10-25, no mediante instalación conjunta. Los benchmarks y la evaluación de respuestas reales forman parte del plan, no de los resultados de esta entrega.

## Estado de esta entrega documental

- [x] Contrastar las decisiones con la conversación y revisar el estado de la carpeta.
- [x] Consultar documentación de modelos, OCR y fuentes.
- [x] Escribir el diseño, el análisis funcional y los criterios de evaluación.
- [x] Incorporar la revisión independiente del diseño: consentimiento OCR, borradores y selección de fuentes.
- [x] Completar y autocontrolar el plan de implementación.
- [x] Verificación documental: 5 archivos, 10 enlaces locales existentes, tablas y fences consistentes, 3 bloques Mermaid identificados y un ejemplo Python con sintaxis válida; 10 tareas y 22 casos adversariales. No se renderizaron los diagramas ni se ejecutaron las pruebas propuestas.
- [x] Aprobación humana para implementar (pedida y concedida en la conversación, con implementación multiagente sin el flujo Superpowers).
- [x] Implementación del MVP: contratos (`packages/contracts`), API (16 pruebas), web (7 pruebas), servicio documental (27 pruebas), e2e (3 pruebas), Docker Compose y CI.

Pendiente de verificación con el motor de Docker activo (hoy estaba detenido): `docker compose up --build` de extremo a extremo, la descarga de pesos y la inferencia real de PaddleOCR, y la ejecución del corpus y los casos demo dentro de Compose. Ver [casos de evaluación](../qa/casos-evaluacion.md) para el plan completo de QA pendiente de ejecutar.

No se afirma validación clínica, cumplimiento regulatorio ni aptitud para datos médicos reales.

El prototipo observado usa `package.json` con nombre `my-med-history-prototypes` y cuatro alternativas visuales en `src/prototypes`. No se ha probado ni modificado desde esta sesión. El plan incorpora un paso previo para conservar sus archivos y scripts; no debe aplicarse como si la carpeta siguiera vacía.
