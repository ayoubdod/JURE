import React from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle, Mail } from 'lucide-react';
import { Link } from 'react-router';
import { useAppTranslation } from '@/i18n';
import { signupBackBtnClass, signupPrimaryBtnClass } from './signupUi';

const VerificationPending = () => {
  const { t } = useAppTranslation();
  const v = t.auth.signup.verification;

  return (
    <div className="animate-fade-in text-center">
      <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#64499D] text-white">
        <CheckCircle className="h-8 w-8" />
      </div>
      <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">{v.title}</h1>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{v.description}</p>

      <div className="mt-8 rounded-2xl bg-slate-50 p-5 text-start dark:bg-zinc-800/60">
        <Mail className="mb-3 h-6 w-6 text-[#64499D] dark:text-[#CFC2FF]" />
        <h3 className="font-semibold text-slate-900 dark:text-slate-100">{v.emailTitle}</h3>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{v.emailBody}</p>
      </div>

      <p className="mt-4 text-sm text-slate-500">{v.noEmailHint}</p>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Button asChild className={`${signupPrimaryBtnClass} flex-1`}>
          <Link to="/signin">{v.goSignIn}</Link>
        </Button>
        <Button variant="outline" className={signupBackBtnClass}>
          {v.contactSupport}
        </Button>
      </div>
    </div>
  );
};

export default VerificationPending;
