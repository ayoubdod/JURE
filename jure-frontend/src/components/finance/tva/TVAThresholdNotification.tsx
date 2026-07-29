import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { X, Scale } from 'lucide-react';
import { Button } from '@/components/ui/button';
import useChatStore from '@/stores/chatStore';
import { useFinanceAccess } from '@/hooks/useFinanceAccess';
import { getTVAStatus } from '@/services/financeService';

const STORAGE_KEY = 'tva_threshold_notification_dismissed';

function isThresholdNotificationPayload(n: unknown): boolean {
  if (!n || typeof n !== 'object') return false;
  const o = n as Record<string, unknown>;
  const t = o.type ?? o.notification_type ?? o.kind ?? o.code;
  if (typeof t === 'string' && t.toUpperCase().includes('TVA_THRESHOLD')) return true;
  if (t === 'TVA_THRESHOLD_CROSSED') return true;
  const title = o.title ?? o.message;
  if (typeof title === 'string' && title.toUpperCase().includes('TVA') && title.toUpperCase().includes('SEUIL'))
    return true;
  return false;
}

export const TVAThresholdNotification: React.FC = () => {
  const navigate = useNavigate();
  const { authorized, loading: roleLoading, effectiveRole } = useFinanceAccess();
  const notifications = useChatStore((s) => s.notifications);
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [fromApi, setFromApi] = useState(false);
  const [fromWs, setFromWs] = useState(false);

  useEffect(() => {
    if (dismissed || roleLoading || !authorized) return;
    let cancelled = false;
    getTVAStatus()
      .then((s) => {
        if (cancelled || !s) return;
        if (s.notify_threshold_crossed === true) setFromApi(true);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [authorized, dismissed, roleLoading]);

  useEffect(() => {
    if (dismissed || !authorized) return;
    const hit = notifications.some(isThresholdNotificationPayload);
    if (hit) setFromWs(true);
  }, [notifications, dismissed, authorized]);

  const visible = useMemo(() => {
    if (dismissed || !authorized || effectiveRole == null) return false;
    return fromApi || fromWs;
  }, [dismissed, authorized, effectiveRole, fromApi, fromWs]);

  if (!visible) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      /* ignore */
    }
    setDismissed(true);
  };

  return (
    <div className="shrink-0 border-b border-amber-200/80 bg-amber-50/95 px-3 py-3 dark:border-amber-900/50 dark:bg-amber-950/40 sm:px-4">
      <div className="relative mx-auto max-w-6xl rounded-xl border border-amber-200/90 bg-white/90 p-4 pr-10 shadow-sm dark:border-amber-800/60 dark:bg-slate-950/80">
        <button
          type="button"
          className="absolute right-3 top-3 rounded-md p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          onClick={dismiss}
          aria-label="Fermer"
        >
          <X className="h-4 w-4" />
        </button>
        <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
          <Scale className="h-4 w-4 text-amber-700 dark:text-amber-400" aria-hidden />
          Seuil TVA franchi — Assujettissement définitif
        </p>
        <p className="mt-2 max-w-3xl text-[13px] leading-relaxed text-slate-600 dark:text-slate-400">
          Votre cabinet a dépassé 500 000 MAD de CA cumulé. La TVA à 20% est désormais obligatoire de façon
          permanente sur toutes vos nouvelles factures.
        </p>
        <div className="mt-4">
          <Button
            type="button"
            variant="outline"
            className="border-jure-300 text-jure-800 hover:bg-jure-50 dark:border-jure-700 dark:text-jure-200 dark:hover:bg-jure-950/40"
            onClick={() => navigate('/dashboard/finance')}
          >
            Voir la page Finance →
          </Button>
        </div>
      </div>
    </div>
  );
};
