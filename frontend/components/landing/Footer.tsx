'use client';

import React from 'react';
import Link from 'next/link';
import { Twitter, Linkedin, Github, Mail } from 'lucide-react';
import Logo from '@/components/Logo';

const footerLinks = {
  platform: [
    { name: 'Find a home', href: '/properties' },
    { name: 'Short stays', href: '/stays' },
    { name: 'Subletting', href: '/sublet' },
    { name: 'Resources', href: '/resources' },
  ],
  developers: [
    { name: 'Documentation', href: '/developer/docs' },
    { name: 'API keys', href: '/developer/api-keys' },
    { name: 'SDKs', href: '/developer/sdks' },
    { name: 'System status', href: '/developer/status' },
  ],
  legal: [
    { name: 'Privacy policy', href: '/privacy' },
    { name: 'Terms of service', href: '/terms' },
  ],
};

const socialLinks = [
  { icon: Twitter, href: 'https://twitter.com', label: 'Twitter' },
  { icon: Linkedin, href: 'https://linkedin.com', label: 'LinkedIn' },
  { icon: Github, href: 'https://github.com', label: 'GitHub' },
  { icon: Mail, href: 'mailto:hello@chioma.io', label: 'Email' },
];

export default function Footer() {
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
              Open financial rails for housing.
            </p>
            <p className="text-cream-dim text-sm leading-relaxed mb-6 max-w-xs">
              Leases, rent, and commissions — settled transparently on the
              Stellar network.
            </p>
            <div className="flex gap-3">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 border border-cream/10 rounded-lg flex items-center justify-center text-cream-dim hover:text-brass-300 hover:border-brass-500/40 transition-colors"
                  aria-label={social.label}
                >
                  <social.icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-cream text-sm font-semibold uppercase tracking-wider mb-4">
              Platform
            </h3>
            <ul className="space-y-3">
              {footerLinks.platform.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-cream-dim hover:text-brass-300 text-sm transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-cream text-sm font-semibold uppercase tracking-wider mb-4">
              Developers
            </h3>
            <ul className="space-y-3">
              {footerLinks.developers.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-cream-dim hover:text-brass-300 text-sm transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-cream text-sm font-semibold uppercase tracking-wider mb-4">
              Legal
            </h3>
            <ul className="space-y-3">
              {footerLinks.legal.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-cream-dim hover:text-brass-300 text-sm transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-cream/8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-cream-dim/70 text-sm">
            © {new Date().getFullYear()} Chioma. All rights reserved.
          </p>
          <Link
            href="/developer/status"
            className="flex items-center gap-2 text-cream-dim/70 hover:text-cream-dim text-sm transition-colors"
          >
            <span className="w-2 h-2 bg-brand-green rounded-full animate-pulse" />
            All systems operational
          </Link>
        </div>
      </div>
    </footer>
  );
}
