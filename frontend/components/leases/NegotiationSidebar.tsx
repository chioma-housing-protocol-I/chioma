'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Send,
  History,
  Check,
  XCircle,
  MessageCircle,
  DollarSign,
  Calendar,
  ArrowRight,
  User,
  ShieldCheck,
  Briefcase,
  Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import type {
  Contract,
  NegotiationOffer,
  NegotiationMessage,
  ProposerRole,
} from '@/types/contracts';
import { useAuthStore } from '@/store/authStore';

interface NegotiationSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  contract: Contract;
  offers: NegotiationOffer[];
  messages: NegotiationMessage[];
  onPropose: (offer: Partial<NegotiationOffer>) => void;
  onAccept: (offerId: string) => void;
  onReject: (offerId: string) => void;
  onSendMessage: (content: string, offerId?: string) => void;
}

export function NegotiationSidebar({
  isOpen,
  onClose,
  contract,
  offers,
  messages,
  onPropose,
  onAccept,
  onReject,
  onSendMessage,
}: NegotiationSidebarProps) {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'chat' | 'offers'>('chat');
  const [newMessage, setNewMessage] = useState('');
  const [isProposing, setIsProposing] = useState(false);
  const [proposal, setProposal] = useState({
    rentAmount: contract.rentAmount,
    startDate: contract.startDate,
    endDate: contract.endDate,
    message: '',
  });

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, activeTab]);

  if (!isOpen) return null;

  const currentOffer = offers.find((o) => o.status === 'PENDING');
  const userRole: ProposerRole = user?.role === 'admin' ? 'LANDLORD' : 'TENANT';

  const handlePropose = () => {
    onPropose({
      ...proposal,
      contractId: contract.id,
      proposerRole: userRole,
    });
    setIsProposing(false);
    setActiveTab('offers');
  };

  // Helper to render a diff between original and new value
  const renderTermDiff = (
    label: string,
    originalValue: string | number,
    proposedValue: string | number,
    isDate = false,
  ) => {
    const originalStr = isDate
      ? new Date(originalValue as string).toLocaleDateString()
      : `$${(originalValue as number).toLocaleString()}`;
    const proposedStr = isDate
      ? new Date(proposedValue as string).toLocaleDateString()
      : `$${(proposedValue as number).toLocaleString()}`;
    const hasChanged = originalValue !== proposedValue;

    return (
      <div>
        <p className="text-[10px] text-neutral-400 uppercase font-bold">
          {label}
        </p>
        {hasChanged ? (
          <p className="text-sm flex items-center gap-2">
            <span className="text-neutral-500 line-through text-xs">
              {originalStr}
            </span>
            <span className="text-neutral-400">→</span>
            <span className="font-bold text-neutral-900">{proposedStr}</span>
          </p>
        ) : (
          <p className="text-sm font-bold text-neutral-900">{proposedStr}</p>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-neutral-900/40 backdrop-blur-sm z-40 transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Sidebar */}
      <div className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-2xl z-50 flex flex-col transform transition-transform duration-300 ease-out border-l border-neutral-200">
        {/* Header */}
        <div className="px-6 py-5 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/50">
          <div>
            <h2 className="text-xl font-bold text-neutral-900">
              Lease Negotiation
            </h2>
            <p className="text-xs text-neutral-500 mt-1 flex items-center gap-1">
              <Info size={12} /> Negotiating terms for {contract.propertyName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-neutral-200 rounded-full transition-colors text-neutral-500"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex p-1 bg-neutral-100 mx-6 mt-4 rounded-xl">
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-lg transition-all ${
              activeTab === 'chat'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-neutral-500 hover:text-neutral-700'
            }`}
          >
            <MessageCircle size={16} />
            Messages
          </button>
          <button
            onClick={() => setActiveTab('offers')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-lg transition-all ${
              activeTab === 'offers'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-neutral-500 hover:text-neutral-700'
            }`}
          >
            <History size={16} />
            Offers
            {offers.length > 0 && (
              <span className="ml-1 w-5 h-5 rounded-full bg-blue-100 text-blue-600 text-[10px] flex items-center justify-center font-bold">
                {offers.length}
              </span>
            )}
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {activeTab === 'chat' ? (
            <>
              {/* Messages List */}
              <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-6 space-y-4"
              >
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center opacity-40 grayscale py-12">
                    <MessageCircle
                      size={48}
                      className="mb-4 text-neutral-300"
                    />
                    <p className="text-sm">
                      No messages yet.
                      <br />
                      Start the conversation!
                    </p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isOwn = msg.senderId === user?.id;
                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}
                      >
                        <div
                          className={`max-w-[85%] px-4 py-2 rounded-2xl text-sm ${
                            isOwn
                              ? 'bg-blue-600 text-white rounded-tr-none'
                              : 'bg-neutral-100 text-neutral-800 rounded-tl-none border border-neutral-200'
                          }`}
                        >
                          {msg.content}
                        </div>
                        <span className="text-[10px] text-neutral-400 mt-1 px-1">
                          {isOwn ? 'You' : msg.senderName} •{' '}
                          {new Date(msg.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Message Input */}
              <div className="p-4 border-t border-neutral-100 bg-white shadow-[0_-4px_12px_rgba(0,0,0,0.02)]">
                <div className="relative group">
                  <Input
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) =>
                      e.key === 'Enter' &&
                      newMessage &&
                      (onSendMessage(newMessage), setNewMessage(''))
                    }
                    className="pr-12 py-6 rounded-2xl bg-neutral-50 border-neutral-200 focus:bg-white transition-all focus:ring-2 focus:ring-blue-100"
                  />
                  <button
                    disabled={!newMessage}
                    onClick={() => {
                      onSendMessage(newMessage);
                      setNewMessage('');
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-30 disabled:hover:bg-blue-600 transition-all shadow-lg shadow-blue-200 group-focus-within:scale-105"
                  >
                    <Send size={18} />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* New Proposal Form */}
              {isProposing ? (
                <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-5 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                  <h3 className="text-sm font-bold text-blue-900 flex items-center gap-2">
                    <ArrowRight size={14} /> Propose New Terms
                  </h3>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-[11px] text-blue-700 flex items-center gap-1">
                        <DollarSign size={10} /> Monthly Rent
                      </Label>
                      <Input
                        type="number"
                        value={proposal.rentAmount}
                        onChange={(e) =>
                          setProposal({
                            ...proposal,
                            rentAmount: e.target.value,
                          })
                        }
                        className="h-9 rounded-lg bg-white border-blue-200 text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[11px] text-blue-700 flex items-center gap-1">
                        <Calendar size={10} /> Start Date
                      </Label>
                      <Input
                        type="date"
                        value={proposal.startDate}
                        onChange={(e) =>
                          setProposal({
                            ...proposal,
                            startDate: e.target.value,
                          })
                        }
                        className="h-9 rounded-lg bg-white border-blue-200 text-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5 text-blue-700">
                    <Label className="text-[11px] flex items-center gap-1">
                      <MessageCircle size={10} /> Message to Landlord
                    </Label>
                    <Textarea
                      placeholder="Explain your proposal..."
                      value={proposal.message}
                      onChange={(e) =>
                        setProposal({ ...proposal, message: e.target.value })
                      }
                      className="min-h-[80px] rounded-lg bg-white border-blue-200 text-sm resize-none"
                    />
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      onClick={() => setIsProposing(false)}
                      className="flex-1 h-9 rounded-lg border-blue-200 bg-white text-blue-600 hover:bg-blue-100"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handlePropose}
                      className="flex-1 h-9 rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-200"
                    >
                      Submit Proposal
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  onClick={() => setIsProposing(true)}
                  className="w-full py-6 rounded-2xl border-2 border-dashed border-neutral-200 hover:border-blue-400 hover:bg-blue-50 text-neutral-500 hover:text-blue-600 transition-all bg-transparent font-semibold flex items-center gap-2"
                >
                  <ArrowRight size={18} />
                  Make a Counter-Offer
                </Button>
              )}

              {/* Offers History */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-widest px-1">
                  Proposal History
                </h3>
                {offers.length === 0 ? (
                  <div className="py-8 text-center text-neutral-400 text-sm italic">
                    No proposals yet
                  </div>
                ) : (
                  offers
                    .sort(
                      (a, b) =>
                        new Date(b.createdAt).getTime() -
                        new Date(a.createdAt).getTime(),
                    )
                    .map((offer) => (
                      <div
                        key={offer.id}
                        className={`relative overflow-hidden rounded-2xl border transition-all ${
                          offer.status === 'PENDING'
                            ? 'border-blue-300 bg-blue-50/20 shadow-md ring-2 ring-blue-50'
                            : 'border-neutral-200 bg-white'
                        }`}
                      >
                        {/* Status Stripe */}
                        <div
                          className={`h-1 w-full ${
                            offer.status === 'ACCEPTED'
                              ? 'bg-green-500'
                              : offer.status === 'REJECTED'
                                ? 'bg-red-500'
                                : offer.status === 'COUNTERED'
                                  ? 'bg-orange-400'
                                  : 'bg-blue-500'
                          }`}
                        />

                        <div className="p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div
                                className={`p-1.5 rounded-lg ${
                                  offer.proposerRole === userRole
                                    ? 'bg-blue-100 text-blue-600'
                                    : 'bg-neutral-100 text-neutral-600'
                                }`}
                              >
                                {offer.proposerRole === 'LANDLORD' ? (
                                  <Briefcase size={14} />
                                ) : (
                                  <User size={14} />
                                )}
                              </div>
                              <div>
                                <p className="text-xs font-bold text-neutral-900">
                                  {offer.proposerRole === userRole
                                    ? 'Your Proposal'
                                    : `${offer.proposerRole}'s Proposal`}
                                </p>
                                <p className="text-[10px] text-neutral-400">
                                  {new Date(
                                    offer.createdAt,
                                  ).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            <Badge
                              variant={
                                offer.status === 'ACCEPTED'
                                  ? 'secondary'
                                  : offer.status === 'REJECTED'
                                    ? 'destructive'
                                    : offer.status === 'PENDING'
                                      ? 'secondary'
                                      : 'outline'
                              }
                              className="text-[10px] font-bold"
                            >
                              {offer.status}
                            </Badge>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white/50 rounded-xl p-3 border border-neutral-100">
                            {renderTermDiff(
                              'Rent',
                              contract.rentAmount,
                              offer.rentAmount,
                              false,
                            )}
                            {renderTermDiff(
                              'Start Date',
                              contract.startDate,
                              offer.startDate,
                              true,
                            )}
                            {renderTermDiff(
                              'End Date',
                              contract.endDate,
                              offer.endDate,
                              true,
                            )}
                          </div>

                          {offer.message && (
                            <p className="text-xs text-neutral-600 bg-neutral-50 p-2 rounded-lg italic">
                              "{offer.message}"
                            </p>
                          )}

                          {offer.message && (
                            <p className="text-xs text-neutral-600 bg-neutral-50 p-2 rounded-lg italic">
                              "{offer.message}"
                            </p>
                          )}

                          {offer.status === 'PENDING' &&
                            offer.proposerRole !== userRole && (
                              <div className="flex gap-2 pt-2">
                                <Button
                                  variant="outline"
                                  onClick={() => onReject(offer.id)}
                                  className="flex-1 h-10 rounded-xl border-red-200 text-red-600 hover:bg-red-50 flex items-center gap-2 font-bold text-xs"
                                >
                                  <XCircle size={14} /> Reject
                                </Button>
                                <Button
                                  onClick={() => onAccept(offer.id)}
                                  className="flex-1 h-10 rounded-xl bg-green-600 hover:bg-green-700 text-white shadow-md shadow-green-200 flex items-center gap-2 font-bold text-xs"
                                >
                                  <Check size={14} /> Accept
                                </Button>
                              </div>
                            )}
                        </div>
                      </div>
                    ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer Info */}
        <div className="p-4 bg-neutral-50 border-t border-neutral-100 flex items-center justify-center gap-2">
          <ShieldCheck size={14} className="text-blue-500" />
          <p className="text-[10px] text-neutral-500 font-medium">
            All negotiations are secure and encrypted.
          </p>
        </div>
      </div>
    </>
  );
}
