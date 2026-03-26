'use client';

import React, { useState } from 'react';
import { BaseModal } from './BaseModal';
import {
  FileText,
  Calendar,
  DollarSign,
  Home,
  User,
  CheckCircle2,
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

interface PropertyAgreementData {
  propertyId: string;
  propertyTitle: string;
  propertyAddress: string;
  landlordName: string;
  tenantName?: string;
  monthlyRent: number;
  securityDeposit: number;
  startDate: string;
  endDate: string;
  terms?: string;
  status?: 'draft' | 'pending' | 'active' | 'expired';
}

interface PropertyAgreementModalProps {
  isOpen: boolean;
  onClose: () => void;
  data?: PropertyAgreementData;
  onSubmit?: (data: PropertyAgreementData) => Promise<void>;
  mode?: 'view' | 'create' | 'edit';
}

export const PropertyAgreementModal: React.FC<PropertyAgreementModalProps> = ({
  isOpen,
  onClose,
  data,
  onSubmit,
  mode = 'view',
}) => {
  const [formData, setFormData] = useState<PropertyAgreementData>(
    data || {
      propertyId: '',
      propertyTitle: '',
      propertyAddress: '',
      landlordName: '',
      tenantName: '',
      monthlyRent: 0,
      securityDeposit: 0,
      startDate: '',
      endDate: '',
      terms: '',
      status: 'draft',
    },
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isViewMode = mode === 'view';
  const isCreateMode = mode === 'create';

  const handleSubmit = async () => {
    if (!onSubmit) return;

    // Validation
    if (
      !formData.propertyTitle ||
      !formData.monthlyRent ||
      !formData.startDate ||
      !formData.endDate
    ) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      toast.success(
        isCreateMode
          ? 'Agreement created successfully'
          : 'Agreement updated successfully',
      );
      onClose();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to save agreement',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (
    field: keyof PropertyAgreementData,
    value: string | number,
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const getStatusBadge = () => {
    const status = formData.status || 'draft';
    const colors = {
      draft: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
      pending:
        'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400',
      active:
        'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400',
      expired: 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400',
    };

    return (
      <span
        className={`text-xs font-semibold px-3 py-1 rounded-lg ${colors[status]}`}
      >
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={
        isCreateMode
          ? 'Create Rental Agreement'
          : isViewMode
            ? 'Rental Agreement Details'
            : 'Edit Rental Agreement'
      }
      subtitle={
        isViewMode
          ? `Agreement for ${formData.propertyTitle}`
          : 'Fill in the details below'
      }
      size="lg"
      footer={
        <div className="flex items-center justify-between w-full">
          <div>{isViewMode && formData.status && getStatusBadge()}</div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl font-bold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-white/10 transition-colors disabled:opacity-50"
            >
              {isViewMode ? 'Close' : 'Cancel'}
            </button>
            {!isViewMode && (
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="px-6 py-2.5 rounded-xl font-bold text-white bg-brand-blue hover:bg-blue-700 shadow-md transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={18} />
                    {isCreateMode ? 'Create Agreement' : 'Save Changes'}
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Property Information */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/30 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-brand-blue/10 rounded-xl flex items-center justify-center">
              <Home className="text-brand-blue" size={20} />
            </div>
            <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
              Property Information
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
                Property Title *
              </label>
              {isViewMode ? (
                <p className="text-neutral-900 dark:text-white font-medium">
                  {formData.propertyTitle}
                </p>
              ) : (
                <input
                  type="text"
                  value={formData.propertyTitle}
                  onChange={(e) =>
                    handleChange('propertyTitle', e.target.value)
                  }
                  className="w-full px-4 py-2.5 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-blue"
                  placeholder="e.g., Modern 2BR Apartment"
                />
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
                Property Address *
              </label>
              {isViewMode ? (
                <p className="text-neutral-900 dark:text-white font-medium">
                  {formData.propertyAddress}
                </p>
              ) : (
                <input
                  type="text"
                  value={formData.propertyAddress}
                  onChange={(e) =>
                    handleChange('propertyAddress', e.target.value)
                  }
                  className="w-full px-4 py-2.5 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-blue"
                  placeholder="e.g., 123 Main St, City"
                />
              )}
            </div>
          </div>
        </div>

        {/* Parties Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-neutral-50 dark:bg-neutral-800/50 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/20 rounded-xl flex items-center justify-center">
                <User className="text-purple-600" size={20} />
              </div>
              <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
                Landlord
              </h3>
            </div>
            {isViewMode ? (
              <p className="text-neutral-900 dark:text-white font-medium">
                {formData.landlordName}
              </p>
            ) : (
              <input
                type="text"
                value={formData.landlordName}
                onChange={(e) => handleChange('landlordName', e.target.value)}
                className="w-full px-4 py-2.5 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-blue"
                placeholder="Landlord name"
              />
            )}
          </div>

          <div className="bg-neutral-50 dark:bg-neutral-800/50 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900/20 rounded-xl flex items-center justify-center">
                <User className="text-green-600" size={20} />
              </div>
              <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
                Tenant
              </h3>
            </div>
            {isViewMode ? (
              <p className="text-neutral-900 dark:text-white font-medium">
                {formData.tenantName || 'Not assigned'}
              </p>
            ) : (
              <input
                type="text"
                value={formData.tenantName}
                onChange={(e) => handleChange('tenantName', e.target.value)}
                className="w-full px-4 py-2.5 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-blue"
                placeholder="Tenant name (optional)"
              />
            )}
          </div>
        </div>

        {/* Financial Details */}
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800/30 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-green-600/10 rounded-xl flex items-center justify-center">
              <DollarSign className="text-green-600" size={20} />
            </div>
            <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
              Financial Terms
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
                Monthly Rent *
              </label>
              {isViewMode ? (
                <p className="text-2xl font-bold text-green-600">
                  ${formData.monthlyRent.toLocaleString()}
                </p>
              ) : (
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500">
                    $
                  </span>
                  <input
                    type="number"
                    value={formData.monthlyRent}
                    onChange={(e) =>
                      handleChange(
                        'monthlyRent',
                        parseFloat(e.target.value) || 0,
                      )
                    }
                    className="w-full pl-8 pr-4 py-2.5 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-blue"
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                  />
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
                Security Deposit *
              </label>
              {isViewMode ? (
                <p className="text-2xl font-bold text-green-600">
                  ${formData.securityDeposit.toLocaleString()}
                </p>
              ) : (
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500">
                    $
                  </span>
                  <input
                    type="number"
                    value={formData.securityDeposit}
                    onChange={(e) =>
                      handleChange(
                        'securityDeposit',
                        parseFloat(e.target.value) || 0,
                      )
                    }
                    className="w-full pl-8 pr-4 py-2.5 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-blue"
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Lease Period */}
        <div className="bg-neutral-50 dark:bg-neutral-800/50 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-xl flex items-center justify-center">
              <Calendar className="text-brand-blue" size={20} />
            </div>
            <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
              Lease Period
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
                Start Date *
              </label>
              {isViewMode ? (
                <p className="text-neutral-900 dark:text-white font-medium">
                  {formData.startDate
                    ? format(new Date(formData.startDate), 'MMMM d, yyyy')
                    : 'Not set'}
                </p>
              ) : (
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => handleChange('startDate', e.target.value)}
                  className="w-full px-4 py-2.5 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-blue"
                />
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
                End Date *
              </label>
              {isViewMode ? (
                <p className="text-neutral-900 dark:text-white font-medium">
                  {formData.endDate
                    ? format(new Date(formData.endDate), 'MMMM d, yyyy')
                    : 'Not set'}
                </p>
              ) : (
                <input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => handleChange('endDate', e.target.value)}
                  className="w-full px-4 py-2.5 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-blue"
                />
              )}
            </div>
          </div>
        </div>

        {/* Terms and Conditions */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-neutral-100 dark:bg-neutral-800 rounded-xl flex items-center justify-center">
              <FileText className="text-neutral-600" size={20} />
            </div>
            <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
              Terms & Conditions
            </h3>
          </div>
          {isViewMode ? (
            <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-4 max-h-64 overflow-y-auto">
              <p className="text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap">
                {formData.terms || 'No terms specified'}
              </p>
            </div>
          ) : (
            <textarea
              value={formData.terms}
              onChange={(e) => handleChange('terms', e.target.value)}
              rows={6}
              className="w-full px-4 py-3 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-blue resize-none"
              placeholder="Enter the terms and conditions of the rental agreement..."
            />
          )}
        </div>
      </div>
    </BaseModal>
  );
};
