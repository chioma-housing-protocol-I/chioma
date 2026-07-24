import Navbar from '@/components/Navbar';
import Hero from '@/components/landing/Hero';
import Features from '@/components/landing/Features';
import HowItWorks from '@/components/landing/HowItWorks';
import Stats from '@/components/landing/Stats';
import Testimonials from '@/components/landing/Testimonials';
import CTA from '@/components/landing/CTA';
import Footer from '@/components/landing/Footer';
import ForWho from '@/components/landing/ForWho';

export const dynamic = 'force-dynamic';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      <Navbar />
      <main id="main-content" tabIndex={-1}>
        <Hero />
        <Stats />
        <Features />
        <HowItWorks />
        <ForWho />
        <Testimonials />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}
