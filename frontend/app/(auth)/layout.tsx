import Logo from '@/components/Logo';
import HeroFamilyScene from '@/components/landing/HeroFamilyScene';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-ink-900 grid lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden lg:block overflow-hidden">
        <HeroFamilyScene />
        <div className="absolute inset-0 bg-gradient-to-t from-ink-950/90 via-transparent to-ink-950/40" />
        <div className="absolute inset-0 flex flex-col justify-between p-10">
          <Logo
            size="md"
            textClassName="text-xl font-bold text-cream"
            className="w-fit"
          />
          <div>
            <p className="font-display text-4xl text-cream leading-tight max-w-md">
              Come home to certainty.
            </p>
            <p className="mt-4 text-cream/70 max-w-sm leading-relaxed">
              Leases, rent, and commissions — settled in seconds on the Stellar
              network.
            </p>
          </div>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center px-4 py-12 sm:px-8">
        <div className="w-full max-w-md">
          <div className="flex justify-center mb-8 lg:hidden">
            <Logo size="lg" textClassName="text-2xl font-bold text-cream" />
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
