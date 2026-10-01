import Conversations from '@/pages/Conversations';
import { useAppTranslation } from '@/i18n';

/**
 * Client portal messages — reuses the existing JURE Chat page.
 * Conversation creation remains staff-driven (confirmation workflow).
 */
const ClientMessagesPage = () => {
  const { t } = useAppTranslation();
  const cp = t.clientPortal;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-serif text-3xl text-[#2F2450]">{cp.messages.title}</h1>
        <p className="mt-1 text-sm text-slate-500">{cp.messages.subtitle}</p>
      </div>
      <div className="-mx-2 min-h-[70vh] overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 sm:-mx-0">
        <Conversations />
      </div>
    </div>
  );
};

export default ClientMessagesPage;
