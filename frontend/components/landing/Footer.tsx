'use client';

import React from 'react';
import Link from 'next/link';
import { Twitter, Linkedin, Github, Mail } from 'lucide-react';
import Logo from '@/components/Logo';
import { useTranslation, type TranslationPath } from '@/lib/i18n';

type FooterLink = { labelKey: TranslationPath; href: string };
type FooterSection = 'platform' | 'developers' | 'legal';

const footerLinks: Record<FooterSection, FooterLink[]> = {
  platform: [
    { labelKey: 'footer.findHome', href: '/properties' },
    { labelKey: 'footer.shortStays', href: '/stays' },
    { labelKey: 'footer.subletting', href: '/sublet' },
    { labelKey: 'footer.resources', href: '/resources' },
  ],
  developers: [
    { labelKey: 'footer.documentation', href: '/developer/docs' },
    { labelKey: 'footer.apiKeys', href: '/developer/api-keys' },
    { labelKey: 'footer.sdks', href: '/developer/sdks' },
    { labelKey: 'footer.systemStatus', href: '/developer/status' },
  ],
  legal: [
    { labelKey: 'footer.privacyPolicy', href: '/privacy' },
    { labelKey: 'footer.termsOfService', href: '/terms' },
  ],
};

// Brand names are not translated; only the generic "Email" label is.
const socialLinks: {
  icon: typeof Twitter;
  href: string;
  label?: string;
  labelKey?: TranslationPath;
}[] = [
  { icon: Twitter, href: 'https://twitter.com', label: 'Twitter' },
  { icon: Linkedin, href: 'https://linkedin.com', label: 'LinkedIn' },
  { icon: Github, href: 'https://github.com', label: 'GitHub' },
  { icon: Mail, href: 'mailto:hello@chioma.io', labelKey: 'footer.email' },
];

export default function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="relative border-t border-cream/8 bg-ink-950">
      <div className="container mx-auto px-4 sm:px-6 py-16">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-10 mb-14">
          {/* Brand */}
          <div className="col-span-2">
            <Logo
              size="lg"
              textClassName="text-xl font-bold text-cream"
              className="mb-5"
            />
            <p className="font-display text-2xl text-cream/90 leading-snug mb-4 max-w-xs">
              {t('footer.tagline')}
            </p>
            <p className="text-cream-dim text-sm leading-relaxed mb-6 max-w-xs">
              {t('footer.description')}
            </p>
            <div className="flex gap-3">
              {socialLinks.map((social) => (
                <a
                  key={social.href}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 border border-cream/10 rounded-lg flex items-center justify-center text-cream-dim hover:text-brass-300 hover:border-brass-500/40 transition-colors"
                  aria-label={
                    social.labelKey ? t(social.labelKey) : social.label
                  }
                >
                  <social.icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-cream text-sm font-semibold uppercase tracking-wider mb-4">
              {t('footer.platform')}
            </h3>
            <ul className="space-y-3">
              {footerLinks.platform.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-cream-dim hover:text-brass-300 text-sm transition-colors"
                  >
                    {t(link.labelKey)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-cream text-sm font-semibold uppercase tracking-wider mb-4">
              {t('footer.developers')}
            </h3>
            <ul className="space-y-3">
              {footerLinks.developers.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-cream-dim hover:text-brass-300 text-sm transition-colors"
                  >
                    {t(link.labelKey)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-cream text-sm font-semibold uppercase tracking-wider mb-4">
              {t('footer.legal')}
            </h3>
            <ul className="space-y-3">
              {footerLinks.legal.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-cream-dim hover:text-brass-300 text-sm transition-colors"
                  >
                    {t(link.labelKey)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-cream/8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-cream-dim/70 text-sm">
            {t('footer.copyright', { year: new Date().getFullYear() })}
          </p>
          <Link
            href="/developer/status"
            className="flex items-center gap-2 text-cream-dim/70 hover:text-cream-dim text-sm transition-colors"
          >
            <span className="w-2 h-2 bg-brand-green rounded-full animate-pulse" />
            {t('footer.allSystemsOperational')}
          </Link>
        </div>
      </div>
    </footer>
  );
}
