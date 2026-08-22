import { Link } from 'react-router';
import { ArrowRight } from 'lucide-react';
import { parseAnnouncementLink } from '@/lib/announcementLink';
import { cn } from '@/lib/utils';

export function AnnouncementLearnMoreLink({
  url,
  label,
  fallbackLabel,
  className,
}: {
  url?: string | null;
  label?: string | null;
  fallbackLabel?: string;
  className?: string;
}) {
  const parsed = parseAnnouncementLink(url);
  if (!parsed) return null;
  const text = (label || '').trim() || fallbackLabel;
  if (!text) return null;

  const content = (
    <>
      {text}
      <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" aria-hidden />
    </>
  );

  if (parsed.kind === 'internal') {
    return (
      <Link
        to={parsed.to}
        className={cn(
          'inline-flex items-center gap-1 text-[13px] font-semibold text-white/95 underline-offset-4 hover:underline',
          className
        )}
      >
        {content}
      </Link>
    );
  }

  return (
    <a
      href={parsed.href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'inline-flex items-center gap-1 text-[13px] font-semibold text-white/95 underline-offset-4 hover:underline',
        className
      )}
    >
      {content}
    </a>
  );
}
