'use client';
import React, { useState, useEffect } from 'react';
import { BaseModal } from './BaseModal';
import {
  CreditCard,
  DollarSign,
  Calendar,
  Building,
  CheckCircle2,
  Trash2,
  Plus,
  Loader2,
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import {
  usePaymentMethods,
  useCreatePaymentMethod,
  useDeletePaymentMethod,
} from '@/lib/query/hooks/use-payments';

interface PaymentData {
  agreementId: string;
  amount: number;
  paymentMethod: 'card' | 'bank_transfer' | 'crypto';
  paymentMethodId?: string;
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

  const { data: savedMethods = [], isLoading: isLoadingMethods } =
    usePaymentMethods();
  const createMethodMutation = useCreatePaymentMethod();
  const deleteMethodMutation = useDeletePaymentMethod();

  const [selectedMethodId, setSelectedMethodId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  // Form states for adding methods
  const [cardFields, setCardFields] = useState({
    cardholderName: '',
    cardNumber: '',
    expiryDate: '',
  });

  const [bankFields, setBankFields] = useState({
    bankName: '',
    accountNumber: '',
    routingNumber: '',
  });

  // Filter saved methods based on chosen category
  const activeCategoryMethods = savedMethods.filter((m) => {
    if (formData.paymentMethod === 'card')
      return m.paymentType === 'CREDIT_CARD';
    if (formData.paymentMethod === 'bank_transfer')
      return m.paymentType === 'BANK_TRANSFER';
    return false;
  });

  // Auto-select first/default method when category changes
  useEffect(() => {
    if (activeCategoryMethods.length > 0) {
      const defaultMethod =
        activeCategoryMethods.find((m) => m.isDefault) ||
        activeCategoryMethods[0];
      setSelectedMethodId(String(defaultMethod.id));
    } else {
      setSelectedMethodId(null);
    }
    setShowAddForm(false);
  }, [formData.paymentMethod, savedMethods.length]);

  const handleAddMethod = async () => {
    if (formData.paymentMethod === 'card') {
      const lastFour = cardFields.cardNumber.replace(/\D/g, '').slice(-4);
      if (lastFour.length < 4) {
        toast.error('Please enter a valid card number');
        return;
      }
      const [mm, yy] = cardFields.expiryDate.split('/');
      if (!mm || !yy || mm.length !== 2 || yy.length !== 2) {
        toast.error('Please enter a valid expiry date (MM/YY)');
        return;
      }

      const expiryDate = `20${yy}-${mm}-28`; // simulated date format

      try {
        await createMethodMutation.mutateAsync({
          paymentType: 'CREDIT_CARD',
          lastFour,
          expiryDate,
          isDefault:
            savedMethods.filter((m) => m.paymentType === 'CREDIT_CARD')
              .length === 0,
          metadata: {
            cardholderName: cardFields.cardholderName,
          },
        });
        toast.success('Payment card added successfully');
        setShowAddForm(false);
        setCardFields({ cardholderName: '', cardNumber: '', expiryDate: '' });
      } catch (err) {
        toast.error('Failed to save credit card');
      }
    } else if (formData.paymentMethod === 'bank_transfer') {
      const lastFour = bankFields.accountNumber.replace(/\D/g, '').slice(-4);
      if (lastFour.length < 4) {
        toast.error('Please enter a valid account number');
        return;
      }
      if (!bankFields.bankName || !bankFields.routingNumber) {
        toast.error('Please fill in all bank account details');
        return;
      }

      try {
        await createMethodMutation.mutateAsync({
          paymentType: 'BANK_TRANSFER',
          lastFour,
          isDefault:
            savedMethods.filter((m) => m.paymentType === 'BANK_TRANSFER')
              .length === 0,
          metadata: {
            bankName: bankFields.bankName,
            routingNumber: bankFields.routingNumber,
          },
        });
        toast.success('Bank account registered successfully');
        setShowAddForm(false);
        setBankFields({ bankName: '', accountNumber: '', routingNumber: '' });
      } catch (err) {
        toast.error('Failed to save bank details');
      }
    }
  };

  const handleDeleteMethod = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteMethodMutation.mutateAsync(id);
      toast.success('Payment method removed');
    } catch {
      toast.error('Failed to delete payment method');
    }
  };

  const handleSubmit = async () => {
    if (!onSubmit) return;

    if (formData.amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (formData.paymentMethod === 'crypto') {
      toast.error('Cryptocurrency payments are currently disabled.');
      return;
    }

    if (!selectedMethodId) {
      toast.error('Please select or add a payment method first');
      return;
    }

    setIsProcessing(true);
    try {
      await onSubmit({
        ...formData,
        paymentMethodId: selectedMethodId,
      });
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
      description: 'Stellar (Disabled for security)',
      disabled: true,
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
              disabled={
                isProcessing ||
                formData.amount <= 0 ||
                formData.paymentMethod === 'crypto' ||
                (!selectedMethodId && !showAddForm)
              }
              className="px-6 py-2.5 rounded-xl font-bold text-white bg-brand-blue hover:bg-blue-700 shadow-md transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
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

        {/* Payment Method Category Selection */}
        <div>
          <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-3">
            Payment Category
          </label>
          <div className="grid grid-cols-3 gap-3">
            {paymentMethods.map((method) => {
              const Icon = method.icon;
              const isSelected = formData.paymentMethod === method.value;

              return (
                <button
                  key={method.value}
                  type="button"
                  onClick={() =>
                    handleChange(
                      'paymentMethod',
                      method.value as 'card' | 'bank_transfer' | 'crypto',
                    )
                  }
                  className={`p-3 rounded-xl border-2 transition-all text-center flex flex-col items-center justify-center gap-2 ${
                    isSelected
                      ? 'border-brand-blue bg-blue-50 dark:bg-blue-900/20'
                      : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600'
                  } ${method.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <Icon
                    size={20}
                    className={
                      isSelected ? 'text-brand-blue' : 'text-neutral-500'
                    }
                  />
                  <span
                    className={`text-xs font-bold ${isSelected ? 'text-brand-blue' : 'text-neutral-700 dark:text-neutral-300'}`}
                  >
                    {method.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Payment Methods Management Section */}
        {formData.paymentMethod === 'crypto' ? (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/30 rounded-xl p-4 text-sm text-amber-800 dark:text-amber-300">
            <p className="font-bold mb-1">
              Cryptocurrency payments are disabled
            </p>
            <p>
              Freighter-wallet based payment flows are undergoing security
              reviews. Please select Card or Bank Transfer to complete your
              transaction safely.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                Saved{' '}
                {formData.paymentMethod === 'card' ? 'Cards' : 'Bank Accounts'}
              </label>
              {!showAddForm && (
                <button
                  type="button"
                  onClick={() => setShowAddForm(true)}
                  className="text-xs font-bold text-brand-blue hover:text-blue-700 flex items-center gap-1"
                >
                  <Plus size={14} /> Add New
                </button>
              )}
            </div>

            {isLoadingMethods ? (
              <div className="flex items-center justify-center p-6 border-2 border-dashed border-neutral-200 dark:border-neutral-700 rounded-xl">
                <Loader2 className="w-6 h-6 animate-spin text-neutral-400" />
              </div>
            ) : showAddForm ? (
              /* Add payment method form */
              <div className="border border-neutral-200 dark:border-neutral-700 rounded-xl p-4 space-y-3 bg-neutral-50 dark:bg-neutral-850">
                <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                  New{' '}
                  {formData.paymentMethod === 'card'
                    ? 'Credit Card'
                    : 'Bank Account'}
                </h4>
                {formData.paymentMethod === 'card' ? (
                  <>
                    <input
                      type="text"
                      placeholder="Cardholder Name"
                      value={cardFields.cardholderName}
                      onChange={(e) =>
                        setCardFields({
                          ...cardFields,
                          cardholderName: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 text-sm border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                    />
                    <div className="grid grid-cols-3 gap-2">
                      <input
                        type="text"
                        placeholder="Card Number"
                        maxLength={16}
                        value={cardFields.cardNumber}
                        onChange={(e) =>
                          setCardFields({
                            ...cardFields,
                            cardNumber: e.target.value,
                          })
                        }
                        className="col-span-2 px-3 py-2 text-sm border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                      />
                      <input
                        type="text"
                        placeholder="MM/YY"
                        maxLength={5}
                        value={cardFields.expiryDate}
                        onChange={(e) =>
                          setCardFields({
                            ...cardFields,
                            expiryDate: e.target.value,
                          })
                        }
                        className="px-3 py-2 text-sm border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white text-center"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <input
                      type="text"
                      placeholder="Bank Name"
                      value={bankFields.bankName}
                      onChange={(e) =>
                        setBankFields({
                          ...bankFields,
                          bankName: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 text-sm border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Account Number"
                        value={bankFields.accountNumber}
                        onChange={(e) =>
                          setBankFields({
                            ...bankFields,
                            accountNumber: e.target.value,
                          })
                        }
                        className="px-3 py-2 text-sm border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                      />
                      <input
                        type="text"
                        placeholder="Routing Number"
                        value={bankFields.routingNumber}
                        onChange={(e) =>
                          setBankFields({
                            ...bankFields,
                            routingNumber: e.target.value,
                          })
                        }
                        className="px-3 py-2 text-sm border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                      />
                    </div>
                  </>
                )}
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="px-3 py-1.5 text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-white/5 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleAddMethod}
                    disabled={createMethodMutation.isPending}
                    className="px-3 py-1.5 text-xs font-semibold text-white bg-brand-blue hover:bg-blue-600 rounded-lg flex items-center gap-1"
                  >
                    {createMethodMutation.isPending && (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    )}
                    Save Method
                  </button>
                </div>
              </div>
            ) : activeCategoryMethods.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-neutral-200 dark:border-neutral-700 rounded-xl text-center">
                <p className="text-sm font-semibold text-neutral-600 dark:text-neutral-400">
                  No saved payment methods
                </p>
                <p className="text-xs text-neutral-500 mb-3">
                  Please add a payment method to continue.
                </p>
                <button
                  type="button"
                  onClick={() => setShowAddForm(true)}
                  className="px-3 py-1.5 text-xs font-bold text-white bg-brand-blue hover:bg-blue-600 rounded-lg"
                >
                  Add Payment Method
                </button>
              </div>
            ) : (
              /* Payment method list */
              <div className="space-y-2">
                {activeCategoryMethods.map((method) => {
                  const isSelected = selectedMethodId === String(method.id);
                  return (
                    <button
                      key={method.id}
                      type="button"
                      onClick={() => setSelectedMethodId(String(method.id))}
                      className={`w-full p-3.5 rounded-xl border-2 text-left flex items-center justify-between gap-3 transition ${
                        isSelected
                          ? 'border-brand-blue bg-blue-50/50 dark:bg-blue-900/10'
                          : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-500 shrink-0">
                          {method.paymentType === 'CREDIT_CARD' ? (
                            <CreditCard size={18} />
                          ) : (
                            <Building size={18} />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-neutral-900 dark:text-white">
                            {method.paymentType === 'CREDIT_CARD'
                              ? `•••• •••• •••• ${method.lastFour}`
                              : `${(method.metadata as Record<string, string> | null)?.bankName || 'Bank'} ···· ${method.lastFour}`}
                          </p>
                          {method.expiryDate && (
                            <p className="text-xs text-neutral-500">
                              Expires:{' '}
                              {format(new Date(method.expiryDate), 'MM/yy')}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {method.isDefault && (
                          <span className="text-[10px] uppercase font-bold text-brand-blue bg-brand-blue/10 px-1.5 py-0.5 rounded">
                            Default
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={(e) => void handleDeleteMethod(method.id, e)}
                          disabled={deleteMethodMutation.isPending}
                          className="p-1.5 text-neutral-400 hover:text-red-500 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
                          title="Remove payment method"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

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
                encryption. All transactions are audited and recorded for
                compliance.
              </p>
            </div>
          </div>
        </div>
      </div>
    </BaseModal>
  );
};
