# API local MVP

Una instalación, un paciente sintético, sin autenticación ni exposición pública. Escucha `0.0.0.0:3000` **solo dentro de la red privada**; únicamente el proxy local debe publicar un puerto. El proxy debe preservar `Host` (`localhost:8080` o `127.0.0.1:8080`), no reemplazarlo por `api:3000`.

## Comandos desde la raíz

Después de instalar los workspaces y construir `@mmh/contracts`:

```sh
npm run build --workspace @mmh/api
npm run test --workspace @mmh/api
npm run migrate --workspace @mmh/api
npm run seed --workspace @mmh/api
npm run start --workspace @mmh/api
```

`seed:corpus` y `seed:demo` pueden ejecutarse por separado; para demo con fuentes usar ese orden. `seed` hace ambos e importa solo datos sintéticos. No sobrescribe revisiones, contexto ni registros existentes. Las precargas dejan de aplicar tras cambios de revisión/contexto/otros tratamientos/corpus; repetir el seed no vuelve a autorizar un hash cambiado. No se requiere borrar volúmenes. `demo:assets` regenera exclusivamente PDFs ficticios, ground truth y hashes de `data/demo`; los seeds normales no escriben archivos de la aplicación.

`DATABASE_URL` es obligatorio. Opcionales: `DOCUMENT_SERVICE_URL` (por defecto `http://documents:8000`), `STORAGE_DIR` (`/var/lib/mmh/originals`), `AI_MODE` (`demo`), `OPENAI_API_KEY`, `OPENAI_MODEL`, `EMBEDDING_MODEL`, `NODE_ENV`, `LOCAL_ORIGIN`. En Windows el almacenamiento debe configurarse a una carpeta privada local. `LOCAL_ORIGIN` solo permite explícitamente `http://localhost:5174` o `http://127.0.0.1:5174`; no existe CORS wildcard. Ninguna key se envía al navegador ni se imprime.

## Implementado

- Rutas del diseño bajo `/api/v1`, salud/capacidades/catálogo y errores `{code,message,requestId}`; JSON máximo 256 KiB.
- PostgreSQL obligatorio, esquema Drizzle y migraciones SQL aplicadas con exclusión mutua. CAS de contexto/borradores, confirmación transaccional, revisiones inmutables. Un conflicto devuelve 409, nunca overwrite.
- Evolución tipada, referencias de tomas a revisiones, corrección CAS (`expectedVersion` junto con los campos de `EvolutionInput`), borrado; preguntas CRUD. No infiere omisiones, causalidad ni adherencia.
- Resumen reconstruido con período inclusivo `YYYY-MM-DD` Lima; máximo 100 registros agregados entre cambios, vivencias y preguntas del período. Solicita acotar si excede, no trunca. Incluye revisión vigente aunque se confirmara antes del período.
- Multipart PDF/PNG/JPEG de 10 MiB, firma/extensión/MIME coherentes y `syntheticAcknowledged=true`. El servicio documental valida estructura/páginas/dimensiones; los errores permanecen explícitos. Almacenamiento por UUID privado, modo 0600/0700 cuando lo soporta el filesystem. Original PDF descargable, `nosniff`, `no-store`.
- pg-boss en esquema separado. Enqueue transaccional con estado de negocio, payload solo IDs/generación. OCR HTTP multipart con timeout cliente 150 s; el proceso documental tiene su propio límite 120 s. Reintentos transitorios OCR 5/15 s, máximo tres intentos. Idempotencia, bloqueo y verificación de tombstones antes de publicar. Limpieza reintentable; tombstones conservados hasta `unlink` completo. Borrar documento elimina extracción/estructuraciones, pero no indicaciones ya confirmadas; para ese historial, borrar tratamiento.
- Tres casos precargados con IDs, versión y hashes exactos; `data/demo/documents/*.pdf`, `expected/*.json`, `hashes.json`. Demo no instancia ni llama al proveedor, aunque exista key. Un documento diferente recibe `DEMO_CASE_NOT_SUPPORTED`; se conserva la entrada manual.
- Dos fragmentos reales de CIMA, atribución española, sección, fecha documental, revisión documental y hashes persistidos. Exclusión de fuentes inactivas/no autorizadas/mayores de 180 días. Filtros exactos sustancia/vía/forma/producto; no fuzzy matching. `vector(1536)` nullable, **sin embeddings generados ni búsqueda semántica simulada**.
- Proveedor live oficial OpenAI Responses, consentimiento por operación/input hash, JSON Schema y Zod, `store:false`, sin tools, `maxRetries:0`, 2048 tokens de salida, 24000 bytes UTF-8 de payload. Reservas atómicas de 3 centavos por intento, máximo 20/día UTC y **100 centavos totales de la instalación**, conservadas ante timeout/borrado. Un resultado fallido no libera una reserva incierta. Concurrencia live global 1 mediante bloqueo PostgreSQL. Dos intentos máximo en errores transitorios.
- Explicación live restringida a citas extractivas del corpus seleccionado; no inferencias personalizadas. Preguntas elegibles limitadas a tres formulaciones seguras. Cobertura insuficiente produce limitación explícita sin llamada externa. No hay motor de interacciones. El resultado es histórico y `stale` si cambiaron sus dependencias.

## Verificación y límites pendientes

Vitest incluye tests unitarios y una base PostgreSQL+pgvector **efímera separada**, creada automáticamente con Docker cuando el daemon está disponible. Nunca usa `DATABASE_URL` del usuario; elimina únicamente su contenedor temporal y su carpeta temporal. Sin daemon los tests de integración se marcan omitidos, no aprobados.

No se ha llamado a OpenAI para validar. La evaluación humana live y sus pruebas pagadas siguen pendientes: disponer de key no constituye esa evaluación. No se implementó generación de embeddings porque no es necesaria para este corpus pequeño. Los 12 PNG degradados/benchmark CPU de QA, validación de OCR real y recorrido móvil pertenecen a la integración global y no se afirman realizados aquí. Los PDFs versionados son documentos de prueba, no recomendaciones de dosis. Citas válidas tampoco garantizan una interpretación clínica correcta.

La API no es segura para internet o uso multiusuario. Host/Origin son controles reales de acceso local, no autenticación. Datos/volúmenes y backups locales no están cifrados por esta aplicación. No usar datos reales ni publicar recetas o logs clínicos.
