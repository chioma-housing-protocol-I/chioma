'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
    Users,
    ArrowRight,
    CheckCircle2,
    DollarSign,
    Clock,
    Shield,
    TrendingUp,
    Building2,
    FileText,
    Zap,
    Star,
} from 'lucide-react';
import Navbar from '@/components/Navbar';

// Stats data
const stats = [
    { value: '$2.5M+', label: 'Commissions Paid' },
    { value: '1,200+', label: 'Agents Active' },
    { value: '48hrs', label: 'Avg. Payout Time' },
    { value: '99.9%', label: 'Uptime' },
];

// Benefits data
const benefits = [
    {
        icon: DollarSign,
        title: 'Instant Commission Payouts',
        description: 'Receive your commission in USDC directly to your Stellar wallet within hours, not weeks.',
        color: 'from-emerald-500 to-emerald-600',
    },
    {
        icon: Shield,
        title: 'Transparent Tracking',
        description: 'Every transaction is recorded on the blockchain. No disputes, no hidden deductions.',
        color: 'from-blue-500 to-blue-600',
    },
    {
        icon: Clock,
        title: 'Real-Time Updates',
        description: 'Track your deals, pending payments, and earnings in real-time on your dashboard.',
        color: 'from-purple-500 to-purple-600',
    },
    {
        icon: TrendingUp,
        title: 'Performance Analytics',
        description: 'Detailed insights into your performance, conversion rates, and earnings growth.',
        color: 'from-orange-500 to-orange-600',
    },
];

// How it works steps
const howItWorks = [
    {
        step: 1,
        title: 'Sign Up & Verify',
        description: 'Create your agent account and complete identity verification to get started.',
        icon: Users,
    },
    {
        step: 2,
        title: 'Connect Listings',
        description: 'Link your property listings and start matching with qualified tenants.',
        icon: Building2,
    },
    {
        step: 3,
        title: 'Close Deals',
        description: 'Facilitate smart lease signings and earn commissions automatically.',
        icon: FileText,
    },
    {
        step: 4,
        title: 'Get Paid Instantly',
        description: 'Receive your earnings in USDC to your Stellar wallet within hours.',
        icon: Zap,
    },
];

// Testimonials
const testimonials = [
    {
        name: 'Sarah Mitchell',
        role: 'Senior Real Estate Agent',
        quote: 'Chioma transformed how I get paid. No more waiting 30 days for commission checks!',
        avatar: 'SM',
    },
    {
        name: 'Michael Chen',
        role: 'Property Consultant',
        quote: 'The transparency is incredible. Zero disputes since I started using Chioma.',
        avatar: 'MC',
    },
    {
        name: 'Jessica Williams',
        role: 'Independent Agent',
        quote: 'Cash flow is everything. Instant payouts have been a game-changer for my business.',
        avatar: 'JW',
    },
];

export default function AgentsPage() {
    const [activeTestimonial, setActiveTestimonial] = useState(0);

    return (
        <div className="min-h-screen bg-white">
            <Navbar />

            {/* Hero Section */}
            <section className="relative pt-24 pb-16 md:pt-32 md:pb-24 overflow-hidden bg-gradient-to-br from-orange-500 via-orange-600 to-red-600">
                <div className="absolute inset-0 opacity-30">
                    <div className="absolute top-0 left-1/4 w-96 h-96 bg-white/20 rounded-full blur-3xl" />
                    <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-white/20 rounded-full blur-3xl" />
                </div>

                <div className="container mx-auto px-6 relative z-10">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                        <div className="max-w-xl">
                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 text-white text-sm font-semibold mb-6">
                                <Users size={16} />
                                <span>For Real Estate Professionals</span>
                            </div>

                            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6">
                                Get Paid{' '}
                                <span className="text-orange-200">Instantly.</span>{' '}
                                <span className="text-white">Zero Disputes.</span>
                            </h1>

                            <p className="text-lg text-orange-100/90 mb-8 leading-relaxed">
                                Join the future of real estate commissions. Receive instant payouts in USDC,
                                track every deal transparently, and never wait for your money again.
                            </p>

                            <div className="flex flex-col sm:flex-row gap-4 mb-8">
                                <Link
                                    href="/signup"
                                    className="group bg-white text-orange-600 hover:bg-orange-50 px-8 py-4 rounded-full font-bold flex items-center justify-center gap-2 transition-all shadow-lg"
                                >
                                    Become a Partner
                                    <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                                </Link>
                                <Link
                                    href="#how-it-works"
                                    className="bg-white/10 hover:bg-white/20 text-white border border-white/30 px-8 py-4 rounded-full font-bold flex items-center justify-center transition-all"
                                >
                                    See How It Works
                                </Link>
                            </div>

                            <div className="flex items-center gap-2 text-orange-100/80 text-sm">
                                <CheckCircle2 size={18} className="text-white" />
                                <span>Zero setup fees • Instant verification • 24/7 support</span>
                            </div>
                        </div>

                        {/* Stats Cards */}
                        <div className="grid grid-cols-2 gap-4">
                            {stats.map((stat) => (
                                <div
                                    key={stat.label}
                                    className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-6 text-center hover:bg-white/20 transition-all hover:-translate-y-1"
                                >
                                    <p className="text-3xl font-bold text-white mb-1">{stat.value}</p>
                                    <p className="text-orange-100 text-sm">{stat.label}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* Benefits Section */}
            <section className="py-20 bg-slate-50">
                <div className="container mx-auto px-6">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
                            Why Agents Choose Chioma
                        </h2>
                        <p className="text-slate-600 max-w-xl mx-auto">
                            Built by agents, for agents. We understand what matters most to your business.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {benefits.map((benefit) => {
                            const Icon = benefit.icon;
                            return (
                                <div
                                    key={benefit.title}
                                    className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-2 border border-slate-100"
                                >
                                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${benefit.color} flex items-center justify-center mb-4`}>
                                        <Icon size={28} className="text-white" />
                                    </div>
                                    <h3 className="text-lg font-bold text-slate-900 mb-2">{benefit.title}</h3>
                                    <p className="text-slate-600 text-sm leading-relaxed">{benefit.description}</p>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* How It Works Section */}
            <section id="how-it-works" className="py-20 bg-white">
                <div className="container mx-auto px-6">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
                            Start Earning in 4 Simple Steps
                        </h2>
                        <p className="text-slate-600 max-w-xl mx-auto">
                            Getting started with Chioma takes minutes, not days.
                        </p>
                    </div>

                    <div className="max-w-4xl mx-auto">
                        <div className="relative">
                            <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-orange-200 hidden md:block" />

                            {howItWorks.map((step) => {
                                const Icon = step.icon;
                                return (
                                    <div key={step.step} className="relative flex gap-6 mb-8 last:mb-0">
                                        <div className="relative z-10 flex-shrink-0 w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center shadow-lg">
                                            <Icon size={28} className="text-white" />
                                        </div>
                                        <div className="pt-3">
                                            <span className="text-orange-600 font-bold text-sm">Step {step.step}</span>
                                            <h3 className="text-xl font-bold text-slate-900 mb-2">{step.title}</h3>
                                            <p className="text-slate-600">{step.description}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </section>

            {/* Testimonials Section */}
            <section className="py-20 bg-slate-900">
                <div className="container mx-auto px-6">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                            Trusted by Top Agents
                        </h2>
                        <p className="text-slate-400 max-w-xl mx-auto">
                            See what real estate professionals are saying about Chioma.
                        </p>
                    </div>

                    <div className="max-w-3xl mx-auto">
                        <div className="bg-slate-800 rounded-3xl p-8 md:p-12 border border-slate-700">
                            <div className="flex gap-1 mb-6">
                                {[...Array(5)].map((_, i) => (
                                    <Star key={i} size={24} className="text-yellow-400 fill-yellow-400" />
                                ))}
                            </div>
                            <blockquote className="text-xl md:text-2xl text-white font-medium mb-8 leading-relaxed">
                                &ldquo;{testimonials[activeTestimonial].quote}&rdquo;
                            </blockquote>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold">
                                        {testimonials[activeTestimonial].avatar}
                                    </div>
                                    <div>
                                        <p className="font-bold text-white">{testimonials[activeTestimonial].name}</p>
                                        <p className="text-slate-400 text-sm">{testimonials[activeTestimonial].role}</p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    {testimonials.map((_, index) => (
                                        <button
                                            key={index}
                                            onClick={() => setActiveTestimonial(index)}
                                            className={`h-3 rounded-full transition-all ${index === activeTestimonial
                                                    ? 'bg-orange-500 w-8'
                                                    : 'bg-slate-600 hover:bg-slate-500 w-3'
                                                }`}
                                            aria-label={`View testimonial ${index + 1}`}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-20 bg-gradient-to-r from-orange-500 to-red-600">
                <div className="container mx-auto px-6 text-center">
                    <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
                        Ready to Transform Your Earnings?
                    </h2>
                    <p className="text-orange-100 mb-10 text-lg max-w-xl mx-auto">
                        Join hundreds of agents already earning faster and smarter with Chioma.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Link
                            href="/signup"
                            className="bg-white text-orange-600 hover:bg-orange-50 px-10 py-4 rounded-full font-bold transition-all shadow-lg"
                        >
                            Get Started Free
                        </Link>
                        <Link
                            href="/resources"
                            className="bg-white/10 text-white border border-white/30 hover:bg-white/20 px-10 py-4 rounded-full font-bold transition-all"
                        >
                            View Documentation
                        </Link>
                    </div>
                </div>
            </section>
        </div>
    );
}
