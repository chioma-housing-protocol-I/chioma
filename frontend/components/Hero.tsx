'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, CheckCircle2 } from 'lucide-react';

/**
 * Hero Component
 * Implements a premium hero section with a value proposition and floating UI elements.
 * Uses Tailwind v4 syntax for background gradients and spacing.
 */
const Hero = () => {
  return (
    <section className="relative pt-10 pb-16 md:pt-12 md:pb-24 overflow-hidden">
      <div className="container mx-auto px-6 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Left Content Column */}
          <div className="flex flex-col space-y-8 max-w-2xl">
            {/* Badge Indicator */}
            <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 text-white text-xs font-black uppercase tracking-wider w-fit">
              <span>Built for Modern Agents</span>
            </div>

            {/* Headline */}
            <h1 className="text-5xl md:text-7xl font-bold text-white leading-[1.1] tracking-tight">
              Automated Commissions. <br />
              <span className="text-blue-200">Zero Disputes.</span>
            </h1>

            {/* Subtext */}
            <p className="text-lg md:text-xl text-white/90 leading-relaxed max-w-xl">
              Connect with landlords and tenants on the Stellar network.
              Experience instant payouts and transparent contract tracking
              without the paperwork.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-4 pt-4">
              <Link
                href="#"
                className="w-full sm:w-auto bg-white text-brand-blue hover:bg-white/90 px-8 py-4 rounded-full text-lg font-bold flex items-center justify-center space-x-2 transition-all shadow-xl shadow-black/10"
              >
                <span>Start Partnering</span>
                <ArrowRight size={20} />
              </Link>
              <Link
                href="#"
                className="w-full sm:w-auto hover:bg-white/20 border border-white/30 text-white px-8 py-4 rounded-full text-lg font-bold flex items-center justify-center transition-all"
              >
                View Documentation
              </Link>
            </div>

            {/* Trust Indicator */}
            <div className="flex items-center space-x-1.5 text-white/70 text-sm font-medium pt-2">
              <CheckCircle2
                size={18}
                className="text-white-700 bg-blue-700 rounded-lg"
              />
              <span>Powered by Stellar Blockchain</span>
            </div>
          </div>

          {/* Right Visuals Column */}
          <div className="relative group">
            {/* Ambient Background Glow */}
            <div className="absolute -inset-4 bg-linear-to-tr from-blue-400/20 to-transparent rounded-[2.5rem] blur-2xl group-hover:blur-3xl transition-all duration-700"></div>

            {/* Main Hero Image Container */}
            <div className="relative rounded-4xl overflow-hidden shadow-2xl border border-white/20 aspect-4/3 md:aspect-square lg:aspect-4/5">
              <Image
                src="https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=2069"
                alt="Modern Office showing collaboration"
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                className="object-cover transition-transform duration-700 group-hover:scale-105"
                priority
              />

              {/* Overlay Gradient for depth */}
              <div className="absolute inset-0 bg-linear-to-t from-black/40 via-transparent to-transparent"></div>
            </div>

            {/* Floating Status Card: Payment Success */}
            <div className="absolute bottom-6 -left-6 md:bottom-14 md:-left-12 bg-white rounded-2xl p-6 shadow-2xl border border-blue-100 flex items-start space-x-4 max-w-70 md:max-w-xs animate-in slide-in-from-bottom-8 duration-1000">
              <div className="bg-emerald-100 p-3 rounded-full text-emerald-600 shrink-0">
                <CheckCircle2 size={32} />
              </div>
              <div className="flex flex-col">
                <h4 className="font-bold text-slate-900 text-lg">
                  Payment Success
                </h4>
                <p className="text-slate-500 text-sm">Commission Received</p>
                <div className="mt-4 flex items-baseline space-x-2">
                  <span className="text-2xl md:text-3xl font-extrabold text-slate-900">
                    $1,200
                  </span>
                  <span className="text-xs font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded uppercase tracking-wider">
                    USDC
                  </span>
                </div>
                {/* Blockchain Transaction Mockup Footer */}
                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center space-x-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  <svg
                    className="w-3 h-3 text-blue-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                  <span>Processed via Stellar Network</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Dynamic Background Decorative Orbs */}
      <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-150 h-150 bg-blue-500/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/2 w-125 h-125 bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none"></div>
    </section>
  );
};

export default Hero;
