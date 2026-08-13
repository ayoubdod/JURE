import { useAppTranslation } from '@/i18n';

type SidebarLabelKey =
  | 'tasks'
  | 'appointment'
  | 'account'
  | 'support'
  | 'consultation'
  | 'litigation'
  | 'administrative';

type PlaceholderPageProps = {
  titleKey: SidebarLabelKey;
};

/**
 * Minimal placeholder for nav destinations that are scaffolded but not built yet.
 */
const PlaceholderPage = ({ titleKey }: PlaceholderPageProps) => {
  const { t } = useAppTranslation();
  return (
    <div className="flex h-full min-h-[50vh] flex-col items-center justify-center px-4 text-center">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">
        {t.sidebar[titleKey]}
      </h1>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">{t.sidebar.comingSoon}</p>
    </div>
  );
};

export default PlaceholderPage;
