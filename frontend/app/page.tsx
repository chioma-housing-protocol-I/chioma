import nextDynamic from 'next/dynamic';
import Navbar from '@/components/Navbar';
import Hero from '@/components/landing/Hero';
import Stats from '@/components/landing/Stats';

// Above-the-fold sections (Navbar, Hero, Stats) ship in the route chunk.
// Everything below the fold is split into its own chunk so the landing
// route's initial JS stays small; sections are still server-rendered, so
// content and SEO are unchanged.
const Features = nextDynamic(() => import('@/components/landing/Features'));
const HowItWorks = nextDynamic(
  () => import('@/components/landing/HowItWorks'),
);
const ForWho = nextDynamic(() => import('@/components/landing/ForWho'));
const Testimonials = nextDynamic(
  () => import('@/components/landing/Testimonials'),
);
const CTA = nextDynamic(() => import('@/components/landing/CTA'));
const Footer = nextDynamic(() => import('@/components/landing/Footer'));

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
