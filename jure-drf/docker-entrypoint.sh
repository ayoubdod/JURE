#!/bin/sh
set -e

# Guard against Railway/dashboard overrides that point at local settings.
# Empty / unset / explicit local → staging. Explicit production is kept.
case "${DJANGO_SETTINGS_MODULE:-}" in
  ""|core.settings|core.settings.local)
    export DJANGO_SETTINGS_MODULE=core.settings.staging
    ;;
esac

if [ "$DJANGO_SETTINGS_MODULE" = "core.settings.local" ]; then
  echo "ERROR: Refusing to boot with core.settings.local inside a container."
  exit 1
fi

echo "DJANGO_SETTINGS_MODULE=${DJANGO_SETTINGS_MODULE}"

python manage.py migrate --noinput

python manage.py collectstatic --noinput

exec gunicorn core.wsgi:application \
    --bind 0.0.0.0:${PORT:-8000} \
    --workers 2 \
    --timeout 120
