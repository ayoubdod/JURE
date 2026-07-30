# Intentionally empty — do not import local/staging/production here.
#
# DJANGO_SETTINGS_MODULE must point at an explicit module:
#   core.settings.local | core.settings.staging | core.settings.production
#
# Using bare "core.settings" would previously silently load local via
# ``from .local import *`` and is now a broken/incomplete settings module.
# docker-entrypoint.sh coerces that value to core.settings.staging.
