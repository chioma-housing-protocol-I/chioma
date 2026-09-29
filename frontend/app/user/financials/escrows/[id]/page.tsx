'use client';

import React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  Calendar,
  FileText,
  ShieldCheck,
  Wallet,
  Download,
  AlertTriangle,
  Send,
  Loader2,
  ListFilter,
} from 'lucide-react';
import {
  useDepositStatus,
  useDepositDeductions,
  useRequestDepositRefund,
  useDownloadDepositReceipt,
  useCreateDeposit,
} from '@/lib/query/hooks/use-payments';
import toast from 'react-hot-toast';

const fallbackImage =
  'https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1200&q=80';

export default function EscrowDetailPage() {
  const params = useParams();
  const id =
    typeof params?.id === 'string' ? decodeURIComponent(params.id) : '';

  const { data: deposit, isLoading, error, refetch } = useDepositStatus(id);
  const { data: deductions = [] } = useDepositDeductions(id);

  const createDepositMutation = useCreateDeposit();
  const requestRefundMutation = useRequestDepositRefund();
  const downloadReceiptMutation = useDownloadDepositReceipt();

  const handlePayDeposit = async () => {
    if (!deposit) return;
    try {
      await createDepositMutation.mutateAsync({
        sourcePublicKey: 'GBMOCKSOURCEKEY123456789012345678901234567890123',
        destinationPublicKey: 'GBMOCKDESTKEY123456789012345678901234567890123',
        amount: String(deposit.amount),
        agreementId: deposit.agreementId || undefined,
      });
      toast.success('Deposit payment submitted successfully');
      refetch();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to submit deposit payment',
      );
    }
  };

  const handleRequestRefund = async () => {
    if (!deposit) return;
    try {
      const reason = prompt('Please enter the reason for the refund:');
      if (reason === null) return;
      if (!reason.trim()) {
        toast.error('Refund reason is required');
        return;
      }

      await requestRefundMutation.mutateAsync({
        paymentId: deposit.id,
        amount: deposit.amount,
        reason,
      });
      toast.success('Refund request submitted successfully');
      refetch();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to submit refund request',
      );
    }
  };

  const handleDownloadReceipt = async () => {
    if (!id) return;
    try {
      await downloadReceiptMutation.mutateAsync(id);
      toast.success('Receipt download started');
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to download receipt',
      );
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-blue-200/80 space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-blue-400" />
        <p className="text-sm font-medium">Loading deposit details…</p>
      </div>
    );
  }

  if (error || !deposit) {
    return (
      <div className="space-y-6">
        <Link
          href="/user/financials"
          className="inline-flex items-center gap-2 text-sm font-bold text-blue-300 hover:text-white transition-colors"
        >
          <ArrowLeft size={16} />
          Back to financials
        </Link>
        <div className="rounded-3xl border border-rose-500/20 bg-rose-500/5 p-6 text-center space-y-4 max-w-lg mx-auto">
          <AlertTriangle className="mx-auto text-rose-400" size={40} />
          <h2 className="text-lg font-bold text-white">
            Failed to Load Deposit
          </h2>
          <p className="text-sm text-blue-200/60">
            {error instanceof Error
              ? error.message
              : 'The requested deposit could not be found or loaded.'}
          </p>
        </div>
      </div>
    );
  }

  // Calculations Verification
  const totalAmount = deposit.amount || 0;
  const totalDeductions = deductions.reduce((sum, d) => sum + d.amount, 0);
  const refundedAmount = deposit.refundAmount || 0;
  const netHeldAmount = Math.max(
    0,
    totalAmount - totalDeductions - refundedAmount,
  );

  const metadata = deposit.metadata || {};
  const propertyName =
    deposit.agreement?.property?.title ||
    String(metadata.description || 'Rental Property');
  const typeDisplay = String(metadata.type || 'Security Deposit');
  const dateDisplay = deposit.createdAt
    ? new Date(deposit.createdAt).toLocaleDateString(undefined, {
        dateStyle: 'medium',
      })
    : '—';
  const statusDisplay = deposit.status;

  return (
    <div className="space-y-6">
      <Link
        href="/user/financials"
        className="inline-flex items-center gap-2 text-sm font-bold text-blue-300 hover:text-white transition-colors"
      >
        <ArrowLeft size={16} />
        Back to financials
      </Link>

      <section className="overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-xl">
        <div className="relative min-h-[320px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={fallbackImage}
            alt={`${propertyName} escrow preview`}
            className="absolute inset-0 h-full w-full object-cover"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-slate-950/65" />
          <div className="relative z-10 flex min-h-[320px] flex-col justify-end p-6 sm:p-8">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-400/30 bg-emerald-500/15 text-emerald-300">
              <ShieldCheck size={28} />
            </div>
            <p className="text-xs font-bold uppercase tracking-widest text-blue-200/60">
              {typeDisplay}
            </p>
            <h1 className="mt-2 max-w-3xl text-3xl font-bold tracking-tight text-white sm:text-4xl">
              {propertyName}
            </h1>
          </div>
        </div>

        <div className="grid gap-4 p-6 sm:grid-cols-3 sm:p-8">
          <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
            <div className="mb-3 flex items-center gap-2 text-blue-200/60">
              <Wallet size={16} />
              <span className="text-[10px] font-bold uppercase tracking-widest">
                Amount Held
              </span>
            </div>
            <p className="text-xl font-bold text-white">
              {netHeldAmount > 0
                ? `$${netHeldAmount.toLocaleString()} ${deposit.currency}`
                : 'Awaiting amount'}
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
            <div className="mb-3 flex items-center gap-2 text-blue-200/60">
              <FileText size={16} />
              <span className="text-[10px] font-bold uppercase tracking-widest">
                Status
              </span>
            </div>
            <p className="text-xl font-bold text-white capitalize">
              {statusDisplay}
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
            <div className="mb-3 flex items-center gap-2 text-blue-200/60">
              <Calendar size={16} />
              <span className="text-[10px] font-bold uppercase tracking-widest">
                Date
              </span>
            </div>
            <p className="text-xl font-bold text-white">{dateDisplay}</p>
          </div>
        </div>

        {/* Dynamic Interactive Action Panel */}
        <div className="border-t border-white/10 px-6 py-5 sm:px-8 bg-white/5 flex flex-wrap gap-4 items-center justify-between">
          <div className="flex gap-3 flex-wrap">
            {statusDisplay === 'pending' && (
              <button
                onClick={handlePayDeposit}
                disabled={createDepositMutation.isPending}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md transition-colors disabled:opacity-50 text-xs uppercase tracking-wider"
              >
                {createDepositMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send size={16} />
                )}
                Pay Deposit
              </button>
            )}

            {['completed', 'held', 'pending', 'partial_refund'].includes(
              statusDisplay.toLowerCase(),
            ) &&
              refundedAmount < totalAmount && (
                <button
                  onClick={handleRequestRefund}
                  disabled={requestRefundMutation.isPending}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-white bg-amber-600 hover:bg-amber-700 shadow-md transition-colors disabled:opacity-50 text-xs uppercase tracking-wider"
                >
                  {requestRefundMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <FileText size={16} />
                  )}
                  Request Refund
                </button>
              )}

            {statusDisplay === 'completed' && (
              <button
                onClick={handleDownloadReceipt}
                disabled={downloadReceiptMutation.isPending}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-blue-300 border border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 hover:text-white transition-colors disabled:opacity-50 text-xs uppercase tracking-wider"
              >
                {downloadReceiptMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download size={16} />
                )}
                Download Receipt
              </button>
            )}
          </div>

          <p className="break-all font-mono text-[10px] text-blue-200/50">
            Payment ID: {deposit.id}
          </p>
        </div>

        {/* Calculations Verification / Deductions Section */}
        <div className="border-t border-white/10 p-6 sm:p-8 space-y-6 bg-slate-950/20">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">
            Calculation &amp; Verification Ledger
          </h3>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-3">
              <div className="flex justify-between text-sm text-blue-200/60">
                <span>Original Deposit Amount:</span>
                <span className="font-bold text-white">
                  ${totalAmount.toLocaleString()} USDC
                </span>
              </div>
              <div className="flex justify-between text-sm text-blue-200/60">
                <span>Deductions:</span>
                <span className="font-bold text-rose-400">
                  -${totalDeductions.toLocaleString()} USDC
                </span>
              </div>
              <div className="flex justify-between text-sm text-blue-200/60">
                <span>Refunded Amount:</span>
                <span className="font-bold text-rose-400">
                  -${refundedAmount.toLocaleString()} USDC
                </span>
              </div>
              <div className="border-t border-white/10 pt-3 flex justify-between text-base font-bold text-white">
                <span>Net Verified Held Balance:</span>
                <span className="text-emerald-400">
                  ${netHeldAmount.toLocaleString()} USDC
                </span>
              </div>
            </div>

            <div className="space-y-4 border-t md:border-t-0 md:border-l border-white/10 pt-4 md:pt-0 md:pl-6">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-blue-300/40 uppercase tracking-widest">
                  Deductions Breakdown
                </h4>
                <ListFilter size={14} className="text-blue-300/40" />
              </div>

              {deductions.length === 0 ? (
                <p className="text-xs text-blue-200/40 italic">
                  No deductions applied to this security deposit.
                </p>
              ) : (
                <div className="space-y-2 max-h-36 overflow-y-auto pr-2">
                  {deductions.map((deduction) => (
                    <div
                      key={deduction.id}
                      className="flex justify-between text-xs py-1.5 border-b border-white/5"
                    >
                      <div className="flex flex-col">
                        <span className="font-bold text-white">
                          {deduction.label}
                        </span>
                        {deduction.reason && (
                          <span className="text-[10px] text-blue-200/40 mt-0.5">
                            {deduction.reason}
                          </span>
                        )}
                      </div>
                      <span className="font-bold text-rose-400">
                        -${deduction.amount.toLocaleString()} USDC
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
