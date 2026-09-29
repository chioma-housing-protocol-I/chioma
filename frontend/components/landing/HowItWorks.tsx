'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Search, FileSignature, Home } from 'lucide-react';

const steps = [
  {
    number: '01',
    icon: Search,
    title: 'Find a place',
    description:
      'Browse verified listings with transparent pricing and real availability. What you see is what the contract says.',
  },
  {
    number: '02',
    icon: FileSignature,
    title: 'Sign once, on-chain',
    description:
      'The lease executes as a smart contract on Stellar. Terms are locked for both sides the moment you sign.',
  },
  {
    number: '03',
    icon: Home,
    title: 'Move in, pay as you live',
    description:
      'Rent settles in seconds each cycle, deposits sit in escrow, and commissions split automatically.',
  },
];

export default function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="relative py-28 bg-ink-800/60 border-y border-cream/8"
    >
      <div className="container mx-auto px-4 sm:px-6">
        <div className="grid lg:grid-cols-[1fr_2fr] gap-12 lg:gap-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brass-400 mb-4">
              How it works
            </p>
            <h2 className="font-display text-4xl md:text-5xl text-cream leading-tight">
              Three steps.
              <br />
              No paperwork.
            </h2>
            <p className="mt-6 text-cream-dim leading-relaxed max-w-sm">
              From first search to first rent payment, everything happens in one
              place — and settles on one ledger.
            </p>
          </motion.div>

          <div>
            {steps.map((step, index) => (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.12 }}
                className="grid grid-cols-[auto_1fr] gap-6 sm:gap-10 py-8 border-t border-cream/8 first:border-t-0"
              >
                <div className="font-display text-3xl sm:text-4xl text-brass-500/70 leading-none pt-1 w-14">
                  {step.number}
                </div>
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <step.icon
                      className="w-5 h-5 text-brass-400"
                      strokeWidth={1.75}
                    />
                    <h3 className="text-xl font-semibold text-cream">
                      {step.title}
                    </h3>
                  </div>
                  <p className="text-cream-dim leading-relaxed max-w-lg">
                    {step.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
