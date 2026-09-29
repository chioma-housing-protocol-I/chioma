'use client';

import React from 'react';
import { motion } from 'framer-motion';

const testimonials = [
  {
    name: 'Sarah Johnson',
    role: 'Property manager, 40+ units',
    content:
      'Chioma has transformed how we manage our rental portfolio. Instant payments and automated commissions save us hours every week.',
  },
  {
    name: 'Michael Chen',
    role: 'Tenant',
    content:
      'The transparency and speed of transactions is incredible. No more waiting weeks for settlements.',
  },
  {
    name: 'Emily Rodriguez',
    role: 'Tenant',
    content:
      'Finding and securing my apartment was seamless. The smart contract lease gave me peace of mind.',
  },
];

export default function Testimonials() {
  return (
    <section className="relative py-28 bg-ink-800/60 border-y border-cream/8">
      <div className="container mx-auto px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="max-w-2xl mb-16"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brass-400 mb-4">
            From our users
          </p>
          <h2 className="font-display text-4xl md:text-5xl text-cream leading-tight">
            People stopped chasing money.
            <br />
            Here&apos;s what they say.
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6 max-w-6xl">
          {testimonials.map((testimonial, index) => (
            <motion.figure
              key={testimonial.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="flex flex-col bg-ink-900 border border-cream/8 rounded-2xl p-8"
            >
              <span
                className="font-display text-5xl text-brass-500/50 leading-none mb-4 select-none"
                aria-hidden
              >
                &ldquo;
              </span>
              <blockquote className="text-cream/90 leading-relaxed flex-1">
                {testimonial.content}
              </blockquote>
              <figcaption className="mt-8 pt-6 border-t border-cream/8">
                <div className="font-semibold text-cream">
                  {testimonial.name}
                </div>
                <div className="text-sm text-cream-dim mt-0.5">
                  {testimonial.role}
                </div>
              </figcaption>
            </motion.figure>
          ))}
        </div>
      </div>
    </section>
  );
}
