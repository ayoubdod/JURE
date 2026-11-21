import React, { useEffect, useMemo, useState } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { Check, Loader2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import { isAxiosError } from 'axios';
import { useToast } from '@/hooks/use-toast';
import { useAppTranslation } from '@/i18n';
import { cn } from '@/lib/utils';
import type { SignUpData } from '@/schemas/signupValidation';
import { createSignupStepSchemas } from '@/schemas/signupValidation';
import { apiRegisterUser } from '@/services/auth/api';
import { fetchPublicPlans, type PublicPlan } from '@/services/billing/api';
import { getRemoteFieldsValidation } from '@/utils/functions';
import SignupActions from './SignupActions';

type SubscriptionStepProps = {
  onPrev: () => void;
  setStep: (step: number) => void;
  form: UseFormReturn<SignUpData>;
};

const formatAmount = (value: string | null, currency: string) => {
  if (!value) return '';
  const amount = Number(value);
  if (Number.isNaN(amount)) return value;
  return new Intl.NumberFormat(undefined, {
    maximumFractionDigits: 0,
  }).format(amount) + (currency === 'MAD' ? '' : ` ${currency}`);
};

const SubscriptionStep = ({ onPrev, setStep, form }: SubscriptionStepProps) => {
  const { t, tf } = useAppTranslation();
  const s = t.auth.signup.subscription;
  const { toast } = useToast();
  const navigate = useNavigate();
  const schemas = useMemo(() => createSignupStepSchemas(t.auth.signup), [t]);
  const [plans, setPlans] = useState<PublicPlan[]>([]);
  const [trial, setTrial] = useState({ days: 0, credits: 0, max_users: 0 });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const planCode = form.watch('plan_code');
  const cycle = form.watch('billing_cycle') || 'monthly';

  useEffect(() => {
    let cancelled = false;
    fetchPublicPlans()
      .then((data) => {
        if (cancelled) return;
        setPlans(data.plans);
        setTrial(data.trial);
        setLoadError(false);
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const selfServe = plans.filter((plan) => plan.is_self_serve);
  const enterprise = plans.find((plan) => !plan.is_self_serve);
  const selected = selfServe.find((plan) => plan.code === planCode) || null;

  const priceOf = (plan: PublicPlan) =>
    cycle === 'annual' ? plan.annual_price : plan.monthly_price;

  const onSubmit = async () => {
    if (!selected) return;
    const values = form.getValues();
    try {
      schemas.step5ValidationSchema.validateSync(values);
    } catch {
      setStep(6);
      return;
    }
    setSubmitting(true);
    try {
      await apiRegisterUser({
        accept_data_processing: values.accept_data_processing || false,
        accept_terms: values.accept_terms || false,
        first_name: values.first_name || '',
        last_name: values.last_name || '',
        country: values.country || '',
        phone: values.phone || '',
        email: values.email || '',
        password1: values.password1 || '',
        password2: values.password2 || '',
        trade_name: values.trade_name || '',
        logo: values.logo || undefined,
        practice_type: values.practice_type || '',
        jurisdiction: values.jurisdiction || '',
        business_address: values.business_address || '',
        team_size: values.team_size || '',
        website: values.website || undefined,
        subscription: {
          plan_code: selected.code,
          billing_cycle: cycle === 'annual' ? 'annual' : 'monthly',
        },
      });
      localStorage.setItem('pendingVerificationEmail', values.email);
      localStorage.setItem(
        'pendingVerificationPlan',
        JSON.stringify({ name: selected.name, cycle, code: selected.code })
      );
      toast({
        title: t.auth.signup.toasts.accountCreatedTitle,
        description: t.auth.signup.toasts.accountCreatedDescription,
      });
      navigate('/verify-email-waiting', {
        state: { email: values.email, planName: selected.name, billingCycle: cycle },
      });
    } catch (error) {
      if (isAxiosError(error)) {
        const remoteValidation = getRemoteFieldsValidation(error);
        Object.keys(remoteValidation).forEach((key) => {
          const field = key === 'subscription' ? 'plan_code' : key;
          if (field in values) {
            form.setError(field as keyof SignUpData, { message: remoteValidation[key] });
          }
        });
        const firstErrorKey = Object.keys(remoteValidation)[0];
        if (firstErrorKey === 'jurisdiction') setStep(1);
        else if (firstErrorKey === 'practice_type') setStep(2);
        else if (firstErrorKey && Object.keys(schemas.step1ValidationSchema.fields).includes(firstErrorKey)) setStep(3);
        else if (firstErrorKey && Object.keys(schemas.step2ValidationSchema.fields).includes(firstErrorKey)) setStep(4);
        else if (firstErrorKey && Object.keys(schemas.step4ValidationSchema.fields).includes(firstErrorKey)) setStep(5);
        else if (firstErrorKey && Object.keys(schemas.step5ValidationSchema.fields).includes(firstErrorKey)) setStep(6);
      }
      const description = isAxiosError(error)
        ? (error.response?.data as { detail?: string })?.detail || error.message
        : t.auth.signup.toasts.registrationError;
      toast({
        title: t.auth.signup.toasts.errorTitle,
        description: typeof description === 'string' ? description : t.auth.signup.toasts.registrationError,
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="animate-fade-in space-y-4">
      <div className="flex justify-center">
        <div className="inline-flex rounded-full bg-slate-100 p-1 dark:bg-zinc-800" role="radiogroup" aria-label={s.monthly}>
          {(['monthly', 'annual'] as const).map((value) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={cycle === value}
              onClick={() => form.setValue('billing_cycle', value)}
              className={cn(
                'rounded-full px-4 py-1.5 text-sm font-medium',
                cycle === value
                  ? 'bg-[#64499D] text-white'
                  : 'text-slate-600 dark:text-slate-300'
              )}
            >
              {value === 'monthly' ? s.monthly : s.annual}
            </button>
          ))}
        </div>
      </div>
      {cycle === 'annual' && (
        <p className="text-center text-xs text-slate-500">{s.annualHint}</p>
      )}

      {loading && (
        <div className="flex justify-center py-10 text-[#64499D]">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      )}
      {loadError && <p className="text-center text-sm text-red-600">{s.loadError}</p>}

      {!loading && !loadError && (
        <div className="grid gap-3 sm:grid-cols-3">
          {selfServe.map((plan) => {
            const active = plan.code === planCode;
            const amount = priceOf(plan);
            return (
              <button
                key={plan.code}
                type="button"
                onClick={() => form.setValue('plan_code', plan.code)}
                className={cn(
                  'relative flex h-full flex-col rounded-2xl border p-4 text-start transition-colors',
                  active
                    ? 'border-[#64499D] bg-[#F7F4FF] ring-2 ring-[#64499D]/30 dark:bg-[#64499D]/15'
                    : 'border-slate-200 bg-white hover:border-[#64499D]/40 dark:border-zinc-700 dark:bg-zinc-900'
                )}
              >
                {plan.is_recommended && (
                  <span className="absolute -top-2 end-3 rounded-full bg-[#64499D] px-2 py-0.5 text-[10px] font-semibold text-white">
                    {s.recommended}
                  </span>
                )}
                <div className="flex items-center justify-between gap-2">
                  <span className="font-display text-lg font-semibold text-slate-900 dark:text-white">{plan.name}</span>
                  {active && <Check className="h-4 w-4 text-[#64499D]" />}
                </div>
                <p className="mt-2 font-display text-2xl font-bold text-[#3E2D71] dark:text-[#CFC2FF]">
                  {formatAmount(amount, plan.currency)}
                  <span className="ms-1 text-xs font-medium text-slate-500">
                    {cycle === 'annual' ? s.perYear : s.perMonth}
                  </span>
                </p>
                <p className="text-[11px] text-slate-500">{s.exclVat}</p>
                <ul className="mt-3 space-y-1 text-xs text-slate-600 dark:text-slate-300">
                  <li>{plan.maximum_users} {s.users}</li>
                  <li>{plan.storage_gb} GB {s.storage}</li>
                  <li>{plan.monthly_juria_credits} {s.credits}</li>
                </ul>
              </button>
            );
          })}
        </div>
      )}

      {enterprise && (
        <div className="flex flex-col gap-2 rounded-2xl border border-dashed border-slate-300 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-zinc-700">
          <div>
            <p className="font-semibold text-slate-900 dark:text-white">{enterprise.name}</p>
            <p className="text-sm text-slate-500">{enterprise.description}</p>
            <p className="mt-1 text-sm font-medium text-[#64499D]">{s.enterprisePrice}</p>
          </div>
          <Link
            to="/contact"
            className="inline-flex h-10 items-center justify-center rounded-lg border border-[#64499D] px-4 text-sm font-semibold text-[#64499D]"
          >
            {s.enterpriseCta}
          </Link>
        </div>
      )}

      <div className="rounded-2xl bg-slate-50 p-4 text-sm dark:bg-zinc-800/60">
        <p className="font-semibold text-slate-800 dark:text-slate-100">{s.summaryTitle}</p>
        {selected ? (
          <>
            <p className="mt-1 text-slate-700 dark:text-slate-200">
              {selected.name} · {cycle === 'annual' ? s.annual : s.monthly} · {formatAmount(priceOf(selected), selected.currency)} {s.exclVat}
            </p>
            <p className="mt-1 text-slate-500">
              {tf(s.trialNote, {
                days: trial.days,
                credits: trial.credits,
                users: trial.max_users,
              })}
            </p>
          </>
        ) : (
          <p className="mt-1 text-slate-500">{s.summaryEmpty}</p>
        )}
      </div>

      <SignupActions
        onNext={() => void onSubmit()}
        nextLabel={submitting ? s.submitting : s.submit}
        onPrev={onPrev}
        backLabel={s.back}
        nextDisabled={!selected || submitting || loading || loadError}
      />
    </div>
  );
};

export default SubscriptionStep;
