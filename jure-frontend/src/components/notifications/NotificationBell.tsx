import React, { useEffect, useRef, useState } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNotifications } from '@/context/NotificationContext';
import { NotificationDropdown } from '@/components/notifications/NotificationDropdown';
import { cn } from '@/lib/utils';
import { useAppTranslation } from '@/i18n';

function formatBadgeCount(n: number): string {
  if (n <= 0) return '';
  if (n > 99) return '99+';
  return String(n);
}

export function NotificationBell() {
  const {
    unreadCount,
    isDropdownOpen,
    toggleDropdown,
    closeDropdown,
    animationTick,
  } = useNotifications();
  const { t, tf } = useAppTranslation();

  const containerRef = useRef<HTMLDivElement>(null);
  const [panelExiting, setPanelExiting] = useState(false);
  const prevOpen = useRef(isDropdownOpen);

  useEffect(() => {
    if (prevOpen.current && !isDropdownOpen) {
      setPanelExiting(true);
      const t = window.setTimeout(() => setPanelExiting(false), 150);
      prevOpen.current = isDropdownOpen;
      return () => clearTimeout(t);
    }
    prevOpen.current = isDropdownOpen;
    if (isDropdownOpen) setPanelExiting(false);
  }, [isDropdownOpen]);

  const showPanel = isDropdownOpen || panelExiting;
  const phase: 'in' | 'out' = panelExiting && !isDropdownOpen ? 'out' : 'in';

  useEffect(() => {
    if (!isDropdownOpen) return undefined;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeDropdown();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isDropdownOpen, closeDropdown]);

  useEffect(() => {
    if (!isDropdownOpen) return undefined;
    const onDown = (e: MouseEvent) => {
      const el = containerRef.current;
      if (el && !el.contains(e.target as Node)) closeDropdown();
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [isDropdownOpen, closeDropdown]);

  const badge = formatBadgeCount(unreadCount);
  const showBadge = unreadCount > 0;

  return (
    <div className="relative" ref={containerRef}>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={showBadge ? tf(t.notifications.unreadAria, { count: unreadCount }) : t.notifications.title}
        aria-expanded={isDropdownOpen}
        aria-haspopup="dialog"
        className={cn(
          'relative h-10 w-10 text-muted-foreground hover:text-foreground sm:h-8 sm:w-8',
          isDropdownOpen && 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300'
        )}
        onClick={() => toggleDropdown()}
      >
        <span className={cn(animationTick > 0 && 'motion-safe:animate-notification-bell-shake')} key={animationTick}>
          <Bell size={16} className={cn(isDropdownOpen && 'fill-indigo-600 text-indigo-600')} strokeWidth={2} />
        </span>
        {showBadge ? (
          <span
            className={cn(
              'absolute -end-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#ef4444] px-0.5 text-[9px] font-bold leading-none text-white',
              animationTick > 0 && 'motion-safe:animate-notification-badge-pulse'
            )}
            key={`badge-${animationTick}`}
          >
            {badge}
          </span>
        ) : null}
      </Button>

      {showPanel ? <NotificationDropdown phase={phase} /> : null}
    </div>
  );
}
