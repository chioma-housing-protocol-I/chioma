'use client';

import { useState } from 'react';
import { User } from 'lucide-react';

interface UserAvatarProps {
  name?: string | null;
  email?: string | null;
  src?: string | null;
  sizeClassName?: string;
  textClassName?: string;
  iconSize?: number;
}

function getInitial(value?: string | null): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed.charAt(0).toUpperCase() : '';
}

export function UserAvatar({
  name,
  email,
  src,
  sizeClassName = 'w-9 h-9',
  textClassName = 'text-sm',
  iconSize = 18,
}: UserAvatarProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const initial = getInitial(name) || getInitial(email);
  const canShowImage = Boolean(src) && !imageFailed;

  return (
    <div
      className={`${sizeClassName} rounded-full bg-white/5 border border-white/10 flex items-center justify-center font-bold text-white uppercase flex-shrink-0 overflow-hidden`}
      aria-hidden="true"
    >
      {canShowImage ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={src ?? ''}
          alt=""
          className="h-full w-full object-cover"
          loading="lazy"
          onError={() => setImageFailed(true)}
        />
      ) : initial ? (
        <span className={textClassName}>{initial}</span>
      ) : (
        <User size={iconSize} className="text-slate-500" />
      )}
    </div>
  );
}
