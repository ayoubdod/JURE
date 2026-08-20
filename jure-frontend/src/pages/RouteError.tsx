import { useEffect, useState } from 'react';
import { isRouteErrorResponse, Link, useRouteError } from 'react-router';
import { Helmet } from 'react-helmet-async';
import { Button } from '@/components/ui/button';
import LogoLoading from '@/components/common/LogoLoading';
import { useAppTranslation } from '@/i18n';
import { DEFAULT_LOCALE, localePath } from '@/marketing/site';
import { isChunkLoadError, reloadOnceOnStaleChunk } from '@/lib/chunkLoad';
import { devError } from '@/utils/devLog';

/**
 * Replaces React Router's default "Unexpected Application Error" overlay.
 * Stale Vite chunks (post-deploy) trigger a one-shot full reload.
 */
export default function RouteError() {
  const error = useRouteError();
  const { t } = useAppTranslation();
  const homeHref = localePath(DEFAULT_LOCALE);
  const stale = isChunkLoadError(error);
  const [reloading, setReloading] = useState(stale);

  useEffect(() => {
    devError('Route error:', error);
    if (!stale) return;
    const didReload = reloadOnceOnStaleChunk();
    if (!didReload) setReloading(false);
  }, [error, stale]);

  if (stale && reloading) {
    return <LogoLoading message={t.routeError.staleDescription} />;
  }

  const title = stale ? t.routeError.staleTitle : t.routeError.title;
  const description = stale
    ? t.routeError.staleDescription
    : isRouteErrorResponse(error)
      ? `${error.status} ${error.statusText}`
      : t.routeError.description;

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-800">
      <Helmet>
        <title>{title} | JURE</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <div className="text-center px-6 max-w-md">
        <h1 className="text-2xl font-bold mb-3">{title}</h1>
        <p className="text-slate-600 dark:text-slate-400 mb-6">{description}</p>
        <div className="flex items-center justify-center gap-3">
          <Button type="button" onClick={() => window.location.reload()}>
            {t.routeError.reload}
          </Button>
          <Button variant="outline" asChild>
            <Link to={homeHref}>{t.notFound.returnHome}</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
