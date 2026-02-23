import Navbar from '@/components/Navbar';
import Hero from '@/components/Hero';
import AudienceCards from '@/components/sections/AudienceCards';
import StepsCard from '@/components/sections/StepsCard';

import SecurityFeatures from '@/components/sections/SecurityFeatures';
import CTA from '@/components/CTA';
import Mainfooter from '@/components/Mainfooter';

export default function Home() {
  return (
    <main className="min-h-screen bg-brand-gradient selection:bg-white/30 selection:text-white">
      <Navbar />
      <Hero />

      {/* Keeping existing sections for now */}
      <div className="bg-white">
        <AudienceCards />
      </div>
      <StepsCard />
      <SecurityFeatures />

      <CTA />
      <Mainfooter />
    </main>
  );
}
