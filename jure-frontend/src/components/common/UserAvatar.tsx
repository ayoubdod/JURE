import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { BACKEND_BASE_URL } from '@/utils/constants';

const IMAGE_FIELDS = [
  'image',
  'avatar',
  'profile_image',
  'avatar_url',
  'photo',
  'picture',
  'profile_picture',
  'profile_photo',
  'profile_photo_url',
  'photo_url',
  'thumbnail',
  'thumbnail_url',
  'headshot',
] as const;

/** Extract image URL from a person/object (checks image, avatar, profile_image, etc.). */
export const getPersonImage = (obj: Record<string, unknown> | null | undefined): string | undefined => {
  if (!obj || typeof obj !== 'object') return undefined;
  for (const key of IMAGE_FIELDS) {
    const val = obj[key];
    if (typeof val === 'string' && val.trim()) return val.trim();
  }
  const user = obj.user as Record<string, unknown> | undefined;
  if (user && typeof user === 'object') return getPersonImage(user);
  return undefined;
};

/** Resolve relative image URLs (e.g. /media/...) to absolute URLs for display. */
const resolveImageUrl = (url: string | null | undefined): string | undefined => {
  if (!url?.trim()) return undefined;
  const u = url.trim();
  if (u.startsWith('http://') || u.startsWith('https://')) return u;
  const base = BACKEND_BASE_URL.replace(/\/$/, '');
  return `${base}${u.startsWith('/') ? '' : '/'}${u}`;
};

export interface UserAvatarProps {
  image?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  xs: 'h-7 w-7',
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-12 w-12',
};

export default function UserAvatar({
  image,
  firstName,
  lastName,
  size = 'md',
  className,
}: UserAvatarProps) {
  const initials = [firstName, lastName]
    .filter(Boolean)
    .map((n) => (n || '').charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2) || '?';

  const resolvedImage = resolveImageUrl(image);

  return (
    <Avatar className={cn(sizeClasses[size], className)}>
      <AvatarImage src={resolvedImage} className="object-cover" />
      <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-white font-medium text-sm">
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}
