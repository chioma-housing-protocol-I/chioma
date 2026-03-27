'use client';

import React from 'react';
import { AgentTransaction } from '@/types';
import { ExternalLink, CheckCircle, Clock } from 'lucide-react';

interface TransactionTableProps {
  transactions: AgentTransaction[];
}

const TransactionTable: React.FC<TransactionTableProps> = ({
  transactions,
}) => {
  if (transactions.length === 0) {
    return (
      <div className="bg-white/5 backdrop-blur-sm rounded-3xl p-12 text-center border border-white/10">
        <p className="text-blue-300/60 uppercase tracking-widest font-bold text-xs">
          No transactions found
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white/5 backdrop-blur-sm rounded-3xl overflow-hidden border border-white/10 shadow-xl">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/5">
              <th className="px-6 py-4 text-[10px] font-bold text-blue-300/40 uppercase tracking-widest">
                Date
              </th>
              <th className="px-6 py-4 text-[10px] font-bold text-blue-300/40 uppercase tracking-widest">
                Transaction ID
              </th>
              <th className="px-6 py-4 text-[10px] font-bold text-blue-300/40 uppercase tracking-widest">
                Parties
              </th>
              <th className="px-6 py-4 text-[10px] font-bold text-blue-300/40 uppercase tracking-widest">
                Status
              </th>
              <th className="px-6 py-4 text-[10px] font-bold text-blue-300/40 uppercase tracking-widest text-right">
                Blockchain
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {transactions.map((tx) => (
              <tr
                key={tx.transactionId}
                className="group hover:bg-white/[0.02] transition-colors"
              >
                <td className="px-6 py-4">
                  <p className="text-sm font-medium text-white">
                    {new Date(tx.createdAt).toLocaleDateString()}
                  </p>
                  <p className="text-[10px] text-blue-300/40 font-bold uppercase tracking-tight mt-0.5">
                    {new Date(tx.createdAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </td>
                <td className="px-6 py-4 font-mono text-xs text-blue-200/70">
                  {tx.transactionId.substring(0, 12)}...
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-wrap gap-1">
                    {tx.parties.map((party, idx) => (
                      <span
                        key={idx}
                        className="text-[10px] bg-blue-500/10 text-blue-300 px-2 py-0.5 rounded-full border border-blue-500/20"
                      >
                        {party.substring(0, 6)}...
                        {party.substring(party.length - 4)}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-6 py-4">
                  {tx.completed ? (
                    <div className="flex items-center gap-1.5 text-emerald-400">
                      <CheckCircle size={14} />
                      <span className="text-[10px] font-bold uppercase tracking-widest">
                        Completed
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-amber-400">
                      <Clock size={14} />
                      <span className="text-[10px] font-bold uppercase tracking-widest">
                        Pending
                      </span>
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 text-right">
                  {tx.blockchainHash ? (
                    <a
                      href={`https://stellar.expert/explorer/testnet/tx/${tx.blockchainHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      <span className="text-[10px] font-bold uppercase tracking-widest">
                        View
                      </span>
                      <ExternalLink size={12} />
                    </a>
                  ) : (
                    <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">
                      N/A
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TransactionTable;
