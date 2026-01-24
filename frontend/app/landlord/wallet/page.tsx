'use client';

import React, { useState } from 'react';
import {
    Wallet,
    ArrowUpRight,
    ArrowDownLeft,
    Copy,
    ExternalLink,
    TrendingUp,
    Clock,
    CheckCircle,
    RefreshCw
} from 'lucide-react';

// Mock wallet data
const walletData = {
    address: 'GDQP2KPQGKIHYJGXNUIYOMHARUARCA7DJT5FO2FFOOUJ3BUWJ5C....',
    fullAddress: 'GDQP2KPQGKIHYJGXNUIYOMHARUARCA7DJT5FO2FFOOUJ3BUWJ5CWHV3',
    balance: {
        xlm: '2,450.50',
        usd: '892.35',
    },
    pendingPayments: 3,
    totalReceived: '$45,230',
};

const transactions = [
    {
        id: '1',
        type: 'received',
        title: 'Rent Payment',
        description: 'From John Smith - Unit 4B',
        amount: '+$1,200',
        xlmAmount: '+342.86 XLM',
        date: 'Today, 2:30 PM',
        status: 'completed',
    },
    {
        id: '2',
        type: 'received',
        title: 'Rent Payment',
        description: 'From Emily Davis - Cedar Lane',
        amount: '+$2,200',
        xlmAmount: '+628.57 XLM',
        date: 'Jan 22, 2025',
        status: 'completed',
    },
    {
        id: '3',
        type: 'sent',
        title: 'Withdrawal',
        description: 'To Bank Account',
        amount: '-$5,000',
        xlmAmount: '-1,428.57 XLM',
        date: 'Jan 20, 2025',
        status: 'completed',
    },
    {
        id: '4',
        type: 'received',
        title: 'Rent Payment',
        description: 'From Michael Chen - Pine Road',
        amount: '+$1,800',
        xlmAmount: '+514.29 XLM',
        date: 'Jan 18, 2025',
        status: 'completed',
    },
    {
        id: '5',
        type: 'received',
        title: 'Rent Payment',
        description: 'From Sarah Johnson - Elm Street',
        amount: '+$1,100',
        xlmAmount: '+314.29 XLM',
        date: 'Jan 15, 2025',
        status: 'pending',
    },
];

export default function WalletPage() {
    const [copied, setCopied] = useState(false);

    const copyAddress = () => {
        navigator.clipboard.writeText(walletData.fullAddress);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-neutral-900 dark:text-white">
                    Stellar Wallet
                </h1>
                <p className="text-neutral-500 dark:text-neutral-400 mt-1">
                    Manage your crypto payments and transactions
                </p>
            </div>

            {/* Wallet Card */}
            <div className="bg-gradient-to-br from-brand-blue via-blue-600 to-indigo-700 rounded-2xl p-6 md:p-8 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />

                <div className="relative">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                            <Wallet size={24} />
                        </div>
                        <div>
                            <p className="text-white/70 text-sm">Wallet Address</p>
                            <div className="flex items-center gap-2">
                                <code className="text-sm font-mono">{walletData.address}</code>
                                <button
                                    onClick={copyAddress}
                                    className="p-1 hover:bg-white/10 rounded transition-colors"
                                    aria-label="Copy address"
                                >
                                    {copied ? <CheckCircle size={16} /> : <Copy size={16} />}
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="mb-6">
                        <p className="text-white/70 text-sm mb-1">Available Balance</p>
                        <div className="flex items-baseline gap-3">
                            <span className="text-4xl md:text-5xl font-bold">{walletData.balance.xlm} XLM</span>
                            <span className="text-white/70">≈ ${walletData.balance.usd} USD</span>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-3">
                        <button className="flex items-center gap-2 bg-white text-brand-blue px-6 py-3 rounded-xl font-semibold hover:bg-white/90 transition-colors">
                            <ArrowUpRight size={18} />
                            Withdraw
                        </button>
                        <button className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-6 py-3 rounded-xl font-semibold transition-colors">
                            <RefreshCw size={18} />
                            Exchange
                        </button>
                        <a
                            href="#"
                            className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-4 py-3 rounded-xl font-semibold transition-colors"
                        >
                            <ExternalLink size={18} />
                            View on Stellar
                        </a>
                    </div>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-neutral-800 rounded-xl p-4 border border-neutral-200 dark:border-neutral-700">
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">Total Received</p>
                    <p className="text-2xl font-bold text-emerald-600 mt-1">{walletData.totalReceived}</p>
                </div>
                <div className="bg-white dark:bg-neutral-800 rounded-xl p-4 border border-neutral-200 dark:border-neutral-700">
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">Pending Payments</p>
                    <p className="text-2xl font-bold text-amber-600 mt-1">{walletData.pendingPayments}</p>
                </div>
                <div className="bg-white dark:bg-neutral-800 rounded-xl p-4 border border-neutral-200 dark:border-neutral-700">
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">XLM Price</p>
                    <p className="text-2xl font-bold text-neutral-900 dark:text-white mt-1">$0.364</p>
                </div>
                <div className="bg-white dark:bg-neutral-800 rounded-xl p-4 border border-neutral-200 dark:border-neutral-700">
                    <div className="flex items-center gap-2">
                        <p className="text-sm text-neutral-500 dark:text-neutral-400">24h Change</p>
                        <span className="flex items-center text-emerald-600 text-xs font-semibold">
                            <TrendingUp size={12} />
                            +2.4%
                        </span>
                    </div>
                    <p className="text-2xl font-bold text-emerald-600 mt-1">+$21.45</p>
                </div>
            </div>

            {/* Transactions */}
            <div className="bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-200 dark:border-neutral-700">
                <div className="px-6 py-4 border-b border-neutral-100 dark:border-neutral-700">
                    <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">Recent Transactions</h2>
                </div>
                <div className="divide-y divide-neutral-100 dark:divide-neutral-700">
                    {transactions.map((tx) => (
                        <div key={tx.id} className="px-6 py-4 flex items-center gap-4 hover:bg-neutral-50 dark:hover:bg-neutral-700/30 transition-colors">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${tx.type === 'received'
                                    ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'
                                    : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                                }`}>
                                {tx.type === 'received' ? <ArrowDownLeft size={20} /> : <ArrowUpRight size={20} />}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-medium text-neutral-900 dark:text-white">{tx.title}</p>
                                <p className="text-sm text-neutral-500 dark:text-neutral-400 truncate">{tx.description}</p>
                            </div>
                            <div className="text-right">
                                <p className={`font-semibold ${tx.type === 'received' ? 'text-emerald-600' : 'text-red-600'}`}>
                                    {tx.amount}
                                </p>
                                <p className="text-xs text-neutral-500">{tx.date}</p>
                            </div>
                            {tx.status === 'pending' && (
                                <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-100 dark:bg-amber-900/30 px-2 py-1 rounded-full">
                                    <Clock size={12} />
                                    Pending
                                </span>
                            )}
                        </div>
                    ))}
                </div>
                <div className="px-6 py-4 border-t border-neutral-100 dark:border-neutral-700">
                    <button className="text-brand-blue font-semibold text-sm hover:underline">
                        View All Transactions →
                    </button>
                </div>
            </div>
        </div>
    );
}
