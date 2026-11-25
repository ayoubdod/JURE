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

# Refuse known-insecure or missing SECRET_KEY before Django imports settings.
_secret="${SECRET_KEY:-}"
case "$_secret" in
  ""|django-insecure-*|*local-dev-only*|*change-me-to-a-long-random-string*)
    echo "ERROR: SECRET_KEY must be a unique random value (>=50 chars) in this environment."
    echo "Rotate any previously committed default immediately after setting it."
    exit 1
    ;;
esac
if [ "${#_secret}" -lt 50 ]; then
  echo "ERROR: SECRET_KEY must be at least 50 characters."
  exit 1
fi
echo "SECRET_KEY is set"

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

# Uploaded files (profile photos, cabinet logos, library docs) live here.
# On Railway this must be a persistent Volume mount, not the image's /app/media.
if [ -z "${MEDIA_ROOT:-}" ] || [ "${MEDIA_ROOT}" = "/app/media" ] || [ "${MEDIA_ROOT}" = "media" ]; then
  echo "ERROR: MEDIA_ROOT must be a persistent absolute path outside /app (volume mount)."
  exit 1
fi
mkdir -p "${MEDIA_ROOT}"

# Railway pre-deploy is `entrypoint sh -c "..."`. Run that and exit.
# Do not fall through into Daphne or the pre-deploy container never finishes.
if [ "$#" -gt 0 ]; then
  echo "Running one-off command: $*"
  exec "$@"
fi

# On Railway, migrate runs in preDeployCommand (see railway.toml) so this
# process can bind PORT before the healthcheck window ends. A migrate that
# hangs on the database otherwise leaves /health/ with nothing to answer.
if [ -n "${RAILWAY_ENVIRONMENT:-}" ]; then
  echo "Railway web process: skipping migrate (pre-deploy already ran it)"
else
  python manage.py migrate --noinput
fi

echo "Collecting static files"
python manage.py collectstatic --noinput

# ASGI (Daphne) is required for WebSockets: /ws/calls/, /ws/chat/, /ws/conversation/, /ws/notifications/
# Gunicorn+WSGI cannot upgrade WebSockets — that is why calls work locally (Daphne) but fail on Railway.
# Single process: InMemory channel layer does not cross workers; use Redis (USE_INMEMORY_CHANNEL_LAYER=False)
# when you need multiple replicas.
echo "Starting daphne on 0.0.0.0:${PORT:-8000}"
exec daphne -b 0.0.0.0 -p "${PORT:-8000}" core.asgi:application
