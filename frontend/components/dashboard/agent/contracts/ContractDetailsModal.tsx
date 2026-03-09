'use client';

import { useState } from 'react';
import {
  X,
  Download,
  ExternalLink,
  CheckCircle2,
  Clock,
  ShieldAlert,
  Copy,
} from 'lucide-react';
import toast from 'react-hot-toast';
import type { Contract } from '@/types/contracts';
import { ContractTimeline } from './ContractTimeline';

interface ContractDetailsModalProps {
  contract: Contract;
  onClose: () => void;
}

/**
 * Generates a printable HTML document for the contract and triggers
 * the browser's native print dialog, allowing users to save as PDF.
 */
function generateContractPdf(contract: Contract): void {
  const printWindow = window.open('', '_blank', 'width=800,height=900');
  if (!printWindow) {
    toast.error('Please allow pop-ups to download the PDF.');
    return;
  }

  const stageLabel: Record<string, string> = {
    DRAFTED: 'Drafted',
    TENANT_SIGNED: 'Tenant Signed',
    LANDLORD_SIGNED: 'Landlord Signed',
    DEPOSIT_LOCKED: 'Security Deposit Locked',
  };

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <title>Contract ${contract.id} - ${contract.propertyName}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          color: #1a1a1a;
          padding: 48px;
          line-height: 1.6;
          max-width: 800px;
          margin: 0 auto;
        }
        .header {
          text-align: center;
          border-bottom: 3px solid #2563eb;
          padding-bottom: 24px;
          margin-bottom: 32px;
        }
        .header h1 { font-size: 28px; color: #2563eb; margin-bottom: 4px; }
        .header p { color: #666; font-size: 14px; }
        .badge {
          display: inline-block;
          padding: 4px 16px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 700;
          margin-top: 8px;
        }
        .badge-active { background: #dcfce7; color: #166534; }
        .badge-pending { background: #fef3c7; color: #92400e; }
        .badge-expired { background: #f3f4f6; color: #6b7280; }
        .section { margin-bottom: 28px; }
        .section h2 {
          font-size: 16px;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: #2563eb;
          border-bottom: 1px solid #e5e7eb;
          padding-bottom: 8px;
          margin-bottom: 16px;
        }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .field label {
          display: block;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #9ca3af;
          margin-bottom: 4px;
          font-weight: 600;
        }
        .field span { font-size: 15px; font-weight: 600; }
        .terms {
          white-space: pre-wrap;
          font-family: 'Courier New', monospace;
          font-size: 13px;
          line-height: 1.8;
          padding: 24px;
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
        }
        .footer {
          margin-top: 40px;
          padding-top: 16px;
          border-top: 1px solid #e5e7eb;
          text-align: center;
          font-size: 11px;
          color: #9ca3af;
        }
        .timeline {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin: 16px 0;
        }
        .timeline-step {
          text-align: center;
          font-size: 11px;
          font-weight: 600;
        }
        .timeline-step.completed { color: #16a34a; }
        .timeline-step.current { color: #2563eb; }
        .timeline-step.pending { color: #d1d5db; }
        @media print {
          body { padding: 24px; }
          @page { margin: 1cm; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Chioma</h1>
        <p>Smart Lease Agreement &mdash; Powered by Stellar Blockchain</p>
        <span class="badge badge-${contract.status.toLowerCase()}">${contract.status}</span>
      </div>

      <div class="section">
        <h2>Contract Details</h2>
        <div class="grid">
          <div class="field">
            <label>Contract ID</label>
            <span>${contract.id}</span>
          </div>
          <div class="field">
            <label>Property</label>
            <span>${contract.propertyName}</span>
          </div>
          <div class="field">
            <label>Address</label>
            <span>${contract.propertyAddress}</span>
          </div>
          <div class="field">
            <label>Current Stage</label>
            <span>${stageLabel[contract.stage] ?? contract.stage}</span>
          </div>
        </div>
      </div>

      <div class="section">
        <h2>Parties Involved</h2>
        <div class="grid">
          <div class="field">
            <label>Landlord</label>
            <span>${contract.landlord.name}</span>
          </div>
          <div class="field">
            <label>Landlord Wallet</label>
            <span>${contract.landlord.walletAddress}</span>
          </div>
          <div class="field">
            <label>Tenant</label>
            <span>${contract.tenant.name}</span>
          </div>
          <div class="field">
            <label>Tenant Wallet</label>
            <span>${contract.tenant.walletAddress}</span>
          </div>
          <div class="field">
            <label>Agent</label>
            <span>${contract.agent.name}</span>
          </div>
          <div class="field">
            <label>Agent Wallet</label>
            <span>${contract.agent.walletAddress}</span>
          </div>
        </div>
      </div>

      <div class="section">
        <h2>Financial Terms</h2>
        <div class="grid">
          <div class="field">
            <label>Annual Rent</label>
            <span>${contract.rentAmount}</span>
          </div>
          <div class="field">
            <label>Security Deposit</label>
            <span>${contract.securityDeposit}</span>
          </div>
          <div class="field">
            <label>Agent Commission</label>
            <span>${contract.commissionRate}</span>
          </div>
          <div class="field">
            <label>Lease Period</label>
            <span>${new Date(contract.startDate).toLocaleDateString()} &ndash; ${new Date(contract.endDate).toLocaleDateString()}</span>
          </div>
        </div>
      </div>

      ${
        contract.stellarTxHash
          ? `
      <div class="section">
        <h2>Blockchain Record</h2>
        <div class="field">
          <label>Stellar Transaction Hash</label>
          <span style="font-family: monospace; font-size: 13px;">${contract.stellarTxHash}</span>
        </div>
      </div>`
          : ''
      }

      <div class="section">
        <h2>Full Agreement Terms</h2>
        <div class="terms">${contract.terms}</div>
      </div>

      <div class="footer">
        <p>Generated by Chioma Protocol &bull; ${new Date().toLocaleDateString()}</p>
        <p>This document is a human-readable representation of an on-chain agreement on the Stellar network.</p>
      </div>
    </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.onload = () => {
    printWindow.print();
  };
}

export function ContractDetailsModal({
  contract,
  onClose,
}: ContractDetailsModalProps) {
  const [activeTab, setActiveTab] = useState<'details' | 'terms'>('details');

  const handleCopyTxHash = async () => {
    if (!contract.stellarTxHash) return;
    try {
      await navigator.clipboard.writeText(contract.stellarTxHash);
      toast.success('Transaction hash copied!');
    } catch {
      toast.error('Failed to copy to clipboard.');
    }
  };

  const handleDownloadPdf = () => {
    generateContractPdf(contract);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div
        className="absolute inset-0 bg-neutral-900/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative w-full max-w-4xl max-h-[90vh] bg-white rounded-2xl shadow-2xl flex flex-col animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-neutral-100 shrink-0">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-xl font-bold text-neutral-900">
                {contract.propertyName}
              </h2>
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-bold rounded-full border ${
                  contract.status === 'ACTIVE'
                    ? 'bg-green-50 text-green-700 border-green-100'
                    : contract.status === 'PENDING'
                      ? 'bg-amber-50 text-amber-700 border-amber-100'
                      : 'bg-neutral-100 text-neutral-500 border-neutral-200'
                }`}
              >
                {contract.status === 'ACTIVE' && <CheckCircle2 size={12} />}
                {contract.status === 'PENDING' && <Clock size={12} />}
                {contract.status === 'EXPIRED' && <ShieldAlert size={12} />}
                {contract.status}
              </span>
            </div>
            <p className="text-sm text-neutral-500">
              {contract.id} &bull; {contract.propertyAddress}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadPdf}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-brand-blue bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <Download size={16} />
              Download PDF
            </button>
            <button
              onClick={onClose}
              className="p-2 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Timeline Section */}
        <div className="px-6 py-5 border-b border-neutral-100 bg-neutral-50/50">
          <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-4">
            Contract Lifecycle
          </p>
          <ContractTimeline currentStage={contract.stage} />
        </div>

        {/* Tab Navigation */}
        <div className="px-6 pt-4 border-b border-neutral-100 flex gap-6 shrink-0">
          <button
            onClick={() => setActiveTab('details')}
            className={`pb-3 text-sm font-semibold transition-colors border-b-2 ${
              activeTab === 'details'
                ? 'text-brand-blue border-brand-blue'
                : 'text-neutral-400 border-transparent hover:text-neutral-600'
            }`}
          >
            Contract Details
          </button>
          <button
            onClick={() => setActiveTab('terms')}
            className={`pb-3 text-sm font-semibold transition-colors border-b-2 ${
              activeTab === 'terms'
                ? 'text-brand-blue border-brand-blue'
                : 'text-neutral-400 border-transparent hover:text-neutral-600'
            }`}
          >
            Full Agreement
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'details' && (
            <div className="space-y-6">
              {/* Parties */}
              <div>
                <h3 className="text-sm font-bold text-neutral-900 mb-3">
                  Parties Involved
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {[contract.landlord, contract.tenant, contract.agent].map(
                    (party) => (
                      <div
                        key={party.walletAddress}
                        className="p-4 bg-neutral-50 rounded-xl border border-neutral-100"
                      >
                        <span className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1">
                          {party.role}
                        </span>
                        <span className="block text-sm font-bold text-neutral-900 mb-1">
                          {party.name}
                        </span>
                        <span className="block text-xs font-mono text-neutral-500">
                          {party.walletAddress}
                        </span>
                      </div>
                    ),
                  )}
                </div>
              </div>

              {/* Financial Terms */}
              <div>
                <h3 className="text-sm font-bold text-neutral-900 mb-3">
                  Financial Terms
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                    <span className="block text-xs text-blue-500 font-medium mb-1">
                      Annual Rent
                    </span>
                    <span className="text-lg font-bold text-brand-blue">
                      {contract.rentAmount}
                    </span>
                  </div>
                  <div className="p-4 bg-neutral-50 rounded-xl border border-neutral-100">
                    <span className="block text-xs text-neutral-400 font-medium mb-1">
                      Security Deposit
                    </span>
                    <span className="text-lg font-bold text-neutral-800">
                      {contract.securityDeposit}
                    </span>
                  </div>
                  <div className="p-4 bg-neutral-50 rounded-xl border border-neutral-100">
                    <span className="block text-xs text-neutral-400 font-medium mb-1">
                      Commission
                    </span>
                    <span className="text-lg font-bold text-neutral-800">
                      {contract.commissionRate}
                    </span>
                  </div>
                  <div className="p-4 bg-neutral-50 rounded-xl border border-neutral-100">
                    <span className="block text-xs text-neutral-400 font-medium mb-1">
                      Duration
                    </span>
                    <span className="text-sm font-bold text-neutral-800">
                      {new Date(contract.startDate).toLocaleDateString(
                        'en-NG',
                        { month: 'short', year: 'numeric' },
                      )}{' '}
                      &ndash;{' '}
                      {new Date(contract.endDate).toLocaleDateString('en-NG', {
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Blockchain Record */}
              {contract.stellarTxHash && (
                <div>
                  <h3 className="text-sm font-bold text-neutral-900 mb-3">
                    Blockchain Record
                  </h3>
                  <div className="flex items-center gap-3 p-4 bg-neutral-50 rounded-xl border border-neutral-100">
                    <div className="flex-1 min-w-0">
                      <span className="block text-xs text-neutral-400 font-medium mb-1">
                        Stellar Transaction Hash
                      </span>
                      <code className="text-sm font-mono text-neutral-700">
                        {contract.stellarTxHash}
                      </code>
                    </div>
                    <button
                      onClick={handleCopyTxHash}
                      className="p-2 text-neutral-400 hover:text-brand-blue hover:bg-blue-50 rounded-lg transition-colors shrink-0"
                      title="Copy transaction hash"
                    >
                      <Copy size={16} />
                    </button>
                    <a
                      href={`https://stellar.expert/explorer/public/tx/${contract.stellarTxHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 text-neutral-400 hover:text-brand-blue hover:bg-blue-50 rounded-lg transition-colors shrink-0"
                      title="View on Stellar Explorer"
                    >
                      <ExternalLink size={16} />
                    </a>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'terms' && (
            <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-6 font-mono text-sm leading-relaxed text-neutral-700 whitespace-pre-wrap min-h-[300px]">
              {contract.terms}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-neutral-100 bg-neutral-50 flex items-center justify-between shrink-0 rounded-b-2xl">
          <span className="text-xs text-neutral-400">
            Created{' '}
            {new Date(contract.createdAt).toLocaleDateString('en-NG', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-lg font-semibold text-sm text-neutral-600 hover:bg-neutral-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
