# My Med History

Una aplicación local para **comprender un tratamiento ya indicado, registrar la experiencia del paciente y preparar preguntas para su siguiente consulta**.

> Proyecto de portafolio con datos ficticios. No diagnostica, prescribe ni modifica tratamientos. No se monitoriza de forma continua ni garantiza detectar interacciones o urgencias. No introduzcas historias clínicas reales en esta demo.

## Dos aplicaciones, sin perder los prototipos

- **Prototipos visuales originales:** `src/`, ejecutados con `npm run dev`. Se conservan para comparar propuestas; sus datos y consejos mock **no son una base clínica validada**.
- **Aplicación conectada:** `apps/web` + `apps/api`, con contratos en `packages/contracts` y servicio documental en `services/documents`.

El frontend nuevo no utiliza los consejos de los prototipos como reglas médicas. La información extraída es un borrador: debe revisarse antes de confirmar una indicación.

## Ejecutar localmente

Requisitos: Docker Desktop con motor Linux activo, Docker Compose y conexión para descargar imágenes/dependencias. No se necesita instalar Python o Node en el host para el recorrido Docker. Primera ejecución puede tardar y necesitar varios GiB de espacio.

```powershell
Copy-Item .env.example .env
docker compose up --build
```

En Linux/macOS, sustituye la primera línea por `cp .env.example .env`.

Abre **http://localhost:8080**. Solo ese puerto se publica, limitado al equipo local; PostgreSQL, API y OCR permanecen en la red de Compose.

`AI_MODE=demo` es el modo predeterminado. No requiere una API key y no debe generar consumo de IA. Que una key esté presente no cambia automáticamente al modo live.

Para detener sin borrar el historial:

```text
docker compose down
```

**No uses `docker compose down -v` como reinicio:** elimina los volúmenes de base de datos, originales y caché de modelos.

Si aparece un error sobre `dockerDesktopLinuxEngine`, inicia Docker Desktop y espera a que el motor Linux esté disponible antes de repetir el comando.

## Procesamiento documental

- Formatos iniciales: PDF, PNG y JPEG.
- Límites: 10 MiB por archivo, cinco páginas, 20 megapíxeles por imagen y 24 000 caracteres de extracción.
- Los PDF con texto pueden procesarse sin reconocimiento de imagen.
- Para fotos/escaneos se necesita preparar explícitamente los modelos de PaddleOCR; consulta [el servicio documental](services/documents/README.md). No se garantiza lectura de recetas manuscritas.
- Los documentos permanecen en almacenamiento local privado. Ejecutar localmente **no implica cifrado del disco** ni aislamiento entre personas que compartan la instalación.

## IA y referencias

Los resultados precargados deben identificarse como demostración y no reutilizarse tras cambiar las indicaciones del caso. Para análisis nuevos con un proveedor externo se requiere modo live, key en servidor y aceptación del envío correspondiente.

No publiques `.env`, claves, recetas ni resultados de personas reales. El modo live puede generar costes y enviar texto al proveedor; `store=false` no equivale a ausencia de toda retención. Las citas y los esquemas estructurados no garantizan exactitud médica.

La cobertura documental inicial es reducida y explícita. Una fuente española no acredita que una marca, formulación o pauta esté autorizada en Perú. El sistema debe reconocer información faltante en lugar de inventarla.

## Desarrollo sin contenedores completos

Requiere Node 22.12 o superior (Node 24 como objetivo), npm, PostgreSQL con pgvector y los servicios/configuración que corresponda. Conserva los scripts de los prototipos:

```text
npm ci
npm run build:contracts
npm run dev:api
npm run dev:web
```

Ejecuta API y web en terminales separadas. `dev:web` usa el puerto 5174 para no reemplazar el explorador de prototipos en 5173. La configuración y los comandos de la API están en [apps/api](apps/api/README.md).

## Comprobaciones

```text
npm run test:app
npm run build:app
npm run build
docker compose config --quiet
```

Las pruebas del servicio documental y cualquier evaluación de OCR/modelos se documentan en su carpeta. Un build correcto no demuestra que PostgreSQL, los contenedores o el LLM se hayan probado juntos. No ejecutar pruebas de pago ni habilitar live automáticamente en CI.

## Diseño y alcance

- [Índice documental](docs/README.md).
- [Flujos, pantallas y navegación](docs/producto/analisis-funcional.md).
- [Diseño técnico](docs/superpowers/specs/2026-10-25-my-med-history-design.md).
- [Casos y criterios de evaluación](docs/qa/casos-evaluacion.md).

El proyecto es una demostración técnica, no un servicio apto para atención clínica o exposición pública sin autenticación y revisión adicional.
