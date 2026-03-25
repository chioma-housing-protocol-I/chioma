'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Search, FileSignature, Home, ArrowRight } from 'lucide-react';

const steps = [
  {
    icon: Search,
    title: 'Search & Discover',
    description:
      'Browse verified listings with transparent pricing and instant availability.',
  },
  {
    icon: FileSignature,
    title: 'Sign Smart Lease',
    description:
      'Execute tamper-proof lease agreements on the blockchain in seconds.',
  },
  {
    icon: Home,
    title: 'Move In & Pay',
    description:
      'Get instant access and make secure payments with automated commission splits.',
  },
];

export default function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="relative py-32 bg-white/5 backdrop-blur-sm"
    >
      <div className="container mx-auto px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            How It Works
          </h2>
          <p className="text-xl text-blue-200/80 max-w-2xl mx-auto">
            Get started in three simple steps
          </p>
        </motion.div>

        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8 relative">
            {/* Connection lines */}
            <div
              className="hidden md:block absolute top-20 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-blue-500/30 to-transparent"
              style={{ left: '16.666%', right: '16.666%' }}
            />

            {steps.map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.2 }}
                className="relative"
              >
                <div className="text-center">
                  {/* Step number */}
                  <div className="relative inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full mb-6 z-10">
                    <span className="text-2xl font-bold text-white">
                      {index + 1}
                    </span>
                  </div>

                  {/* Icon */}
                  <div className="w-20 h-20 bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <step.icon className="w-10 h-10 text-blue-300" />
                  </div>

                  {/* Content */}
                  <h3 className="text-2xl font-bold text-white mb-3">
                    {step.title}
                  </h3>
                  <p className="text-blue-200/70 leading-relaxed">
                    {step.description}
                  </p>
                </div>

                {/* Arrow between steps */}
                {index < steps.length - 1 && (
                  <div className="hidden md:block absolute top-20 -right-4 text-blue-500/30">
                    <ArrowRight className="w-8 h-8" />
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
