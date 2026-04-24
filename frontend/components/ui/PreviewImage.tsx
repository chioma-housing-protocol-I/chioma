'use client';

import { useState } from 'react';
import type { LucideIcon } from 'lucide-react';

interface PreviewImageProps {
  src?: string | null;
  alt: string;
  fallbackIcon: LucideIcon;
  className?: string;
  iconClassName?: string;
  imageClassName?: string;
}

export function PreviewImage({
  src,
  alt,
  fallbackIcon: FallbackIcon,
  className = '',
  iconClassName = '',
  imageClassName = '',
}: PreviewImageProps) {
  const [error, setError] = useState(false);

  const hasValidSrc = src && src.trim() !== '' && !error;

  if (!hasValidSrc) {
    return (
      <div
        className={`w-full h-full bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center border border-white/5 ${className}`}
        aria-label={`${alt} - Image unavailable`}
      >
        <FallbackIcon
          className={`text-slate-500 opacity-40 ${iconClassName}`}
          size={48}
          strokeWidth={1}
        />
      </div>
    );
  }

  return (
    <div className={`relative w-full h-full ${className}`}>
      <img
        src={src}
        alt={alt}
        className={`w-full h-full object-cover ${imageClassName}`}
        onError={() => setError(true)}
        loading="lazy"
      />
    </div>
  );
}

export default PreviewImage;
