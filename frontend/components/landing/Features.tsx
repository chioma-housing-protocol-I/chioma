'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Zap, Shield, Coins, FileCheck, Globe, Lock } from 'lucide-react';

const features = [
  {
    icon: Zap,
    title: 'Payments that land in seconds',
    description:
      'Rent moves over the Stellar network, so funds settle in under three seconds — not three business days.',
  },
  {
    icon: Coins,
    title: 'Commissions that split themselves',
    description:
      'Agent commissions are carved out of every rent payment automatically. No invoices, no reminders, no awkward calls.',
  },
  {
    icon: FileCheck,
    title: 'Leases as smart contracts',
    description:
      'Every agreement is executed on-chain, so the terms you signed are the terms that run — for both sides.',
  },
  {
    icon: Lock,
    title: 'Deposits held in escrow',
    description:
      'Security deposits sit in multi-signature escrow until the lease ends. Neither party can touch them alone.',
  },
  {
    icon: Shield,
    title: 'A record nobody can edit',
    description:
      'Payments, signatures, and disputes leave an immutable audit trail. When there is a disagreement, the ledger settles it.',
  },
  {
    icon: Globe,
    title: 'Any Stellar asset',
    description:
      'Collect rent in USDC, local fiat tokens, or XLM — whatever suits both sides of the lease.',
  },
];

export default function Features() {
  return (
    <section className="relative py-28">
      <div className="container mx-auto px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="max-w-2xl mb-16"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brass-400 mb-4">
            Why Chioma
          </p>
          <h2 className="font-display text-4xl md:text-5xl text-cream leading-tight">
            Renting has a trust problem.
            <br />
            We removed the trust part.
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-1">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: (index % 3) * 0.08 }}
              className="group border-t border-cream/8 py-8 pr-4 hover:border-brass-500/40 transition-colors"
            >
              <feature.icon
                className="w-5 h-5 text-brass-400 mb-5"
                strokeWidth={1.75}
              />
              <h3 className="text-lg font-semibold text-cream mb-2">
                {feature.title}
              </h3>
              <p className="text-cream-dim text-[15px] leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
