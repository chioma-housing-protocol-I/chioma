'use client';

import React from 'react';
import { motion } from 'framer-motion';

const stats = [
  { value: '<3s', label: 'to settle a rent payment' },
  { value: '$0.00001', label: 'network fee per transaction' },
  { value: '100%', label: 'of contract terms on-chain' },
  { value: '24/7', label: 'settlement, no banking hours' },
];

export default function Stats() {
  return (
    <section className="relative border-y border-cream/8 bg-ink-800/60">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-cream/8">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.08 }}
              className="py-10 px-6 text-center lg:text-left"
            >
              <div className="font-display text-3xl md:text-4xl text-brass-300 mb-2">
                {stat.value}
              </div>
              <div className="text-cream-dim text-sm leading-snug">
                {stat.label}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
