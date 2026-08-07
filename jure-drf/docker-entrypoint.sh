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

# Presence-only diagnostics (never print connection strings).
if [ -n "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL is set"
elif [ -n "${DATABASE_PUBLIC_URL:-}" ]; then
  echo "DATABASE_PUBLIC_URL is set (prefer DATABASE_URL private reference)"
  export DATABASE_URL="${DATABASE_PUBLIC_URL}"
else
  echo "ERROR: Neither DATABASE_URL nor DATABASE_PUBLIC_URL is set in this service."
  echo "On Railway: Variables → Add → DATABASE_URL=\${{Postgres.DATABASE_URL}}"
  echo "(Replace Postgres with your PostgreSQL service name.)"
  exit 1
fi

python manage.py migrate --noinput

python manage.py collectstatic --noinput

# ASGI (Daphne) is required for WebSockets: /ws/calls/, /ws/chat/, /ws/conversation/, /ws/notifications/
# Gunicorn+WSGI cannot upgrade WebSockets — that is why calls work locally (Daphne) but fail on Railway.
# Single process: InMemory channel layer does not cross workers; use Redis (USE_INMEMORY_CHANNEL_LAYER=False)
# when you need multiple replicas.
exec daphne -b 0.0.0.0 -p "${PORT:-8000}" core.asgi:application
