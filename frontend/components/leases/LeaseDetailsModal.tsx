'use client';

import { X, CheckCircle2, ShieldAlert } from 'lucide-react';
import { useState } from 'react';
import { SignaturePad } from './SignaturePad';
import { NegotiationSidebar } from './NegotiationSidebar';
import toast from 'react-hot-toast';
import type {
  NegotiationOffer,
  NegotiationMessage,
  Contract,
} from '@/types/contracts';
import { MessageSquare } from 'lucide-react';

export type LeaseStatus = 'ACTIVE' | 'PENDING' | 'EXPIRED';

export interface Lease {
  id: string;
  property: string;
  tenantName: string;
  landlordName: string;
  rentAmount: string;
  startDate: string;
  endDate: string;
  status: LeaseStatus;
  terms: string;
}

interface LeaseDetailsModalProps {
  lease: Lease;
  onClose: () => void;
  currentUserRole: 'user' | 'admin';
  onSignComplete?: (leaseId: string) => Promise<void>;
}

export function LeaseDetailsModal({
  lease,
  onClose,
  currentUserRole,
  onSignComplete,
}: LeaseDetailsModalProps) {
  const [isSigning, setIsSigning] = useState(false);
  const [isSignMode, setIsSignMode] = useState(false);
  const [isNegotiating, setIsNegotiating] = useState(false);

  // Mock data for demonstration
  const [offers, setOffers] = useState<NegotiationOffer[]>([
    {
      id: 'off-1',
      contractId: lease.id,
      proposerRole: 'LANDLORD',
      rentAmount: lease.rentAmount,
      startDate: lease.startDate,
      endDate: lease.endDate,
      message: 'Initial lease terms',
      status: 'PENDING',
      createdAt: new Date(Date.now() - 86400000).toISOString(),
    },
  ]);

  const [messages, setMessages] = useState<NegotiationMessage[]>([
    {
      id: 'msg-1',
      senderId: 'landlord-1',
      senderName: lease.landlordName,
      content: 'Hello! I have sent the initial lease terms for your review.',
      createdAt: new Date(Date.now() - 86400000).toISOString(),
    },
  ]);

  const handlePropose = (offer: Partial<NegotiationOffer>) => {
    const newOffer: NegotiationOffer = {
      id: `off-${Date.now()}`,
      contractId: lease.id,
      proposerRole: offer.proposerRole || 'TENANT',
      rentAmount: offer.rentAmount || lease.rentAmount,
      startDate: offer.startDate || lease.startDate,
      endDate: offer.endDate || lease.endDate,
      message: offer.message || '',
      status: 'PENDING',
      createdAt: new Date().toISOString(),
    };

    // Counter previous pending offers
    setOffers((prev: NegotiationOffer[]) =>
      prev
        .map(
          (o: NegotiationOffer): NegotiationOffer =>
            o.status === 'PENDING' ? { ...o, status: 'COUNTERED' } : o,
        )
        .concat(newOffer),
    );

    // Add message
    const newMessage: NegotiationMessage = {
      id: `msg-${Date.now()}`,
      senderId: 'user-1',
      senderName: lease.tenantName,
      content: `I've proposed new terms: $${newOffer.rentAmount} rent starting ${new Date(newOffer.startDate).toLocaleDateString()}.`,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, newMessage]);

    toast.success('Counter-proposal sent!');
  };

  const handleSendMessage = (content: string) => {
    const newMessage: NegotiationMessage = {
      id: `msg-${Date.now()}`,
      senderId: 'user-1',
      senderName: lease.tenantName,
      content,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev: NegotiationMessage[]) => [...prev, newMessage]);
  };

  const handleSign = async () => {
    setIsSigning(true);
    try {
      if (onSignComplete) {
        await onSignComplete(lease.id);
      }
      toast.success('Lease agreement signed successfully!');
      onClose();
    } catch (error) {
      toast.error('Failed to sign the agreement.');
      console.error(error);
    } finally {
      setIsSigning(false);
    }
  };

  const canSign = lease.status === 'PENDING' && currentUserRole === 'user';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div
        className="absolute inset-0 bg-neutral-900/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative w-full max-w-3xl max-h-[90vh] bg-white rounded-3xl shadow-2xl flex flex-col animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 shrink-0">
          <div>
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">
              Lease Agreement
            </h2>
            <p className="text-sm font-medium text-brand-blue mt-1">
              {lease.property}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {/* Status Banner */}
          {lease.status === 'ACTIVE' && (
            <div className="bg-green-50 text-green-700 p-4 rounded-xl flex items-center gap-3 border border-green-100">
              <CheckCircle2 className="w-6 h-6 shrink-0" />
              <p className="font-semibold">
                This lease is active and digitally signed by all parties.
              </p>
            </div>
          )}
          {lease.status === 'PENDING' && (
            <div className="bg-amber-50 text-amber-700 p-4 rounded-xl flex items-center gap-3 border border-amber-100">
              <ShieldAlert className="w-6 h-6 shrink-0" />
              <p className="font-semibold">This lease is pending signature.</p>
            </div>
          )}

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-y-6 gap-x-8 bg-gray-50 p-6 rounded-2xl border border-gray-100">
            <div>
              <span className="block text-sm font-semibold text-gray-500 mb-1">
                Landlord
              </span>
              <span className="text-lg font-bold text-gray-900">
                {lease.landlordName}
              </span>
            </div>
            <div>
              <span className="block text-sm font-semibold text-gray-500 mb-1">
                Tenant
              </span>
              <span className="text-lg font-bold text-gray-900">
                {lease.tenantName}
              </span>
            </div>
            <div>
              <span className="block text-sm font-semibold text-gray-500 mb-1">
                Rent Amount
              </span>
              <span className="text-lg font-extrabold text-brand-blue">
                {lease.rentAmount}
              </span>
            </div>
            <div>
              <span className="block text-sm font-semibold text-gray-500 mb-1">
                Duration
              </span>
              <span className="text-md font-bold text-gray-900">
                {new Date(lease.startDate).toLocaleDateString()} -{' '}
                {new Date(lease.endDate).toLocaleDateString()}
              </span>
            </div>
          </div>

          {/* Terms text */}
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              Terms & Conditions
            </h3>
            <div className="bg-white border border-gray-200 rounded-xl p-6 h-64 overflow-y-auto font-mono text-sm leading-relaxed text-gray-700 whitespace-pre-wrap">
              {lease.terms}
            </div>
          </div>

          {/* Signature Mode */}
          {isSignMode && (
            <div className="pt-6 border-t border-gray-100 animate-in fade-in slide-in-from-bottom-4">
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                Provide Signature
              </h3>
              <p className="text-sm text-gray-500 mb-6">
                By signing below, you agree to all the terms and conditions
                outlined in the agreement above.
              </p>
              <SignaturePad
                onSign={handleSign}
                onCancel={() => setIsSignMode(false)}
                isSubmitting={isSigning}
              />
            </div>
          )}
        </div>

        {/* Footer actions */}
        {!isSignMode && (
          <div className="p-6 border-t border-gray-100 bg-gray-50 flex items-center justify-end gap-4 shrink-0 rounded-b-3xl">
            <button
              onClick={onClose}
              className="px-6 py-2.5 rounded-xl font-bold text-gray-600 hover:bg-gray-200 transition-colors"
            >
              Close
            </button>
            {lease.status === 'PENDING' && (
              <button
                onClick={() => setIsNegotiating(true)}
                className="px-6 py-2.5 rounded-xl font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors flex items-center gap-2"
              >
                <MessageSquare className="w-4 h-4" />
                Negotiate
              </button>
            )}
            {canSign && (
              <button
                onClick={() => setIsSignMode(true)}
                className="px-6 py-2.5 rounded-xl font-bold text-white bg-brand-blue hover:bg-blue-700 shadow-md transition-colors"
              >
                Review & Sign
              </button>
            )}
            {lease.status === 'PENDING' && currentUserRole === 'admin' && (
              <button
                disabled
                className="px-6 py-2.5 rounded-xl font-bold text-gray-400 bg-gray-100 cursor-not-allowed border border-gray-200"
              >
                Waiting for User Signature
              </button>
            )}
          </div>
        )}
      </div>

      <NegotiationSidebar
        isOpen={isNegotiating}
        onClose={() => setIsNegotiating(false)}
        contract={
          {
            ...lease,
            id: lease.id,
            propertyName: lease.property,
            propertyAddress: '',
            landlord: {
              name: lease.landlordName,
              walletAddress: '',
              role: 'ADMIN',
            },
            tenant: { name: lease.tenantName, walletAddress: '', role: 'USER' },
            agent: { name: '', walletAddress: '', role: 'USER' },
            rentAmount: lease.rentAmount,
            securityDeposit: '0',
            commissionRate: '0',
            startDate: lease.startDate,
            endDate: lease.endDate,
            status: 'PENDING',
            stage: 'DRAFTED',
            stellarTxHash: '',
            createdAt: '',
            terms: lease.terms,
          } as Contract
        }
        offers={offers}
        messages={messages}
        onPropose={handlePropose}
        onAccept={(id: string) => {
          setOffers((prev: NegotiationOffer[]) =>
            prev.map((o: NegotiationOffer) =>
              o.id === id ? { ...o, status: 'ACCEPTED' } : o,
            ),
          );
          toast.success('Offer accepted!');
        }}
        onReject={(id: string) => {
          setOffers((prev: NegotiationOffer[]) =>
            prev.map((o: NegotiationOffer) =>
              o.id === id ? { ...o, status: 'REJECTED' } : o,
            ),
          );
          toast.error('Offer rejected.');
        }}
        onSendMessage={handleSendMessage}
      />
    </div>
  );
}
