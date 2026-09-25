import Navbar from '@/components/Navbar';
import Footer from '@/components/landing/Footer';
import { WebVitalsPanel } from '@/components/web-vitals';

export const metadata = {
  title: 'Web Vitals',
  description:
    'Real-user Core Web Vitals (LCP, CLS, INP) collected by Chioma — anonymized pathname-only payloads.',
};

export default function WebVitalsPage() {
  return (
    <main className="relative min-h-screen bg-ink-900 text-cream">
      <div
        className="pointer-events-none absolute inset-0 bg-grain opacity-60"
        aria-hidden
      />

      <div className="relative z-10">
        <Navbar />
        <WebVitalsPanel />
        <Footer />
      </div>
    </main>
  );
}
