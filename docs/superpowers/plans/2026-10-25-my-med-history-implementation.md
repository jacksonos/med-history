# My Med History Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir una demo local que convierta documentos ficticios en tratamientos revisados, explicaciones trazables, seguimiento y preparación de consulta.

**Architecture:** Monolito modular NestJS con PostgreSQL/pgvector y pg-boss, React/Vite para la interfaz y un servicio documental Python/FastAPI/PaddleOCR. Solo la web publica loopback; la IA externa es optativa y queda encapsulada en el backend. Un paciente por instalación, sin login ni exposición pública.

**Tech Stack:** Node 24 LTS, TypeScript, npm workspaces, NestJS 12.2.0, React 19.3.1, Vite 8.3.5, Drizzle 0.45.4, pg-boss 12.38.0, PostgreSQL 17/pgvector 0.8.7, Python 3.11, FastAPI 0.162.0, PaddleOCR 3.7.0/PaddlePaddle CPU 3.3.1, OpenAI SDK 7.43.0 y Zod 4.6.7. Baseline documental, no combinación instalada y validada.

**Spec:** [Diseño técnico](../specs/2026-10-25-my-med-history-design.md), [análisis funcional](../../producto/analisis-funcional.md) y [casos de evaluación](../../qa/casos-evaluacion.md). Los tres viajan con el repositorio y son lectura obligatoria.

## Global Constraints

- «Uso local al clonar el repositorio; contexto de referencia Perú».
- «Casos ficticios, una persona por instalación y sin login inicialmente».
- «Solo `web` publica puerto: `127.0.0.1:8080:80`».
- «Máximo **10 MiB** por archivo, **5 páginas**, **20 megapíxeles** por imagen, rasterizado PDF máximo **8 megapíxeles por página**, salida máxima **24 000 caracteres**».
- «Cada documento se procesa en un proceso hijo terminable, con timeout total **120 s**». API espera máximo **150 s**.
- «`AI_MODE=demo` predeterminado: cero llamadas de pago»; live requiere key y autorización explícita.
- «`max_output_tokens=2048`, reasoning effort none»; payload máximo 24 000 bytes UTF-8.
- Modelo inicial `gpt-5.4-mini-2026-03-17`; embeddings `text-embedding-3-small`, 1536 dimensiones.
- 20 intentos de generación/día UTC, 500 solicitudes de embeddings/día, techo local estimado 100 centavos USD/día, concurrencia IA 1.
- No diagnóstico, prescripción, ajuste autónomo de dosis, certeza causal ni promesa de detección exhaustiva de interacciones.
- No perder originales, completar valores desconocidos ni publicar extracción como confirmación médica.
- No red de IA, secretos ni datos reales en pruebas CI. Los tests live y OCR pesado se ejecutan aparte.
- Sin Redis, motor de agentes, Kubernetes, S3/MinIO o login en este MVP.

## Review Focus

1. **Decimal/unidad ilegible o vía diferente:** conservar literal y evidencia; no corregir por plausibilidad ni recuperar otra formulación. Pruebas T3/T6/T7.
2. **Revisión/contexto cambiado durante un job:** no duplicar ni publicar resultado antiguo como vigente. Pruebas T2/T4/T7.
3. **Borrado y petición cross-site al servicio local:** no resucitar archivos ni permitir mutaciones desde otra web. Pruebas T1/T4/T10.
4. **Fallos del proveedor con presupuesto y reintentos concurrentes:** reservas persistentes y modo manual operativo, sin fallback oculto. Pruebas T6/T9.
5. **Notas, fuentes o respuestas engañosas:** sin HTML ejecutable, citas inventadas, dosis nuevas o causalidad inferida; evaluación humana adicional a schemas. Pruebas T7/T8/T9/T10.

---

## Estado y límites de ejecución

Este archivo es un plan para revisión. **Ninguna tarea de implementación está ejecutada**. La carpeta del proyecto estaba vacía y no era repositorio Git al inspeccionarla. No inicializar Git, crear commits o instalar el proyecto antes de la aprobación humana del diseño y el plan.

**Cambio de baseline observado al cerrar:** aparecieron un prototipo raíz `my-med-history-prototypes` (React/Vite/Tailwind), cuatro variantes bajo `src/prototypes`, package-lock, node_modules y dist. No son trabajo de esta entrega y se preservan. Antes de T1, inventariar su estructura e instrucciones locales y contrastarla con este plan. Donde un archivo listado como Create ya exista, usar modificación dirigida o conservarlo; nunca sobrescribirlo automáticamente. Mantener `src` y los scripts raíz `dev`, `build`, `preview` del prototipo durante la incorporación de workspaces. Usar `build:app` para la aplicación nueva; migración o eliminación del prototipo requiere revisión expresa, no forma parte del scaffolding.

Los pasos de commit son puntos de control para cuando el humano autorice Git. Sin esa autorización, marcar el punto de control como pendiente, no ejecutarlo ni inventar un hash. No descartar archivos o cambios que aparezcan mientras se implementa.

No prometer completar el modo live antes de superar la revisión de fuentes y respuestas. Un bloqueo de calidad permite entregar la demo limitada, pero debe quedar señalado y no presentarse como capacidad validada.

## Mapa de responsabilidades y convenciones

| Unidad | Archivos principales | Consumidores |
|---|---|---|
| Contratos | `packages/contracts/src/{common,treatments,documents,assistance,evolution,questions,context}.ts`, `index.ts` | API y web |
| API | `apps/api/src/main.ts`, `app.module.ts`, módulos feature | Web y jobs internos |
| Datos | `apps/api/src/database/{client,schema}.ts`, `apps/api/drizzle/` | Módulos Nest y scripts |
| OCR | `services/documents/app/{main,schemas,validation,extraction,worker}.py` | Cliente documental Nest |
| IA | `apps/api/src/assistance/{provider,budget,structure,assistance}.service.ts`, `*.processor.ts` | Documentos, explicación y preguntas |
| Conocimiento | `apps/api/src/knowledge/{import,retrieval}.service.ts`, `scripts/import-corpus.ts` | IA y fuentes citadas |
| UI | `apps/web/src/features/{treatments,documents,assistance,evolution,questions,context}/` | Navegación del paciente |
| Pruebas | `apps/api/test/`, `services/documents/tests/`, `apps/web/src/**/*.test.tsx`, `tests/e2e/` | CI y aceptación |

- API: `/api/v1`; esquemas públicos y tipos exportados en `@mmh/contracts`. Workspaces `@mmh/api`, `@mmh/web`, `@mmh/contracts`.
- Root scripts a establecer en T1: `build:app`, `typecheck`, `test:api`, `test:web`, `test:contracts`; preservar los scripts existentes `dev`, `build`, `preview` del prototipo. T10 añade `test:e2e`, `qa:ocr` y `qa:live`.
- Vitest para TypeScript, React Testing Library para UI y Supertest para contratos HTTP. Testcontainers arranca PostgreSQL/pgvector efímero para API; no apuntar pruebas a la BD local de uso normal.
- Harness T1: `createApiHarness(): Promise<ApiTestHarness>`, con `request` Supertest, `db` Drizzle y `close(): Promise<void>`. Cada archivo API crea/cierra su harness con beforeAll/afterAll y limpia sus filas entre pruebas.
- Nombres de archivos organizados por funcionalidad. Añadir `*.module.ts`/`*.controller.ts` solo para módulos que exponen lógica o endpoints, no capas vacías.
- En cada tarea: escribir pruebas, observar fallo relevante, implementar, observar éxito. El fallo por no tener el runner instalado no demuestra el comportamiento de una prueba.

## T1. Base ejecutable, contratos comunes y perímetro local

**Files:**
- Modify, preservando prototipo y scripts: `package.json`, `package-lock.json`.
- Create: `tsconfig.base.json`, `.gitignore`, `.env.example`, `compose.yaml`.
- Create: `packages/contracts/package.json`, `packages/contracts/src/common.ts`, `packages/contracts/src/index.ts`.
- Create: `apps/api/package.json`, `apps/api/src/main.ts`, `apps/api/src/app.module.ts`, `apps/api/src/config/config.ts`, `apps/api/src/common/local-origin.guard.ts`, `apps/api/src/common/api-error.filter.ts`.
- Create: `apps/api/src/database/client.ts`, `apps/api/src/database/schema.ts`, `apps/api/drizzle.config.ts`, primera migración `apps/api/drizzle/0000_initial.sql`.
- Create: `apps/api/src/health/health.controller.ts`, `apps/api/Dockerfile`, `apps/web/Dockerfile`, `infra/nginx.conf`.
- Create: `apps/web/package.json`, `apps/web/index.html`, `apps/web/vite.config.ts`, `apps/web/src/main.tsx`, `apps/web/src/app/app.tsx`.
- Test: `apps/api/test/helpers/create-api-harness.ts`, `apps/api/test/local-boundary.e2e-spec.ts`, `packages/contracts/src/common.test.ts`.

**Interfaces:**
- Consumes: especificación §§3–4, 6–8 y 14.
- Produces: `loadConfig(env: NodeJS.ProcessEnv): AppConfig`, `assertLocalRequest(host: string, origin: string | undefined, fetchSite: string | undefined): void`, `ApiErrorSchema`, conexión Drizzle inyectable y `createApiHarness()`.
- `AppConfig` incorpora modo demo por defecto, modelos, límites y precios descritos en la especificación; valida enteros positivos, modos y coherencia de reserva/modelo. La key es opcional en demo y nunca se serializa en capabilities.

- [ ] **Step 1: Preparar el runner y el harness mínimo.** Relevar primero el prototipo existente y conservarlo; incorporar workspaces sin reemplazar src ni configuración raíz. Crear configuración TypeScript/Vitest y Testcontainers con pgvector; harness arranca app de prueba con BD efímera. Crear imágenes/Compose básicos sin IA ni OCR real todavía. No usar una base existente como entorno de prueba.
- [ ] **Step 2: Escribir las pruebas rojas.** Cubrir configuración y guard sin depender del resto del producto:

```typescript
it('defaults to demo without an API key', () => {
  expect(loadConfig({}).aiMode).toBe('demo');
});
it('rejects cross-site writes to localhost', () => {
  expect(() => assertLocalRequest('localhost:8080', 'https://evil.example', 'cross-site'))
    .toThrow();
});
it('rejects unknown hosts', () => {
  expect(() => assertLocalRequest('evil.example:8080', undefined, undefined)).toThrow();
});
```

- [ ] **Step 3: Verificar fallo.** `npm run test:api -- test/local-boundary.e2e-spec.ts`; esperar fallo por funciones/guard sin implementar, no por configuración rota.
- [ ] **Step 4: Implementar base.** Health/capabilities, errores normalizados con requestId, guard y proxy. Migración define tablas de §6, unicidad y FK; `CREATE EXTENSION vector`. No publicar puertos de api/documents/db. Probar además rollback de migración fallida y ausencia de key en respuestas/logs.
- [ ] **Step 5: Verificar verde.** `npm run test:contracts`, `npm run test:api -- test/local-boundary.e2e-spec.ts`, `npm run typecheck`, `docker compose config --quiet`. Esperar exit 0 y pruebas de Host/Origin rechazadas con 403.
- [ ] **Step 6: Punto de control Git, solo autorizado.** Commit propuesto: `chore: establish local application foundation`.

## T2. Tratamientos manuales, contexto y revisiones

**Files:**
- Create: `packages/contracts/src/treatments.ts`, `packages/contracts/src/context.ts`.
- Create: `apps/api/src/treatments/{treatments.module,treatments.controller,treatments.service}.ts`, `apps/api/src/context/{context.module,context.controller,context.service}.ts`.
- Create: `apps/api/test/fixtures/treatment.ts`, `apps/api/test/treatments.e2e-spec.ts`, `apps/api/test/context.e2e-spec.ts`.
- Modify: `packages/contracts/src/index.ts`, `apps/api/src/app.module.ts`, schema/migración si las pruebas revelan una restricción faltante.

**Interfaces:**
- Consumes: `ConfirmRevisionInput`, `SaveDraftInput`, `TreatmentSnapshot`, `FieldValue` del diseño §7; las implementaciones Zod conservan esos nombres.
- Produces: `TreatmentsService.create(input: {title: string; reason: string | null}): Promise<TreatmentView>`, `confirmRevision(id: string, input: ConfirmRevisionInput): Promise<TreatmentView>`, `get(id: string): Promise<TreatmentView>`.
- `TreatmentView`: id, title, reason, status, currentRevision, snapshot confirmado nullable, draft nullable con version/baseRevision/snapshot y fechas ISO. `TreatmentsService.saveDraft(id: string, input: SaveDraftInput): Promise<TreatmentView>` no confirma. `ContextService.update(input: {expectedVersion: number; allergies: ReportedList; conditions: ReportedList; otherMedications: ReportedList}): Promise<ContextView>`; `ReportedList` = `{state: 'unknown' | 'reported_none' | 'reported'; items: string[]}` con coherencia estado/lista.

- [ ] **Step 1: Escribir pruebas rojas.** Fixture `completeSnapshot` reproduce DEMO-01 sin generar receta. Verificar revisión y unknown:

```typescript
it('never overwrites a confirmed revision', async () => {
  const t = await createDraft(h.request);
  await h.request.put(`/api/v1/treatments/${t.id}/draft`)
    .send({ expectedDraftVersion: 0, baseRevision: 0, snapshot: completeSnapshot }).expect(200);
  await h.request.post(`/api/v1/treatments/${t.id}/revisions`)
    .send({ expectedRevision: 0, expectedDraftVersion: 1, changeReason: 'Revisión inicial' }).expect(201);
  await h.request.post(`/api/v1/treatments/${t.id}/revisions`)
    .send({ expectedRevision: 0, expectedDraftVersion: 1, changeReason: 'Otra pestaña' }).expect(409);
  expect((await h.request.get(`/api/v1/treatments/${t.id}`)).body.currentRevision).toBe(1);
});
```

`createDraft(request): Promise<{id: string}>` se define en el fixture de esta tarea usando POST /treatments. Añadir prueba de dos confirmaciones concurrentes; guardar dosis/frecuencia/duración null; persistencia del draft tras recargar sin modificar estado/revisión; conflicto por expectedDraftVersion o baseRevision; form y referenceSelection null permitidas. No impedir tratamiento incompleto.
- [ ] **Step 2: Verificar fallo.** `npm run test:api -- test/treatments.e2e-spec.ts test/context.e2e-spec.ts`; esperar fallo de contrato ausente.
- [ ] **Step 3: Implementar endpoints.** Persistir borrador separado; PUT draft usa CAS por versión/baseRevision, POST revisions confirma exclusivamente el borrador guardado y lo retira atómicamente. Mantener revisiones anteriores y validar referenceSelection contra nombre/vía/forma sin inferir marca. Contexto opcional explícito, sin interpretar un array ausente como alergias negadas. Archivar/reabrir es organización, no recomendación médica. DELETE treatment prepara limpieza documental de T4.
- [ ] **Step 4: Verificar verde.** Mismo comando más `npm run typecheck`; confirmar 201/409 y snapshots históricos intactos. Probar paginación y 404.
- [ ] **Step 5: Punto de control Git, solo autorizado.** `feat: register treatments with immutable revisions`.

## T3. Servicio documental seguro y OCR CPU

**Files:**
- Create: `services/documents/pyproject.toml`, `services/documents/uv.lock`, `services/documents/Dockerfile`.
- Create: `services/documents/app/__init__.py`, `main.py`, `schemas.py`, `validation.py`, `extraction.py`, `worker.py`, `prepare_models.py`, `services/documents/models/manifest.json`.
- Create: `services/documents/tests/test_validation.py`, `test_extraction.py`, `test_worker_timeout.py`, `services/documents/tests/fixtures/` con documentos sintéticos técnicos.
- Modify: `compose.yaml` para servicio privado y cache de pesos; no publicar OCR al host.

**Interfaces:**
- Consumes: multipart y `DocumentExtraction` de §9; mismas claves JSON camelCase que TypeScript.
- Produces: `validate_document(content: bytes, filename: str) -> ValidatedDocument`, `extract_document(document: ValidatedDocument, document_id: UUID, generation: int) -> DocumentExtraction`, `run_isolated(content: bytes, document_id: UUID, generation: int, timeout_seconds: int = 120) -> DocumentExtraction`.
- `ValidatedDocument` contiene mime, bytes y datos de páginas/dimensiones validados; el filename nunca determina ruta. Bloques page 1-based, box en píxeles de la imagen/raster de esa página, score null para texto nativo.

- [ ] **Step 1: Escribir pruebas rojas.** Instalar solo dependencias de test en imagen de pruebas; predictor OCR sustituible por fixture en tests unitarios:

```python
def test_rejects_html_disguised_as_png():
    with pytest.raises(UnsupportedDocument):
        validate_document(b"<script>alert(1)</script>", "receta.png")

def test_preserves_decimal_and_unit(native_decimal_pdf):
    result = extract_document(validate_document(native_decimal_pdf, "test.pdf"), TEST_ID, 1)
    assert "0,5 mg" in result.text
    assert "mcg" in result.text
```

Definir `TEST_ID`, las excepciones y fixture en esta tarea. Añadir casos 6 páginas, cifrado, corrupción, 21 MP, salida >24 000 caracteres, texto nativo con anotaciones no cubiertas y proceso bloqueado realmente terminado.
- [ ] **Step 2: Verificar fallo.** `docker compose run --rm --build --no-deps documents uv run pytest -q tests/test_validation.py tests/test_extraction.py tests/test_worker_timeout.py`; esperar funciones ausentes o comportamientos sin implementar, sin descargar pesos en estos tests.
- [ ] **Step 3: Implementar extracción.** pypdf antes de OCR; raster por página con pypdfium2. Proceso hijo terminado/killed al timeout, cleanup de temporales, validación de score/box y un solo trabajo activo. OCR de CPU con nombres de modelos explícitos; health distingue modelos no preparados. No lanzar shell con entrada del cliente.
- [ ] **Step 4: Verificar verde y smoke real.** Repetir pytest; `docker compose run --rm --build --no-deps documents uv run python -m app.prepare_models` descarga a caché únicamente los dos modelos fijados y registra sus hashes. Ejecutar un PNG sintético con predictor real. Registrar éxito/error, versiones y consumo; si el binario baseline no es compatible, ajustar solo versiones de OCR en spec/locks con evidencia, no cambiar contrato ni afirmar benchmark pasado.
- [ ] **Step 5: Punto de control Git, solo autorizado.** `feat: extract document text in an isolated OCR service`.

## T4. Originales privados, jobs y revisión documental

**Files:**
- Create: `packages/contracts/src/documents.ts`.
- Create: `apps/api/src/documents/{documents.module,documents.controller,documents.service,document-storage.service,document-client.service}.ts`.
- Create: `apps/api/src/jobs/{jobs.module,document.processor}.ts`.
- Create: `apps/api/test/documents.e2e-spec.ts`, `apps/api/test/document-jobs.e2e-spec.ts`, `apps/api/test/fixtures/document-extraction.json`.
- Modify: exports, app module y DELETE treatment de T2.

**Interfaces:**
- Consumes: `DocumentExtraction` de T3, cliente Drizzle y pg-boss.
- Produces: `DocumentClient.extract(input: {documentId: string; generation: number; bytes: Uint8Array; filename: string}): Promise<DocumentExtraction>`.
- `DocumentsService.upload(treatmentId: string, input: {bytes: Uint8Array; filename: string; syntheticAcknowledged: true}): Promise<DocumentView>`; `DocumentView` incluye id, treatmentId, generation, status, extracción nullable y errorCode nullable.
- `DocumentProcessor.process(input: {documentId: string; generation: number}): Promise<void>`; no necesita datos del paciente en el payload de cola.

- [ ] **Step 1: Escribir pruebas rojas.** Harness con cliente OCR falso que respeta contrato, no respuesta médica:

```typescript
it('deduplicates delivery of the same document job', async () => {
  await processor.process({ documentId, generation: 1 });
  await processor.process({ documentId, generation: 1 });
  expect(await countExtractions(h.db, documentId, 1)).toBe(1);
});
```

El setup de la prueba crea `documentId`, inyecta `processor` y define `countExtractions` en su fixture mediante SQL count. Probar fallo entre cambio de estado/enqueue con rollback; borrado durante OCR; original inaccesible después del tombstone; nombre `../../secret`; reintentos agotados; originales no expuestos estáticamente.
- [ ] **Step 2: Verificar fallo.** `npm run test:api -- test/documents.e2e-spec.ts test/document-jobs.e2e-spec.ts`.
- [ ] **Step 3: Implementar almacenamiento y jobs.** Archivo con UUID, permisos y hash; validación en API y de nuevo en servicio documental. Enqueue transaccional con adaptador pg-boss; publicación CAS por generación. Usar DocumentView para polling, no exponer tablas internas de cola. Borrado seguro y cleanup de tombstones al arrancar. Revisar instrucción original por descarga/vista de imagen, nunca URL arbitraria.
- [ ] **Step 4: Verificar verde.** Repetir pruebas, `npm run typecheck` y prueba de reinicio conservando archivos/estados. En fallo permanente permitir entrada manual; no perder el tratamiento.
- [ ] **Step 5: Punto de control Git, solo autorizado.** `feat: persist originals and process document jobs reliably`.

## T5. Corpus atribuido y demo reproducible sin key

**Files:**
- Create: `data/corpus/manifest.json`, `data/corpus/ATTRIBUTION.md`, `data/corpus/chunks/` con fragmentos aprobados documentalmente.
- Create: `data/demo/cases.json`, `data/demo/documents/`, `data/demo/expected/`, `data/demo/results/`.
- Create: `packages/contracts/src/knowledge.ts`, `apps/api/src/knowledge/{knowledge.module,knowledge.controller,import.service}.ts`, `apps/api/scripts/import-corpus.ts`, `apps/api/scripts/seed-demo.ts`.
- Create: `apps/api/src/assistance/demo-results.service.ts`, `apps/api/test/corpus.e2e-spec.ts`, `apps/api/test/demo.e2e-spec.ts`.
- Modify: root scripts `corpus:import`, `demo:seed`; no llamada de embeddings durante import/demo por defecto.

**Interfaces:**
- Consumes: fuentes y casos exactos de QA §§2–3.
- Produces: `CorpusImporter.import(manifestPath: string): Promise<{sources: number; chunks: number; corpusVersion: string}>`, `DemoResultsService.get(input: {caseId: string; inputHash: string; kind: string}): Promise<DemoResult | null>`.
- `GET /reference-catalog` devuelve sustancias/aliases/vías/formas/productos del manifiesto local, validado por `ReferenceCatalogSchema` en knowledge.ts. La UI lo usa para revisar la selección; sin cobertura puede guardar referenceSelection null.
- `DemoResult` contiene payload del contrato correspondiente, mode demo, hash, IDs fuente y leyenda de precarga. `canonicalHash(value: unknown): string` ordena claves de objetos, preserva orden de arrays y calcula SHA-256; rechaza valores no JSON.

- [ ] **Step 1: Escribir pruebas rojas.** Verificar importación sin permiso, doble seed y hash:

```typescript
it('does not reuse a demo result after editing its inputs', async () => {
  expect(await demos.get({ caseId: 'DEMO-01', inputHash: 'changed', kind: 'explanation' })).toBeNull();
});
```

Inyectar espía al proveedor y exigir cero llamadas en modo demo incluso si existe API key. Corpus importado dos veces no duplica fuentes/chunks; fuentes con revisión >180 días no son elegibles.
- [ ] **Step 2: Verificar fallo.** `npm run test:api -- test/corpus.e2e-spec.ts test/demo.e2e-spec.ts`.
- [ ] **Step 3: Implementar datos y comandos.** Generar documentos ficticios de QA, ground truth y respuestas precargadas claramente atribuidas, no aparentar generación real. Importar únicamente las cuatro URLs de CIMA seleccionadas, conservar secciones, original, fechas, hash y condiciones de reutilización; revisar la ficha técnica antes de añadir mecanismos. Ninguna inferencia clínica se da por verificada por este proceso.
- [ ] **Step 4: Verificar verde.** Repetir pruebas; seed idempotente desde BD vacía y ya poblada, sin sobrescribir datos modificados. Si una fuente trae restricciones adicionales, excluirla y reconocer su falta de cobertura, sin inventar permiso ni contenido.
- [ ] **Step 5: Punto de control Git, solo autorizado.** `feat: provide attributed reference corpus and offline demo cases`.

## T6. Proveedor IA, presupuesto y estructuración revisable

**Files:**
- Create: `packages/contracts/src/assistance.ts`.
- Create: `apps/api/src/assistance/{assistance.module,provider.service,budget.service,structure.service,structure.processor}.ts`, `apps/api/src/assistance/prompts/structure-v1.ts`.
- Create: `apps/api/test/ai-budget.e2e-spec.ts`, `apps/api/test/structure.e2e-spec.ts`, `apps/api/test/fixtures/structure-result.json`.
- Modify: documents controller para `/structure`, exports y registro de consumidores.

**Interfaces:**
- Consumes: FieldValue, TreatmentSnapshot, extracción literal y demo de T5.
- Produces: `AiProvider.generate<T>(request: StructuredRequest<T>): Promise<{value: T; inputTokens: number; outputTokens: number}>`.
- `StructuredRequest<T>`: `schema` Zod, `instructions: string`, `input: string`, `model: string`, `maxOutputTokens: 2048`, `store: false`; implementación única OpenAI, no fábrica multiproveedor.
- `BudgetService.reserve(kind: 'generation' | 'embedding', operationId: string): Promise<{attemptId: string; reservedCents: number}>`; `recordUsage(attemptId: string, usage: {inputTokens: number; outputTokens: number; outcome: 'success' | 'failed' | 'unknown'}): Promise<void>`.
- `StructureService.request(documentId: string, externalProcessingAccepted: boolean): Promise<{analysisId: string}>`; resultado TreatmentSnapshot solo borrador, nunca confirmación de T2.

- [ ] **Step 1: Escribir pruebas rojas.** Simular SDK, no llamar al proveedor:

```typescript
it('reserves atomically when only one attempt fits', async () => {
  await seedBudgetWithRemainingCents(h.db, 3);
  const results = await Promise.allSettled([
    budget.reserve('generation', 'op-a'), budget.reserve('generation', 'op-b'),
  ]);
  expect(results.filter(x => x.status === 'fulfilled')).toHaveLength(1);
});
```

Definir helper de presupuesto y fixtures en el test. Añadir contador persistente tras recrear servicio, máximo 20 intentos, retry como intento nuevo, reserva mantenida ante timeout, key ausente, payload >24 000 bytes, refusal/incomplete, JSON inválido, campo sin evidencia y `0,5 mg` no cambiado a `5 mg`. Estructuración live sin aceptación explícita devuelve 400 EXTERNAL_PROCESSING_NOT_ACCEPTED y cero llamadas; con aceptación registra propósito/hash/fecha/versión del aviso para texto OCR aún no revisado. Una aceptación para explicación no sirve como consentimiento de estructuración.
- [ ] **Step 2: Verificar fallo.** `npm run test:api -- test/ai-budget.e2e-spec.ts test/structure.e2e-spec.ts`.
- [ ] **Step 3: Implementar SDK y límite.** `store=false`, reasoning none, Structured Outputs estricto y Zod; SDK maxRetries 0, worker máximo 2 intentos solo transitorios. Inputs sin secretos ni originales binarios, consentimiento por operación que advierte del texto OCR sin revisar. Quote de cada campo debe existir en página; rechazar inventado, no completar desde conocimiento general ni sobrescribir automáticamente el borrador. Demo y live permanecen distinguibles.
- [ ] **Step 4: Verificar verde.** Repetir pruebas; inspeccionar request mock para ausencia de key en input, tools, web search o envío de imagen. Guardar tokens/estado y no textos en logs. Test live permanece excluido por defecto.
- [ ] **Step 5: Punto de control Git, solo autorizado.** `feat: add bounded AI generation and reviewable structuring`.

## T7. Recuperación, explicaciones y preguntas con referencias

**Files:**
- Create: `apps/api/src/knowledge/retrieval.service.ts`, `apps/api/scripts/index-corpus.ts`.
- Create: `apps/api/src/assistance/{assistance.controller,assistance.service,assistance.processor,evidence-validator}.ts`, `apps/api/src/assistance/prompts/explain-v1.ts`, `questions-v1.ts`.
- Create: `apps/api/test/retrieval.e2e-spec.ts`, `apps/api/test/assistance.e2e-spec.ts`, `apps/api/test/evidence-validator.spec.ts`.
- Modify: root script `corpus:index`, módulo knowledge/assistance, `apps/api/src/knowledge/knowledge.controller.ts` para GET sources, capabilities.

**Interfaces:**
- Consumes: AiProvider, BudgetService, CorpusImporter y revisión confirmada/contexto versionado.
- Produces: `RetrievalService.retrieve(input: {referenceSelection: NonNullable<MedicationInstruction['referenceSelection']>; strength: string | null; question: string}): Promise<RetrievedChunk[]>`, máximo 6 chunks. productId null solo habilita scope substance_route_formulation; productId presente exige coincidencia de producto y concentración compatible de la revisión.
- `RetrievedChunk`: id, sourceId, sourceVersion, text, section, country, retrievedAt; embedding es detalle privado de BD.
- `validateEvidence(result: AssistanceResult, retrieved: RetrievedChunk[]): AssistanceResult` lanza `AI_OUTPUT_REJECTED` ante IDs/quotes inválidos.
- `AssistanceService.request(treatmentId: string, input: {kind: 'explanation' | 'questions'; patientQuestion: string | null; externalProcessingAccepted: true}): Promise<{analysisId: string}>`, `get(id: string): Promise<AnalysisView>`; `AnalysisView` contiene status, mode, stale, result y referencias.

- [ ] **Step 1: Escribir pruebas rojas.** Retrieval excluye vía/formulación desconocida o incompatible, fuentes desactivadas/caducadas y aliases ambiguos. Para producto desconocido, excluye chunks de scope product (excipientes, dosis o administración específica), pero permite fragmentos generales curados de sustancia/vía/forma confirmadas. Validación:

```typescript
it('rejects a citation not present in the retrieved context', () => {
  const result = { explanation: [{ text: 'Afirmación', chunkIds: ['invented'], quote: 'inventada' }],
    concernsToDiscuss: [], questions: [], limitations: [] };
  expect(() => validateEvidence(result, [])).toThrow('AI_OUTPUT_REJECTED');
});
```

Pruebas adicionales: edición del contexto u otro tratamiento following durante generación produce stale; mismo requestHash devuelve mismo analysisId; cambio de key/modelo no reinterpreta resultados anteriores. Fuente que no respalda mecanismo genera limitación, no texto médico desde memoria.
- [ ] **Step 2: Verificar fallo.** `npm run test:api -- test/retrieval.e2e-spec.ts test/assistance.e2e-spec.ts test/evidence-validator.spec.ts`.
- [ ] **Step 3: Implementar búsqueda y generación.** Metadata/aliases primero; búsqueda textual más coseno exacto cuando haya embeddings válidos del mismo modelo/dimensión. Importación y indexado explícitos, no web abierta durante consultas. Snapshot de fuentes e input, validación literal, límites y resultados obsoletos. No añadir herramientas al modelo ni usar prompt como única barrera.
- [ ] **Step 4: Verificar verde.** Repetir tests y probar prompt injection de A05 con un proveedor mock que intenta emitir IDs fuera del contexto. Verificar rechazo, no mostrar salida parcial. La evaluación semántica real queda en T10, no sustituirla por este mock.
- [ ] **Step 5: Punto de control Git, solo autorizado.** `feat: ground treatment explanations in a bounded reference corpus`.

## T8. Evolución, preguntas guardadas y resumen sin inferencias

**Files:**
- Create: `packages/contracts/src/evolution.ts`, `packages/contracts/src/questions.ts`.
- Create: `apps/api/src/evolution/{evolution.module,evolution.controller,evolution.service}.ts`, `apps/api/src/questions/{questions.module,questions.controller,questions.service}.ts`.
- Create: `apps/api/src/summaries/{summaries.module,summaries.controller,summaries.service}.ts`.
- Create: `apps/api/test/evolution.e2e-spec.ts`, `apps/api/test/questions.e2e-spec.ts`, `apps/api/test/summaries.e2e-spec.ts`.
- Modify: exports y módulos de aplicación.

**Interfaces:**
- Consumes: versiones/revisiones y tipos de seguimiento de especificación §12.
- Produces: `EvolutionService.create(treatmentId: string, input: EvolutionInput): Promise<EvolutionEntry>`, actualización con expectedVersion y borrado por ID.
- `EvolutionInput`: occurredAt ISO y unión discriminada kind checkin/intake/symptom/measurement/note con los payloads de §12. `QuestionsService.create(treatmentId: string, input: {text: string; origin: 'patient' | 'app'; analysisId: string | null}): Promise<Question>`.
- `SummaryService.build(treatmentId: string, period: {from: string; to: string}): Promise<ConsultationSummary>`; fechas locales YYYY-MM-DD. `ConsultationSummary` contiene treatmentId, período, revisiones relevantes, entries, questions, generatedAt y advertencias fijas, sin diagnóstico ni causalidad calculada.

- [ ] **Step 1: Escribir pruebas rojas.** Seed DEMO-03 y cubrir límites de día Lima:

```typescript
it('includes only recorded experiences and never invents missed doses', async () => {
  const result = await summaries.build(treatmentId, { from: '2026-10-20', to: '2026-10-21' });
  expect(result.entries).toHaveLength(3);
  expect(result.entries.filter(e => e.kind === 'intake')).toHaveLength(1);
  expect(result.entries.find(e => e.kind === 'symptom')?.originalText)
    .toBe('Hoy sentí mareo leve; no sé si tiene relación');
});
```

El setup del test crea el síntoma tipado con originalText exacto de DEMO-03. Añadir edición/borrado reflejado, >100 registros rechazado con instrucción de acotar, pregunta sugerida no guardada sin selección y toma referida a medicamento/revisión inexistentes rechazada.
- [ ] **Step 2: Verificar fallo.** `npm run test:api -- test/evolution.e2e-spec.ts test/questions.e2e-spec.ts test/summaries.e2e-spec.ts`.
- [ ] **Step 3: Implementar CRUD y resumen.** Validación por kind, versiones esperadas y fechas UTC; no cálculo de adherencia ni interpretación de mediciones. Resumen selecciona registros/revisiones y preguntas, ordena por instante y no llama al LLM. Respuesta declarada por paciente no se convierte automáticamente en pauta nueva.
- [ ] **Step 4: Verificar verde.** Repetir tests y comprobar exactamente las tres entradas sintéticas y la pregunta de QA sin datos agregados inventados.
- [ ] **Step 5: Punto de control Git, solo autorizado.** `feat: track patient experiences and prepare factual consultation summaries`.

## T9. Interfaz completa, estados y navegación accesible

**Files:**
- Create: `apps/web/src/app/{router,shell}.tsx`, `apps/web/src/shared/{api-client.ts,styles.css}`.
- Create: `apps/web/src/features/treatments/{home-page,treatments-page,new-treatment-page,treatment-page}.tsx`.
- Create: `apps/web/src/features/documents/{review-page,document-status}.tsx`.
- Create: `apps/web/src/features/assistance/{understand-panel,analysis-status}.tsx`.
- Create: `apps/web/src/features/evolution/{evolution-panel,evolution-form}.tsx`, `apps/web/src/features/questions/consultation-panel.tsx`, `apps/web/src/features/context/context-page.tsx`.
- Test: `apps/web/src/features/documents/review-page.test.tsx`, `apps/web/src/features/assistance/understand-panel.test.tsx`, `apps/web/src/features/evolution/evolution-form.test.tsx`, `apps/web/src/shared/api-client.test.ts`.
- Modify: app.tsx y exports necesarios, sin duplicar esquemas en formularios.

**Interfaces:**
- Consumes: exclusivamente contratos @mmh/contracts y API de §8; browser no conoce URL de OCR ni proveedor/key.
- Produces: `apiRequest<T>(path: string, init?: RequestInit): Promise<T>` con ApiError normalizado; rutas exactas de especificación §13 y todos los recorridos funcionales.
- Estado de formularios local a feature; polling 2 s limitado a estados pendientes y cancelado al desmontar. No mostrar un resultado stale como explicación vigente.

- [ ] **Step 1: Escribir pruebas rojas.** Usar mocks HTTP, no lógica médica en navegador:

```typescript
it('keeps an AI failure separate from manual tracking', async () => {
  render(<UnderstandPanel treatmentId="demo-id" />);
  expect(await screen.findByText('No se pudo generar la explicación')).toBeVisible();
  expect(screen.getByRole('link', { name: 'Registrar evolución' })).toBeVisible();
});
```

Setup simula 503 de análisis y resto de API operativo. Añadir: null no se convierte en dosis, guardado de borrador separado de confirmación, selección revisable de forma/catálogo sin marca inferida, consentimiento de estructuración distinto del de explicación, etiquetas demo/live/stale, script renderizado como texto, aviso de cambios sin guardar y polling detenido tras navegación.
- [ ] **Step 2: Verificar fallo.** `npm run test:web`; esperar componentes ausentes/acciones no implementadas, no fallo de entorno DOM.
- [ ] **Step 3: Implementar pantallas.** Revisar antes las skills de frontend/accesibilidad aplicables y los componentes de src/prototypes. Reutilizar las piezas compatibles con el flujo aprobado sin borrar las alternativas originales ni sustituir el diseño elegido por el humano. Interfaz sobria y legible; no inventar branding ni hacer una landing ajena al producto. Indicaciones/Comprender/Evolución/Preparar consulta dentro de tratamiento; originales accesibles, preguntas editables, borrar con confirmación, límites y falta de cobertura visibles.
- [ ] **Step 4: Verificar verde.** `npm run test:web`, `npm run typecheck`, `npm run build:app`; comprobar además `npm run build` del prototipo conservado. Probar teclado y 360 px manualmente; no declarar comprobación visual por pasar Vitest. Resumen legible/copiar texto; PDF e impresión especializada no forman parte de esta tarea.
- [ ] **Step 5: Punto de control Git, solo autorizado.** `feat: deliver the patient treatment journey in the web interface`.

## T10. Evaluación, recorrido desde clon limpio y entrega

**Files:**
- Create: `tests/e2e/{treatment-journey,manual-fallback,security}.spec.ts`, `playwright.config.ts`.
- Create: `scripts/e2e.mjs`, `scripts/generate-ocr-fixtures.py`, `scripts/benchmark-ocr.py`, `scripts/evaluate-live.ts`.
- Create: `README.md`, `docs/qa/resultados-ocr.md`, `docs/qa/resultados-demo.md`, `.github/workflows/ci.yml`.
- Modify: root scripts, Dockerfiles, Compose, docs de arquitectura/QA cuando haya resultados observados.

**Interfaces:**
- Consumes: DEMO-01/02/03, matriz A01–A22 y puertas de QA.
- Produces: `npm run test:e2e` en proyecto Compose de pruebas aislado, `npm run qa:ocr` con benchmark sintético, `npm run qa:live` condicionado a RUN_LIVE_AI_TESTS=1 y autorización de gasto.
- `scripts/e2e.mjs` usa un nombre de proyecto/volúmenes exclusivo de pruebas y limpia únicamente esos recursos al finalizar. Nunca ejecuta `down -v` sobre la instalación normal.

- [ ] **Step 1: Escribir pruebas E2E rojas.** Desde web: documento → revisión → confirmación → explicación demo → tres registros → resumen. Segundo recorrido sin key con receta nueva y entrada manual; tercero verifica Host/Origin, HTML escapado, eliminación y persistencia tras reinicio.
- [ ] **Step 2: Verificar fallo relevante.** `npm run test:e2e`; confirmar qué integración real no cumple antes de corregir. La suite no realiza llamadas de pago, y un OCR falso para tests debe estar inyectado solo en composición de pruebas, nunca como fallback de producción.
- [ ] **Step 3: Cerrar integraciones y ejecutar evaluación.** Benchmark real Paddle/Tesseract en perfil de QA, no dos motores en runtime. Registrar compatibilidad, tiempos fríos/calientes y RSS. Revisar corpus/hashes/atribuciones y usar la checklist semántica de QA para modo live solo con autorización adicional. No producir un veredicto clínico automático.
- [ ] **Step 4: Verificar suite y clon limpio.** `npm run test:contracts`, `npm run test:api`, `npm run test:web`, `npm run typecheck`, `npm run build:app`, `npm run build` del prototipo conservado, pytest del servicio, `npm run test:e2e`, `docker compose config --quiet`. Desde una copia temporal no sensible: preparar imágenes/pesos/datos, `docker compose up --build`, abrir localhost:8080 y completar demo sin key. Documentar red necesaria en preparación y diferencia con live. CI corre pruebas deterministas sin secrets; OCR pesado/live quedan explícitamente optativos.
- [ ] **Step 5: Documentar resultados reales y punto de control Git autorizado.** README distingue implementado/no validado, configuración sin key real, límites de salud/privacidad, borrado y costes, comandos Windows/PowerShell y Linux. Informar fallos pendientes; no marcar puertas no ejecutadas como aprobadas. Commit propuesto: `test: verify local demo and document operational limits`.

## Cobertura y dependencias

| Requisito | Tareas |
|---|---|
| Ejecución local, aislamiento y configuración | T1, T10 |
| Registro manual, contexto e historia de indicaciones | T2, T9 |
| Originales, OCR, revisión y fallos seguros | T3, T4, T6, T9 |
| Casos sin key, fuentes y atribución | T5, T7, T9 |
| Explicación y dudas con evidencia | T6, T7, T9 |
| Evolución y preparación de consulta | T8, T9 |
| Presupuesto, privacidad y borrado | T1, T4, T6, T10 |
| Accesibilidad y estados completos | T9, T10 |

Orden principal T1 → T2 → T3 → T4 → T5 → T6 → T7 → T8 → T9 → T10. Algunos módulos son independientes, pero se recomienda ejecución nativa secuencial para evitar que varios agentes inventen interfaces distintas. Si se delega, el contrato compartido y su test deben existir antes del consumidor.

## Autocontrol del plan antes de entregar

- [x] Cobertura: todas las secciones funcionales/técnicas tienen tarea propietaria.
- [x] Granularidad: pruebas y firmas permiten implementar sin diseñar nuevas capacidades.
- [x] Consistencia: tipos, estados, rutas y límites coinciden con la especificación; incluye consentimiento de OCR, borrador y selección de catálogo de la revisión independiente.
- [x] Review Focus: cada riesgo está vinculado a pruebas, incluida evaluación semántica no automatizable.
- [x] Proporción: no se ha escrito la aplicación dentro del plan ni añadido componentes fuera de alcance.

## Handoff

Revisar primero las elecciones del autor en el diseño. Tras aprobación, elegir ejecución nativa o por subagentes. **Recomendación: nativa**, por dependencias compartidas entre contratos, revisión de datos y UI; incorporar revisión independiente de la entrega antes de integrar.

Esta entrega no autoriza ejecutar las tareas, llamar al proveedor, inicializar Git ni crear commits automáticamente.
