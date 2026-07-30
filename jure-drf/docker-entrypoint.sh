#!/bin/sh

set -e

echo "Applying migrations..."

python manage.py migrate --noinput

echo "Collecting static files..."

python manage.py collectstatic --noinput

echo "Starting Gunicorn..."

exec gunicorn core.wsgi:application \
    --bind 0.0.0.0:${PORT:-8000} \
    --workers=2 \
    --timeout=120