import { useLocation, Link } from "react-router";
import { useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { useAppTranslation } from "@/i18n";
import { DEFAULT_LOCALE, localePath } from "@/marketing/site";
import { devError } from "@/utils/devLog";

const NotFound = () => {
  const location = useLocation();
  const { t } = useAppTranslation();
  const homeHref = localePath(DEFAULT_LOCALE);

  useEffect(() => {
    devError("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-800">
      <Helmet>
        <title>Page not found | JURE</title>
        <meta name="description" content="The page you requested could not be found." />
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">{t.notFound.title}</h1>
        <p className="text-xl text-slate-600 dark:text-slate-400 mb-4">{t.notFound.description}</p>
        <Link to={homeHref} className="text-blue-500 hover:text-blue-700 underline">
          {t.notFound.returnHome}
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
