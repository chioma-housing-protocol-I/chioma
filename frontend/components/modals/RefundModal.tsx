'use client';

import React, { useState } from 'react';
import { BaseModal } from './BaseModal';
import { DollarSign, AlertCircle, CheckCircle2, FileText } from 'lucide-react';
import toast from 'react-hot-toast';

interface RefundData {
  paymentId: string;
  amount: number;
  reason: string;
  refundMethod: 'original' | 'bank_transfer' | 'crypto';
}

interface RefundModalProps {
  isOpen: boolean;
  onClose: () => void;
  paymentId?: string;
  maxAmount?: number;
  onSubmit?: (data: RefundData) => Promise<void>;
}

export const RefundModal: React.FC<RefundModalProps> = ({
  isOpen,
  onClose,
  paymentId = '',
  maxAmount = 0,
  onSubmit,
}) => {
  const [formData, setFormData] = useState<RefundData>({
    paymentId,
    amount: maxAmount,
    reason: '',
    refundMethod: 'original',
  });
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async () => {
    if (!onSubmit) return;

    if (formData.amount <= 0 || formData.amount > maxAmount) {
      toast.error(`Refund amount must be between $0 and $${maxAmount}`);
      return;
    }

    if (!formData.reason.trim()) {
      toast.error('Please provide a reason for the refund');
      return;
    }

    setIsProcessing(true);
    try {
      await onSubmit(formData);
      toast.success('Refund processed successfully');
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Refund failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleChange = (field: keyof RefundData, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const refundMethods = [
    {
      value: 'original',
      label: 'Original Payment Method',
      description: 'Refund to the original payment source',
    },
    {
      value: 'bank_transfer',
      label: 'Bank Transfer',
      description: 'Direct bank transfer (3-5 business days)',
    },
    {
      value: 'crypto',
      label: 'Cryptocurrency',
      description: 'Refund in Stellar (XLM)',
    },
  ];

  const isPartialRefund = formData.amount < maxAmount;

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Process Refund"
      subtitle="Issue a refund for this payment"
      size="md"
      footer={
        <div className="flex items-center justify-end gap-3 w-full">
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="px-6 py-2.5 rounded-xl font-bold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-white/10 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isProcessing || formData.amount <= 0}
            className="px-6 py-2.5 rounded-xl font-bold text-white bg-red-600 hover:bg-red-700 shadow-md transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {isProcessing ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <CheckCircle2 size={18} />
                Process Refund
              </>
            )}
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Warning Banner */}
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/30 rounded-2xl p-4 flex items-start gap-3">
          <AlertCircle className="text-amber-600 shrink-0 mt-0.5" size={20} />
          <div className="text-sm text-amber-900 dark:text-amber-100">
            <p className="font-semibold mb-1">Important</p>
            <p>
              Refunds are typically processed within 5-10 business days. This
              action cannot be undone once confirmed.
            </p>
          </div>
        </div>

        {/* Refund Amount */}
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/30 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-red-600/10 rounded-xl flex items-center justify-center">
              <DollarSign className="text-red-600" size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
                Refund Amount
              </h3>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                Maximum: ${maxAmount.toLocaleString()}
              </p>
            </div>
          </div>

          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-neutral-500">
              $
            </span>
            <input
              type="number"
              value={formData.amount}
              onChange={(e) =>
                handleChange('amount', parseFloat(e.target.value) || 0)
              }
              className="w-full pl-12 pr-4 py-4 bg-white dark:bg-neutral-800 border-2 border-neutral-200 dark:border-neutral-700 rounded-xl text-3xl font-bold text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-600"
              placeholder="0.00"
              min="0"
              max={maxAmount}
              step="0.01"
            />
          </div>

          {isPartialRefund && (
            <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/30 rounded-lg">
              <p className="text-sm text-blue-900 dark:text-blue-100">
                <span className="font-semibold">Partial Refund:</span> Refunding
                ${formData.amount.toLocaleString()} of $
                {maxAmount.toLocaleString()}
              </p>
            </div>
          )}
        </div>

        {/* Refund Reason */}
        <div>
          <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
            Reason for Refund *
          </label>
          <textarea
            value={formData.reason}
            onChange={(e) => handleChange('reason', e.target.value)}
            rows={4}
            className="w-full px-4 py-3 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-blue resize-none"
            placeholder="Provide a detailed explanation for this refund..."
            maxLength={500}
          />
          <p className="text-xs text-neutral-500 mt-1 text-right">
            {formData.reason.length}/500
          </p>
        </div>

        {/* Refund Method */}
        <div>
          <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-3">
            Refund Method
          </label>
          <div className="space-y-2">
            {refundMethods.map((method) => (
              <label
                key={method.value}
                className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  formData.refundMethod === method.value
                    ? 'border-brand-blue bg-blue-50 dark:bg-blue-900/20'
                    : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600'
                }`}
              >
                <input
                  type="radio"
                  name="refundMethod"
                  value={method.value}
                  checked={formData.refundMethod === method.value}
                  onChange={(e) => handleChange('refundMethod', e.target.value)}
                  className="mt-1 w-4 h-4 text-brand-blue focus:ring-brand-blue"
                />
                <div className="flex-1">
                  <p
                    className={`font-bold ${
                      formData.refundMethod === method.value
                        ? 'text-brand-blue'
                        : 'text-neutral-900 dark:text-white'
                    }`}
                  >
                    {method.label}
                  </p>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">
                    {method.description}
                  </p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Confirmation Notice */}
        <div className="bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <FileText
              className="text-neutral-600 dark:text-neutral-400 shrink-0 mt-0.5"
              size={20}
            />
            <div className="text-sm text-neutral-700 dark:text-neutral-300">
              <p className="font-semibold mb-1">Refund Policy</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>Refunds are processed within 5-10 business days</li>
                <li>The customer will receive an email confirmation</li>
                <li>All refunds are recorded on the blockchain</li>
                <li>This action cannot be reversed once processed</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </BaseModal>
  );
};
