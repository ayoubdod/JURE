import React, { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { useAppTranslation } from '@/i18n';
import { fetchCurrentSubscription, type CurrentSubscription } from '@/services/billing/api';

const TrialStatusBanner: React.FC = () => {
  const { t, tf } = useAppTranslation();
  const b = t.settings.billing;
  const [current, setCurrent] = useState<CurrentSubscription | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchCurrentSubscription()
      .then((response) => {
        const body = response.data;
        if (!cancelled && body && 'status' in body && (body.status === 'TRIALING' || body.status === 'PENDING_VERIFICATION')) {
          setCurrent(body);
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  if (!current) return null;

  return (
    <div className="border-b border-[#64499D]/15 bg-[#F7F4FF] px-4 py-2 text-sm text-[#3E2D71] dark:bg-[#64499D]/15 dark:text-[#E6DEFF]">
      <div className="mx-auto flex max-w-[1100px] flex-wrap items-center justify-between gap-2">
        <p>
          <span className="font-semibold">{b.bannerTitle}</span>
          {' · '}
          {tf(b.bannerBody, {
            days: current.trial_days_left ?? 0,
            credits: current.credits_remaining,
          })}
        </p>
        <Link to="/dashboard/settings/subscription" className="font-semibold underline-offset-2 hover:underline">
          {b.bannerManage}
        </Link>
      </div>
    </div>
  );
};

export default TrialStatusBanner;
