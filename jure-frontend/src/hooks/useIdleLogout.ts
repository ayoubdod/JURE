import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { apiLogoutUser } from '@/services/auth/api';
import useUserStore from '@/stores/userStore';
import { useCallSessionStore } from '@/stores/callSessionStore';
import { useToast } from '@/hooks/use-toast';
import { useAppTranslation } from '@/i18n';
import { devError } from '@/utils/devLog';
import {
  IDLE_LOGOUT_KEY,
  IDLE_TIMEOUT_MS,
  LAST_ACTIVITY_KEY,
  readLastActivity,
  stampLastActivity,
} from '@/utils/idleSession';

const ACTIVITY_EVENTS: (keyof WindowEventMap)[] = [
  'mousedown',
  'mousemove',
  'keydown',
  'scroll',
  'touchstart',
  'wheel',
  'click',
];

const ACTIVE_CALL_STATUSES = new Set([
  'calling',
  'ringing',
  'connecting',
  'active',
  'reconnecting',
]);

let logoutInFlight = false;

function isInLiveCall(): boolean {
  return ACTIVE_CALL_STATUSES.has(useCallSessionStore.getState().ui.status);
}

/**
 * Logs the authenticated user out after 15 minutes without interaction.
 * Shared across tabs via localStorage. Live calls keep the session alive.
 */
export function useIdleLogout() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useAppTranslation();
  const isLoggedIn = useUserStore((s) => s.isLoggedIn);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastStampRef = useRef(0);

  useEffect(() => {
    if (!isLoggedIn) return;

    const clearTimer = () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };

    const logoutForIdle = async () => {
      if (logoutInFlight) return;
      if (!useUserStore.getState().isLoggedIn) return;
      if (isInLiveCall()) {
        stampLastActivity();
        schedule();
        return;
      }

      logoutInFlight = true;
      try {
        localStorage.setItem(IDLE_LOGOUT_KEY, String(Date.now()));
      } catch {
        // ignore
      }

      try {
        await apiLogoutUser();
      } catch (error) {
        devError('Idle logout API failed:', error);
      }

      useUserStore.getState().logout();
      toast({
        title: t.sessionIdle.title,
        description: t.sessionIdle.description,
      });
      navigate('/signin', { replace: true });
      logoutInFlight = false;
    };

    const schedule = () => {
      clearTimer();
      if (isInLiveCall()) {
        stampLastActivity();
        timerRef.current = setTimeout(schedule, IDLE_TIMEOUT_MS);
        return;
      }
      const last = readLastActivity() || Date.now();
      const remaining = IDLE_TIMEOUT_MS - (Date.now() - last);
      if (remaining <= 0) {
        void logoutForIdle();
        return;
      }
      timerRef.current = setTimeout(() => {
        void logoutForIdle();
      }, remaining);
    };

    const onActivity = () => {
      const now = Date.now();
      if (now - lastStampRef.current < 1000) return;
      lastStampRef.current = now;
      stampLastActivity(now);
      schedule();
    };

    if (!readLastActivity()) {
      stampLastActivity();
    }

    schedule();

    ACTIVITY_EVENTS.forEach((event) => {
      window.addEventListener(event, onActivity, { passive: true });
    });

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        schedule();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    const onStorage = (event: StorageEvent) => {
      if (event.key === IDLE_LOGOUT_KEY && event.newValue) {
        void logoutForIdle();
      }
      if (event.key === LAST_ACTIVITY_KEY && event.newValue) {
        schedule();
      }
    };
    window.addEventListener('storage', onStorage);

    return () => {
      clearTimer();
      ACTIVITY_EVENTS.forEach((event) => {
        window.removeEventListener(event, onActivity);
      });
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('storage', onStorage);
    };
  }, [isLoggedIn, navigate, t.sessionIdle.description, t.sessionIdle.title, toast]);
}
