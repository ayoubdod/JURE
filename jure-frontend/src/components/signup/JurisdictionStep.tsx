import React, { useEffect, useMemo, useState } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { createSignupStepSchemas, type SignUpData } from '@/schemas/signupValidation';
import { apiGetJurisdictions, countryFlagEmoji, type Jurisdiction } from '@/services/jurisdictions/api';
import { useAppTranslation } from '@/i18n';
import { signupChoiceClass } from './signupUi';
import SignupActions from './SignupActions';
import { devError } from '@/utils/devLog';

interface JurisdictionStepProps {
  onNext: () => void;
  form: UseFormReturn<SignUpData>;
}

const JurisdictionStep = ({ onNext, form }: JurisdictionStepProps) => {
  const { toast } = useToast();
  const { t } = useAppTranslation();
  const s = t.auth.signup.jurisdiction;
  const schemas = useMemo(() => createSignupStepSchemas(t.auth.signup), [t]);
  const [jurisdictions, setJurisdictions] = useState<Jurisdiction[]>([]);
  const [loading, setLoading] = useState(true);
  const selected = form.watch('jurisdiction');

  useEffect(() => {
    let cancelled = false;
    apiGetJurisdictions()
      .then((rows) => {
        if (!cancelled) setJurisdictions(rows);
      })
      .catch((error) => {
        devError('Failed to load jurisdictions', error);
        if (!cancelled) {
          toast({
            title: t.auth.signup.toasts.errorTitle,
            description: s.loadError,
            variant: 'destructive',
          });
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [s.loadError, t.auth.signup.toasts.errorTitle, toast]);

  const onSubmit = async () => {
    const valid = await form.trigger('jurisdiction');
    try {
      schemas.stepJurisdictionSchema.validateSync(form.getValues());
    } catch {
      toast({
        title: t.auth.signup.toasts.errorTitle,
        description: t.auth.signup.toasts.checkFields,
        variant: 'destructive',
      });
      return;
    }
    if (!valid) return;
    onNext();
  };

  return (
    <div className="animate-fade-in">
      {loading ? (
        <div className="flex justify-center py-16 text-slate-400">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {jurisdictions.map((item) => {
            const active = selected === item.code;
            return (
              <button
                key={item.code}
                type="button"
                onClick={() => form.setValue('jurisdiction', item.code, { shouldValidate: true })}
                className={signupChoiceClass(active)}
              >
                <div className="mb-2 text-3xl" aria-hidden>
                  {countryFlagEmoji(item.country_code)}
                </div>
                <div className="text-[15px] font-semibold text-slate-900 dark:text-slate-100">
                  {item.name}
                </div>
                <div className="mt-0.5 text-[11px] uppercase tracking-wide text-slate-400">{item.code}</div>
              </button>
            );
          })}
        </div>
      )}

      {form.formState.errors.jurisdiction && (
        <p className="mt-3 text-center text-sm text-red-600">{form.formState.errors.jurisdiction.message}</p>
      )}

      <SignupActions onNext={onSubmit} nextLabel={s.continue} nextDisabled={loading || !selected} />
    </div>
  );
};

export default JurisdictionStep;
