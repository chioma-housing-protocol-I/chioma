'use client';

import React, { useState } from 'react';
import { BaseModal } from './BaseModal';
import {
  CheckCircle2,
  XCircle,
  MessageSquare,
  AlertCircle,
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

interface DisputeInfo {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  status: 'open' | 'under_review' | 'resolved' | 'closed';
  raisedBy: string;
  raisedByName: string;
  createdAt: string;
}

interface DisputeResolutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  dispute: DisputeInfo | null;
  onResolve?: (
    disputeId: string,
    resolution: string,
    action: 'approve' | 'reject',
  ) => Promise<void>;
  userRole?: 'admin' | 'landlord' | 'tenant';
}

export const DisputeResolutionModal: React.FC<DisputeResolutionModalProps> = ({
  isOpen,
  onClose,
  dispute,
  onResolve,
  userRole = 'admin',
}) => {
  const [resolution, setResolution] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!dispute) return null;

  const handleResolve = async (action: 'approve' | 'reject') => {
    if (!onResolve) return;

    if (!resolution.trim()) {
      toast.error('Please provide a resolution note');
      return;
    }

    setIsSubmitting(true);
    try {
      await onResolve(dispute.id, resolution, action);
      toast.success(
        action === 'approve'
          ? 'Dispute resolved in favor of claimant'
          : 'Dispute rejected',
      );
      onClose();
      setResolution('');
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to resolve dispute',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = () => {
    const colors = {
      open: 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400',
      under_review:
        'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400',
      resolved:
        'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400',
      closed: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    };

    return (
      <span
        className={`text-xs font-semibold px-3 py-1 rounded-lg ${colors[dispute.status]}`}
      >
        {dispute.status.replace('_', ' ').toUpperCase()}
      </span>
    );
  };

  const getPriorityBadge = () => {
    const colors = {
      low: 'bg-gray-100 text-gray-700',
      medium: 'bg-yellow-100 text-yellow-700',
      high: 'bg-red-100 text-red-700',
    };

    return (
      <span
        className={`text-xs font-semibold px-3 py-1 rounded-lg ${colors[dispute.priority as keyof typeof colors] || colors.medium}`}
      >
        {dispute.priority.toUpperCase()} PRIORITY
      </span>
    );
  };

  const canResolve =
    userRole === 'admin' &&
    dispute.status !== 'resolved' &&
    dispute.status !== 'closed';

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Dispute Resolution"
      subtitle={`Dispute #${dispute.id.slice(0, 8)}`}
      size="lg"
      footer={
        canResolve ? (
          <div className="flex items-center justify-end gap-3 w-full">
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl font-bold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-white/10 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={() => handleResolve('reject')}
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl font-bold text-white bg-red-600 hover:bg-red-700 shadow-md transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              <XCircle size={18} />
              Reject Claim
            </button>
            <button
              onClick={() => handleResolve('approve')}
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl font-bold text-white bg-green-600 hover:bg-green-700 shadow-md transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle2 size={18} />
                  Approve & Resolve
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-end w-full">
            <button
              onClick={onClose}
              className="px-6 py-2.5 rounded-xl font-bold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-white/10 transition-colors"
            >
              Close
            </button>
          </div>
        )
      }
    >
      <div className="space-y-6">
        {/* Status and Priority */}
        <div className="flex items-center gap-3 flex-wrap">
          {getStatusBadge()}
          {getPriorityBadge()}
        </div>

        {/* Dispute Information */}
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/30 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-red-600/10 rounded-xl flex items-center justify-center">
              <AlertCircle className="text-red-600" size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
                {dispute.title}
              </h3>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                Filed by {dispute.raisedByName} on{' '}
                {format(new Date(dispute.createdAt), 'MMMM d, yyyy')}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-1">
                Category
              </p>
              <p className="text-neutral-900 dark:text-white font-medium">
                {dispute.category.replace('_', ' ')}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-1">
                Description
              </p>
              <p className="text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap">
                {dispute.description}
              </p>
            </div>
          </div>
        </div>

        {/* Resolution Section */}
        {canResolve && (
          <div className="bg-neutral-50 dark:bg-neutral-800/50 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-xl flex items-center justify-center">
                <MessageSquare className="text-brand-blue" size={20} />
              </div>
              <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
                Resolution Notes
              </h3>
            </div>

            <textarea
              value={resolution}
              onChange={(e) => setResolution(e.target.value)}
              rows={6}
              className="w-full px-4 py-3 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-blue resize-none"
              placeholder="Provide detailed notes about your decision and any actions taken..."
              maxLength={1000}
            />
            <p className="text-xs text-neutral-500 mt-2 text-right">
              {resolution.length}/1000
            </p>

            <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/30 rounded-xl">
              <p className="text-sm text-blue-900 dark:text-blue-100">
                <span className="font-semibold">Note:</span> Your resolution
                will be recorded and all parties will be notified. This action
                cannot be undone.
              </p>
            </div>
          </div>
        )}

        {/* Already Resolved */}
        {!canResolve && dispute.status === 'resolved' && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800/30 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-3">
              <CheckCircle2 className="text-green-600" size={24} />
              <h3 className="text-lg font-bold text-green-900 dark:text-green-100">
                Dispute Resolved
              </h3>
            </div>
            <p className="text-sm text-green-800 dark:text-green-200">
              This dispute has been resolved and closed. No further action is
              required.
            </p>
          </div>
        )}
      </div>
    </BaseModal>
  );
};
