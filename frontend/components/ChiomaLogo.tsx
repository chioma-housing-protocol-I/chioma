'use client';

import Link from 'next/link';

interface ChiomaLogoProps {
  /** 'light' = dark logo on light bg (Logo 02), 'dark' = blue/orange logo on dark bg (Logo 01) */
  variant?: 'light' | 'dark';
  /** Height in px. Width auto-scales to preserve aspect ratio (311:162 ≈ 1.92:1) */
  height?: number;
  /** Wrap in a Link to "/" */
  linked?: boolean;
  className?: string;
}

export default function ChiomaLogo({
  variant = 'dark',
  height = 36,
  linked = true,
  className = '',
}: ChiomaLogoProps) {
  // Logo 01 = blue + orange on transparent (suits dark/navy backgrounds)
  // Logo 02 = dark navy on transparent (suits light/white backgrounds)
  const src =
    variant === 'dark'
      ? '/logo/Chioma%20Logo%2001.svg'
      : '/logo/Chioma%20Logo%2002.svg';

  // Preserve original 311×162 aspect ratio
  const width = Math.round((height * 311) / 162);

  const img = (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt="Chioma"
      width={width}
      height={height}
      className={className}
      style={{ display: 'block', minWidth: width, minHeight: height }}
      onError={(e) => {
        (e.target as HTMLImageElement).style.border = '1px solid red';
      }}
    />
  );

  if (!linked) return img;

  return (
    <Link href="/" aria-label="Chioma home">
      {img}
    </Link>
  );
}
