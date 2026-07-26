'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowRight, CheckCircle2, Search } from 'lucide-react';
import { useAuth } from '@/store/authStore';
import HeroFamilyScene from '@/components/landing/HeroFamilyScene';

const trustPoints = [
  'Settles in seconds',
  'Fees under a cent',
  'Contracts you can read',
];

export default function Hero() {
  const { walletAddress } = useAuth();
  const router = useRouter();
  const [query, setQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    router.push(
      trimmed ? `/properties?q=${encodeURIComponent(trimmed)}` : '/properties',
    );
  };

  return (
    <section className="relative pt-16 pb-24 lg:pt-24 lg:pb-32 overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 xl:gap-20 items-center">
          {/* Text column */}
          <div className="text-center lg:text-left">
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-brass-400 mb-6"
            >
              <span className="w-8 rule-glint" aria-hidden />
              Rentals on the Stellar network
            </motion.p>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.08 }}
              className="font-display text-5xl md:text-6xl xl:text-7xl text-cream leading-[1.05]"
            >
              Come home
              <br />
              to{' '}
              <em className="text-brass-300 not-italic border-b-4 border-brass-500/40">
                certainty.
              </em>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.16 }}
              className="mt-6 text-lg md:text-xl text-cream-dim max-w-xl mx-auto lg:mx-0 leading-relaxed"
            >
              Chioma puts leases, rent, and agent commissions on rails. Payments
              settle in seconds on Stellar, contracts stay transparent, and
              nobody has to chase anybody for money.
            </motion.p>

            {walletAddress && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.2 }}
                className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-green/10 border border-brand-green/30 text-sm text-cream"
              >
                <span className="w-2 h-2 rounded-full bg-brand-green animate-pulse" />
                <span className="font-mono">
                  {walletAddress.slice(0, 6)}…{walletAddress.slice(-6)}
                </span>
              </motion.div>
            )}

            {/* Search */}
            <motion.form
              onSubmit={handleSearch}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.24 }}
              className="mt-10 flex items-stretch max-w-xl mx-auto lg:mx-0 rounded-2xl bg-ink-800 border border-cream/10 p-2 focus-within:border-brass-500/50 transition-colors"
            >
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-cream-dim/60 pointer-events-none" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="City, neighborhood, or property type…"
                  aria-label="Search properties"
                  className="w-full h-full pl-12 pr-4 py-3 bg-transparent text-cream placeholder:text-cream-dim/50 focus:outline-none text-sm"
                />
              </div>
              <button
                type="submit"
                className="group flex items-center gap-2 px-5 py-3 rounded-xl bg-brass-500 hover:bg-brass-400 text-ink-950 font-semibold text-sm transition-colors whitespace-nowrap"
              >
                Browse homes
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              </button>
            </motion.form>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.35 }}
              className="mt-8 flex flex-wrap items-center justify-center lg:justify-start gap-x-6 gap-y-2 text-sm text-cream-dim"
            >
              {trustPoints.map((point) => (
                <span key={point} className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-brass-400" />
                  {point}
                </span>
              ))}
            </motion.div>
          </div>

          {/* Golden-hour scene */}
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="relative mx-auto w-full max-w-md lg:max-w-lg"
          >
            <div className="relative aspect-[4/5] rounded-[2rem] overflow-hidden border border-cream/10 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.6)]">
              <HeroFamilyScene />
            </div>
            {/* Floating settlement receipt card */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.7 }}
              className="absolute -bottom-6 -left-4 sm:-left-10 bg-ink-800 border border-cream/10 rounded-2xl px-5 py-4 shadow-2xl"
            >
              <p className="text-[11px] uppercase tracking-widest text-cream-dim mb-1">
                Rent settled
              </p>
              <p className="text-cream font-semibold">
                1,250 XLM{' '}
                <span className="text-brand-green text-sm font-normal">
                  · confirmed in 2.8s
                </span>
              </p>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
