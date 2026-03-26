'use client';

import React, { useState } from 'react';
import { BaseModal } from './BaseModal';
import {
  CreditCard,
  DollarSign,
  Calendar,
  Building,
  CheckCircle2,
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

interface PaymentData {
  agreementId: string;
  amount: number;
  paymentMethod: 'card' | 'bank_transfer' | 'crypto';
  dueDate?: string;
  description?: string;
}

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  agreementId?: string;
  amount?: number;
  dueDate?: string;
  onSubmit?: (data: PaymentData) => Promise<void>;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  agreementId = '',
  amount = 0,
  dueDate,
  onSubmit,
}) => {
  const [formData, setFormData] = useState<PaymentData>({
    agreementId,
    amount,
    paymentMethod: 'card',
    dueDate,
    description: '',
  });
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async () => {
    if (!onSubmit) return;

    if (formData.amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    setIsProcessing(true);
    try {
      await onSubmit(formData);
      toast.success('Payment processed successfully');
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Payment failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleChange = (field: keyof PaymentData, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const paymentMethods = [
    {
      value: 'card',
      label: 'Credit/Debit Card',
      icon: CreditCard,
      description: 'Instant payment via card',
    },
    {
      value: 'bank_transfer',
      label: 'Bank Transfer',
      icon: Building,
      description: '1-3 business days',
    },
    {
      value: 'crypto',
      label: 'Cryptocurrency',
      icon: DollarSign,
      description: 'Pay with Stellar (XLM)',
    },
  ];

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Make Payment"
      subtitle="Complete your rent payment securely"
      size="md"
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="text-left">
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Total Amount
            </p>
            <p className="text-2xl font-black text-brand-blue">
              ${formData.amount.toLocaleString()}
            </p>
          </div>
          <div className="flex items-center gap-3">
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
              className="px-6 py-2.5 rounded-xl font-bold text-white bg-brand-blue hover:bg-blue-700 shadow-md transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {isProcessing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle2 size={18} />
                  Pay Now
                </>
              )}
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Payment Amount */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/30 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-brand-blue/10 rounded-xl flex items-center justify-center">
              <DollarSign className="text-brand-blue" size={20} />
            </div>
            <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
              Payment Amount
            </h3>
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
              className="w-full pl-12 pr-4 py-4 bg-white dark:bg-neutral-800 border-2 border-neutral-200 dark:border-neutral-700 rounded-xl text-3xl font-bold text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-blue"
              placeholder="0.00"
              min="0"
              step="0.01"
            />
          </div>

          {formData.dueDate && (
            <div className="mt-4 flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
              <Calendar size={16} />
              <span>
                Due: {format(new Date(formData.dueDate), 'MMMM d, yyyy')}
              </span>
            </div>
          )}
        </div>

        {/* Payment Method Selection */}
        <div>
          <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-3">
            Payment Method
          </label>
          <div className="space-y-3">
            {paymentMethods.map((method) => {
              const Icon = method.icon;
              const isSelected = formData.paymentMethod === method.value;

              return (
                <button
                  key={method.value}
                  onClick={() => handleChange('paymentMethod', method.value)}
                  className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                    isSelected
                      ? 'border-brand-blue bg-blue-50 dark:bg-blue-900/20'
                      : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        isSelected
                          ? 'bg-brand-blue text-white'
                          : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
                      }`}
                    >
                      <Icon size={24} />
                    </div>
                    <div className="flex-1">
                      <p
                        className={`font-bold ${
                          isSelected
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
                    {isSelected && (
                      <CheckCircle2 className="text-brand-blue" size={24} />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Payment Description */}
        <div>
          <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
            Payment Note (Optional)
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => handleChange('description', e.target.value)}
            rows={3}
            className="w-full px-4 py-3 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-blue resize-none"
            placeholder="Add a note about this payment..."
            maxLength={200}
          />
        </div>

        {/* Security Notice */}
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800/30 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <CheckCircle2
              className="text-green-600 shrink-0 mt-0.5"
              size={20}
            />
            <div className="text-sm text-green-900 dark:text-green-100">
              <p className="font-semibold mb-1">Secure Payment</p>
              <p>
                Your payment is processed securely using industry-standard
                encryption. All transactions are recorded on the Stellar
                blockchain.
              </p>
            </div>
          </div>
        </div>
      </div>
    </BaseModal>
  );
};
