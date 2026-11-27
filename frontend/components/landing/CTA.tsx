'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, Wallet } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/useTranslation';

export default function CTA() {
  const { t } = useTranslation();

  return (
    <section className="relative py-28">
      <div className="container mx-auto px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="relative max-w-4xl mx-auto text-center bg-grain bg-ink-800 border border-cream/10 rounded-[2rem] px-8 py-16 md:px-16 md:py-20 overflow-hidden"
        >
          <div className="rule-glint w-32 mx-auto mb-10" aria-hidden />

          <h2 className="font-display text-4xl md:text-5xl lg:text-6xl text-cream leading-tight mb-6">
            {t('landing.cta.titleLine1')}
            <br />
            {t('landing.cta.titleConnector')}{' '}
            <span className="text-brass-300">
              {t('landing.cta.titleEmphasis')}
            </span>
          </h2>

          <p className="text-lg text-cream-dim mb-10 max-w-xl mx-auto leading-relaxed">
            {t('landing.cta.description')}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/signup"
              className="group w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-brass-500 hover:bg-brass-400 text-ink-950 font-semibold transition-colors"
            >
              {t('landing.cta.createAccount')}
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/login"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl border border-cream/15 text-cream hover:border-brass-500/50 hover:text-brass-300 font-semibold transition-colors"
            >
              <Wallet className="w-4 h-4" />
              {t('landing.cta.connectWallet')}
            </Link>
          </div>

          <p className="text-cream-dim/70 text-sm mt-10">
            {t('landing.cta.footnote')}
          </p>
        </motion.div>
      </div>
    </section>
  );
}
