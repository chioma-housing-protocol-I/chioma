'use client';

import React, { useState, useMemo } from 'react';
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
import { useReferrals } from '@/lib/query/hooks/use-referrals';

interface Referral {
  id: string;
  referredName: string;
  status: 'PENDING' | 'COMPLETED' | 'REWARDED' | 'CANCELLED';
  createdAt: string;
  rewardAmount?: number;
}

export default function TenantReferralsPage() {
  const { referralCode, stats, isLoading, isError } = useReferrals();
  const [isCopying, setIsCopying] = useState(false);

  const referralLink = useMemo(() => {
    if (typeof window !== 'undefined' && referralCode)
      return `${window.location.origin}/register?ref=${referralCode}`;
    return '';
  }, [referralCode]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setIsCopying(true);
    toast.success('Copied to clipboard!');
    setTimeout(() => setIsCopying(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="relative">
          <div className="w-14 h-14 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <Sparkles className="text-blue-500 animate-pulse" size={20} />
          </div>
        </div>
        <p className="text-blue-200/50 font-medium animate-pulse">
          Loading your referral rewards...
        </p>
      </div>
    );
  }

  if (isError || !stats || !referralCode) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <p className="text-blue-200/50 font-medium">
          Failed to load referral data. Please try again later.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 to-indigo-900 rounded-3xl p-8 md:p-10 text-white shadow-2xl">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 bg-blue-400/10 rounded-full blur-3xl"></div>
        <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-10">
          <div className="max-w-xl space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/10 backdrop-blur-md rounded-full text-xs font-black uppercase tracking-widest border border-white/10">
              <Sparkles size={14} className="text-yellow-400" />
              Limited Time Offer
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight leading-tight">
              Invite Friends,{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-200 to-white">
                Earn USDC Rewards
              </span>
            </h1>
            <p className="text-lg text-blue-100/80 leading-relaxed">
              Share Chioma with property owners and managers. Earn{' '}
              <span className="text-white font-bold">10 USDC</span> for every
              successful referral.
            </p>
          </div>
          <div className="w-full lg:w-80 bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 flex flex-col items-center text-center space-y-5">
            <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl flex items-center justify-center shadow-xl">
              <Gift size={32} className="text-white" />
            </div>
            <div>
              <p className="text-blue-100/60 font-bold uppercase tracking-widest text-xs mb-1">
                Your Referral Code
              </p>
              <div className="text-2xl font-black text-white tracking-tight uppercase">
                {referralCode}
              </div>
            </div>
            <button
              onClick={() => handleCopy(referralCode ?? '')}
              className="w-full py-3.5 bg-white text-blue-900 rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-blue-50 transition-all active:scale-95"
            >
              {isCopying ? <CheckCircle2 size={18} /> : <Copy size={18} />}
              {isCopying ? 'CODE COPIED' : 'COPY CODE'}
            </button>
          </div>
        </div>
      </div>

      {/* Stats + Share */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
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

          <div className="md:col-span-3 bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl p-6 space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Share2 size={20} className="text-blue-400" />
              Spread the Word
            </h3>
            <div className="flex flex-col md:flex-row gap-3">
              <div className="flex-1 relative">
                <LinkIcon
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-300/30"
                  size={16}
                />
                <input
                  type="text"
                  readOnly
                  value={referralLink}
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-12 py-3 text-sm font-mono text-blue-200/60 focus:outline-none"
                />
                <button
                  onClick={() => handleCopy(referralLink)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-all"
                >
                  <Copy size={14} />
                </button>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => toast.error('Twitter sharing coming soon!')}
                  className="p-3 bg-sky-500 text-white rounded-xl hover:scale-110 active:scale-95 transition-all"
                >
                  <Twitter size={18} />
                </button>
                <button
                  onClick={() => toast.error('Facebook sharing coming soon!')}
                  className="p-3 bg-blue-600 text-white rounded-xl hover:scale-110 active:scale-95 transition-all"
                >
                  <Facebook size={18} />
                </button>
                <button
                  onClick={() => toast.error('LinkedIn sharing coming soon!')}
                  className="p-3 bg-indigo-600 text-white rounded-xl hover:scale-110 active:scale-95 transition-all"
                >
                  <Linkedin size={18} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* How it works */}
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl p-6 space-y-6">
          <h3 className="text-lg font-bold text-white">How it works</h3>
          <div className="space-y-6">
            {[
              {
                n: '01',
                title: 'Share Code',
                desc: 'Invite friends using your unique code or referral link.',
              },
              {
                n: '02',
                title: 'Friend Registers',
                desc: 'They create an account and complete their profile.',
              },
              {
                n: '03',
                title: 'First Transaction',
                desc: 'Once they complete their first asset-based transaction.',
              },
            ].map(({ n, title, desc }) => (
              <div key={n} className="flex gap-4 group">
                <div className="text-2xl font-black text-blue-500/20 group-hover:text-blue-500 transition-colors mt-0.5">
                  {n}
                </div>
                <div>
                  <h4 className="text-white font-bold">{title}</h4>
                  <p className="text-blue-200/40 text-sm leading-relaxed mt-0.5">
                    {desc}
                  </p>
                </div>
              </div>
            ))}
            <div className="pt-4 border-t border-white/5">
              <div className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
                <div className="w-10 h-10 bg-emerald-500/20 text-emerald-400 rounded-xl flex items-center justify-center">
                  <Coins size={20} />
                </div>
                <div>
                  <div className="text-emerald-400 font-black text-xs uppercase tracking-widest">
                    Get Paid
                  </div>
                  <div className="text-white font-bold text-sm">
                    10 USDC credited to your wallet
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* History Table */}
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl overflow-hidden">
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <h3 className="text-xl font-black text-white">Referral History</h3>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-xl border border-white/5 text-xs font-bold text-blue-200/40">
            <Users size={14} />
            {stats.referrals.length} Total
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-white/5">
                {['User Involved', 'Date Joined', 'Status', 'Award'].map(
                  (h) => (
                    <th
                      key={h}
                      className="px-6 py-4 text-xs font-black text-blue-300/30 uppercase tracking-widest last:text-right"
                    >
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {stats.referrals.map((referral) => (
                <tr
                  key={referral.id}
                  className="group hover:bg-white/5 transition-all"
                >
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center font-black text-white text-sm">
                        {referral.referredName.charAt(0)}
                      </div>
                      <span className="font-bold text-white group-hover:text-blue-400 transition-colors">
                        {referral.referredName}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-5 text-blue-200/50 font-medium text-sm">
                    {new Date(referral.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </td>
                  <td className="px-6 py-5">
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                        referral.status === 'REWARDED'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : referral.status === 'PENDING'
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            : referral.status === 'COMPLETED'
                              ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                              : 'bg-white/5 text-blue-300/30 border-white/10'
                      }`}
                    >
                      <div
                        className={`w-1.5 h-1.5 rounded-full ${
                          referral.status === 'REWARDED'
                            ? 'bg-emerald-400'
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
                  <td className="px-6 py-5 text-right">
                    {referral.rewardAmount ? (
                      <span className="text-lg font-black text-white">
                        {referral.rewardAmount}{' '}
                        <span className="text-[10px] font-black text-blue-400 uppercase">
                          USDC
                        </span>
                      </span>
                    ) : (
                      <span className="text-blue-300/20 font-bold">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-5 bg-white/5 flex items-center justify-center group cursor-pointer hover:bg-white/10 transition-all">
          <span className="text-blue-200/30 group-hover:text-white transition-colors flex items-center gap-2 font-black uppercase tracking-widest text-xs">
            Show all referral history
            <ArrowRight
              size={12}
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
    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all">
      <div
        className={`w-10 h-10 ${colors[color]} rounded-xl flex items-center justify-center border mb-4`}
      >
        <Icon size={20} />
      </div>
      <p className="text-blue-300/40 font-black text-xs uppercase tracking-widest mb-1">
        {title}
      </p>
      <div className="flex items-baseline gap-1">
        <span className="text-3xl font-black text-white">{value}</span>
        {unit && (
          <span className="text-xs font-black text-blue-400 uppercase">
            {unit}
          </span>
        )}
      </div>
    </div>
  );
}
