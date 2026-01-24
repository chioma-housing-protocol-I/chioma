'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
    Building2,
    ArrowRight,
    CheckCircle2,
    TrendingUp,
    Shield,
    Clock,
    FileText,
    Wallet,
    BarChart3,
    Settings,
} from 'lucide-react';
import Navbar from '@/components/Navbar';

// Features data
const features = [
    {
        icon: Wallet,
        title: 'Automated Rent Collection',
        description: 'Receive rent payments automatically in USDC. No more chasing tenants or handling cash.',
    },
    {
        icon: FileText,
        title: 'Smart Lease Contracts',
        description: 'Digital leases secured by blockchain. Automatically enforce terms and conditions.',
    },
    {
        icon: BarChart3,
        title: 'Real-Time Analytics',
        description: 'Track occupancy, revenue, and property performance with detailed dashboards.',
    },
    {
        icon: Shield,
        title: 'Tenant Verification',
        description: 'Automated background checks and identity verification for all applicants.',
    },
    {
        icon: Clock,
        title: 'Instant Notifications',
        description: 'Get alerted about payments, maintenance requests, and lease renewals instantly.',
    },
    {
        icon: Settings,
        title: 'Property Management',
        description: 'Manage all your properties from a single, intuitive dashboard.',
    },
];

// Pricing tiers
const pricingTiers = [
    {
        name: 'Starter',
        price: 'Free',
        description: 'Perfect for landlords with 1-2 properties',
        features: ['Up to 2 properties', 'Basic analytics', 'Rent collection', 'Email support'],
        cta: 'Get Started',
        popular: false,
    },
    {
        name: 'Professional',
        price: '$29',
        period: '/month',
        description: 'For growing property portfolios',
        features: ['Up to 10 properties', 'Advanced analytics', 'Smart contracts', 'Priority support', 'Tenant screening', 'Maintenance tracking'],
        cta: 'Start Free Trial',
        popular: true,
    },
    {
        name: 'Enterprise',
        price: 'Custom',
        description: 'For property management companies',
        features: ['Unlimited properties', 'Custom integrations', 'Dedicated account manager', 'White-label options', 'API access', 'SLA guarantee'],
        cta: 'Contact Sales',
        popular: false,
    },
];

// Dashboard preview features
const dashboardFeatures = [
    { label: 'Total Revenue', value: '$45,230', trend: '+12.5%' },
    { label: 'Occupancy Rate', value: '87%', trend: '+3%' },
    { label: 'Properties', value: '12', trend: '' },
    { label: 'Pending', value: '2', trend: '' },
];

export default function LandlordsPage() {
    const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');

    return (
        <div className="min-h-screen bg-white">
            <Navbar />

            {/* Hero Section */}
            <section className="relative pt-24 pb-16 md:pt-32 md:pb-24 overflow-hidden bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-700">
                <div className="absolute inset-0 opacity-30">
                    <div className="absolute top-0 left-1/4 w-96 h-96 bg-white/20 rounded-full blur-3xl" />
                    <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-white/20 rounded-full blur-3xl" />
                </div>

                <div className="container mx-auto px-6 relative z-10">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                        <div className="max-w-xl">
                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 text-white text-sm font-semibold mb-6">
                                <Building2 size={16} />
                                <span>For Property Owners</span>
                            </div>

                            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6">
                                Smarter Property{' '}
                                <span className="text-emerald-200">Management.</span>{' '}
                                <span className="text-white">Better Returns.</span>
                            </h1>

                            <p className="text-lg text-emerald-100/90 mb-8 leading-relaxed">
                                Automate rent collection, manage leases with smart contracts, and grow your
                                portfolio with real-time analytics—all powered by blockchain.
                            </p>

                            <div className="flex flex-col sm:flex-row gap-4 mb-8">
                                <Link
                                    href="/landlord/dashboard"
                                    className="group bg-white text-emerald-600 hover:bg-emerald-50 px-8 py-4 rounded-full font-bold flex items-center justify-center gap-2 transition-all shadow-lg"
                                >
                                    View Demo Dashboard
                                    <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                                </Link>
                                <Link
                                    href="#pricing"
                                    className="bg-white/10 hover:bg-white/20 text-white border border-white/30 px-8 py-4 rounded-full font-bold flex items-center justify-center transition-all"
                                >
                                    See Pricing
                                </Link>
                            </div>

                            <div className="flex flex-wrap items-center gap-4 text-emerald-100/80 text-sm">
                                <span className="flex items-center gap-2">
                                    <CheckCircle2 size={16} className="text-white" />
                                    No credit card required
                                </span>
                                <span className="flex items-center gap-2">
                                    <CheckCircle2 size={16} className="text-white" />
                                    14-day free trial
                                </span>
                            </div>
                        </div>

                        {/* Dashboard Preview */}
                        <div className="relative">
                            <div className="bg-white rounded-2xl shadow-2xl p-6 border border-emerald-100">
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="font-bold text-slate-900">Dashboard Preview</h3>
                                    <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full font-semibold">Live Demo</span>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    {dashboardFeatures.map((feature) => (
                                        <div key={feature.label} className="bg-slate-50 rounded-xl p-4">
                                            <p className="text-xs text-slate-500 mb-1">{feature.label}</p>
                                            <div className="flex items-baseline gap-2">
                                                <p className="text-xl font-bold text-slate-900">{feature.value}</p>
                                                {feature.trend && (
                                                    <span className="text-xs text-emerald-600 font-semibold">{feature.trend}</span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <Link
                                    href="/landlord/dashboard"
                                    className="mt-4 w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl font-semibold text-center block transition-colors"
                                >
                                    Explore Full Dashboard →
                                </Link>
                            </div>

                            {/* Floating notification */}
                            <div className="absolute -bottom-4 -left-4 bg-white rounded-xl px-4 py-3 shadow-lg border border-slate-100 animate-float">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
                                        <TrendingUp className="w-4 h-4 text-emerald-600" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-slate-900">Revenue up 23%</p>
                                        <p className="text-xs text-slate-500">This month</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Grid */}
            <section className="py-20 bg-slate-50">
                <div className="container mx-auto px-6">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
                            Everything You Need to Manage Properties
                        </h2>
                        <p className="text-slate-600 max-w-xl mx-auto">
                            Streamline operations, maximize returns, and scale your portfolio with confidence.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {features.map((feature) => {
                            const Icon = feature.icon;
                            return (
                                <div
                                    key={feature.title}
                                    className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
                                >
                                    <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center mb-4">
                                        <Icon size={24} className="text-emerald-600" />
                                    </div>
                                    <h3 className="text-lg font-bold text-slate-900 mb-2">{feature.title}</h3>
                                    <p className="text-slate-600 text-sm leading-relaxed">{feature.description}</p>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* Pricing Section */}
            <section id="pricing" className="py-20 bg-white">
                <div className="container mx-auto px-6">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
                            Simple, Transparent Pricing
                        </h2>
                        <p className="text-slate-600 max-w-xl mx-auto mb-8">
                            Start free and scale as your portfolio grows. No hidden fees.
                        </p>

                        {/* Billing Toggle */}
                        <div className="inline-flex items-center bg-slate-100 rounded-full p-1">
                            <button
                                onClick={() => setBillingPeriod('monthly')}
                                className={`px-6 py-2 rounded-full text-sm font-semibold transition-all ${billingPeriod === 'monthly'
                                        ? 'bg-white text-slate-900 shadow-sm'
                                        : 'text-slate-600 hover:text-slate-900'
                                    }`}
                            >
                                Monthly
                            </button>
                            <button
                                onClick={() => setBillingPeriod('yearly')}
                                className={`px-6 py-2 rounded-full text-sm font-semibold transition-all ${billingPeriod === 'yearly'
                                        ? 'bg-white text-slate-900 shadow-sm'
                                        : 'text-slate-600 hover:text-slate-900'
                                    }`}
                            >
                                Yearly <span className="text-emerald-600 ml-1">-20%</span>
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                        {pricingTiers.map((tier) => (
                            <div
                                key={tier.name}
                                className={`relative rounded-2xl p-8 ${tier.popular
                                        ? 'bg-emerald-600 text-white scale-105 shadow-2xl'
                                        : 'bg-white border border-slate-200 shadow-sm'
                                    }`}
                            >
                                {tier.popular && (
                                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-orange-500 text-white text-xs font-bold px-4 py-1 rounded-full">
                                        Most Popular
                                    </span>
                                )}
                                <h3 className={`text-xl font-bold mb-2 ${tier.popular ? 'text-white' : 'text-slate-900'}`}>
                                    {tier.name}
                                </h3>
                                <div className="mb-4">
                                    <span className={`text-4xl font-bold ${tier.popular ? 'text-white' : 'text-slate-900'}`}>
                                        {tier.price === 'Free' || tier.price === 'Custom'
                                            ? tier.price
                                            : billingPeriod === 'yearly'
                                                ? `$${Math.round(parseInt(tier.price.slice(1)) * 0.8)}`
                                                : tier.price}
                                    </span>
                                    {tier.period && (
                                        <span className={tier.popular ? 'text-emerald-100' : 'text-slate-500'}>
                                            {tier.period}
                                        </span>
                                    )}
                                </div>
                                <p className={`mb-6 text-sm ${tier.popular ? 'text-emerald-100' : 'text-slate-600'}`}>
                                    {tier.description}
                                </p>
                                <ul className="space-y-3 mb-8">
                                    {tier.features.map((feature) => (
                                        <li key={feature} className="flex items-center gap-2 text-sm">
                                            <CheckCircle2 size={16} className={tier.popular ? 'text-emerald-200' : 'text-emerald-600'} />
                                            <span className={tier.popular ? 'text-white' : 'text-slate-700'}>{feature}</span>
                                        </li>
                                    ))}
                                </ul>
                                <Link
                                    href={tier.name === 'Enterprise' ? '#' : '/signup'}
                                    className={`block w-full py-3 rounded-xl font-semibold text-center transition-all ${tier.popular
                                            ? 'bg-white text-emerald-600 hover:bg-emerald-50'
                                            : 'bg-emerald-600 text-white hover:bg-emerald-700'
                                        }`}
                                >
                                    {tier.cta}
                                </Link>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-20 bg-gradient-to-r from-emerald-600 to-teal-700">
                <div className="container mx-auto px-6 text-center">
                    <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
                        Start Managing Smarter Today
                    </h2>
                    <p className="text-emerald-100 mb-10 text-lg max-w-xl mx-auto">
                        Join thousands of landlords who are growing their portfolios with Chioma.
                    </p>
                    <Link
                        href="/landlord/dashboard"
                        className="inline-flex items-center gap-2 bg-white text-emerald-600 hover:bg-emerald-50 px-10 py-4 rounded-full font-bold transition-all shadow-lg"
                    >
                        Try the Dashboard
                        <ArrowRight size={18} />
                    </Link>
                </div>
            </section>
        </div>
    );
}
