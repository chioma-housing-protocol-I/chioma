'use client';

import React from 'react';
import { useModal } from '@/contexts/ModalContext';
import {
  FileText,
  AlertTriangle,
  CreditCard,
  User,
  FolderOpen,
  Upload,
  List,
  Building2,
  FileSignature,
} from 'lucide-react';
import type { Document, DocumentMetadata } from '@/components/documents';
import type {
  PropertyDetailData,
  PropertyInquiryData,
  AgreementViewData,
  AgreementSigningData,
} from '@/components/modals/types';

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

export default function ModalsDemo() {
  const { openModal } = useModal();

  const modalDemos = [
    {
      title: 'Property Workflow',
      description: 'View property details and send inquiries',
      icon: Building2,
      color: 'bg-indigo-500',
      actions: [
        {
          label: 'Open Property Detail',
          onClick: () =>
            openModal('propertyDetail', {
              property: {
                id: 'property-001',
                title: 'Contemporary 3BR Duplex',
                address: '12 Admiralty Way, Lekki, Lagos',
                price: 3200,
                bedrooms: 3,
                bathrooms: 3,
                areaSqft: 1850,
                landlordName: 'Chioma Estates',
                description:
                  'Modern duplex with a fitted kitchen, backup power, and secure estate access.',
                images: [
                  'https://images.unsplash.com/photo-1560185007-c5ca9d2c014d',
                  'https://images.unsplash.com/photo-1494526585095-c41746248156',
                  'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c',
                  'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85',
                ],
                amenities: ['24/7 power', 'Gym', 'Security', 'Parking'],
              } as PropertyDetailData,
              onInquirySubmit: async (data: PropertyInquiryData) => {
                console.log('Property inquiry:', data);
                await new Promise((resolve) => setTimeout(resolve, 1000));
              },
            }),
        },
      ],
    },
    {
      title: 'Agreement Workflow',
      description: 'View agreement document and complete e-signing',
      icon: FileSignature,
      color: 'bg-cyan-500',
      actions: [
        {
          label: 'Open Agreement View',
          onClick: () =>
            openModal('agreementView', {
              agreement: {
                agreementId: 'agreement-001',
                propertyTitle: 'Contemporary 3BR Duplex',
                propertyAddress: '12 Admiralty Way, Lekki, Lagos',
                landlordName: 'Chioma Estates',
                tenantName: 'Ada Johnson',
                monthlyRent: 3200,
                securityDeposit: 6400,
                startDate: '2026-04-01',
                endDate: '2027-03-31',
                status: 'pending' as const,
                pdfUrl:
                  'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
              } as AgreementViewData,
              onSignSubmit: async (data: AgreementSigningData) => {
                console.log('Agreement signature:', data);
                await new Promise((resolve) => setTimeout(resolve, 1200));
              },
            }),
        },
      ],
    },
    {
      title: 'Property Agreement',
      description: 'Create, view, or edit rental agreements',
      icon: FileText,
      color: 'bg-blue-500',
      actions: [
        {
          label: 'View Agreement',
          onClick: () =>
            openModal('propertyAgreement', {
              mode: 'view',
              agreement: {
                propertyId: '1',
                propertyTitle: 'Modern 2BR Apartment',
                propertyAddress: '123 Main St, San Francisco, CA',
                landlordName: 'John Landlord',
                tenantName: 'Jane Tenant',
                monthlyRent: 2500,
                securityDeposit: 5000,
                startDate: '2024-01-01',
                endDate: '2024-12-31',
                terms: 'Standard rental terms and conditions...',
                status: 'active' as const,
              },
            }),
        },
        {
          label: 'Create Agreement',
          onClick: () =>
            openModal('propertyAgreement', {
              mode: 'create',
              onSubmit: async (data: PropertyAgreementData) => {
                console.log('Creating agreement:', data);
                await new Promise((resolve) => setTimeout(resolve, 1000));
              },
            }),
        },
      ],
    },
    {
      title: 'Dispute Management',
      description: 'File and resolve disputes',
      icon: AlertTriangle,
      color: 'bg-red-500',
      actions: [
        {
          label: 'File Dispute',
          onClick: () =>
            openModal('dispute', {
              agreementId: '123',
              onSubmit: async (data: DisputeData) => {
                console.log('Filing dispute:', data);
                await new Promise((resolve) => setTimeout(resolve, 1000));
              },
            }),
        },
        {
          label: 'Resolve Dispute',
          onClick: () =>
            openModal('disputeResolution', {
              dispute: {
                id: '456',
                title: 'Late Rent Payment',
                description: 'Tenant has not paid rent for 2 months',
                category: 'payment',
                priority: 'high',
                status: 'under_review' as const,
                raisedBy: 'user-1',
                raisedByName: 'John Landlord',
                createdAt: new Date().toISOString(),
              },
              userRole: 'admin' as const,
              onResolve: async (
                id: string,
                resolution: string,
                action: string,
              ) => {
                console.log('Resolving dispute:', { id, resolution, action });
                await new Promise((resolve) => setTimeout(resolve, 1000));
              },
            }),
        },
      ],
    },
    {
      title: 'Payment Processing',
      description: 'Process payments and refunds',
      icon: CreditCard,
      color: 'bg-green-500',
      actions: [
        {
          label: 'Make Payment',
          onClick: () =>
            openModal('payment', {
              agreementId: '123',
              amount: 2500,
              dueDate: new Date().toISOString(),
              onSubmit: async (data: PaymentData) => {
                console.log('Processing payment:', data);
                await new Promise((resolve) => setTimeout(resolve, 2000));
              },
            }),
        },
        {
          label: 'Process Refund',
          onClick: () =>
            openModal('refund', {
              paymentId: '789',
              maxAmount: 2500,
              onSubmit: async (data: RefundData) => {
                console.log('Processing refund:', data);
                await new Promise((resolve) => setTimeout(resolve, 2000));
              },
            }),
        },
      ],
    },
    {
      title: 'User Management',
      description: 'Manage user accounts',
      icon: User,
      color: 'bg-purple-500',
      actions: [
        {
          label: 'View User',
          onClick: () =>
            openModal('userManagement', {
              mode: 'view',
              user: {
                id: '1',
                name: 'John Doe',
                email: 'john@example.com',
                phone: '+1 (555) 123-4567',
                role: 'tenant' as const,
                status: 'active' as const,
                isVerified: true,
              },
              onSuspend: async (userId: string) => {
                console.log('Suspending user:', userId);
                await new Promise((resolve) => setTimeout(resolve, 1000));
              },
              onDelete: async (userId: string) => {
                console.log('Deleting user:', userId);
                await new Promise((resolve) => setTimeout(resolve, 1000));
              },
            }),
        },
        {
          label: 'Create User',
          onClick: () =>
            openModal('userManagement', {
              mode: 'create',
              onSubmit: async (data: UserData) => {
                console.log('Creating user:', data);
                await new Promise((resolve) => setTimeout(resolve, 1000));
              },
            }),
        },
      ],
    },
    {
      title: 'Document Management',
      description: 'View, upload, and manage documents',
      icon: FolderOpen,
      color: 'bg-orange-500',
      actions: [
        {
          label: 'View Document',
          onClick: () =>
            openModal('documentViewer', {
              document: {
                id: '1',
                name: 'Lease Agreement.pdf',
                type: 'pdf' as const,
                url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
                size: 2457600,
                uploadedBy: 'user-1',
                uploadedByName: 'John Landlord',
                uploadedAt: new Date().toISOString(),
                category: 'lease' as const,
                description: 'Annual lease agreement',
              },
            }),
        },
        {
          label: 'Upload Documents',
          onClick: () =>
            openModal('documentUpload', {
              onUpload: async (files: File[], metadata: DocumentMetadata) => {
                console.log('Uploading documents:', { files, metadata });
                await new Promise((resolve) => setTimeout(resolve, 2000));
              },
            }),
        },
        {
          label: 'Browse Documents',
          onClick: () =>
            openModal('documentList', {
              documents: [
                {
                  id: '1',
                  name: 'Lease Agreement.pdf',
                  type: 'pdf' as const,
                  url: '#',
                  size: 2457600,
                  uploadedBy: 'user-1',
                  uploadedByName: 'John Landlord',
                  uploadedAt: new Date().toISOString(),
                  category: 'lease' as const,
                },
                {
                  id: '2',
                  name: 'Property Inspection.pdf',
                  type: 'pdf' as const,
                  url: '#',
                  size: 1843200,
                  uploadedBy: 'user-2',
                  uploadedByName: 'Jane Inspector',
                  uploadedAt: new Date().toISOString(),
                  category: 'inspection' as const,
                },
              ],
              onView: (doc: Document) => {
                openModal('documentViewer', { document: doc });
              },
            }),
        },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-black text-neutral-900 dark:text-white mb-2">
            Modal Components Demo
          </h1>
          <p className="text-neutral-600 dark:text-neutral-400">
            Interactive demonstration of all modal components with context-based
            state management
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-white dark:bg-neutral-800 rounded-2xl p-6 border border-neutral-200 dark:border-neutral-700">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-xl flex items-center justify-center mb-4">
              <List className="text-brand-blue" size={24} />
            </div>
            <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-2">
              Centralized State
            </h3>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              All modals managed through a single context provider
            </p>
          </div>

          <div className="bg-white dark:bg-neutral-800 rounded-2xl p-6 border border-neutral-200 dark:border-neutral-700">
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-xl flex items-center justify-center mb-4">
              <FileText className="text-purple-600" size={24} />
            </div>
            <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-2">
              Type-Safe
            </h3>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Full TypeScript support with type inference
            </p>
          </div>

          <div className="bg-white dark:bg-neutral-800 rounded-2xl p-6 border border-neutral-200 dark:border-neutral-700">
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-xl flex items-center justify-center mb-4">
              <Upload className="text-green-600" size={24} />
            </div>
            <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-2">
              Accessible
            </h3>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              ARIA labels, keyboard navigation, and focus management
            </p>
          </div>
        </div>

        {/* Modal Demos */}
        <div className="space-y-6">
          {modalDemos.map((demo) => {
            const Icon = demo.icon;
            return (
              <div
                key={demo.title}
                className="bg-white dark:bg-neutral-800 rounded-2xl p-6 border border-neutral-200 dark:border-neutral-700"
              >
                <div className="flex items-start gap-4 mb-4">
                  <div
                    className={`w-12 h-12 ${demo.color} rounded-xl flex items-center justify-center shrink-0`}
                  >
                    <Icon className="text-white" size={24} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-neutral-900 dark:text-white mb-1">
                      {demo.title}
                    </h3>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">
                      {demo.description}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  {demo.actions.map((action) => (
                    <button
                      key={action.label}
                      onClick={action.onClick}
                      className="px-4 py-2.5 bg-neutral-100 dark:bg-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-600 text-neutral-900 dark:text-white font-semibold rounded-xl transition-colors"
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Usage Example */}
        <div className="mt-8 bg-neutral-900 dark:bg-neutral-800 rounded-2xl p-6 border border-neutral-700">
          <h3 className="text-lg font-bold text-white mb-4">Usage Example</h3>
          <pre className="text-sm text-green-400 font-mono overflow-x-auto">
            {`import { useModal } from '@/contexts/ModalContext';

function MyComponent() {
  const { openModal } = useModal();

  const handleOpenPayment = () => {
    openModal('payment', {
      amount: 2500,
      agreementId: '123',
      onSubmit: async (data) => {
        // Handle payment
      },
    });
  };

  return <button onClick={handleOpenPayment}>Pay Rent</button>;
}`}
          </pre>
        </div>
      </div>
    </div>
  );
}
