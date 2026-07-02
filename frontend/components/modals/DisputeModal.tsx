'use client';

import React, { useState } from 'react';
import { BaseModal } from './BaseModal';
import { AlertTriangle } from 'lucide-react';
import { Uploader } from '@/components/ui/Uploader';
import toast from 'react-hot-toast';

interface DisputeData {
  agreementId: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  category:
    | 'payment'
    | 'property_damage'
    | 'lease_violation'
    | 'maintenance'
    | 'other';
  evidence?: File[];
}

interface DisputeModalProps {
  isOpen: boolean;
  onClose: () => void;
  agreementId?: string;
  onSubmit?: (data: DisputeData) => Promise<void>;
}

export const DisputeModal: React.FC<DisputeModalProps> = ({
  isOpen,
  onClose,
  agreementId = '',
  onSubmit,
}) => {
  const [formData, setFormData] = useState<DisputeData>({
    agreementId,
    title: '',
    description: '',
    priority: 'medium',
    category: 'other',
    evidence: [],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!onSubmit) return;

    // Validation
    if (!formData.title || !formData.description) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      toast.success('Dispute filed successfully');
      onClose();
      // Reset form
      setFormData({
        agreementId,
        title: '',
        description: '',
        priority: 'medium',
        category: 'other',
        evidence: [],
      });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to file dispute',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (field: keyof DisputeData, value: string | File[]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleFilesSelected = (files: File[]) => {
    setFormData((prev) => ({ ...prev, evidence: files }));
  };

  const priorities = [
    { value: 'low', label: 'Low', color: 'text-gray-600' },
    { value: 'medium', label: 'Medium', color: 'text-yellow-600' },
    { value: 'high', label: 'High', color: 'text-red-600' },
  ];

  const categories = [
    { value: 'payment', label: 'Payment Issue' },
    { value: 'property_damage', label: 'Property Damage' },
    { value: 'lease_violation', label: 'Lease Violation' },
    { value: 'maintenance', label: 'Maintenance Issue' },
    { value: 'other', label: 'Other' },
  ];

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="File a Dispute"
      subtitle="Provide details about the issue you're experiencing"
      size="lg"
      footer={
        <div className="flex items-center justify-end gap-3 w-full">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="px-6 py-2.5 rounded-xl font-bold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-white/10 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-6 py-2.5 rounded-xl font-bold text-white bg-red-600 hover:bg-red-700 shadow-md transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Filing...
              </>
            ) : (
              <>
                <AlertTriangle size={18} />
                File Dispute
              </>
            )}
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Warning Banner */}
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/30 rounded-2xl p-4 flex items-start gap-3">
          <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={20} />
          <div className="text-sm text-amber-900 dark:text-amber-100">
            <p className="font-semibold mb-1">Important Notice</p>
            <p>
              Filing a dispute will notify all parties involved. Please ensure
              you have attempted to resolve the issue directly before
              proceeding.
            </p>
          </div>
        </div>

        {/* Dispute Title */}
        <div>
          <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
            Dispute Title *
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => handleChange('title', e.target.value)}
            className="w-full px-4 py-2.5 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-blue"
            placeholder="Brief summary of the issue"
            maxLength={100}
          />
          <p className="text-xs text-neutral-500 mt-1 text-right">
            {formData.title.length}/100
          </p>
        </div>

        {/* Category and Priority */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
              Category *
            </label>
            <select
              value={formData.category}
              onChange={(e) => handleChange('category', e.target.value)}
              className="w-full px-4 py-2.5 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-blue"
            >
              {categories.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
              Priority *
            </label>
            <select
              value={formData.priority}
              onChange={(e) => handleChange('priority', e.target.value)}
              className="w-full px-4 py-2.5 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-blue"
            >
              {priorities.map((priority) => (
                <option key={priority.value} value={priority.value}>
                  {priority.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
            Detailed Description *
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => handleChange('description', e.target.value)}
            rows={6}
            className="w-full px-4 py-3 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-blue resize-none"
            placeholder="Provide a detailed explanation of the issue, including dates, amounts, and any relevant context..."
            maxLength={2000}
          />
          <p className="text-xs text-neutral-500 mt-1 text-right">
            {formData.description.length}/2000
          </p>
        </div>

        {/* Evidence Upload */}
        <div>
          <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
            Supporting Evidence (Optional)
          </label>
          <Uploader
            label=""
            accept="image/*,application/pdf,.doc,.docx"
            multiple={true}
            onFilesSelected={handleFilesSelected}
            maxFiles={5}
            description="Upload photos, documents, or receipts (max 5 files)"
          />
          <p className="text-xs text-neutral-500 mt-2">
            Supported formats: Images, PDF, Word documents. Max 10MB per file.
          </p>
        </div>
      </div>
    </BaseModal>
  );
};
