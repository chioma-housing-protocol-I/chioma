'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  Gift,
  Share2,
  Copy,
  CheckCircle2,
  Coins,
  ArrowRight,
  Sparkles,
  Link as LinkIcon,
  Twitter,
  Facebook,
  Linkedin,
} from 'lucide-react';
import toast from 'react-hot-toast';

// Types for referral data
interface Referral {
  id: string;
  referredName: string;
  status: 'PENDING' | 'COMPLETED' | 'REWARDED' | 'CANCELLED';
  createdAt: string;
  rewardAmount?: number;
}

interface ReferralStats {
  totalReferrals: number;
  completedReferrals: number;
  totalRewards: number;
  referrals: Referral[];
  referralCode: string;
}

// Mock data generator
const generateMockReferralStats = (): ReferralStats => {
  return {
    totalReferrals: 12,
    completedReferrals: 8,
    totalRewards: 80,
    referrals: [
      {
        id: '1',
        referredName: 'John Doe',
        status: 'REWARDED',
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        rewardAmount: 10,
      },
      {
        id: '2',
        referredName: 'Jane Smith',
        status: 'REWARDED',
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        rewardAmount: 10,
      },
      {
        id: '3',
        referredName: 'Michael Brown',
        status: 'COMPLETED',
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        rewardAmount: 10,
      },
      {
        id: '4',
        referredName: 'Emily Davis',
        status: 'PENDING',
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: '5',
        referredName: 'Chris Wilson',
        status: 'PENDING',
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ],
    referralCode: 'CHIOMA-TRUST-2024',
  };
};

export default function ReferralDashboard() {
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCopying, setIsCopying] = useState(false);

  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      setStats(generateMockReferralStats());
      setIsLoading(false);
    }, 1500);
  }, []);

  const referralLink = useMemo(() => {
    if (typeof window !== 'undefined' && stats) {
      return `${window.location.origin}/register?ref=${stats.referralCode}`;
    }
    return '';
  }, [stats]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setIsCopying(true);
    toast.success('Copied to clipboard!');
    setTimeout(() => setIsCopying(false), 2000);
  };

  const shareOnTwitter = () => {
    const text = `Join me on Chioma and earn rewards while managing your rental properties! Use my referral code: ${stats?.referralCode} ${referralLink}`;
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`,
      '_blank',
    );
  };

  if (isLoading || !stats) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <Sparkles className="text-blue-500 animate-pulse" size={24} />
          </div>
        </div>
        <p className="text-blue-200/50 font-medium animate-pulse">
          Loading your referral rewards...
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 to-indigo-900 rounded-[40px] p-8 md:p-12 text-white shadow-2xl">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl"></div>

        <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-12">
          <div className="max-w-2xl space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/10 backdrop-blur-md rounded-full text-sm font-black uppercase tracking-widest border border-white/10 shadow-xl">
              <Sparkles size={16} className="text-yellow-400" />
              <span>Limited Time Offer</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-black tracking-tight leading-tight">
              Invite Friends, <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-200 to-white">
                Earn USDC Rewards
              </span>
            </h1>
            <p className="text-xl text-blue-100/80 font-medium leading-relaxed">
              Share your love for Chioma with your fellow property owners and
              managers. Earn{' '}
              <span className="text-white font-bold">10 USDC</span> for every
              successful referral that completes their first transaction.
            </p>
          </div>

          <div className="w-full lg:w-96 bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[32px] p-8 shadow-2xl flex flex-col items-center text-center space-y-6 transform hover:scale-[1.02] transition-transform duration-500">
            <div className="w-20 h-20 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-3xl flex items-center justify-center shadow-2xl shadow-orange-500/20">
              <Gift size={40} className="text-white" />
            </div>
            <div>
              <p className="text-blue-100/60 font-bold uppercase tracking-widest text-xs mb-1">
                Your Referral Code
              </p>
              <div className="text-3xl font-black text-white tracking-tight leading-none uppercase">
                {stats.referralCode}
              </div>
            </div>
            <button
              onClick={() => handleCopy(stats.referralCode)}
              className="w-full py-4 bg-white text-blue-900 rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-blue-50 transition-all active:scale-95 shadow-xl"
            >
              {isCopying ? <CheckCircle2 size={20} /> : <Copy size={20} />}
              <span>{isCopying ? 'CODE COPIED' : 'COPY CODE'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Stats and Sharing Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Statistics Cards */}
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard
            title="Total Referrals"
            value={stats.totalReferrals}
            icon={Users}
            color="blue"
          />
          <StatCard
            title="Converted"
            value={stats.completedReferrals}
            icon={CheckCircle2}
            color="emerald"
          />
          <StatCard
            title="Rewards Earned"
            value={stats.totalRewards}
            icon={Coins}
            unit="USDC"
            color="amber"
          />

          <div className="md:col-span-3 bg-slate-900/50 backdrop-blur-xl border border-white/5 rounded-[32px] p-8 space-y-6">
            <h3 className="text-xl font-bold text-white flex items-center gap-3">
              <Share2 size={24} className="text-blue-400" />
              Spread the Word
            </h3>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
                  <LinkIcon size={18} />
                </div>
                <input
                  type="text"
                  readOnly
                  value={referralLink}
                  className="w-full bg-slate-950/50 border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-sm font-mono text-blue-200/70 focus:outline-none"
                />
                <button
                  onClick={() => handleCopy(referralLink)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-all"
                >
                  <Copy size={16} />
                </button>
              </div>
              <div className="flex gap-2">
                <ShareButton
                  icon={Twitter}
                  color="bg-sky-500"
                  onClick={shareOnTwitter}
                />
                <ShareButton
                  icon={Facebook}
                  color="bg-blue-600"
                  onClick={() => toast.error('Facebook sharing coming soon!')}
                />
                <ShareButton
                  icon={Linkedin}
                  color="bg-indigo-600"
                  onClick={() => toast.error('LinkedIn sharing coming soon!')}
                />
              </div>
            </div>
          </div>
        </div>

        {/* How it works */}
        <div className="bg-slate-900/50 backdrop-blur-xl border border-white/5 rounded-[32px] p-8 space-y-8">
          <h3 className="text-xl font-bold text-white">How it works</h3>
          <div className="space-y-8">
            <Step
              number="01"
              title="Share Code"
              description="Invite friends using your unique code or referral link."
            />
            <Step
              number="02"
              title="Friend Registers"
              description="They create an account and complete their profile."
            />
            <Step
              number="03"
              title="First Transaction"
              description="Once they complete their first asset-based transaction."
            />
            <div className="pt-4 border-t border-white/5">
              <div className="flex items-center gap-4 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
                <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 rounded-xl flex items-center justify-center">
                  <Coins size={24} />
                </div>
                <div>
                  <div className="text-emerald-400 font-black text-sm uppercase tracking-widest">
                    Get Paid
                  </div>
                  <div className="text-white font-bold">
                    10 USDC credited to your wallet
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Referral History Table */}
      <div className="bg-slate-900/30 border border-white/5 rounded-[40px] overflow-hidden backdrop-blur-3xl shadow-2xl">
        <div className="p-8 border-b border-white/10 flex items-center justify-between">
          <h3 className="text-2xl font-black text-white">Referral History</h3>
          <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-xl border border-white/5 text-sm font-bold text-blue-200/50">
            <Users size={16} />
            <span>{stats.referrals.length} Total</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-white/5">
                <th className="px-8 py-5 text-xs font-black text-slate-500 uppercase tracking-widest">
                  User Involved
                </th>
                <th className="px-8 py-5 text-xs font-black text-slate-500 uppercase tracking-widest">
                  Date Joined
                </th>
                <th className="px-8 py-5 text-xs font-black text-slate-500 uppercase tracking-widest">
                  Current Status
                </th>
                <th className="px-8 py-5 text-xs font-black text-slate-500 uppercase tracking-widest text-right">
                  Award
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {stats.referrals.map((referral) => (
                <tr
                  key={referral.id}
                  className="group hover:bg-white/5 transition-all duration-300"
                >
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center font-black text-white shadow-lg">
                        {referral.referredName.charAt(0)}
                      </div>
                      <div className="font-bold text-white group-hover:text-blue-400 transition-colors">
                        {referral.referredName}
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="text-blue-200/60 font-medium">
                      {new Date(referral.createdAt).toLocaleDateString(
                        'en-US',
                        { month: 'short', day: 'numeric', year: 'numeric' },
                      )}
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span
                      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all ${
                        referral.status === 'REWARDED'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : referral.status === 'PENDING'
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            : referral.status === 'COMPLETED'
                              ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                              : 'bg-slate-500/10 text-slate-400 border-slate-500/20'
                      }`}
                    >
                      <div
                        className={`w-1.5 h-1.5 rounded-full ${
                          referral.status === 'REWARDED'
                            ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]'
                            : referral.status === 'PENDING'
                              ? 'bg-amber-400 animate-pulse'
                              : referral.status === 'COMPLETED'
                                ? 'bg-blue-400'
                                : 'bg-slate-400'
                        }`}
                      ></div>
                      {referral.status}
                    </span>
                  </td>
                  <td className="px-8 py-6 text-right">
                    {referral.rewardAmount ? (
                      <div className="flex items-center justify-end gap-1.5">
                        <span className="text-xl font-black text-white">
                          {referral.rewardAmount}
                        </span>
                        <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">
                          USDC
                        </span>
                      </div>
                    ) : (
                      <span className="text-slate-600 font-bold uppercase tracking-widest text-xs">
                        —
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-8 bg-white/5 flex items-center justify-center group cursor-pointer hover:bg-white/10 transition-all">
          <span className="text-blue-200/40 group-hover:text-white transition-colors flex items-center gap-2 font-black uppercase tracking-[0.2em] text-xs">
            Show all referral history
            <ArrowRight
              size={14}
              className="group-hover:translate-x-1 transition-transform"
            />
          </span>
        </div>
      </div>
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  color: 'blue' | 'emerald' | 'amber';
  unit?: string;
}

function StatCard({ title, value, icon: Icon, color, unit }: StatCardProps) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  };

  return (
    <div className="bg-slate-900/50 backdrop-blur-xl border border-white/5 rounded-[32px] p-8 hover:bg-slate-900 transition-all group relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-700"></div>
      <div className="relative z-10 space-y-4">
        <div
          className={`w-12 h-12 ${colors[color]} rounded-2xl flex items-center justify-center border shadow-lg group-hover:scale-110 transition-transform`}
        >
          <Icon size={24} />
        </div>
        <div>
          <p className="text-slate-500 font-black text-xs uppercase tracking-[0.2em] mb-1">
            {title}
          </p>
          <div className="flex items-baseline gap-1.5">
            <span className="text-4xl font-black text-white tabular-nums">
              {value}
            </span>
            {unit && (
              <span className="text-sm font-black text-blue-400 uppercase tracking-widest">
                {unit}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface ShareButtonProps {
  icon: React.ElementType;
  color: string;
  onClick: () => void;
}

function ShareButton({ icon: Icon, color, onClick }: ShareButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`p-4 ${color} text-white rounded-2xl shadow-xl hover:scale-110 active:scale-95 transition-all`}
    >
      <Icon size={20} />
    </button>
  );
}

function Step({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-6 group">
      <div className="text-3xl font-black text-blue-500/20 group-hover:text-blue-500 transition-colors duration-500 mt-1">
        {number}
      </div>
      <div className="space-y-1">
        <h4 className="text-white font-bold text-lg">{title}</h4>
        <p className="text-blue-200/50 text-sm leading-relaxed">
          {description}
        </p>
      </div>
    </div>
  );
}
