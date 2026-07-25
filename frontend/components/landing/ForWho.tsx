'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { Users, Building2, Briefcase, ArrowRight } from 'lucide-react';

const audiences = [
  {
    icon: Users,
    label: 'For renters',
    title: 'Find a home you can trust',
    description:
      'Verified listings, transparent lease terms, and a deposit that actually comes back.',
    features: [
      'Instant background checks',
      'Flexible payment options',
      'Lease terms locked on-chain',
      'Rewards for on-time payments',
    ],
    cta: 'Start searching',
    href: '/properties',
  },
  {
    icon: Building2,
    label: 'For landlords',
    title: 'Rent that arrives on time',
    description:
      'Automated collection, guaranteed settlement, and a portfolio view of every lease.',
    features: [
      'Automated rent collection',
      'Smart-contract leases',
      'Real-time analytics',
      'Shorter vacancy periods',
    ],
    cta: 'List a property',
    href: '/user/properties/wizard',
  },
  {
    icon: Briefcase,
    label: 'For agents',
    title: 'Commissions without chasing',
    description:
      'Your cut is written into the contract and paid out with every rent cycle.',
    features: [
      'Automatic commission splits',
      'Instant settlement',
      'Transparent tracking',
      'One dashboard for every deal',
    ],
    cta: 'Go to dashboard',
    href: '/user',
  },
];

export default function ForWho() {
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
            Who it&apos;s for
          </p>
          <h2 className="font-display text-4xl md:text-5xl text-cream leading-tight">
            Every side of the lease,
            <br />
            finally on the same page.
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6 max-w-7xl mx-auto">
          {audiences.map((audience, index) => (
            <motion.div
              key={audience.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="group flex flex-col h-full bg-ink-800 border border-cream/8 rounded-2xl p-8 hover:border-brass-500/35 transition-colors"
            >
              <div className="flex items-center gap-3 mb-6">
                <audience.icon
                  className="w-5 h-5 text-brass-400"
                  strokeWidth={1.75}
                />
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-cream-dim">
                  {audience.label}
                </span>
              </div>

              <h3 className="font-display text-2xl text-cream mb-3">
                {audience.title}
              </h3>

              <p className="text-cream-dim mb-6 leading-relaxed text-[15px]">
                {audience.description}
              </p>

              <ul className="space-y-3 mb-8">
                {audience.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-3 text-cream-dim text-sm"
                  >
                    <span className="w-3 h-px bg-brass-500/60 mt-2.5 flex-shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <Link
                href={audience.href}
                className="mt-auto inline-flex items-center gap-2 text-brass-300 font-semibold text-sm group-hover:gap-3 transition-all"
              >
                {audience.cta}
                <ArrowRight className="w-4 h-4" />
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
