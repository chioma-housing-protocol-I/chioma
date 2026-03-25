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

// Types
interface Contact {
  id: string;
  name: string;
  role: 'landlord' | 'agent';
  email: string;
  phone: string;
  avatarUrl?: string;
  isVerified: boolean;
  responseTime: string; // e.g., "< 2 hours", "< 24 hours"
  propertyTitle: string;
  propertyAddress: string;
  rating?: number;
  totalProperties?: number;
  joinedDate?: Date;
}

interface HistoricalContact {
  id: string;
  name: string;
  role: 'landlord' | 'agent';
  email: string;
  phone: string;
  avatarUrl?: string;
  propertyTitle: string;
  leasePeriod: string;
}

export default function MyContactsPage() {
  const [activeContacts, setActiveContacts] = useState<Contact[]>([]);
  const [historicalContacts, setHistoricalContacts] = useState<
    HistoricalContact[]
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchContacts();
  }, []);

  const fetchContacts = async () => {
    try {
      setLoading(true);
      // TODO: Replace with actual API call
      // const response = await fetch('/api/contacts?tenantId=currentUserId');
      // const data = await response.json();

      // Mock data for demonstration
      setActiveContacts([
        {
          id: '1',
          name: 'John Doe',
          role: 'landlord',
          email: 'john.doe@example.com',
          phone: '+234 801 234 5678',
          isVerified: true,
          responseTime: '< 2 hours',
          propertyTitle: 'Sunset Apartments',
          propertyAddress: '123 Sunset Boulevard, Unit 4B, Lagos',
          rating: 4.8,
          totalProperties: 12,
          joinedDate: new Date('2020-01-15'),
        },
        {
          id: '2',
          name: 'Sarah Johnson',
          role: 'agent',
          email: 'sarah.johnson@example.com',
          phone: '+234 802 345 6789',
          isVerified: true,
          responseTime: '< 4 hours',
          propertyTitle: 'Sunset Apartments',
          propertyAddress: '123 Sunset Boulevard, Unit 4B, Lagos',
          rating: 4.9,
          totalProperties: 25,
          joinedDate: new Date('2019-06-20'),
        },
      ]);

      setHistoricalContacts([
        {
          id: '3',
          name: 'Michael Brown',
          role: 'landlord',
          email: 'michael.brown@example.com',
          phone: '+234 803 456 7890',
          propertyTitle: 'Marina Heights',
          leasePeriod: 'Jun 2021 - Dec 2022',
        },
        {
          id: '4',
          name: 'Emily Davis',
          role: 'agent',
          email: 'emily.davis@example.com',
          phone: '+234 804 567 8901',
          propertyTitle: 'Marina Heights',
          leasePeriod: 'Jun 2021 - Dec 2022',
        },
      ]);
    } catch (error) {
      console.error('Error fetching contacts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = (contactId: string, contactName: string) => {
    // TODO: Implement messaging functionality
    console.log('Opening message dialog for:', contactName);
  };

  const handleEmailContact = (email: string) => {
    window.location.href = `mailto:${email}`;
  };

  const handleCallContact = (phone: string) => {
    window.location.href = `tel:${phone}`;
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  };

  const getRoleIcon = (role: 'landlord' | 'agent') => {
    return role === 'landlord' ? Building : User;
  };

  const getRoleColor = (role: 'landlord' | 'agent') => {
    return role === 'landlord'
      ? 'bg-blue-50 text-blue-700'
      : 'bg-purple-50 text-purple-700';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-neutral-900 tracking-tight">
          My Contacts
        </h1>
        <p className="text-neutral-500 mt-2">
          Connect with your landlords and property managers
        </p>
      </div>

      {/* Active Contacts Section */}
      <section>
        <h2 className="text-xl font-semibold text-neutral-900 mb-4">
          Current Property Contacts
        </h2>

        {activeContacts.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 p-8 text-center">
            <User className="mx-auto h-12 w-12 text-neutral-400 mb-3" />
            <p className="text-neutral-600">No active contacts available</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {activeContacts.map((contact) => {
              const RoleIcon = getRoleIcon(contact.role);
              return (
                <div
                  key={contact.id}
                  className="bg-white rounded-2xl shadow-sm border border-neutral-200 p-6 hover:shadow-md transition-shadow"
                >
                  {/* Contact Header */}
                  <div className="flex items-start space-x-4 mb-4">
                    {/* Avatar */}
                    <div className="flex-shrink-0">
                      {contact.avatarUrl ? (
                        <Image
                          src={contact.avatarUrl}
                          alt={contact.name}
                          width={64}
                          height={64}
                          className="rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-lg font-semibold">
                          {getInitials(contact.name)}
                        </div>
                      )}
                    </div>

                    {/* Contact Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <h3 className="text-lg font-semibold text-neutral-900 truncate">
                          {contact.name}
                        </h3>
                        {contact.isVerified && (
                          <Shield className="w-4 h-4 text-blue-600 flex-shrink-0" />
                        )}
                      </div>

                      <div className="flex items-center space-x-2 mb-2">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleColor(contact.role)}`}
                        >
                          <RoleIcon className="w-3 h-3 mr-1" />
                          {contact.role === 'landlord'
                            ? 'Landlord'
                            : 'Property Agent'}
                        </span>
                        {contact.rating && (
                          <span className="text-xs text-neutral-600 flex items-center">
                            ⭐ {contact.rating}
                          </span>
                        )}
                      </div>

                      {/* Response Time */}
                      <div className="flex items-center space-x-1 text-sm text-neutral-600">
                        <Clock className="w-4 h-4 text-green-600" />
                        <span>Avg. response: {contact.responseTime}</span>
                      </div>
                    </div>
                  </div>

                  {/* Property Info */}
                  <div className="bg-neutral-50 rounded-lg p-3 mb-4">
                    <div className="flex items-start space-x-2">
                      <Home className="w-4 h-4 text-neutral-500 mt-0.5 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-neutral-900">
                          {contact.propertyTitle}
                        </p>
                        <p className="text-xs text-neutral-600 truncate">
                          {contact.propertyAddress}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Contact Actions */}
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() =>
                        handleSendMessage(contact.id, contact.name)
                      }
                      className="flex flex-col items-center justify-center p-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors group"
                    >
                      <MessageSquare className="w-5 h-5 text-blue-600 mb-1" />
                      <span className="text-xs font-medium text-blue-700">
                        Message
                      </span>
                    </button>

                    <button
                      onClick={() => handleEmailContact(contact.email)}
                      className="flex flex-col items-center justify-center p-3 bg-neutral-50 hover:bg-neutral-100 rounded-lg transition-colors group"
                    >
                      <Mail className="w-5 h-5 text-neutral-600 mb-1" />
                      <span className="text-xs font-medium text-neutral-700">
                        Email
                      </span>
                    </button>

                    <button
                      onClick={() => handleCallContact(contact.phone)}
                      className="flex flex-col items-center justify-center p-3 bg-neutral-50 hover:bg-neutral-100 rounded-lg transition-colors group"
                    >
                      <Phone className="w-5 h-5 text-neutral-600 mb-1" />
                      <span className="text-xs font-medium text-neutral-700">
                        Call
                      </span>
                    </button>
                  </div>

                  {/* Additional Info */}
                  {contact.totalProperties && (
                    <div className="mt-4 pt-4 border-t border-neutral-100">
                      <div className="flex items-center justify-between text-xs text-neutral-600">
                        <span>
                          Manages {contact.totalProperties} properties
                        </span>
                        {contact.isVerified && (
                          <span className="flex items-center text-green-600">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Verified
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Historical Contacts Section */}
      {historicalContacts.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold text-neutral-900 mb-4">
            Previous Contacts
          </h2>

          <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-neutral-50 border-b border-neutral-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      Property
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      Lease Period
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {historicalContacts.map((contact) => {
                    const RoleIcon = getRoleIcon(contact.role);
                    return (
                      <tr key={contact.id} className="hover:bg-neutral-50">
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-3">
                            <div className="flex-shrink-0">
                              {contact.avatarUrl ? (
                                <Image
                                  src={contact.avatarUrl}
                                  alt={contact.name}
                                  width={40}
                                  height={40}
                                  className="rounded-full object-cover"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-neutral-400 to-neutral-600 flex items-center justify-center text-white text-sm font-semibold">
                                  {getInitials(contact.name)}
                                </div>
                              )}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-neutral-900">
                                {contact.name}
                              </p>
                              <p className="text-xs text-neutral-500">
                                {contact.email}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleColor(contact.role)}`}
                          >
                            <RoleIcon className="w-3 h-3 mr-1" />
                            {contact.role === 'landlord' ? 'Landlord' : 'Agent'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-neutral-600">
                          {contact.propertyTitle}
                        </td>
                        <td className="px-6 py-4 text-sm text-neutral-600">
                          {contact.leasePeriod}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleEmailContact(contact.email)}
                              className="p-2 text-neutral-600 hover:bg-neutral-100 rounded-lg transition-colors"
                              title="Send Email"
                            >
                              <Mail className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleCallContact(contact.phone)}
                              className="p-2 text-neutral-600 hover:bg-neutral-100 rounded-lg transition-colors"
                              title="Call"
                            >
                              <Phone className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
