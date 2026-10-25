import asyncio
import io
import json
import multiprocessing
import time
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from PIL import Image
from pypdf import PdfWriter
from pypdf.generic import DecodedStreamObject, DictionaryObject, NameObject

from app import extraction as documents
from app import main

DOCUMENT_ID = "a807c38d-6489-4f30-b230-4fd1005e35ca"
TEXT = "Documento ficticio de prueba. Indicaciones impresas para revision humana."


def pdf_bytes(text=TEXT, pages=1, encrypted=False):
    writer = PdfWriter()
    font = DictionaryObject({NameObject("/Type"): NameObject("/Font"),
                             NameObject("/Subtype"): NameObject("/Type1"),
                             NameObject("/BaseFont"): NameObject("/Helvetica")})
    for _ in range(pages):
        page = writer.add_blank_page(width=600, height=800)
        page[NameObject("/Resources")] = DictionaryObject({NameObject("/Font"): DictionaryObject({NameObject("/F1"): writer._add_object(font)})})
        stream = DecodedStreamObject()
        stream.set_data(f"BT /F1 12 Tf 50 700 Td ({text}) Tj ET".encode("ascii"))
        page[NameObject("/Contents")] = writer._add_object(stream)
    if encrypted:
        writer.encrypt("synthetic-password")
    output = io.BytesIO()
    writer.write(output)
    return output.getvalue()


def write(tmp_path, data):
    path = tmp_path / "input"
    path.write_bytes(data)
    return path


def post(client, data=b"bad", mime="application/pdf", fields=None, filename="../../ignored.pdf"):
    return client.post("/v1/extractions", data=fields or {"documentId": DOCUMENT_ID, "generation": "1"},
                       files={"file": (filename, data, mime)})


def test_native_real_worker_and_contract():
    with TestClient(main.app) as client:
        response = post(client, pdf_bytes())
    assert response.status_code == 200, response.text
    result = response.json()
    fixture = Path(__file__).parent / "fixtures" / "document-extraction.json"
    assert result == json.loads(fixture.read_text("utf-8"))
    assert set(result) == {"schemaVersion", "documentId", "generation", "method", "pages", "text", "blocks", "warnings"}
    assert result["documentId"] == DOCUMENT_ID
    assert result["schemaVersion"] == "1" and result["generation"] == 1
    assert result["method"] == "native" and result["pages"] == 1
    assert TEXT in result["text"]
    assert result["blocks"][0] == {"page": 1, "text": result["text"], "box": None, "score": None}
    assert "PDF_IMAGE_ANNOTATIONS_NOT_COVERED" in result["warnings"]
    assert response.headers["cache-control"] == "no-store"


@pytest.mark.parametrize("fields", [
    {"documentId": "bad", "generation": "1"},
    {"documentId": DOCUMENT_ID, "generation": "0"},
    {"documentId": DOCUMENT_ID, "generation": "1.5"},
    {"documentId": DOCUMENT_ID, "generation": "-1"},
    {"documentId": DOCUMENT_ID, "generation": "1", "path": "/etc/passwd"},
])
def test_invalid_fields(fields):
    with TestClient(main.app) as client:
        assert post(client, fields=fields).status_code == 400


@pytest.mark.parametrize("data,code,status", [
    (b"", "EMPTY_FILE", 422),
    (b"<svg>bad</svg>", "UNSUPPORTED_FILE_TYPE", 415),
    (b"%PDF-1.7\nbroken", "INVALID_PDF", 422),
    (pdf_bytes(encrypted=True), "ENCRYPTED_PDF", 422),
    (pdf_bytes(pages=6), "PDF_PAGE_LIMIT_EXCEEDED", 413),
    (pdf_bytes(text="a" * 24001), "TEXT_LIMIT_EXCEEDED", 413),
    (b"\x89PNG\r\n\x1a\nbroken", "INVALID_IMAGE", 422),
])
def test_rejections(data, code, status):
    with TestClient(main.app) as client:
        response = post(client, data)
    assert response.status_code == status, response.text
    assert response.json() == {"code": code, "retryable": False}


@pytest.mark.parametrize("extra", [1, 100_000])
def test_upload_size(extra):
    with TestClient(main.app) as client:
        response = post(client, b"a" * (documents.MAX_BYTES + extra))
    assert response.status_code == 413, response.text


def test_busy():
    with TestClient(main.app) as client:
        main.gate.acquire()
        try:
            response = post(client)
        finally:
            main.gate.release()
    assert response.status_code == 429
    assert response.json()["retryable"] is True


def test_image_ocr_mock_and_pdf_fallback(tmp_path, monkeypatch):
    calls = []
    monkeypatch.setattr(documents, "load_ocr", lambda: object())

    def recognize(_engine, image, page):
        calls.append(image.size)
        assert image.width * image.height <= documents.MAX_PDF_PIXELS
        return [documents.Block(page=page, text="Texto OCR ficticio", box=(0, 0, 10, 10), score=0.8)]

    monkeypatch.setattr(documents, "ocr_blocks", recognize)
    image = io.BytesIO()
    Image.new("RGB", (100, 100)).save(image, format="PNG")
    result = documents.extract(write(tmp_path, image.getvalue()), DOCUMENT_ID, 2)
    assert result["method"] == "ocr" and result["text"] == "Texto OCR ficticio"
    result = documents.extract(write(tmp_path, pdf_bytes(text="")), DOCUMENT_ID, 1)
    assert result["method"] == "ocr" and len(calls) == 2


def test_image_bomb(tmp_path, monkeypatch):
    image = io.BytesIO()
    Image.new("RGB", (100, 100)).save(image, format="PNG")
    monkeypatch.setattr(documents.Image, "MAX_IMAGE_PIXELS", 100)
    with pytest.raises(documents.DocumentError, match="IMAGE_PIXEL_LIMIT_EXCEEDED"):
        documents.open_image(write(tmp_path, image.getvalue()))


def test_models_missing_explicit(tmp_path, monkeypatch):
    monkeypatch.setenv("MODELS_DIR", str(tmp_path))
    with pytest.raises(documents.DocumentError, match="OCR_MODELS_UNAVAILABLE"):
        documents.load_ocr()


def hanging_worker(connection, path, document_id, generation):
    Path(path).write_text("started")
    time.sleep(60)


def test_timeout_terminates_process(tmp_path):
    before = {child.pid for child in multiprocessing.active_children()}
    with pytest.raises(documents.DocumentError, match="EXTRACTION_TIMEOUT") as error:
        asyncio.run(main.run_child(tmp_path / "marker", DOCUMENT_ID, 1, target=hanging_worker, timeout=1.5))
    assert error.value.retryable is False
    assert (tmp_path / "marker").read_text() == "started"
    assert {child.pid for child in multiprocessing.active_children()} == before


def test_cancellation_terminates_process(tmp_path):
    before = {child.pid for child in multiprocessing.active_children()}

    async def cancel():
        task = asyncio.create_task(main.run_child(tmp_path / "marker", DOCUMENT_ID, 1, target=hanging_worker))
        await asyncio.sleep(0.2)
        task.cancel()
        with pytest.raises(asyncio.CancelledError):
            await task

    asyncio.run(cancel())
    assert {child.pid for child in multiprocessing.active_children()} == before


def test_failure_cleans_temp_files_and_releases_gate(monkeypatch):
    paths = []

    async def failing(path, *_):
        paths.append(path)
        assert path.name == "input" and path.exists()
        raise documents.DocumentError("EXTRACTION_TIMEOUT")

    monkeypatch.setattr(main, "run_child", failing)
    with TestClient(main.app) as client:
        assert post(client, pdf_bytes()).status_code == 422
        assert post(client, pdf_bytes()).status_code == 422
    assert len(paths) == 2
    assert all(not path.parent.exists() for path in paths)


def test_liveness_does_not_require_ocr(monkeypatch):
    monkeypatch.setattr(main, "readiness", lambda: (False, "OCR_MODELS_UNAVAILABLE"))
    with TestClient(main.app) as client:
        assert client.get("/health/live").status_code == 200
        response = client.get("/health/ready")
    assert response.status_code == 503
    assert response.json()["nativePdf"] is True


def test_pdf_decompression_bomb(tmp_path):
    writer = PdfWriter(clone_from=io.BytesIO(pdf_bytes()))
    stream = DecodedStreamObject()
    stream.set_data(b" " * (17 * 1024 * 1024))
    compressed = stream.flate_encode()
    writer.pages[0][NameObject("/Contents")] = writer._add_object(compressed)
    output = io.BytesIO()
    writer.write(output)
    assert len(output.getvalue()) < documents.MAX_BYTES
    with pytest.raises(documents.DocumentError, match="INVALID_PDF"):
        documents.extract(write(tmp_path, output.getvalue()), DOCUMENT_ID, 1)


def test_mixed_pdf(tmp_path, monkeypatch):
    writer = PdfWriter()
    writer.append(io.BytesIO(pdf_bytes()))
    writer.append(io.BytesIO(pdf_bytes(text="")))
    output = io.BytesIO()
    writer.write(output)
    monkeypatch.setattr(documents, "load_ocr", lambda: object())
    monkeypatch.setattr(documents, "ocr_blocks", lambda _, image, page: [documents.Block(page=page, text="OCR ficticio")])
    result = documents.extract(write(tmp_path, output.getvalue()), DOCUMENT_ID, 1)
    assert result["method"] == "mixed" and result["pages"] == 2
    assert [block["page"] for block in result["blocks"]] == [1, 2]


def test_preparation_and_hash_validation(tmp_path, monkeypatch):
    import tarfile
    from scripts import prepare_models

    def archive(url, timeout):
        output = io.BytesIO()
        with tarfile.open(fileobj=output, mode="w") as tar:
            for name in ("inference.json", "inference.pdiparams", "inference.yml"):
                member = tarfile.TarInfo("model_infer/" + name)
                member.size = 4
                tar.addfile(member, io.BytesIO(b"test"))
        return io.BytesIO(output.getvalue())

    monkeypatch.setattr(prepare_models.urllib.request, "urlopen", archive)
    root = tmp_path / "models"
    prepare_models.prepare(root)
    assert documents.model_directories(root) == [root / name for name in documents.MODELS]
    (root / documents.MODELS[0] / "inference.json").write_text("tampered")
    with pytest.raises(documents.DocumentError, match="OCR_MODELS_UNAVAILABLE"):
        documents.model_directories(root)
    with pytest.raises(ValueError, match="already contains models"):
        prepare_models.prepare(root)


def test_preparation_rejects_traversal(tmp_path, monkeypatch):
    import tarfile
    from scripts import prepare_models

    output = io.BytesIO()
    with tarfile.open(fileobj=output, mode="w") as tar:
        member = tarfile.TarInfo("model/../../escape")
        member.size = 1
        tar.addfile(member, io.BytesIO(b"x"))
    monkeypatch.setattr(prepare_models.urllib.request, "urlopen", lambda *_, **__: io.BytesIO(output.getvalue()))
    with pytest.raises(ValueError, match="Unsafe archive path"):
        prepare_models.prepare(tmp_path / "models")
    assert not (tmp_path / "escape").exists()
