# Servicio documental local

Python 3.11/Linux amd64 es el objetivo de Docker; no usa GPU, API externa ni base de datos. Solo documentos ficticios. PDF con texto funciona sin Paddle ni pesos.

## Desarrollo y pruebas sin OCR

Desde `services/documents`, crear un venv (no instalar Paddle en el Python global):

```sh
python -m venv .venv
# Linux: . .venv/bin/activate ; Windows: .venv\Scripts\Activate.ps1
python -m pip install -e '.[test]'
python -m pytest -q
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 1 --no-access-log
```

No utilizar varios workers/réplicas: la exclusión de concurrencia es por proceso. El despliegue principal mantiene este servicio en la red interna, sin puertos publicados al host. Nunca usar el endpoint con archivos reales en una instalación expuesta sin autenticación.

## Preparar OCR explícitamente

Construir la imagen instala Paddle CPU pero **no descarga modelos**. Desde la raíz del proyecto:

```sh
docker compose --profile tools run --rm --build prepare-ocr
```

El comando descarga únicamente los dos archivos oficiales `PP-OCRv5_mobile_det` y `latin_PP-OCRv5_mobile_rec` en el volumen de modelos de Compose. Este contenedor de preparación es optativo y puede salir a Internet; el servicio que procesa documentos usa una red interna sin salida y monta los modelos en solo lectura. El script rechaza rutas/links peligrosos y archivos demasiado grandes; no sobrescribe modelos existentes. Para actualizar, preparar un volumen nuevo y revisar su manifiesto antes de sustituirlo.

`/models/manifest.json` registra nombres, versión PP-OCRv5, URLs y SHA-256 de archivos/archives; conservarlo junto con los pesos (fuera de Git) para reproducir esa descarga. Los hashes detectan cambios locales, no constituyen una firma del proveedor. El proceso de extracción verifica los hashes antes de cargar modelos. No hay descarga automática durante peticiones. `MODELS_DIR` permite una carpeta local alternativa. En un venv dedicado Python 3.11, `pip install -r requirements-ocr.txt` instala el runtime CPU opcional.

Montar ese volumen en `/models:ro` al arrancar. La imagen ejecuta UID/GID 10001. Usar filesystem raíz de solo lectura, `/tmp` tmpfs privado (UID 10001, modo 0700), sin privilegios/capabilities, límite de memoria (p.ej. 2 GiB), CPU (2), PIDs y sin salida a Internet durante procesamiento. El límite de memoria del contenedor es necesario para contener bombas PDF; el límite de bytes por sí solo no limita streams comprimidos. El volumen debe ser legible por UID 10001. No publicar puertos del servicio.

La preparación no demuestra compatibilidad de inferencia: ejecutar además un smoke CPU con PNG ficticio legible y revisar texto/bloques, tiempos y memoria en el equipo objetivo. Las pruebas automatizadas usan OCR simulado; no afirman precisión clínica ni validación de Paddle real.

## Contrato y límites

- `POST /v1/extractions`: multipart exactamente `documentId` UUID, `generation` entero positivo y `file` PDF/PNG/JPEG. Nombre del archivo ignorado; ningún parámetro acepta rutas/URLs.
- 10 MiB por archivo (más 64 KiB de sobre multipart), 5 páginas, 20 MP por imagen, render PDF hasta 8 MP/página, 24 000 caracteres totales; excesos se rechazan, no se truncan.
- PDF con al menos 40 caracteres visibles por página conserva texto nativo; otras páginas se rasterizan y pasan por OCR español. Método `native`, `ocr` o `mixed`. Se advierte que imágenes/anotaciones dentro de páginas nativas no están cubiertas y todo resultado requiere revisión humana.
- Un hijo desechable por documento, timeout de 120 s y terminación real (también al cancelar). Una segunda petición recibe 429; temporales privados eliminados incluso ante fallo.
- Respuesta 200 camelCase `DocumentExtraction` schemaVersion `1`; errores `{code, retryable}`. 400 formulario, 413 límites, 415 formato, 422 corrupto/cifrado/timeout, 429 ocupado, 503 runtime/pesos/worker indisponibles. Solo errores transitorios marcan `retryable:true`.
- `GET /health/live`: proceso vivo. `GET /health/ready`: 200 con OCR preparado o 503 degradado con `nativePdf:true`; **no condicionar el arranque de la API de negocio a este ready**. Ready comprueba presencia, no carga inferencia ni certifica exactitud; hashes se verifican en el hijo.

No se registran nombres originales, bytes ni texto extraído. Uvicorn usa un solo worker y access log desactivado. El cliente interno debe esperar hasta 150 s; cerrar su conexión no sustituye el timeout del hijo.
