import React from 'react';
import { Key, ChartLine, Handshake } from 'lucide-react';

const audiences = [
  {
    role: 'Tenants',
    title: 'For Tenants',
    description:
      'Instant background checks and deposit-free options available through our trusted partner network.',
    cta: 'Start Renting',
    borderColor: 'border-blue-700',
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-700',
    ctaColor: 'text-blue-700',
    icon: <Key className="w-8 h-8 text-blue-700" strokeWidth={1.5} />,
  },
  {
    role: 'Landlords',
    title: 'For Landlords',
    description:
      'Guaranteed rent payouts and automated property management driven by smart contracts.',
    cta: 'Maximize Yield',
    borderColor: 'border-green-600',
    iconBg: 'bg-green-100',
    iconColor: 'text-green-600',
    ctaColor: 'text-green-600',
    icon: <ChartLine className="w-8 h-8 text-green-600" strokeWidth={1.5} />,
  },
  {
    role: 'Agents',
    title: 'For Agents',
    description:
      'Faster closings and transparent commission tracking on an immutable ledger.',
    cta: 'Partner with Us',
    borderColor: 'border-orange-500',
    iconBg: 'bg-orange-100',
    iconColor: 'text-orange-500',
    ctaColor: 'text-orange-500',
    icon: <Handshake className="w-8 h-8 text-orange-500" strokeWidth={1.5} />,
  },
];

export default function AudienceCards() {
  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {audiences.map((audience) => (
            <div
              key={audience.role}
              className={`group bg-white rounded-3xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300 border-t-8 ${audience.borderColor} flex flex-col items-start`}
            >
              <div
                className={`mb-6 p-4 rounded-2xl ${audience.iconBg} group-hover:scale-105 transition-transform duration-300`}
              >
                {audience.icon}
              </div>

              <h3 className="text-xl font-bold text-zinc-900 mb-4">
                {audience.title}
              </h3>

              <p className="text-zinc-500 mb-8 leading-relaxed">
                {audience.description}
              </p>

              <a
                href="#"
                className={`mt-auto inline-flex items-center text-base font-bold ${audience.ctaColor} group-hover:opacity-80 transition-opacity`}
              >
                {audience.cta}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2.5}
                  stroke="currentColor"
                  className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                  />
                </svg>
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
