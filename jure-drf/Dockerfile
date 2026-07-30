FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PIP_NO_CACHE_DIR=1

# Baked into every image layer after this instruction.
# Entrypoint also refuses core.settings.local at runtime.
ENV DJANGO_SETTINGS_MODULE=core.settings.staging

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy entrypoint + settings early so changes invalidate subsequent layers
# and cannot be served from a stale cached image without a rebuild.
COPY docker-entrypoint.sh .
COPY core/settings/ ./core/settings/

COPY . .

# Re-assert after COPY so a stray .env (if ever present) cannot win via
# build-time tooling, and so settings-module changes bust the final layers.
ARG CACHEBUST=1
RUN echo "cachebust=${CACHEBUST}" \
    && test ! -f .env \
    && test ! -d .venv \
    && chmod +x docker-entrypoint.sh

ENV DJANGO_SETTINGS_MODULE=core.settings.staging

RUN mkdir -p staticfiles media

EXPOSE 8000

ENTRYPOINT ["./docker-entrypoint.sh"]
