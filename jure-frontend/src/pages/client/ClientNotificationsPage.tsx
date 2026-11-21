import NotificationsPage from '@/pages/notifications/NotificationsPage';
import { useAppTranslation } from '@/i18n';
import { ClientPageHeader } from '@/components/client/ClientPageHeader';

const ClientNotificationsPage = () => {
  const { t } = useAppTranslation();
  const cp = t.clientPortal;
  return (
    <div className="space-y-4">
      <ClientPageHeader title={cp.notifications.title} subtitle={cp.notifications.subtitle} />
      <NotificationsPage />
    </div>
  );
};

export default ClientNotificationsPage;
