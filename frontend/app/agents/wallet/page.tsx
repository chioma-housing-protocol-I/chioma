'use client';

import React, { useState } from 'react';
import DashboardLayout from '@/components/dashboard/agent/DashboardLayout';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { StellarLogo } from '@/components/icons/StellarLogo';
import { requestAccess, setAllowed } from '@stellar/freighter-api';
import { 
  ArrowUpRight, 
  ArrowDownLeft, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Wallet, 
  RefreshCw,
  X 
} from 'lucide-react';

// Mock Transaction History
const mockTransactions = [
  {
    id: 'TXN-9842',
    title: 'Commission - Highland Apt',
    type: 'earning',
    status: 'completed',
    date: '2024-03-24',
    amount: 1200,
    currency: 'USDC',
  },
  {
    id: 'TXN-9841',
    title: 'Withdrawal to External Wallet',
    type: 'withdrawal',
    status: 'pending',
    date: '2024-03-23',
    amount: 500,
    currency: 'USDC',
  },
  {
    id: 'TXN-9839',
    title: 'Listing Fee - Sunset Villa',
    type: 'fee',
    status: 'completed',
    date: '2024-03-22',
    amount: 50,
    currency: 'USDC',
  },
  {
    id: 'TXN-9837',
    title: 'Commission - Lake House',
    type: 'earning',
    status: 'completed',
    date: '2024-03-20',
    amount: 850,
    currency: 'USDC',
  },
  {
    id: 'TXN-9820',
    title: 'Withdrawal to Anchor (Fiat)',
    type: 'withdrawal',
    status: 'completed',
    date: '2024-03-15',
    amount: 2000,
    currency: 'USDC',
  },
];

export default function AgentWalletPage() {
  const [preferredAsset, setPreferredAsset] = useState('USDC');
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawAddress, setWithdrawAddress] = useState('');
  const [walletStatus, setWalletStatus] = useState<string | null>(null);

  // Stats
  const availableBalance = 12450.00;
  const pendingBalance = 500.00;
  const totalEarned = 45800.00;

  const handleStellarConnect = async () => {
    try {
      setIsProcessing(true);
      await setAllowed();
      const access = await requestAccess();
      if (access) {
        setWalletStatus('Connected to Freighter!');
        setTimeout(() => setWalletStatus(null), 3000);
      }
    } catch (error) {
      console.error(error);
      setWalletStatus('Failed to connect to Freighter.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!withdrawAmount || !withdrawAddress) return;
    
    // Simulating Freighter Wallet transaction initiation
    try {
      setIsProcessing(true);
      setWalletStatus('Initiating transfer with Stellar SDK...');
      
      // Real implementation would invoke:
      // const tx = buildTransaction(...);
      // const signedTx = await signTransaction(tx.toXDR(), { network: 'TESTNET' });
      // await server.submitTransaction(signedTx);
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setWalletStatus('Withdrawal request successfully queued!');
      setTimeout(() => {
        setIsWithdrawModalOpen(false);
        setWalletStatus(null);
        setWithdrawAmount('');
        setWithdrawAddress('');
      }, 2000);
    } catch (error) {
      setWalletStatus('Transaction failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="max-w-7xl mx-auto space-y-8">
          
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-neutral-900">Wallet & Earnings</h1>
              <p className="text-sm text-neutral-500 mt-1">
                Manage your commissions, payouts, and Stellar assets.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="bg-white border border-neutral-200 rounded-lg px-3 py-2 flex items-center text-sm">
                <span className="text-neutral-500 mr-2">Asset:</span>
                <select 
                  className="bg-transparent border-none outline-none font-semibold text-neutral-900 cursor-pointer"
                  value={preferredAsset}
                  onChange={(e) => setPreferredAsset(e.target.value)}
                >
                  <option value="USDC">USDC (Stellar)</option>
                  <option value="XLM">XLM (Lumens)</option>
                  <option value="NGN">NGN (Anchor)</option>
                </select>
              </div>
              <button 
                onClick={handleStellarConnect}
                className="flex items-center gap-2 bg-neutral-900 hover:bg-neutral-800 text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors"
              >
                <Wallet size={16} />
                <span>Connect Wallet</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Main Balance Card */}
            <div className="md:col-span-2 bg-linear-to-br from-brand-blue to-blue-600 rounded-2xl p-8 text-white shadow-lg shadow-blue-500/20 relative overflow-hidden flex flex-col justify-between">
              {/* Decorative backgrounds */}
              <div className="absolute top-0 right-0 -mr-8 -mt-8 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute bottom-0 left-0 -ml-8 -mb-8 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
              
              <div className="relative z-10 flex justify-between items-start mb-12">
                <div>
                  <span className="text-blue-100 text-sm font-medium uppercase tracking-wider block mb-2">
                    Available Balance
                  </span>
                  <h2 className="text-5xl font-bold tracking-tight">
                    {preferredAsset === 'XLM' 
                      ? (availableBalance * 8.5).toLocaleString() 
                      : availableBalance.toLocaleString()
                    }
                    <span className="text-2xl font-medium text-blue-100 ml-2">{preferredAsset}</span>
                  </h2>
                </div>
                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-md">
                  <StellarLogo size={28} color="white" />
                </div>
              </div>
              
              <div className="relative z-10 grid grid-cols-2 gap-4">
                <button 
                  onClick={() => setIsWithdrawModalOpen(true)}
                  className="flex items-center justify-center gap-2 py-3 px-6 rounded-xl bg-white text-brand-blue hover:bg-neutral-50 font-bold transition-colors shadow-sm"
                >
                  <ArrowUpRight size={18} />
                  <span>Withdraw Funds</span>
                </button>
                <button className="flex items-center justify-center gap-2 py-3 px-6 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white font-bold transition-colors">
                  <RefreshCw size={18} />
                  <span>On/Off Ramp</span>
                </button>
              </div>
            </div>

            {/* Smaller Stat Cards */}
            <div className="space-y-6 flex flex-col justify-between">
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-neutral-100 flex-1">
                <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center mb-4">
                  <Clock size={20} />
                </div>
                <span className="text-neutral-500 text-sm font-medium block mb-1">Pending Payouts</span>
                <h3 className="text-2xl font-bold text-neutral-900">
                  {preferredAsset === 'XLM' 
                    ? (pendingBalance * 8.5).toLocaleString() 
                    : pendingBalance.toLocaleString()
                  } <span className="text-base font-medium text-neutral-400">{preferredAsset}</span>
                </h3>
              </div>
              
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-neutral-100 flex-1">
                <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center mb-4">
                  <CheckCircle2 size={20} />
                </div>
                <span className="text-neutral-500 text-sm font-medium block mb-1">Total Earned (All Time)</span>
                <h3 className="text-2xl font-bold text-neutral-900">
                  {preferredAsset === 'XLM' 
                    ? (totalEarned * 8.5).toLocaleString() 
                    : totalEarned.toLocaleString()
                  } <span className="text-base font-medium text-neutral-400">{preferredAsset}</span>
                </h3>
              </div>
            </div>
          </div>

          {/* Transaction History */}
          <div className="bg-white rounded-2xl shadow-sm border border-neutral-100 overflow-hidden">
            <div className="p-6 border-b border-neutral-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-neutral-900">Transaction History</h3>
              <button className="text-brand-blue text-sm font-medium hover:underline">View All</button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-neutral-50/50 text-neutral-500 text-xs uppercase tracking-wider">
                    <th className="px-6 py-4 font-semibold">Transaction</th>
                    <th className="px-6 py-4 font-semibold">Date</th>
                    <th className="px-6 py-4 font-semibold">Type</th>
                    <th className="px-6 py-4 font-semibold">Status</th>
                    <th className="px-6 py-4 font-semibold text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {mockTransactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-neutral-50/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                            tx.type === 'earning' ? 'bg-emerald-50 text-emerald-600' :
                            tx.type === 'withdrawal' ? 'bg-blue-50 text-blue-600' :
                            'bg-red-50 text-red-600'
                          }`}>
                            {tx.type === 'earning' && <ArrowDownLeft size={16} />}
                            {tx.type === 'withdrawal' && <ArrowUpRight size={16} />}
                            {tx.type === 'fee' && <AlertCircle size={16} />}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-neutral-900">{tx.title}</p>
                            <p className="text-xs text-neutral-500">{tx.id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-neutral-600 font-medium">
                        {tx.date}
                      </td>
                      <td className="px-6 py-4">
                        <span className="capitalize text-sm text-neutral-600">{tx.type}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                          tx.status === 'completed' ? 'bg-emerald-50 text-emerald-600' :
                          tx.status === 'pending' ? 'bg-amber-50 text-amber-600' :
                          'bg-red-50 text-red-600'
                        }`}>
                          {tx.status === 'completed' && <CheckCircle2 size={12} />}
                          {tx.status === 'pending' && <Clock size={12} />}
                          {tx.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className={`text-sm font-bold ${
                          tx.type === 'earning' ? 'text-emerald-600' : 'text-neutral-900'
                        }`}>
                          {tx.type === 'earning' ? '+' : '-'}${tx.amount.toLocaleString()} 
                          <span className="text-xs font-medium ml-1 text-neutral-500">{tx.currency}</span>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {mockTransactions.length === 0 && (
              <div className="p-8 text-center text-neutral-500">
                <p>No transactions found.</p>
              </div>
            )}
          </div>
          
        </div>

        {/* Withdraw Modal */}
        {isWithdrawModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
              <button 
                onClick={() => setIsWithdrawModalOpen(false)}
                className="absolute top-4 right-4 p-2 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
              
              <div className="p-6 sm:p-8">
                <div className="w-12 h-12 bg-blue-50 text-brand-blue rounded-xl flex items-center justify-center mb-6">
                  <ArrowUpRight size={24} />
                </div>
                
                <h2 className="text-2xl font-bold text-neutral-900 mb-2">Withdraw Funds</h2>
                <p className="text-sm text-neutral-500 mb-6">
                  Transfer your earnings to an external Stellar wallet or Anchor.
                </p>

                {walletStatus && (
                  <div className="mb-4 p-3 bg-neutral-50 border border-neutral-100 rounded-lg text-sm font-medium text-brand-blue flex items-center justify-center">
                    {walletStatus}
                  </div>
                )}

                <form onSubmit={handleWithdraw} className="space-y-5">
                  <div>
                    <label className="block text-sm font-extrabold text-neutral-700 mb-1.5">Amount (in {preferredAsset})</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <span className="text-neutral-400 font-bold">$</span>
                      </div>
                      <input 
                        type="number" 
                        required
                        value={withdrawAmount}
                        onChange={(e) => setWithdrawAmount(e.target.value)}
                        placeholder="0.00"
                        className="w-full pl-8 pr-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl outline-none focus:border-brand-blue/50 focus:ring-4 focus:ring-brand-blue/5 transition-all text-neutral-900 font-medium"
                      />
                      <button 
                        type="button"
                        onClick={() => setWithdrawAmount(availableBalance.toString())}
                        className="absolute inset-y-0 right-2 my-auto h-8 px-3 text-xs font-bold text-brand-blue hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        Max
                      </button>
                    </div>
                    <p className="text-xs text-neutral-500 mt-2 font-medium">
                      Available: {availableBalance.toLocaleString()} {preferredAsset}
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-extrabold text-neutral-700 mb-1.5">Destination Address</label>
                    <input 
                      type="text" 
                      required
                      value={withdrawAddress}
                      onChange={(e) => setWithdrawAddress(e.target.value)}
                      placeholder="G... (Stellar Public Key)"
                      className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl outline-none focus:border-brand-blue/50 focus:ring-4 focus:ring-brand-blue/5 transition-all text-neutral-900 font-medium"
                    />
                  </div>

                  <button 
                    type="submit"
                    disabled={isProcessing}
                    className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-brand-blue hover:bg-blue-700 text-white font-bold transition-all shadow-lg shadow-blue-500/20 disabled:opacity-70 disabled:cursor-not-allowed mt-2"
                  >
                    {isProcessing ? (
                      <RefreshCw size={18} className="animate-spin" />
                    ) : (
                      <ArrowUpRight size={18} />
                    )}
                    <span>{isProcessing ? 'Processing...' : 'Confirm Withdrawal'}</span>
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}
        
      </DashboardLayout>
    </ProtectedRoute>
  );
}
