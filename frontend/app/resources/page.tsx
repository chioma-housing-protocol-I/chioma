'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
    BookOpen,
    FileText,
    Video,
    HelpCircle,
    Search,
    ArrowRight,
    Code,
    Zap,
    Shield,
    Users,
    ChevronDown,
    ChevronUp,
    ExternalLink,
} from 'lucide-react';
import Navbar from '@/components/Navbar';

// Resource categories
const categories = [
    {
        id: 'getting-started',
        icon: BookOpen,
        title: 'Getting Started',
        description: 'New to Chioma? Start here.',
        articles: [
            { title: 'Quick Start Guide', readTime: '5 min read' },
            { title: 'Creating Your First Property', readTime: '8 min read' },
            { title: 'Understanding Smart Leases', readTime: '10 min read' },
            { title: 'Setting Up Rent Collection', readTime: '6 min read' },
        ],
        color: 'from-blue-500 to-blue-600',
    },
    {
        id: 'documentation',
        icon: FileText,
        title: 'Documentation',
        description: 'Technical guides and API reference.',
        articles: [
            { title: 'API Reference', readTime: '15 min read' },
            { title: 'Webhook Integration', readTime: '12 min read' },
            { title: 'Smart Contract Specs', readTime: '20 min read' },
            { title: 'Authentication Guide', readTime: '8 min read' },
        ],
        color: 'from-purple-500 to-purple-600',
    },
    {
        id: 'tutorials',
        icon: Video,
        title: 'Video Tutorials',
        description: 'Learn by watching step-by-step guides.',
        articles: [
            { title: 'Platform Walkthrough', readTime: '12 min video' },
            { title: 'Dashboard Deep Dive', readTime: '15 min video' },
            { title: 'Mobile App Features', readTime: '8 min video' },
            { title: 'Advanced Analytics', readTime: '10 min video' },
        ],
        color: 'from-orange-500 to-orange-600',
    },
    {
        id: 'faq',
        icon: HelpCircle,
        title: 'FAQ & Support',
        description: 'Common questions and help center.',
        articles: [
            { title: 'Billing & Payments FAQ', readTime: '3 min read' },
            { title: 'Security & Privacy', readTime: '5 min read' },
            { title: 'Account Management', readTime: '4 min read' },
            { title: 'Contact Support', readTime: '' },
        ],
        color: 'from-emerald-500 to-emerald-600',
    },
];

// FAQ items
const faqItems = [
    {
        question: 'How does Chioma handle security?',
        answer: 'Chioma uses end-to-end encryption and stores all critical data on the Stellar blockchain. We employ industry-leading security practices including SOC 2 compliance, regular security audits, and multi-factor authentication.',
    },
    {
        question: 'What fees does Chioma charge?',
        answer: 'We offer a free tier for up to 2 properties. Our Professional plan is $29/month and includes advanced features. Enterprise pricing is custom based on your needs.',
    },
    {
        question: 'How fast are rent payments processed?',
        answer: 'Rent payments are processed on the Stellar network, which means near-instant settlement. Most payments complete within seconds.',
    },
    {
        question: 'Can I integrate Chioma with my existing tools?',
        answer: 'Yes! We offer integrations with popular property management tools, accounting software, and CRMs. Our REST API also allows custom integrations.',
    },
    {
        question: 'What blockchain does Chioma use?',
        answer: 'Chioma is built on the Stellar network, known for its speed, low transaction costs, and environmental sustainability.',
    },
];

// Quick links
const quickLinks = [
    { icon: Code, label: 'API Reference', href: '#' },
    { icon: Zap, label: 'Quick Start', href: '#' },
    { icon: Shield, label: 'Security Docs', href: '#' },
    { icon: Users, label: 'Community Forum', href: '#' },
];

export default function ResourcesPage() {
    const [searchQuery, setSearchQuery] = useState('');
    const [openFaq, setOpenFaq] = useState<number | null>(0);

    const toggleFaq = (index: number) => {
        setOpenFaq(openFaq === index ? null : index);
    };

    return (
        <div className="min-h-screen bg-white">
            <Navbar />

            {/* Hero Section */}
            <section className="relative pt-24 pb-16 md:pt-32 md:pb-20 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
                <div className="absolute inset-0 opacity-30">
                    <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl" />
                    <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl" />
                </div>

                <div className="container mx-auto px-6 relative z-10">
                    <div className="max-w-3xl mx-auto text-center">
                        <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
                            Resources & Documentation
                        </h1>
                        <p className="text-lg text-slate-300 mb-10">
                            Everything you need to get started, learn, and build with Chioma.
                        </p>

                        {/* Search Bar */}
                        <div className="relative max-w-xl mx-auto">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                            <input
                                type="text"
                                placeholder="Search documentation, tutorials, guides..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-12 pr-4 py-4 rounded-full bg-white/10 border border-white/20 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>

                        {/* Quick Links */}
                        <div className="flex flex-wrap justify-center gap-4 mt-8">
                            {quickLinks.map((link) => {
                                const Icon = link.icon;
                                return (
                                    <Link
                                        key={link.label}
                                        href={link.href}
                                        className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 text-white text-sm font-medium hover:bg-white/20 transition-colors"
                                    >
                                        <Icon size={16} />
                                        {link.label}
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </section>

            {/* Categories Grid */}
            <section className="py-20 bg-slate-50">
                <div className="container mx-auto px-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {categories.map((category) => {
                            const Icon = category.icon;
                            return (
                                <div
                                    key={category.id}
                                    className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300"
                                >
                                    <div className="flex items-start gap-4 mb-6">
                                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${category.color} flex items-center justify-center flex-shrink-0`}>
                                            <Icon size={24} className="text-white" />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold text-slate-900">{category.title}</h3>
                                            <p className="text-slate-500 text-sm">{category.description}</p>
                                        </div>
                                    </div>
                                    <ul className="space-y-3">
                                        {category.articles.map((article) => (
                                            <li key={article.title}>
                                                <Link
                                                    href="#"
                                                    className="flex items-center justify-between group py-2 px-3 -mx-3 rounded-lg hover:bg-slate-50 transition-colors"
                                                >
                                                    <span className="text-slate-700 group-hover:text-blue-600 transition-colors">
                                                        {article.title}
                                                    </span>
                                                    <span className="text-xs text-slate-400">{article.readTime}</span>
                                                </Link>
                                            </li>
                                        ))}
                                    </ul>
                                    <Link
                                        href="#"
                                        className="inline-flex items-center gap-2 mt-4 text-blue-600 font-semibold text-sm hover:gap-3 transition-all"
                                    >
                                        View all articles
                                        <ArrowRight size={14} />
                                    </Link>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* FAQ Section */}
            <section className="py-20 bg-white">
                <div className="container mx-auto px-6">
                    <div className="max-w-3xl mx-auto">
                        <div className="text-center mb-12">
                            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
                                Frequently Asked Questions
                            </h2>
                            <p className="text-slate-600">
                                Can&apos;t find what you&apos;re looking for? Contact our support team.
                            </p>
                        </div>

                        <div className="space-y-4">
                            {faqItems.map((item, index) => (
                                <div
                                    key={index}
                                    className="border border-slate-200 rounded-xl overflow-hidden"
                                >
                                    <button
                                        onClick={() => toggleFaq(index)}
                                        className="w-full flex items-center justify-between p-6 text-left bg-white hover:bg-slate-50 transition-colors"
                                        aria-expanded={openFaq === index}
                                    >
                                        <span className="font-semibold text-slate-900">{item.question}</span>
                                        {openFaq === index ? (
                                            <ChevronUp size={20} className="text-slate-400 flex-shrink-0" />
                                        ) : (
                                            <ChevronDown size={20} className="text-slate-400 flex-shrink-0" />
                                        )}
                                    </button>
                                    {openFaq === index && (
                                        <div className="px-6 pb-6 pt-0">
                                            <p className="text-slate-600 leading-relaxed">{item.answer}</p>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-20 bg-slate-900">
                <div className="container mx-auto px-6">
                    <div className="max-w-3xl mx-auto text-center">
                        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                            Still have questions?
                        </h2>
                        <p className="text-slate-400 mb-8">
                            Our support team is here to help. We&apos;ll get back to you within 24 hours.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <Link
                                href="#"
                                className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-full font-bold transition-all"
                            >
                                Contact Support
                                <ExternalLink size={16} />
                            </Link>
                            <Link
                                href="#"
                                className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white border border-white/20 px-8 py-4 rounded-full font-bold transition-all"
                            >
                                Join Community Forum
                            </Link>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
