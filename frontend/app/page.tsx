'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowRight,
  Search,
  FileSignature,
  Home as HomeIcon,
  Shield,
  Zap,
  UserCheck,
  AlertTriangle,
  Building2,
  Briefcase,
  CheckCircle2,
  Twitter,
  Linkedin,
  Github,
} from 'lucide-react';
import Navbar from '@/components/Navbar';

// Animated floating notification component
const LeaseNotification = () => (
  <div className="absolute bottom-8 right-4 md:bottom-12 md:-right-8 bg-white rounded-2xl p-4 shadow-2xl border border-emerald-100 max-w-[200px] animate-float">
    <div className="flex items-center gap-3 mb-2">
      <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
      </div>
      <div>
        <p className="text-sm font-bold text-slate-900">Lease Signed!</p>
        <p className="text-xs text-slate-500">Just now</p>
      </div>
    </div>
    <div className="flex items-center justify-between">
      <span className="text-xs text-slate-400">Smart Contract Active</span>
      <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
    </div>
  </div>
);

// Hero Section matching Figma
const HeroSection = () => (
  <section className="relative pt-24 pb-16 md:pt-32 md:pb-24 overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800">
    {/* Background decorative elements */}
    <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-500/20 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2" />
    <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-indigo-500/20 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/2" />

    <div className="container mx-auto px-6 relative z-10">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        {/* Left Content */}
        <div className="max-w-xl">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6">
            Rent Smarter.{' '}
            <span className="text-blue-200">Move Faster.</span>{' '}
            <span className="text-white">Save More.</span>
          </h1>
          <p className="text-lg text-blue-100/90 mb-8 leading-relaxed">
            The first complete online platform bridging Tenants, Landlords, and Agents with blockchain security, transparency, and speed.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 mb-8">
            <Link
              href="#"
              className="group bg-brand-orange hover:bg-orange-600 text-white px-8 py-4 rounded-full font-bold flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-orange-500/30 hover:-translate-y-0.5"
            >
              Explore Homes
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="/landlords"
              className="bg-white/10 hover:bg-white/20 text-white border border-white/30 px-8 py-4 rounded-full font-bold flex items-center justify-center gap-2 transition-all backdrop-blur-sm"
            >
              List Your Property
            </Link>
          </div>

          {/* Trust indicator */}
          <div className="flex items-center gap-2 text-blue-200/70 text-sm">
            <CheckCircle2 size={18} className="text-emerald-400" />
            <span>Powered by Stellar Blockchain</span>
          </div>
        </div>

        {/* Right - Hero Image */}
        <div className="relative">
          <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-white/10">
            <Image
              src="https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&q=80&w=800"
              alt="Modern living room with plants"
              width={600}
              height={450}
              className="w-full h-auto object-cover"
              priority
            />
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
          </div>
          <LeaseNotification />
        </div>
      </div>
    </div>
  </section>
);

// Audience Cards Section
const audienceCards = [
  {
    icon: HomeIcon,
    title: 'For Tenants',
    description: 'Smart, transparent renting with secure digital leases, automated payments, and verified landlords.',
    cta: 'See Rentals',
    href: '/',
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    borderColor: 'border-t-blue-500',
  },
  {
    icon: Building2,
    title: 'For Landlords',
    description: 'Streamlined rent collection and automated property management powered by smart contracts.',
    cta: 'Maximize Yield',
    href: '/landlord/dashboard',
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-600',
    borderColor: 'border-t-emerald-500',
  },
  {
    icon: Briefcase,
    title: 'For Agents',
    description: 'Faster closings and transparent commissions tracking via an irrevocable ledger.',
    cta: 'Partner with Us',
    href: '/agents',
    iconBg: 'bg-orange-100',
    iconColor: 'text-orange-600',
    borderColor: 'border-t-orange-500',
  },
];

const AudienceSection = () => (
  <section className="py-20 bg-white">
    <div className="container mx-auto px-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {audienceCards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.title}
              href={card.href}
              className={`group bg-white rounded-2xl p-8 border border-slate-200 ${card.borderColor} border-t-4 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-2`}
            >
              <div className={`w-14 h-14 ${card.iconBg} rounded-2xl flex items-center justify-center mb-6`}>
                <Icon size={28} className={card.iconColor} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">{card.title}</h3>
              <p className="text-slate-600 mb-6 leading-relaxed">{card.description}</p>
              <span className={`inline-flex items-center gap-2 font-semibold ${card.iconColor} group-hover:gap-3 transition-all`}>
                {card.cta}
                <ArrowRight size={16} />
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  </section>
);

// Simple Steps Section
const steps = [
  {
    icon: Search,
    title: 'Search & Tour',
    description: 'Find your perfect home from verified listings. Schedule virtual or in-person tours instantly.',
  },
  {
    icon: FileSignature,
    title: 'Sign Smart Lease',
    description: 'Review and digitally sign your lease secured by blockchain. No paperwork, no hassle.',
  },
  {
    icon: HomeIcon,
    title: 'Move & Earn',
    description: 'Move in seamlessly and earn rewards for on-time payments. Build your rental reputation.',
  },
];

const StepsSection = () => (
  <section className="py-20 bg-slate-50">
    <div className="container mx-auto px-6">
      <div className="text-center mb-16">
        <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
          Rent in 3 Simple Steps
        </h2>
        <p className="text-slate-600 max-w-xl mx-auto">
          Our streamlined process gets you from searching to moving in faster than ever.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
        {steps.map((step, index) => {
          const Icon = step.icon;
          return (
            <div key={step.title} className="text-center group">
              <div className="relative inline-block mb-6">
                <div className="w-20 h-20 bg-white rounded-full shadow-lg flex items-center justify-center group-hover:shadow-xl transition-shadow">
                  <Icon size={32} className="text-blue-600" />
                </div>
                <div className="absolute -top-2 -right-2 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                  {index + 1}
                </div>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">{step.title}</h3>
              <p className="text-slate-600 leading-relaxed">{step.description}</p>
            </div>
          );
        })}
      </div>
    </div>
  </section>
);

// Security Features Section
const securityFeatures = [
  {
    icon: Shield,
    title: 'Immutable Records',
    description: 'Every contract recorded on the blockchain—permanent & verifiable.',
    color: 'from-blue-500 to-blue-600',
  },
  {
    icon: Zap,
    title: 'Instant Payments',
    description: 'Rent paid in seconds with near-zero transaction fees via Stellar.',
    color: 'from-emerald-500 to-emerald-600',
  },
  {
    icon: UserCheck,
    title: 'Identity Protection',
    description: 'Decentralized identity verification for all platform users.',
    color: 'from-purple-500 to-purple-600',
  },
  {
    icon: AlertTriangle,
    title: 'Dispute Resolution',
    description: 'Fair, transparent dispute handling backed by smart contracts.',
    color: 'from-orange-500 to-orange-600',
  },
];

const SecuritySection = () => (
  <section className="py-20 bg-slate-900">
    <div className="container mx-auto px-6">
      <div className="text-center mb-16">
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
          Security Built into Every Lease
        </h2>
        <p className="text-slate-400 max-w-xl mx-auto">
          Blockchain-powered protection for every transaction on Chioma.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {securityFeatures.map((feature) => {
          const Icon = feature.icon;
          return (
            <div
              key={feature.title}
              className="bg-slate-800 rounded-2xl p-6 border border-slate-700 hover:border-slate-600 transition-all hover:-translate-y-1"
            >
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4`}>
                <Icon size={24} className="text-white" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">{feature.title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{feature.description}</p>
            </div>
          );
        })}
      </div>
    </div>
  </section>
);

// CTA Banner Section
const CTABanner = () => (
  <section className="py-20 bg-gradient-to-r from-blue-600 to-indigo-700">
    <div className="container mx-auto px-6">
      <div className="max-w-3xl mx-auto text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
          Ready to experience the new standard?
        </h2>
        <p className="text-blue-100 mb-10 text-lg">
          Join thousands of tenants, landlords, and agents already using Chioma.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="#"
            className="bg-white text-blue-600 hover:bg-blue-50 px-8 py-4 rounded-full font-bold transition-all shadow-lg hover:shadow-xl"
          >
            Find a Home
          </Link>
          <Link
            href="/landlords"
            className="bg-brand-orange hover:bg-orange-600 text-white px-8 py-4 rounded-full font-bold transition-all shadow-lg hover:shadow-orange-500/30"
          >
            I&apos;m a Property Owner
          </Link>
        </div>
      </div>
    </div>
  </section>
);

// Footer Section
const footerLinks = {
  forUsers: [
    { label: 'Find Rentals', href: '/' },
    { label: 'List Property', href: '/landlords' },
    { label: 'For Agents', href: '/agents' },
    { label: 'Pricing', href: '#' },
  ],
  landlords: [
    { label: 'Dashboard', href: '/landlord/dashboard' },
    { label: 'Smart Contracts', href: '#' },
    { label: 'Rent Collection', href: '#' },
    { label: 'Analytics', href: '#' },
  ],
  company: [
    { label: 'About Us', href: '#' },
    { label: 'Careers', href: '#' },
    { label: 'Press', href: '#' },
    { label: 'Contact', href: '#' },
  ],
  resources: [
    { label: 'Documentation', href: '/resources' },
    { label: 'Help Center', href: '#' },
    { label: 'Blog', href: '#' },
    { label: 'API', href: '#' },
  ],
};

const Footer = () => (
  <footer className="bg-slate-900 pt-16 pb-8">
    <div className="container mx-auto px-6">
      {/* Top section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-12 mb-12">
        {/* Brand */}
        <div className="lg:col-span-2">
          <Link href="/" className="text-2xl font-bold text-white mb-4 inline-block">
            Chioma
          </Link>
          <p className="text-slate-400 mb-6 max-w-xs">
            Building the future of real estate transactions with blockchain technology and smart contracts.
          </p>
          <div className="flex gap-4">
            <a href="#" className="w-10 h-10 bg-slate-800 hover:bg-slate-700 rounded-full flex items-center justify-center transition-colors">
              <Twitter size={18} className="text-slate-400" />
            </a>
            <a href="#" className="w-10 h-10 bg-slate-800 hover:bg-slate-700 rounded-full flex items-center justify-center transition-colors">
              <Linkedin size={18} className="text-slate-400" />
            </a>
            <a href="#" className="w-10 h-10 bg-slate-800 hover:bg-slate-700 rounded-full flex items-center justify-center transition-colors">
              <Github size={18} className="text-slate-400" />
            </a>
          </div>
        </div>

        {/* Links */}
        <div>
          <h4 className="text-white font-semibold mb-4">For Users</h4>
          <ul className="space-y-3">
            {footerLinks.forUsers.map((link) => (
              <li key={link.label}>
                <Link href={link.href} className="text-slate-400 hover:text-white transition-colors text-sm">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="text-white font-semibold mb-4">Landlords</h4>
          <ul className="space-y-3">
            {footerLinks.landlords.map((link) => (
              <li key={link.label}>
                <Link href={link.href} className="text-slate-400 hover:text-white transition-colors text-sm">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="text-white font-semibold mb-4">Company</h4>
          <ul className="space-y-3">
            {footerLinks.company.map((link) => (
              <li key={link.label}>
                <Link href={link.href} className="text-slate-400 hover:text-white transition-colors text-sm">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="text-white font-semibold mb-4">Resources</h4>
          <ul className="space-y-3">
            {footerLinks.resources.map((link) => (
              <li key={link.label}>
                <Link href={link.href} className="text-slate-400 hover:text-white transition-colors text-sm">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Bottom section */}
      <div className="pt-8 border-t border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
        <p className="text-slate-500 text-sm">
          © 2026 Chioma Inc. All rights reserved.
        </p>
        <div className="flex gap-6 text-sm">
          <Link href="#" className="text-slate-400 hover:text-white transition-colors">Privacy Policy</Link>
          <Link href="#" className="text-slate-400 hover:text-white transition-colors">Terms of Service</Link>
        </div>
      </div>
    </div>
  </footer>
);

// Main Page Component
export default function HomePage() {
  return (
    <main className="min-h-screen">
      <Navbar />
      <HeroSection />
      <AudienceSection />
      <StepsSection />
      <SecuritySection />
      <CTABanner />
      <Footer />
    </main>
  );
}
