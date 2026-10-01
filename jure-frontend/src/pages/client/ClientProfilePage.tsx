import useUserStore from '@/stores/userStore';
import { useAppTranslation } from '@/i18n';

const ClientProfilePage = () => {
  const { user } = useUserStore();
  const { t } = useAppTranslation();
  const cp = t.clientPortal;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl text-[#2F2450]">{cp.profile.title}</h1>
        <p className="mt-1 text-sm text-slate-500">{cp.profile.subtitle}</p>
      </div>
      <div className="max-w-lg space-y-4 rounded-xl border border-slate-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <div>
          <p className="text-xs uppercase text-slate-400">{cp.profile.name}</p>
          <p className="mt-1 font-medium">
            {[user?.first_name, user?.last_name].filter(Boolean).join(' ') || '—'}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase text-slate-400">{cp.profile.email}</p>
          <p className="mt-1">{user?.email || '—'}</p>
        </div>
        <div>
          <p className="text-xs uppercase text-slate-400">{cp.profile.phone}</p>
          <p className="mt-1">{user?.phone || '—'}</p>
        </div>
        <div>
          <p className="text-xs uppercase text-slate-400">{cp.profile.firm}</p>
          <p className="mt-1">
            {user?.trade_name || user?.cabinet_name || user?.firm_name || '—'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default ClientProfilePage;
