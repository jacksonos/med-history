FROM python:3.11.14-slim-bookworm
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 HOME=/tmp \
    MODELS_DIR=/models PADDLE_PDX_CACHE_HOME=/tmp/paddlex \
    PADDLE_PDX_DISABLE_MODEL_SOURCE_CHECK=True OMP_NUM_THREADS=2
WORKDIR /service
RUN apt-get update && apt-get install -y --no-install-recommends libgomp1 libgl1 libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd --gid 10001 documents && useradd --uid 10001 --gid 10001 --no-create-home documents \
    && mkdir /models && chown 10001:10001 /models
COPY requirements*.txt ./
RUN pip install --no-cache-dir -r requirements-ocr.txt
COPY app ./app
COPY scripts ./scripts
USER 10001:10001
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1", "--no-access-log"]
