'use client';

import React from 'react';
import { motion } from 'framer-motion';

const stats = [
  { value: '<3s', label: 'Settlement Time' },
  { value: '$0.00001', label: 'Transaction Fee' },
  { value: '100%', label: 'Transparent' },
  { value: '24/7', label: 'Always Available' },
];

export default function Stats() {
  return (
    <section className="relative py-20 border-y border-white/10">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
          {stats.map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="text-center"
            >
              <div className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-300 to-indigo-300 bg-clip-text text-transparent mb-2">
                {stat.value}
              </div>
              <div className="text-blue-200/70 text-sm md:text-base font-medium">
                {stat.label}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
