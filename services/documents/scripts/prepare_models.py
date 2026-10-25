"""Explicit network-only maintenance command; never called by the API."""

import argparse
import hashlib
import json
from pathlib import Path
import shutil
import tarfile
import tempfile
import urllib.request

NAMES = ("PP-OCRv5_mobile_det", "latin_PP-OCRv5_mobile_rec")
BASE = "https://paddle-model-ecology.bj.bcebos.com/paddlex/official_inference_model/paddle3.0.0/"
MAX_DOWNLOAD = 64 * 1024 * 1024
MAX_UNPACKED = 128 * 1024 * 1024


def prepare(root: Path):
    root.mkdir(parents=True, exist_ok=True)
    if (root / "manifest.json").exists() or any((root / name).exists() for name in NAMES):
        raise ValueError("Destination already contains models; use a new directory to avoid overwriting them")
    manifest = {"schemaVersion": "1", "models": {}}
    with tempfile.TemporaryDirectory(prefix="prepare-ocr-") as directory:
        staging = Path(directory)
        for name in NAMES:
            url = BASE + name + "_infer.tar"
            archive = staging / (name + ".tar")
            total = 0
            with urllib.request.urlopen(url, timeout=60) as response, archive.open("xb") as output:
                while chunk := response.read(64 * 1024):
                    total += len(chunk)
                    if total > MAX_DOWNLOAD:
                        raise ValueError("Model archive too large")
                    output.write(chunk)
            destination = staging / name
            destination.mkdir()
            unpacked = 0
            with tarfile.open(archive) as tar:
                for member in tar:
                    relative = Path(member.name)
                    if relative.is_absolute() or ".." in relative.parts or "\\" in member.name:
                        raise ValueError("Unsafe archive path")
                    if member.isdir():
                        continue
                    if not member.isfile():
                        raise ValueError("Archive links/devices are not allowed")
                    # Official archives contain one top-level *_infer directory.
                    relative = Path(*relative.parts[1:])
                    if not relative.parts:
                        raise ValueError("Invalid archive structure")
                    unpacked += member.size
                    if unpacked > MAX_UNPACKED:
                        raise ValueError("Model files too large")
                    target = destination / relative
                    if not target.resolve().is_relative_to(destination.resolve()):
                        raise ValueError("Unsafe archive path")
                    target.parent.mkdir(parents=True, exist_ok=True)
                    with tar.extractfile(member) as source, target.open("xb") as output:
                        shutil.copyfileobj(source, output)
            files = {str(path.relative_to(destination)).replace("\\", "/"): hashlib.sha256(path.read_bytes()).hexdigest()
                     for path in sorted(destination.rglob("*")) if path.is_file()}
            if not {"inference.json", "inference.pdiparams", "inference.yml"} <= files.keys():
                raise ValueError("Incomplete model archive")
            manifest["models"][name] = {"version": "PP-OCRv5", "source": url,
                "archiveSha256": hashlib.sha256(archive.read_bytes()).hexdigest(), "files": files}
        for name in NAMES:
            shutil.copytree(staging / name, root / name)
        (root / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print("Prepared local models and SHA-256 manifest. OCR CPU smoke test still required.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--download", action="store_true", required=True, help="Authorize model downloads")
    parser.add_argument("--output", type=Path, default=Path("/models"))
    args = parser.parse_args()
    prepare(args.output)
