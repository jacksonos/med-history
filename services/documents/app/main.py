import asyncio
import multiprocessing
import tempfile
import threading
import time
from pathlib import Path
from uuid import UUID

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from starlette.datastructures import UploadFile
from starlette.exceptions import HTTPException
from starlette.formparsers import MultiPartException

from .extraction import MAX_BYTES, DocumentError, DocumentExtraction, readiness, worker

TIMEOUT_SECONDS = 120
gate = threading.Lock()
app = FastAPI(title="My Med History documents", docs_url=None, redoc_url=None)


@app.exception_handler(DocumentError)
async def document_error(_request, exc):
    return JSONResponse({"code": exc.code, "retryable": exc.retryable}, status_code=exc.status,
                        headers={"Cache-Control": "no-store"})


class BodyLimitMiddleware:
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            return await self.app(scope, receive, send)
        size = 0

        async def limited_receive():
            nonlocal size
            message = await receive()
            size += len(message.get("body", b""))
            if size > MAX_BYTES + 64 * 1024:
                # MultiPartException makes Starlette close all partially spooled files.
                raise MultiPartException("BODY_TOO_LARGE")
            return message

        await self.app(scope, limited_receive, send)


app.add_middleware(BodyLimitMiddleware)


async def run_child(path: Path, document_id: str, generation: int, *, target=worker,
                    timeout: float = TIMEOUT_SECONDS) -> dict:
    context = multiprocessing.get_context("spawn")
    parent, child = context.Pipe(duplex=False)
    process = context.Process(target=target, args=(child, str(path), document_id, generation), daemon=True)
    try:
        process.start()
        child.close()
        deadline = time.monotonic() + timeout
        while time.monotonic() < deadline:
            if parent.poll():
                try:
                    message = parent.recv()
                except EOFError:
                    raise DocumentError("EXTRACTION_WORKER_FAILED", 503, True) from None
                if "error" in message:
                    raise DocumentError(**message["error"])
                return DocumentExtraction.model_validate(message["result"]).model_dump(mode="json")
            if not process.is_alive():
                raise DocumentError("EXTRACTION_WORKER_FAILED", 503, True)
            await asyncio.sleep(0.02)
        raise DocumentError("EXTRACTION_TIMEOUT", 422, False)
    finally:
        if process.pid is not None:
            if process.is_alive():
                process.terminate()
            process.join(timeout=2)
            if process.is_alive():
                process.kill()
                process.join()
            process.close()
        parent.close()
        child.close()


@app.get("/health/live")
def live():
    return {"status": "ok"}


@app.get("/health/ready")
def ready():
    available, code = readiness()
    return JSONResponse({"status": "ready" if available else "degraded", "nativePdf": True,
                         "ocr": available, "code": code}, status_code=200 if available else 503)


@app.post("/v1/extractions", response_model=DocumentExtraction)
async def extraction(request: Request):
    if not gate.acquire(blocking=False):
        raise DocumentError("DOCUMENT_SERVICE_BUSY", 429, True)
    try:
        if request.headers.get("content-type", "").split(";", 1)[0].lower() != "multipart/form-data":
            raise DocumentError("MULTIPART_REQUIRED", 415)
        try:
            async with request.form(max_files=1, max_fields=2, max_part_size=1024) as form:
                if sorted(form.keys()) != ["documentId", "file", "generation"] or len(form.multi_items()) != 3:
                    raise DocumentError("INVALID_MULTIPART_FIELDS", 400)
                try:
                    document_id = str(UUID(str(form["documentId"])))
                    raw_generation = form["generation"]
                    if not isinstance(raw_generation, str) or not raw_generation.isascii() or not raw_generation.isdecimal():
                        raise ValueError("generation")
                    generation = int(raw_generation)
                    if generation <= 0 or generation > 2_147_483_647:
                        raise ValueError("generation")
                except (ValueError, TypeError):
                    raise DocumentError("INVALID_DOCUMENT_ID_OR_GENERATION", 400) from None
                upload = form["file"]
                if not isinstance(upload, UploadFile):
                    raise DocumentError("FILE_REQUIRED", 400)
                if upload.content_type not in ("application/pdf", "image/png", "image/jpeg", "application/octet-stream"):
                    raise DocumentError("UNSUPPORTED_FILE_TYPE", 415)
                with tempfile.TemporaryDirectory(prefix="document-") as directory:
                    path = Path(directory) / "input"
                    size = 0
                    with path.open("xb") as output:
                        path.chmod(0o600)
                        while chunk := await upload.read(64 * 1024):
                            size += len(chunk)
                            if size > MAX_BYTES:
                                raise DocumentError("FILE_TOO_LARGE", 413)
                            output.write(chunk)
                    if not size:
                        raise DocumentError("EMPTY_FILE", 422)
                    result = await run_child(path, document_id, generation)
                    return JSONResponse(result, headers={"Cache-Control": "no-store"})
        except HTTPException as exc:
            code = "FILE_TOO_LARGE" if "BODY_TOO_LARGE" in str(exc.detail) else "INVALID_MULTIPART"
            raise DocumentError(code, 413 if code == "FILE_TOO_LARGE" else 400) from None
    finally:
        gate.release()
