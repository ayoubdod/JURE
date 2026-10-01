import NotificationsPage from '@/pages/notifications/NotificationsPage';
import { useAppTranslation } from '@/i18n';

const ClientNotificationsPage = () => {
  const { t } = useAppTranslation();
  const cp = t.clientPortal;
  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-serif text-3xl text-[#2F2450]">{cp.notifications.title}</h1>
        <p className="mt-1 text-sm text-slate-500">{cp.notifications.subtitle}</p>
      </div>
      <NotificationsPage />
    </div>
  );
};

export default ClientNotificationsPage;
