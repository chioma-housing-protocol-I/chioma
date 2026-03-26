'use client';

import React from 'react';
import { useModal } from '@/contexts/ModalContext';
import { PropertyAgreementModal } from './PropertyAgreementModal';
import { DisputeModal } from './DisputeModal';
import { DisputeResolutionModal } from './DisputeResolutionModal';
import { PaymentModal } from './PaymentModal';
import { RefundModal } from './RefundModal';
import { UserManagementModal } from './UserManagementModal';
import dynamic from 'next/dynamic';
import type { Document, DocumentMetadata } from '@/components/documents';

// Import types for type safety
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

interface PaymentData {
  agreementId: string;
  amount: number;
  paymentMethod: 'card' | 'bank_transfer' | 'crypto';
  dueDate?: string;
  description?: string;
}

interface RefundData {
  paymentId: string;
  amount: number;
  reason: string;
  refundMethod: 'original' | 'bank_transfer' | 'crypto';
}

interface UserData {
  id?: string;
  name: string;
  email: string;
  phone?: string;
  role: 'tenant' | 'landlord' | 'agent' | 'admin';
  status: 'active' | 'suspended' | 'inactive';
  isVerified: boolean;
}

// Dynamically import document modals to avoid SSR issues
const DocumentViewerModal = dynamic(
  () =>
    import('@/components/documents').then((mod) => ({
      default: mod.DocumentViewerModal,
    })),
  { ssr: false },
);

const DocumentUploadModal = dynamic(
  () =>
    import('@/components/documents').then((mod) => ({
      default: mod.DocumentUploadModal,
    })),
  { ssr: false },
);

const DocumentListModal = dynamic(
  () =>
    import('@/components/documents').then((mod) => ({
      default: mod.DocumentListModal,
    })),
  { ssr: false },
);

/**
 * ModalManager Component
 *
 * Centralized modal management component that renders the appropriate modal
 * based on the current modal state from ModalContext.
 *
 * Usage:
 * 1. Wrap your app with ModalProvider
 * 2. Add ModalManager to your layout
 * 3. Use useModal() hook to open modals from anywhere
 *
 * Example:
 * ```tsx
 * const { openModal } = useModal();
 * openModal('payment', { amount: 1000, agreementId: '123' });
 * ```
 */
export const ModalManager: React.FC = () => {
  const { modalState, closeModal } = useModal();

  if (!modalState.isOpen || !modalState.type) {
    return null;
  }

  switch (modalState.type) {
    case 'propertyAgreement':
      return (
        <PropertyAgreementModal
          isOpen={modalState.isOpen}
          onClose={closeModal}
          data={modalState.data?.agreement as PropertyAgreementData | undefined}
          mode={(modalState.data?.mode as 'view' | 'create' | 'edit') || 'view'}
          onSubmit={
            modalState.data?.onSubmit as
              | ((data: PropertyAgreementData) => Promise<void>)
              | undefined
          }
        />
      );

    case 'dispute':
      return (
        <DisputeModal
          isOpen={modalState.isOpen}
          onClose={closeModal}
          agreementId={modalState.data?.agreementId as string | undefined}
          onSubmit={
            modalState.data?.onSubmit as
              | ((data: DisputeData) => Promise<void>)
              | undefined
          }
        />
      );

    case 'disputeResolution':
      return (
        <DisputeResolutionModal
          isOpen={modalState.isOpen}
          onClose={closeModal}
          dispute={modalState.data?.dispute as DisputeInfo | null}
          userRole={
            (modalState.data?.userRole as 'admin' | 'landlord' | 'tenant') ||
            'admin'
          }
          onResolve={
            modalState.data?.onResolve as
              | ((
                  disputeId: string,
                  resolution: string,
                  action: 'approve' | 'reject',
                ) => Promise<void>)
              | undefined
          }
        />
      );

    case 'payment':
      return (
        <PaymentModal
          isOpen={modalState.isOpen}
          onClose={closeModal}
          agreementId={modalState.data?.agreementId as string | undefined}
          amount={modalState.data?.amount as number | undefined}
          dueDate={modalState.data?.dueDate as string | undefined}
          onSubmit={
            modalState.data?.onSubmit as
              | ((data: PaymentData) => Promise<void>)
              | undefined
          }
        />
      );

    case 'refund':
      return (
        <RefundModal
          isOpen={modalState.isOpen}
          onClose={closeModal}
          paymentId={modalState.data?.paymentId as string | undefined}
          maxAmount={modalState.data?.maxAmount as number | undefined}
          onSubmit={
            modalState.data?.onSubmit as
              | ((data: RefundData) => Promise<void>)
              | undefined
          }
        />
      );

    case 'userManagement':
      return (
        <UserManagementModal
          isOpen={modalState.isOpen}
          onClose={closeModal}
          user={modalState.data?.user as UserData | undefined}
          mode={(modalState.data?.mode as 'create' | 'edit' | 'view') || 'view'}
          onSubmit={
            modalState.data?.onSubmit as
              | ((data: UserData) => Promise<void>)
              | undefined
          }
          onSuspend={
            modalState.data?.onSuspend as
              | ((userId: string) => Promise<void>)
              | undefined
          }
          onDelete={
            modalState.data?.onDelete as
              | ((userId: string) => Promise<void>)
              | undefined
          }
        />
      );

    case 'documentViewer':
      return (
        <DocumentViewerModal
          document={modalState.data?.document as Document | null}
          onClose={closeModal}
          onDownload={
            modalState.data?.onDownload as
              | ((documentId: string) => void)
              | undefined
          }
        />
      );

    case 'documentUpload':
      return (
        <DocumentUploadModal
          isOpen={modalState.isOpen}
          onClose={closeModal}
          onUpload={
            modalState.data?.onUpload as (
              files: File[],
              metadata: DocumentMetadata,
            ) => Promise<void>
          }
          allowedTypes={modalState.data?.allowedTypes as string | undefined}
          maxFiles={modalState.data?.maxFiles as number | undefined}
          title={modalState.data?.title as string | undefined}
        />
      );

    case 'documentList':
      return (
        <DocumentListModal
          documents={(modalState.data?.documents as Document[]) || []}
          isOpen={modalState.isOpen}
          onClose={closeModal}
          onView={modalState.data?.onView as (document: Document) => void}
          onDownload={
            modalState.data?.onDownload as
              | ((documentId: string) => void)
              | undefined
          }
          onDelete={
            modalState.data?.onDelete as
              | ((documentId: string) => void)
              | undefined
          }
          onUploadClick={
            modalState.data?.onUploadClick as (() => void) | undefined
          }
          isLoading={modalState.data?.isLoading as boolean | undefined}
        />
      );

    default:
      return null;
  }
};
