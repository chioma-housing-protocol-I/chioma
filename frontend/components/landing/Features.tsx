'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Zap, Shield, Coins, FileCheck, Globe, Lock } from 'lucide-react';

const features = [
  {
    icon: Zap,
    title: 'Instant Payments',
    description:
      'Funds settle in seconds, not days. Experience the speed of blockchain technology.',
  },
  {
    icon: Shield,
    title: 'Immutable Records',
    description:
      'Every transaction is recorded on the blockchain, creating an unchangeable audit trail.',
  },
  {
    icon: Coins,
    title: 'Automated Commissions',
    description:
      'Agent commissions are distributed automatically with every rent payment.',
  },
  {
    icon: FileCheck,
    title: 'Smart Contracts',
    description:
      'Lease agreements are executed as smart contracts, eliminating disputes.',
  },
  {
    icon: Globe,
    title: 'Multi-Currency Support',
    description:
      'Accept payments in USDC, local fiat tokens, or any Stellar asset.',
  },
  {
    icon: Lock,
    title: 'Secure Escrow',
    description:
      'Security deposits are held in multi-sig escrow for maximum protection.',
  },
];

export default function Features() {
  return (
    <section className="relative py-32">
      <div className="container mx-auto px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Built for Modern Rentals
          </h2>
          <p className="text-xl text-blue-200/80 max-w-2xl mx-auto">
            Everything you need to manage rentals efficiently and transparently
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="group relative"
            >
              <div className="h-full backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-8 hover:bg-white/10 transition-all duration-300">
                <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <feature.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">
                  {feature.title}
                </h3>
                <p className="text-blue-200/70 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
