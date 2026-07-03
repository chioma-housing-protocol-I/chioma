'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import {
  User,
  Mail,
  Phone,
  MessageSquare,
  Clock,
  CheckCircle,
  Shield,
  Building,
  Home,
} from 'lucide-react';

interface Contact {
  id: string;
  name: string;
  role: 'user';
  email: string;
  phone: string;
  avatarUrl?: string;
  isVerified: boolean;
  responseTime: string;
  propertyTitle: string;
  propertyAddress: string;
  rating?: number;
  totalProperties?: number;
}

interface HistoricalContact {
  id: string;
  name: string;
  role: 'user';
  email: string;
  phone: string;
  propertyTitle: string;
  leasePeriod: string;
}

export default function MyContactsPage() {
  const [activeContacts, setActiveContacts] = useState<Contact[]>([]);
  const [historicalContacts, setHistoricalContacts] = useState<
    HistoricalContact[]
  >([]);
  const [loading, setLoading] = useState(true);

  const fetchContacts = async () => {
    try {
      setLoading(true);
      setActiveContacts([
        {
          id: '1',
          name: 'John Doe',
          role: 'user',
          email: 'john.doe@example.com',
          phone: '+234 801 234 5678',
          isVerified: true,
          responseTime: '< 2 hours',
          propertyTitle: 'Sunset Apartments',
          propertyAddress: '123 Sunset Boulevard, Unit 4B, Lagos',
          rating: 4.8,
          totalProperties: 12,
        },
        {
          id: '2',
          name: 'Sarah Johnson',
          role: 'user',
          email: 'sarah.johnson@example.com',
          phone: '+234 802 345 6789',
          isVerified: true,
          responseTime: '< 4 hours',
          propertyTitle: 'Sunset Apartments',
          propertyAddress: '123 Sunset Boulevard, Unit 4B, Lagos',
          rating: 4.9,
          totalProperties: 25,
        },
      ]);
      setHistoricalContacts([
        {
          id: '3',
          name: 'Michael Brown',
          role: 'user',
          email: 'michael.brown@example.com',
          phone: '+234 803 456 7890',
          propertyTitle: 'Marina Heights',
          leasePeriod: 'Jun 2021 – Dec 2022',
        },
        {
          id: '4',
          name: 'Emily Davis',
          role: 'user',
          email: 'emily.davis@example.com',
          phone: '+234 804 567 8901',
          propertyTitle: 'Marina Heights',
          leasePeriod: 'Jun 2021 – Dec 2022',
        },
      ]);
    } catch (error) {
      console.error('Error fetching contacts:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchContacts();
     
  }, []);

  const getInitials = (name: string) =>
    name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black text-white tracking-tight">
          My Contacts
        </h1>
        <p className="text-blue-200/50 mt-1">
          Connect with your landlords and property managers.
        </p>
      </div>

      {/* Active Contacts */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-white">
          Current Property Contacts
        </h2>
        {activeContacts.length === 0 ? (
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-10 text-center">
            <User className="mx-auto h-10 w-10 text-blue-300/30 mb-3" />
            <p className="text-blue-200/50">No active contacts available.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {activeContacts.map((contact) => (
              <div
                key={contact.id}
                className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:border-white/20 transition-all"
              >
                <div className="flex items-start gap-4 mb-4">
                  {contact.avatarUrl ? (
                    <Image
                      src={contact.avatarUrl}
                      alt={contact.name}
                      width={56}
                      height={56}
                      className="rounded-full object-cover shrink-0"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg shrink-0">
                      {getInitials(contact.name)}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-base font-bold text-white truncate">
                        {contact.name}
                      </h3>
                      {contact.isVerified && (
                        <Shield className="w-4 h-4 text-blue-400 shrink-0" />
                      )}
                    </div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border bg-blue-500/10 text-blue-400 border-blue-500/20`}
                      >
                        <Building className="w-3 h-3" />
                        Contact
                      </span>
                      {contact.rating && (
                        <span className="text-xs text-blue-200/50">
                          ⭐ {contact.rating}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-blue-200/40">
                      <Clock className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Avg. response: {contact.responseTime}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white/5 border border-white/5 rounded-xl p-3 mb-4">
                  <div className="flex items-start gap-2">
                    <Home className="w-4 h-4 text-blue-300/40 mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white">
                        {contact.propertyTitle}
                      </p>
                      <p className="text-xs text-blue-200/40 truncate">
                        {contact.propertyAddress}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {[
                    {
                      icon: MessageSquare,
                      label: 'Message',
                      color: 'text-blue-400',
                      bg: 'bg-blue-500/10 border-blue-500/20 hover:bg-blue-500/20',
                    },
                    {
                      icon: Mail,
                      label: 'Email',
                      color: 'text-white/60',
                      bg: 'bg-white/5 border-white/10 hover:bg-white/10',
                      onClick: () => {
                        window.location.href = `mailto:${contact.email}`;
                      },
                    },
                    {
                      icon: Phone,
                      label: 'Call',
                      color: 'text-white/60',
                      bg: 'bg-white/5 border-white/10 hover:bg-white/10',
                      onClick: () => {
                        window.location.href = `tel:${contact.phone}`;
                      },
                    },
                  ].map(({ icon: Icon, label, color, bg, onClick }) => (
                    <button
                      key={label}
                      onClick={onClick}
                      className={`flex flex-col items-center justify-center p-3 ${bg} border rounded-xl transition-colors`}
                    >
                      <Icon className={`w-4 h-4 ${color} mb-1`} />
                      <span className="text-xs font-medium text-blue-200/60">
                        {label}
                      </span>
                    </button>
                  ))}
                </div>

                {contact.totalProperties && (
                  <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between text-xs text-blue-200/40">
                    <span>Manages {contact.totalProperties} properties</span>
                    {contact.isVerified && (
                      <span className="flex items-center gap-1 text-emerald-400">
                        <CheckCircle className="w-3 h-3" /> Verified
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Previous Contacts */}
      {historicalContacts.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-white">Previous Contacts</h2>
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-white/5 border-b border-white/5">
                  <tr>
                    {[
                      'Contact',
                      'Role',
                      'Property',
                      'Lease Period',
                      'Actions',
                    ].map((h) => (
                      <th
                        key={h}
                        className="px-6 py-4 text-left text-xs font-bold text-blue-300/40 uppercase tracking-widest"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {historicalContacts.map((contact) => (
                    <tr
                      key={contact.id}
                      className="hover:bg-white/5 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white text-xs font-bold shrink-0">
                            {getInitials(contact.name)}
                          </div>
                          <div>
                            <p className="font-semibold text-white">
                              {contact.name}
                            </p>
                            <p className="text-xs text-blue-200/40">
                              {contact.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border bg-blue-500/10 text-blue-400 border-blue-500/20`}
                        >
                          Contact
                        </span>
                      </td>
                      <td className="px-6 py-4 text-blue-200/60">
                        {contact.propertyTitle}
                      </td>
                      <td className="px-6 py-4 text-blue-200/60">
                        {contact.leasePeriod}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              window.location.href = `mailto:${contact.email}`;
                            }}
                            className="p-2 text-blue-200/40 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                          >
                            <Mail className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              window.location.href = `tel:${contact.phone}`;
                            }}
                            className="p-2 text-blue-200/40 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                          >
                            <Phone className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
