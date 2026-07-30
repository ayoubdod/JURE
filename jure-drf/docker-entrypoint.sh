#!/bin/sh

echo "Running migrations..."

python manage.py migrate --noinput

echo "Collecting static files..."

python manage.py collectstatic --noinput

echo "Starting Gunicorn..."

exec gunicorn core.wsgi:application \
    --bind 0.0.0.0:$PORT \
    --workers 2 \
    --timeout 120