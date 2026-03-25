import Image from 'next/image';
import Link from 'next/link';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  textClassName?: string;
  href?: string;
  className?: string;
}

const sizeMap = {
  sm: { px: 56, text: 'text-xl font-semibold tracking-tight' },
  md: { px: 68, text: 'text-2xl font-semibold tracking-tight' },
  lg: { px: 96, text: 'text-4xl font-bold tracking-tight' },
};

export default function Logo({
  size = 'sm',
  showText = true,
  textClassName,
  href = '/',
  className = '',
}: LogoProps) {
  const { px, text } = sizeMap[size];
  const resolvedText = textClassName ?? `${text} text-white`;

  if (!href) {
    return (
      <div className={`flex items-center ${className}`}>
        <Image
          src="/logo_256.png"
          alt="Chioma logo"
          width={px}
          height={px}
          className="rounded-lg object-contain flex-shrink-0"
          style={{ width: px, height: px }}
          priority
        />
        {showText && <span className={resolvedText}>Chioma</span>}
      </div>
    );
  }

  return (
    <Link href={href} className={`flex items-center ${className}`}>
      <Image
        src="/logo_256.png"
        alt="Chioma logo"
        width={px}
        height={px}
        className="rounded-lg"
        priority
      />
      {showText && <span className={resolvedText}>Chioma</span>}
    </Link>
  );
}
