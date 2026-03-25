'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { Users, Building2, Briefcase, ArrowRight } from 'lucide-react';

const audiences = [
  {
    icon: Users,
    title: 'For Tenants',
    description:
      'Find your perfect home with transparent pricing, instant approvals, and secure payments.',
    features: [
      'Instant background checks',
      'Flexible payment options',
      'Transparent lease terms',
      'Earn rewards for on-time payments',
    ],
    cta: 'Start Searching',
    href: '/properties',
    gradient: 'from-blue-500 to-cyan-500',
  },
  {
    icon: Building2,
    title: 'For Landlords',
    description:
      'Maximize your rental income with automated management and guaranteed payments.',
    features: [
      'Automated rent collection',
      'Smart contract leases',
      'Real-time analytics',
      'Reduced vacancy periods',
    ],
    cta: 'List Property',
    href: '/landlords',
    gradient: 'from-indigo-500 to-purple-500',
  },
  {
    icon: Briefcase,
    title: 'For Agents',
    description:
      'Close deals faster with transparent commissions and instant payouts.',
    features: [
      'Automated commission splits',
      'Instant settlement',
      'Transparent tracking',
      'Reduced paperwork',
    ],
    cta: 'Join as Agent',
    href: '/agents',
    gradient: 'from-purple-500 to-pink-500',
  },
];

export default function ForWho() {
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
            Built for Everyone
          </h2>
          <p className="text-xl text-blue-200/80 max-w-2xl mx-auto">
            Whether you&apos;re renting, managing, or facilitating, we&apos;ve
            got you covered
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {audiences.map((audience, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="group relative"
            >
              <div className="h-full backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-8 hover:bg-white/10 transition-all duration-300">
                {/* Icon */}
                <div
                  className={`w-16 h-16 bg-gradient-to-br ${audience.gradient} rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}
                >
                  <audience.icon className="w-8 h-8 text-white" />
                </div>

                {/* Title */}
                <h3 className="text-2xl font-bold text-white mb-3">
                  {audience.title}
                </h3>

                {/* Description */}
                <p className="text-blue-200/70 mb-6 leading-relaxed">
                  {audience.description.replace(/'/g, '\u2019')}
                </p>

                {/* Features */}
                <ul className="space-y-3 mb-8">
                  {audience.features.map((feature, idx) => (
                    <li
                      key={idx}
                      className="flex items-start gap-2 text-blue-200/80 text-sm"
                    >
                      <div className="w-1.5 h-1.5 bg-blue-400 rounded-full mt-2 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <Link
                  href={audience.href}
                  className={`inline-flex items-center gap-2 text-white font-semibold group-hover:gap-3 transition-all`}
                >
                  {audience.cta}
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
