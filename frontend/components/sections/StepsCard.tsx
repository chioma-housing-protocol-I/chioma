import React from 'react';
import { MapPin, FileText, Home } from 'lucide-react';

const steps = [
  {
    id: 1,
    title: 'Search & Tour',
    description: 'Find verified listings and book smart-lock tours instantly.',
    icon: <MapPin className="w-8 h-8" strokeWidth={1.5} />,
    iconBg: 'bg-blue-50',
    iconColor: 'text-blue-600',
  },
  {
    id: 2,
    title: 'Sign Smart Lease',
    description: 'Execute a tamper-proof lease on the blockchain in seconds.',
    icon: <FileText className="w-8 h-8" strokeWidth={1.5} />,
    iconBg: 'bg-blue-50',
    iconColor: 'text-blue-600',
  },
  {
    id: 3,
    title: 'Move & Earn',
    description: 'Get keys instantly and earn rewards for on-time payments.',
    icon: <Home className="w-8 h-8" strokeWidth={1.5} />,
    iconBg: 'bg-blue-50',
    iconColor: 'text-blue-600',
  },
];

export default function StepsCard() {
  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-linear-to-b from-gray-50 to-white">
      <div className="max-w-6xl mx-auto">
        {/* Section Title */}
        <h2 className="text-4xl md:text-5xl font-bold text-center text-blue-600 mb-16">
          Rent in 3 Simple Steps
        </h2>

        {/* Steps Container */}
        <div className="relative grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-8">
          {/* Connecting Line - Hidden on mobile */}
          <div
            className="hidden md:block absolute top-16 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-gray-300 to-transparent"
            style={{
              left: 'calc(16.666% + 2rem)',
              right: 'calc(16.666% + 2rem)',
              top: '4rem',
            }}
          />

          {steps.map((step) => (
            <div
              key={step.id}
              className="relative flex flex-col items-center text-center group"
            >
              {/* Icon Circle */}
              <div
                className={`relative z-10 w-32 h-32 rounded-full ${step.iconBg} flex items-center justify-center mb-6 shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-105 bg-white border-4 border-gray-100`}
              >
                <div className={step.iconColor}>{step.icon}</div>
              </div>

              {/* Step Title */}
              <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-3">
                {step.title}
              </h3>

              {/* Step Description */}
              <p className="text-gray-600 leading-relaxed max-w-xs">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
