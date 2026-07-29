import { cn } from '@/lib/utils';
import { BACKEND_BASE_URL } from '@/utils/constants';

const resolveIconUrl = (url: string | null | undefined): string | null => {
  if (!url?.trim()) return null;
  const u = url.trim();
  if (u.startsWith('http://') || u.startsWith('https://')) return u;
  return `${BACKEND_BASE_URL.replace(/\/$/, '')}${u.startsWith('/') ? '' : '/'}${u}`;
};

export interface GroupChatIconProps {
  iconUrl?: string | null;
  iconPresetEmoji?: string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'h-8 w-8 text-base',
  md: 'h-9 w-9 text-lg',
  lg: 'h-10 w-10 text-xl',
};

export default function GroupChatIcon({
  iconUrl,
  iconPresetEmoji,
  size = 'md',
  className,
}: GroupChatIconProps) {
  const resolvedUrl = resolveIconUrl(iconUrl);

  if (resolvedUrl) {
    return (
      <img
        src={resolvedUrl}
        alt=""
        className={cn('rounded-full object-cover shrink-0', sizeClasses[size], className)}
      />
    );
  }

  const emoji = iconPresetEmoji?.trim() || '👥';
  return (
    <span
      className={cn(
        'rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center shrink-0',
        sizeClasses[size],
        className
      )}
    >
      {emoji}
    </span>
  );
}
