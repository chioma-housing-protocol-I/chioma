'use client';

import React from 'react';
import { format } from 'date-fns';
import { FileDown, PenSquare } from 'lucide-react';
import { BaseModal } from './BaseModal';
import type { AgreementViewData } from './types';

interface AgreementViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  agreement: AgreementViewData | null;
  onSignClick?: (agreement: AgreementViewData) => void;
}

export const AgreementViewModal: React.FC<AgreementViewModalProps> = ({
  isOpen,
  onClose,
  agreement,
  onSignClick,
}) => {
  if (!agreement) return null;

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Agreement Details"
      subtitle={`${agreement.propertyTitle} - ${agreement.status || 'pending'}`}
      size="xl"
      footer={
        <div className="flex w-full items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-100"
          >
            Close
          </button>
          <div className="flex items-center gap-2">
            {agreement.pdfUrl && (
              <a
                href={agreement.pdfUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
              >
                <FileDown size={16} />
                Download PDF
              </a>
            )}
            {onSignClick && agreement.status !== 'signed' && (
              <button
                type="button"
                onClick={() => onSignClick(agreement)}
                className="inline-flex items-center gap-2 rounded-xl bg-brand-blue px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                <PenSquare size={16} />
                Sign Agreement
              </button>
            )}
          </div>
        </div>
      }
    >
      <div className="space-y-5">
        <div className="grid grid-cols-1 gap-4 rounded-2xl bg-neutral-50 p-4 md:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase text-neutral-500">
              Landlord
            </p>
            <p className="text-sm font-medium text-neutral-900">
              {agreement.landlordName}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-neutral-500">
              Tenant
            </p>
            <p className="text-sm font-medium text-neutral-900">
              {agreement.tenantName}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-neutral-500">
              Monthly Rent
            </p>
            <p className="text-sm font-bold text-green-600">
              ${agreement.monthlyRent.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-neutral-500">
              Security Deposit
            </p>
            <p className="text-sm font-bold text-green-600">
              ${agreement.securityDeposit.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-neutral-500">
              Start Date
            </p>
            <p className="text-sm font-medium text-neutral-900">
              {format(new Date(agreement.startDate), 'MMMM d, yyyy')}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-neutral-500">
              End Date
            </p>
            <p className="text-sm font-medium text-neutral-900">
              {format(new Date(agreement.endDate), 'MMMM d, yyyy')}
            </p>
          </div>
          {agreement.renewalOption != null && (
            <div>
              <p className="text-xs font-semibold uppercase text-neutral-500">
                Renewal option
              </p>
              <p className="text-sm font-medium text-neutral-900">
                {agreement.renewalOption ? 'Yes' : 'No'}
              </p>
            </div>
          )}
          {agreement.renewalNoticeDate && (
            <div>
              <p className="text-xs font-semibold uppercase text-neutral-500">
                Renewal notice by
              </p>
              <p className="text-sm font-medium text-neutral-900">
                {format(new Date(agreement.renewalNoticeDate), 'MMMM d, yyyy')}
              </p>
            </div>
          )}
          {agreement.moveInDate && (
            <div>
              <p className="text-xs font-semibold uppercase text-neutral-500">
                Move-in
              </p>
              <p className="text-sm font-medium text-neutral-900">
                {format(new Date(agreement.moveInDate), 'MMMM d, yyyy')}
              </p>
            </div>
          )}
          {agreement.moveOutDate && (
            <div>
              <p className="text-xs font-semibold uppercase text-neutral-500">
                Move-out
              </p>
              <p className="text-sm font-medium text-neutral-900">
                {format(new Date(agreement.moveOutDate), 'MMMM d, yyyy')}
              </p>
            </div>
          )}
          {agreement.utilitiesIncluded != null && (
            <div>
              <p className="text-xs font-semibold uppercase text-neutral-500">
                Utilities included
              </p>
              <p className="text-sm font-medium text-neutral-900">
                {agreement.utilitiesIncluded ? 'Yes' : 'No'}
              </p>
            </div>
          )}
          {agreement.maintenanceResponsibility && (
            <div className="md:col-span-2">
              <p className="text-xs font-semibold uppercase text-neutral-500">
                Maintenance
              </p>
              <p className="text-sm font-medium text-neutral-900">
                {agreement.maintenanceResponsibility}
              </p>
            </div>
          )}
          {agreement.earlyTerminationFee != null && (
            <div>
              <p className="text-xs font-semibold uppercase text-neutral-500">
                Early termination fee
              </p>
              <p className="text-sm font-bold text-amber-700">
                ${agreement.earlyTerminationFee.toLocaleString()}
              </p>
            </div>
          )}
          {agreement.lateFeePercentage != null && (
            <div>
              <p className="text-xs font-semibold uppercase text-neutral-500">
                Late fee (% of rent)
              </p>
              <p className="text-sm font-medium text-neutral-900">
                {agreement.lateFeePercentage}%
              </p>
            </div>
          )}
          {agreement.gracePeriodDays != null && (
            <div>
              <p className="text-xs font-semibold uppercase text-neutral-500">
                Payment grace period
              </p>
              <p className="text-sm font-medium text-neutral-900">
                {agreement.gracePeriodDays} day
                {agreement.gracePeriodDays === 1 ? '' : 's'}
              </p>
            </div>
          )}
        </div>

        <div className="overflow-hidden rounded-2xl border border-neutral-200">
          {agreement.pdfUrl ? (
            <iframe
              title="Agreement PDF preview"
              src={agreement.pdfUrl}
              className="h-[460px] w-full"
            />
          ) : (
            <div className="flex h-52 items-center justify-center bg-neutral-50 text-sm text-neutral-500">
              PDF preview unavailable for this agreement.
            </div>
          )}
        </div>
      </div>
    </BaseModal>
  );
};
