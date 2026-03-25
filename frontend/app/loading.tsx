'use client';

import Image from 'next/image';

export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center space-y-5">
        {/* Animated logo mark */}
        <div className="relative flex h-24 w-24 items-center justify-center">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-20"></span>
          <Image
            src="/logo_512.png"
            alt="Chioma"
            width={200}
            height={200}
            className="relative rounded-lg"
            priority
          />
        </div>

        {/* Brand name */}
        <p className="text-lg font-semibold tracking-tight text-white">
          Chioma
        </p>

        {/* Subtle subtext */}
        <p className="text-sm text-blue-200/70">Loading, please wait…</p>
      </div>
    </div>
  );
}
