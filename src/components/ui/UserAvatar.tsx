/**
 * Batch T18: UserAvatar
 * Avatar with photo or initials fallback.
 * Named UserAvatar to avoid conflict with the existing Radix Avatar primitive.
 *
 * Props: src, name, size (sm|md|lg|xl)
 *
 * Example:
 *   <UserAvatar name="Jan de Vries" size="md" />
 *   <UserAvatar src="/avatars/jan.jpg" name="Jan de Vries" size="lg" />
 */
import { useState } from 'react';
import { cn } from '@/lib/utils';

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface UserAvatarProps {
  src?: string | null;
  name?: string | null;
  size?: AvatarSize;
  className?: string;
}

const SIZE_CLASSES: Record<AvatarSize, string> = {
  xs: 'w-6 h-6 text-xs',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-16 h-16 text-xl',
};

// Stable color from name hash — ensures same person always gets same color
function colorFromName(name: string): string {
  const COLORS = [
    'bg-blue-500/30 text-blue-300',
    'bg-purple-500/30 text-purple-300',
    'bg-emerald-500/30 text-emerald-300',
    'bg-amber-500/30 text-amber-300',
    'bg-rose-500/30 text-rose-300',
    'bg-cyan-500/30 text-cyan-300',
    'bg-orange-500/30 text-orange-300',
    'bg-indigo-500/30 text-indigo-300',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return COLORS[Math.abs(hash) % COLORS.length];
}

function getInitials(name: string, max = 2): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, max).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function UserAvatar({
  src,
  name,
  size = 'md',
  className,
}: UserAvatarProps) {
  const [imgError, setImgError] = useState(false);
  const showImage = !!src && !imgError;
  const initials = name ? getInitials(name) : '?';
  const colorClass = name ? colorFromName(name) : 'bg-white/10 text-white/60';

  return (
    <span
      className={cn(
        'relative inline-flex items-center justify-center rounded-full shrink-0 overflow-hidden',
        'border border-white/10',
        SIZE_CLASSES[size],
        !showImage && colorClass,
        className
      )}
      aria-label={name ?? undefined}
    >
      {showImage ? (
        <img
          src={src!}
          alt={name ?? 'Avatar'}
          className="w-full h-full object-cover"
          onError={() => setImgError(true)}
        />
      ) : (
        <span className="font-semibold leading-none select-none">{initials}</span>
      )}
    </span>
  );
}
