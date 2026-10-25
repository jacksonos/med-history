"""Untrusted document parsing runs only in the disposable worker process."""

import importlib.util
import json
import logging
import math
import os
import hashlib
import warnings
from pathlib import Path
from typing import Literal
from uuid import UUID

from PIL import Image, UnidentifiedImageError
from pydantic import BaseModel, ConfigDict, Field
from pypdf import PdfReader, overwrite_configuration

MAX_BYTES = 10 * 1024 * 1024
MAX_PAGES = 5
MAX_IMAGE_PIXELS = 20_000_000
MAX_PDF_PIXELS = 8_000_000
MAX_CHARS = 24_000
MODELS = ("PP-OCRv5_mobile_det", "latin_PP-OCRv5_mobile_rec")
Image.MAX_IMAGE_PIXELS = MAX_IMAGE_PIXELS


class DocumentError(Exception):
    def __init__(self, code: str, status: int = 422, retryable: bool = False):
        super().__init__(code)
        self.code, self.status, self.retryable = code, status, retryable


class Block(BaseModel):
    model_config = ConfigDict(extra="forbid", allow_inf_nan=False)
    page: int = Field(ge=1, le=MAX_PAGES)
    text: str
    box: tuple[float, float, float, float] | None = None
    score: float | None = Field(default=None, ge=0, le=1)


class DocumentExtraction(BaseModel):
    model_config = ConfigDict(extra="forbid")
    schemaVersion: Literal["1"] = "1"
    documentId: UUID
    generation: int = Field(gt=0)
    method: Literal["native", "ocr", "mixed"]
    pages: int = Field(ge=1, le=MAX_PAGES)
    text: str = Field(max_length=MAX_CHARS)
    blocks: list[Block]
    warnings: list[str]


def model_directories(root: Path, verify: bool = True) -> list[Path]:
    """Only explicitly prepared local models are accepted; never model names alone."""
    try:
        manifest = json.loads((root / "manifest.json").read_text("utf-8"))
        if manifest["schemaVersion"] != "1" or set(manifest["models"]) != set(MODELS):
            raise ValueError("manifest")
        for name in MODELS:
            entry = manifest["models"][name]
            if entry["version"] != "PP-OCRv5" or not entry["files"]:
                raise ValueError("version")
            for required in ("inference.json", "inference.pdiparams", "inference.yml"):
                if required not in entry["files"]:
                    raise ValueError("incomplete")
            for relative, digest in entry["files"].items():
                path = root / name / relative
                if not path.resolve().is_relative_to((root / name).resolve()) or path.is_symlink():
                    raise ValueError("path")
                if not path.is_file() or (verify and hashlib.sha256(path.read_bytes()).hexdigest() != digest):
                    raise ValueError("checksum")
        return [root / name for name in MODELS]
    except (OSError, ValueError, KeyError, TypeError):
        raise DocumentError("OCR_MODELS_UNAVAILABLE", 503, True) from None


def readiness() -> tuple[bool, str | None]:
    if any(importlib.util.find_spec(module) is None for module in ("paddle", "paddleocr", "pypdfium2")):
        return False, "OCR_RUNTIME_UNAVAILABLE"
    try:
        model_directories(Path(os.environ.get("MODELS_DIR", "/models")), verify=False)
    except DocumentError as exc:
        return False, exc.code
    return True, None


def load_ocr():
    directories = model_directories(Path(os.environ.get("MODELS_DIR", "/models")))
    os.environ["PADDLE_PDX_DISABLE_MODEL_SOURCE_CHECK"] = "True"
    try:
        from paddleocr import PaddleOCR

        return PaddleOCR(
            lang="es", device="cpu", ocr_version="PP-OCRv5",
            text_detection_model_name=MODELS[0], text_detection_model_dir=str(directories[0]),
            text_recognition_model_name=MODELS[1], text_recognition_model_dir=str(directories[1]),
            use_doc_orientation_classify=False, use_doc_unwarping=False,
            use_textline_orientation=False, enable_mkldnn=False, cpu_threads=2,
        )
    except ImportError:
        raise DocumentError("OCR_RUNTIME_UNAVAILABLE", 503, True) from None
    except Exception:
        raise DocumentError("OCR_INITIALIZATION_FAILED", 503, True) from None


def ocr_blocks(engine, image: Image.Image, page: int) -> list[Block]:
    import numpy as np

    blocks = []
    # Paddle expects a BGR ndarray, not a PIL image.
    for result in engine.predict(np.asarray(image.convert("RGB"))[:, :, ::-1].copy()):
        for text, score, polygon in zip(result["rec_texts"], result["rec_scores"], result["rec_polys"], strict=True):
            points = polygon.tolist() if hasattr(polygon, "tolist") else polygon
            xs, ys = zip(*points)
            blocks.append(Block(page=page, text=str(text), score=float(score),
                                box=(min(xs), min(ys), max(xs), max(ys))))
            if sum(len(block.text) + 1 for block in blocks) > MAX_CHARS:
                raise DocumentError("TEXT_LIMIT_EXCEEDED", 413)
    return blocks


def open_image(path: Path) -> Image.Image:
    try:
        with warnings.catch_warnings():
            warnings.simplefilter("error", Image.DecompressionBombWarning)
            with Image.open(path) as source:
                if source.format not in ("PNG", "JPEG"):
                    raise DocumentError("UNSUPPORTED_FILE_TYPE", 415)
                if source.width * source.height > MAX_IMAGE_PIXELS:
                    raise DocumentError("IMAGE_PIXEL_LIMIT_EXCEEDED", 413)
                if getattr(source, "n_frames", 1) != 1:
                    raise DocumentError("ANIMATED_IMAGE_UNSUPPORTED")
                source.verify()
            with Image.open(path) as source:
                source.load()
                return source.convert("RGB")
    except (Image.DecompressionBombError, Image.DecompressionBombWarning):
        raise DocumentError("IMAGE_PIXEL_LIMIT_EXCEEDED", 413) from None
    except (UnidentifiedImageError, OSError, ValueError, SyntaxError):
        raise DocumentError("INVALID_IMAGE") from None


def extract(path: Path, document_id: str, generation: int) -> dict:
    if path.stat().st_size > MAX_BYTES:
        raise DocumentError("FILE_TOO_LARGE", 413)
    with path.open("rb") as stream:
        signature = stream.read(8)
    blocks: list[Block] = []
    methods: set[str] = set()
    notices = ["OCR_REQUIRES_HUMAN_REVIEW"]
    engine = None

    def recognize(image, page):
        nonlocal engine
        if engine is None:
            engine = load_ocr()
        return ocr_blocks(engine, image, page)

    if signature.startswith(b"%PDF-"):
        try:
            overwrite_configuration(
                zlib_maximum_output_length=16 * 1024 * 1024,
                lzw_maximum_output_length=16 * 1024 * 1024,
                run_length_maximum_output_length=16 * 1024 * 1024,
                stream_decoding_work_maximum_length=32 * 1024 * 1024,
                page_tree_maximum_entries=100, page_tree_maximum_depth=20,
                jbig2dec_binary=None,
            )
            reader = PdfReader(path, strict=True)
            if reader.is_encrypted:
                raise DocumentError("ENCRYPTED_PDF")
            pages = len(reader.pages)
            if not 1 <= pages <= MAX_PAGES:
                raise DocumentError("PDF_PAGE_LIMIT_EXCEEDED", 413)
            raster = None
            try:
                for number, page in enumerate(reader.pages, 1):
                    # The child timeout and container memory limit contain hostile streams.
                    text = page.extract_text() or ""
                    if sum(char.isprintable() and not char.isspace() for char in text) >= 40:
                        blocks.append(Block(page=number, text=text))
                        methods.add("native")
                        if "PDF_IMAGE_ANNOTATIONS_NOT_COVERED" not in notices:
                            notices.append("PDF_IMAGE_ANNOTATIONS_NOT_COVERED")
                    else:
                        import pypdfium2 as pdfium

                        if raster is None:
                            raster = pdfium.PdfDocument(path)
                        pdf_page = raster[number - 1]
                        try:
                            width, height = pdf_page.get_size()
                            if not all(math.isfinite(v) and v > 0 for v in (width, height)):
                                raise DocumentError("INVALID_PDF")
                            scale = min(2.0, math.sqrt(MAX_PDF_PIXELS / (width * height)) * 0.999)
                            if math.ceil(width * scale) * math.ceil(height * scale) > MAX_PDF_PIXELS:
                                raise DocumentError("PDF_PIXEL_LIMIT_EXCEEDED", 413)
                            bitmap = pdf_page.render(scale=scale)
                            try:
                                with bitmap.to_pil().copy() as image:
                                    blocks.extend(recognize(image, number))
                            finally:
                                bitmap.close()
                        finally:
                            pdf_page.close()
                        methods.add("ocr")
                    if sum(len(block.text) + 1 for block in blocks) - 1 > MAX_CHARS:
                        raise DocumentError("TEXT_LIMIT_EXCEEDED", 413)
            finally:
                if raster is not None:
                    raster.close()
        except DocumentError:
            raise
        except Exception:
            raise DocumentError("INVALID_PDF") from None
    elif signature.startswith(b"\x89PNG\r\n\x1a\n") or signature.startswith(b"\xff\xd8\xff"):
        with open_image(path) as image:
            blocks = recognize(image, 1)
        pages = 1
        methods.add("ocr")
    else:
        raise DocumentError("UNSUPPORTED_FILE_TYPE", 415)

    text = "\n".join(block.text for block in blocks)
    if len(text) > MAX_CHARS:
        raise DocumentError("TEXT_LIMIT_EXCEEDED", 413)
    if not text.strip():
        notices.append("NO_TEXT_RECOGNIZED")
    return DocumentExtraction(
        documentId=document_id, generation=generation,
        method="mixed" if len(methods) > 1 else next(iter(methods)),
        pages=pages, text=text, blocks=blocks, warnings=notices,
    ).model_dump(mode="json")


def worker(connection, path: str, document_id: str, generation: int):
    # Third-party parser diagnostics can quote untrusted document content.
    logging.disable(logging.CRITICAL)
    try:
        connection.send({"result": extract(Path(path), document_id, generation)})
    except DocumentError as exc:
        connection.send({"error": {"code": exc.code, "status": exc.status, "retryable": exc.retryable}})
    except Exception:
        connection.send({"error": {"code": "EXTRACTION_FAILED", "status": 422, "retryable": False}})
    finally:
        connection.close()
