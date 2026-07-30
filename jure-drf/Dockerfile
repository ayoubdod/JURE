FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PIP_NO_CACHE_DIR=1
# Container/Railway default — override with core.settings.production if needed.
# Local `manage.py` / `wsgi.py` still default to core.settings.local when unset.
ENV DJANGO_SETTINGS_MODULE=core.settings.staging

WORKDIR /app

RUN apt-get update && apt-get install -y \
    gcc \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

RUN pip install -r requirements.txt

COPY . .

RUN mkdir -p staticfiles media

RUN chmod +x docker-entrypoint.sh

EXPOSE 8000

ENTRYPOINT ["./docker-entrypoint.sh"]
