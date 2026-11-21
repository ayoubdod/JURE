import Conversations from '@/pages/Conversations';
import { useAppTranslation } from '@/i18n';
import { ClientPageHeader } from '@/components/client/ClientPageHeader';

/**
 * Client portal messages — reuses the existing JURE Chat page.
 * Conversation creation remains staff-driven (confirmation workflow).
 */
const ClientMessagesPage = () => {
  const { t } = useAppTranslation();
  const cp = t.clientPortal;

  return (
    <div className="space-y-4">
      <ClientPageHeader title={cp.messages.title} subtitle={cp.messages.subtitle} />
      <div className="-mx-2 min-h-[70vh] overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 sm:-mx-0">
        <Conversations />
      </div>
    </div>
  );
};

export default ClientMessagesPage;
