'use client';

import Link from 'next/link';
import { BookOpen, KeyRound, Webhook } from 'lucide-react';

const cards = [
  {
    href: '/developer/webhooks',
    icon: Webhook,
    title: 'Webhooks',
    description:
      'Create endpoints, test deliveries, review logs, and manage signing secrets.',
  },
  {
    href: '/api/docs',
    icon: BookOpen,
    title: 'API docs',
    description:
      'Inspect available endpoints, schemas, and backend contracts used by integrations.',
  },
  {
    href: '/developer/webhooks',
    icon: KeyRound,
    title: 'Integration setup',
    description:
      'Start from webhook configuration and align payload handling with your external services.',
  },
];

export default function DeveloperOverviewPage() {
  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <h2 className="text-2xl font-semibold text-white">Developer tools</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
          This portal centralizes the integration surfaces currently available in the
          frontend. Use it to configure outbound webhooks and validate delivery
          behavior before wiring production consumers.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <Link
            key={card.title}
            href={card.href}
            className="rounded-3xl border border-white/10 bg-white/5 p-6 transition hover:border-white/20 hover:bg-white/10"
          >
            <card.icon className="h-8 w-8 text-blue-300" />
            <h3 className="mt-4 text-lg font-semibold text-white">{card.title}</h3>
            <p className="mt-2 text-sm text-slate-300">{card.description}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
