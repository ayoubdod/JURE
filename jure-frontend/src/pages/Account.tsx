import { User } from 'lucide-react';
import { useAppTranslation } from '@/i18n';
import AccountProfileForm from '@/components/account/AccountProfileForm';

const Account = () => {
  const { t } = useAppTranslation();

  return (
    <div className="mx-auto max-w-[1100px] pb-8">
      <header className="relative mb-6 overflow-hidden rounded-[20px] border border-[#64499D]/15 bg-gradient-to-br from-[#3E2D71] via-[#64499D] to-[#6D54B5] px-5 py-5 text-white sm:px-6">
        <div className="pointer-events-none absolute -end-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex items-start gap-3">
          <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/15 ring-1 ring-white/25">
            <User className="h-5 w-5" aria-hidden />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/70">{t.sidebar.office}</p>
            <h1 className="mt-1 text-[20px] font-semibold tracking-tight sm:text-[22px]">{t.sidebar.account}</h1>
            <p className="mt-1 max-w-xl text-[13px] leading-snug text-white/80">
              {t.settings.profileCardDescription}
            </p>
          </div>
        </div>
      </header>

      <AccountProfileForm />
    </div>
  );
};

export default Account;
