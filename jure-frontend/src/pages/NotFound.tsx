import { useLocation, Link } from "react-router";
import { useEffect } from "react";
import { useAppTranslation } from "@/i18n";
import { devError } from "@/utils/devLog";

const NotFound = () => {
  const location = useLocation();
  const { t } = useAppTranslation();

  useEffect(() => {
    devError("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">{t.notFound.title}</h1>
        <p className="text-xl text-gray-600 mb-4">{t.notFound.description}</p>
        <Link to="/" className="text-blue-500 hover:text-blue-700 underline">
          {t.notFound.returnHome}
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
