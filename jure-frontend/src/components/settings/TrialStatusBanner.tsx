import { useEffect, useState } from 'react';
import { useAppTranslation } from '@/i18n';
import { fetchCurrentSubscription } from '@/services/billing/api';

export type SubscriptionNavCopy = {
  summary: string;
  action: string;
};

/** Sidebar label for the subscription page. During a trial this is the status line that used to sit at the top of the page. */
export function useSubscriptionNavCopy(): SubscriptionNavCopy {
  const { t, tf, lang } = useAppTranslation();
  const billing = t.settings.billing;
  const [summary, setSummary] = useState(billing.bannerManage);

  useEffect(() => {
    let cancelled = false;
    fetchCurrentSubscription()
      .then((response) => {
        const body = response.data;
        if (cancelled || !body || !('status' in body)) return;
        if (body.status === 'TRIALING' || body.status === 'PENDING_VERIFICATION') {
          setSummary(
            `${billing.bannerTitle} · ${tf(billing.bannerBody, {
              days: body.trial_days_left ?? 0,
              credits: body.credits_remaining,
            })}`,
          );
          return;
        }
        setSummary(billing.statuses[body.status] || billing.bannerManage);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [billing, lang]);

  return { summary, action: billing.bannerManage };
}
