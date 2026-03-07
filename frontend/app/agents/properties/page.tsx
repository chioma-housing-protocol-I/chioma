'use client';

import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/dashboard/agent/DashboardLayout';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import {
  Building2,
  MapPin,
  MoreVertical,
  Edit,
  Eye,
  X,
  ChevronLeft,
  ChevronRight,
  Search,
  Filter,
  Calendar,
  User,
  DollarSign,
} from 'lucide-react';

interface Property {
  id: string;
  title: string;
  address: string;
  status: 'rented' | 'vacant' | 'maintenance';
  monthlyRent: number;
  assignedLandlord: string;
  landlordId: string;
  leaseRenewalDate: string | null;
  image?: string;
  createdAt: string;
}

const AgentPropertiesPage = () => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'rented' | 'vacant' | 'maintenance'
  >('all');
  const [selectedProperty, setSelectedProperty] = useState<string | null>(null);
  const itemsPerPage = 10;

  useEffect(() => {
    // Simulate API call to fetch agent properties
    const fetchProperties = async () => {
      setIsLoading(true);
      await new Promise((resolve) => setTimeout(resolve, 800));

      // Mock data - in production, this would come from an API
      const mockProperties: Property[] = [
        {
          id: 'prop-1',
          title: 'Highland Luxury Apartment',
          address: '123 Main Street, Victoria Island, Lagos',
          status: 'rented',
          monthlyRent: 2400,
          assignedLandlord: 'James Obi',
          landlordId: 'landlord-1',
          leaseRenewalDate: '2024-12-15',
          createdAt: '2024-01-15',
        },
        {
          id: 'prop-2',
          title: 'Sunset View Villa',
          address: '456 Lekki Expressway, Lekki, Lagos',
          status: 'vacant',
          monthlyRent: 3500,
          assignedLandlord: 'Sarah Okafor',
          landlordId: 'landlord-2',
          leaseRenewalDate: null,
          createdAt: '2024-02-20',
        },
        {
          id: 'prop-3',
          title: 'Modern Studio Apartment',
          address: '789 Ikoyi Road, Ikoyi, Lagos',
          status: 'rented',
          monthlyRent: 1800,
          assignedLandlord: 'David Ibrahim',
          landlordId: 'landlord-3',
          leaseRenewalDate: '2025-01-20',
          createdAt: '2024-03-10',
        },
        {
          id: 'prop-4',
          title: 'Beachfront Condo',
          address: '321 Banana Island, Lagos',
          status: 'maintenance',
          monthlyRent: 4200,
          assignedLandlord: 'Grace A.',
          landlordId: 'landlord-4',
          leaseRenewalDate: null,
          createdAt: '2024-04-05',
        },
        {
          id: 'prop-5',
          title: 'Downtown Loft',
          address: '555 Yaba Street, Yaba, Lagos',
          status: 'rented',
          monthlyRent: 2800,
          assignedLandlord: 'Emmanuel K.',
          landlordId: 'landlord-5',
          leaseRenewalDate: '2024-11-30',
          createdAt: '2024-05-12',
        },
        {
          id: 'prop-6',
          title: 'Garden Estate House',
          address: '777 Eko Atlantic, Lagos',
          status: 'vacant',
          monthlyRent: 5500,
          assignedLandlord: 'James Obi',
          landlordId: 'landlord-1',
          leaseRenewalDate: null,
          createdAt: '2024-06-18',
        },
        {
          id: 'prop-7',
          title: 'Executive Penthouse',
          address: '999 Victoria Island, Lagos',
          status: 'rented',
          monthlyRent: 6800,
          assignedLandlord: 'Sarah Okafor',
          landlordId: 'landlord-2',
          leaseRenewalDate: '2025-03-15',
          createdAt: '2024-07-22',
        },
        {
          id: 'prop-8',
          title: 'Cozy 2-Bed Apartment',
          address: '111 Lekki Phase 1, Lagos',
          status: 'rented',
          monthlyRent: 2100,
          assignedLandlord: 'David Ibrahim',
          landlordId: 'landlord-3',
          leaseRenewalDate: '2024-12-10',
          createdAt: '2024-08-30',
        },
      ];

      setProperties(mockProperties);
      setTotalPages(Math.ceil(mockProperties.length / itemsPerPage));
      setIsLoading(false);
    };

    fetchProperties();
  }, []);

  const getStatusBadge = (status: Property['status']) => {
    switch (status) {
      case 'rented':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5"></span>
            Rented
          </span>
        );
      case 'vacant':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1.5"></span>
            Vacant
          </span>
        );
      case 'maintenance':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mr-1.5"></span>
            Maintenance
          </span>
        );
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getDaysUntilRenewal = (dateString: string | null) => {
    if (!dateString) return null;
    const renewalDate = new Date(dateString);
    const today = new Date();
    const diffTime = renewalDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const handleEdit = (propertyId: string) => {
    // Navigate to edit page
    console.log('Edit property:', propertyId);
    // router.push(`/agents/properties/${propertyId}/edit`);
  };

  const handleUnpublish = (propertyId: string) => {
    // Handle unpublish action
    console.log('Unpublish property:', propertyId);
    // Show confirmation modal and update property status
  };

  const handleViewContract = (propertyId: string) => {
    // Navigate to contract details
    console.log('View contract for property:', propertyId);
    // router.push(`/agents/contracts?property=${propertyId}`);
  };

  // Filter and search properties
  const filteredProperties = properties.filter((property) => {
    const matchesSearch =
      property.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      property.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      property.assignedLandlord
        .toLowerCase()
        .includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === 'all' || property.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Calculate total pages from filtered results
  const totalFilteredPages = Math.ceil(
    filteredProperties.length / itemsPerPage,
  );

  // Paginate filtered results
  const paginatedProperties = filteredProperties.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  // Reset to page 1 if current page exceeds total pages
  useEffect(() => {
    if (currentPage > totalFilteredPages && totalFilteredPages > 0) {
      setCurrentPage(1);
    }
  }, [totalFilteredPages, currentPage]);

  // Update total pages when filtered results change
  useEffect(() => {
    setTotalPages(totalFilteredPages);
  }, [totalFilteredPages]);

  if (isLoading) {
    return (
      <ProtectedRoute>
        <DashboardLayout>
          <div className="max-w-7xl mx-auto space-y-6 pt-4 sm:pt-6">
            <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 p-8">
              <div className="animate-pulse space-y-4">
                <div className="h-8 bg-neutral-200 rounded w-1/4"></div>
                <div className="h-4 bg-neutral-200 rounded w-1/2"></div>
                <div className="space-y-3 mt-6">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="h-16 bg-neutral-100 rounded"></div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="max-w-7xl mx-auto space-y-6 pt-4 sm:pt-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">
                Properties Management
              </h1>
              <p className="text-neutral-500 mt-1 text-sm">
                Manage all properties you represent or have listed on behalf of
                landlords
              </p>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 p-4 sm:p-6">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search */}
              <div className="flex-1 relative">
                <Search
                  size={18}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400"
                />
                <input
                  type="text"
                  placeholder="Search by property name, address, or landlord..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-11 pr-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm outline-none focus:border-brand-blue/50 focus:ring-4 focus:ring-brand-blue/5 transition-all"
                />
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-2">
                <Filter size={18} className="text-neutral-400 shrink-0" />
                <select
                  value={statusFilter}
                  onChange={(e) =>
                    setStatusFilter(
                      e.target.value as
                        | 'all'
                        | 'rented'
                        | 'vacant'
                        | 'maintenance',
                    )
                  }
                  className="px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm font-medium text-neutral-700 outline-none focus:border-brand-blue/50 focus:ring-4 focus:ring-brand-blue/5 transition-all cursor-pointer"
                >
                  <option value="all">All Status</option>
                  <option value="rented">Rented</option>
                  <option value="vacant">Vacant</option>
                  <option value="maintenance">Maintenance</option>
                </select>
              </div>
            </div>

            {/* Results Count */}
            <div className="mt-4 pt-4 border-t border-neutral-100">
              <p className="text-sm text-neutral-600">
                Showing{' '}
                <span className="font-semibold text-neutral-900">
                  {paginatedProperties.length}
                </span>{' '}
                of{' '}
                <span className="font-semibold text-neutral-900">
                  {filteredProperties.length}
                </span>{' '}
                properties
              </p>
            </div>
          </div>

          {/* Properties Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse min-w-[1000px]">
                <thead>
                  <tr className="bg-neutral-50/50 border-b border-neutral-100">
                    <th className="px-6 py-4 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                      Property
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                      <div className="flex items-center gap-1.5">
                        <User size={14} />
                        Assigned Landlord
                      </div>
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                      <div className="flex items-center gap-1.5">
                        <DollarSign size={14} />
                        Current Rent
                      </div>
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                      <div className="flex items-center gap-1.5">
                        <Calendar size={14} />
                        Lease Renewal
                      </div>
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {paginatedProperties.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center justify-center">
                          <Building2
                            size={48}
                            className="text-neutral-300 mb-3"
                          />
                          <p className="text-neutral-600 font-medium">
                            No properties found
                          </p>
                          <p className="text-neutral-500 text-sm mt-1">
                            Try adjusting your search or filter criteria
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedProperties.map((property) => {
                      const daysUntilRenewal = getDaysUntilRenewal(
                        property.leaseRenewalDate,
                      );
                      const isRenewalSoon =
                        daysUntilRenewal !== null && daysUntilRenewal <= 30;

                      return (
                        <tr
                          key={property.id}
                          className="hover:bg-neutral-50/50 transition-colors group"
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center text-neutral-400 group-hover:bg-brand-blue/10 group-hover:text-brand-blue transition-colors shrink-0">
                                <Building2 size={20} />
                              </div>
                              <div className="min-w-0">
                                <h4 className="font-semibold text-neutral-900 group-hover:text-brand-blue transition-colors text-sm">
                                  {property.title}
                                </h4>
                                <div className="flex items-center text-xs text-neutral-500 mt-0.5">
                                  <MapPin size={12} className="mr-1 shrink-0" />
                                  <span className="truncate">
                                    {property.address}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            {getStatusBadge(property.status)}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-brand-blue/10 flex items-center justify-center text-brand-blue text-xs font-semibold shrink-0">
                                {property.assignedLandlord.charAt(0)}
                              </div>
                              <span className="text-sm font-medium text-neutral-700">
                                {property.assignedLandlord}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm">
                              <span className="font-semibold text-neutral-900">
                                ${property.monthlyRent.toLocaleString()}
                              </span>
                              <span className="text-neutral-500 text-xs block">
                                /month
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            {property.leaseRenewalDate ? (
                              <div className="text-sm">
                                <div
                                  className={`font-medium ${
                                    isRenewalSoon
                                      ? 'text-amber-700'
                                      : 'text-neutral-700'
                                  }`}
                                >
                                  {formatDate(property.leaseRenewalDate)}
                                </div>
                                {daysUntilRenewal !== null && (
                                  <div
                                    className={`text-xs mt-0.5 ${
                                      isRenewalSoon
                                        ? 'text-amber-600 font-medium'
                                        : 'text-neutral-500'
                                    }`}
                                  >
                                    {daysUntilRenewal > 0
                                      ? `${daysUntilRenewal} days remaining`
                                      : daysUntilRenewal === 0
                                        ? 'Renews today'
                                        : `${Math.abs(daysUntilRenewal)} days overdue`}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-sm text-neutral-400">
                                No active lease
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="relative inline-block">
                              <button
                                onClick={() =>
                                  setSelectedProperty(
                                    selectedProperty === property.id
                                      ? null
                                      : property.id,
                                  )
                                }
                                className="p-2 text-neutral-400 hover:text-brand-blue rounded-lg hover:bg-brand-blue/10 transition-colors"
                              >
                                <MoreVertical size={18} />
                              </button>

                              {selectedProperty === property.id && (
                                <>
                                  <div
                                    className="fixed inset-0 z-10"
                                    onClick={() => setSelectedProperty(null)}
                                  ></div>
                                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-neutral-200 py-2 z-20">
                                    <button
                                      onClick={() => {
                                        handleEdit(property.id);
                                        setSelectedProperty(null);
                                      }}
                                      className="w-full px-4 py-2.5 text-left text-sm text-neutral-700 hover:bg-neutral-50 transition-colors flex items-center gap-2"
                                    >
                                      <Edit
                                        size={16}
                                        className="text-neutral-400"
                                      />
                                      Edit Listing
                                    </button>
                                    <button
                                      onClick={() => {
                                        handleViewContract(property.id);
                                        setSelectedProperty(null);
                                      }}
                                      className="w-full px-4 py-2.5 text-left text-sm text-neutral-700 hover:bg-neutral-50 transition-colors flex items-center gap-2"
                                    >
                                      <Eye
                                        size={16}
                                        className="text-neutral-400"
                                      />
                                      View Contract
                                    </button>
                                    <div className="border-t border-neutral-100 my-1"></div>
                                    <button
                                      onClick={() => {
                                        handleUnpublish(property.id);
                                        setSelectedProperty(null);
                                      }}
                                      className="w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
                                    >
                                      <X size={16} />
                                      Unpublish
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-neutral-100 flex items-center justify-between">
                <div className="text-sm text-neutral-600">
                  Page{' '}
                  <span className="font-semibold text-neutral-900">
                    {currentPage}
                  </span>{' '}
                  of{' '}
                  <span className="font-semibold text-neutral-900">
                    {totalPages}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      setCurrentPage((prev) => Math.max(1, prev - 1))
                    }
                    disabled={currentPage === 1}
                    className={`p-2 rounded-lg border transition-colors ${
                      currentPage === 1
                        ? 'border-neutral-200 text-neutral-300 cursor-not-allowed'
                        : 'border-neutral-200 text-neutral-600 hover:bg-neutral-50 hover:border-brand-blue/50 hover:text-brand-blue'
                    }`}
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <button
                    onClick={() =>
                      setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                    }
                    disabled={currentPage === totalPages}
                    className={`p-2 rounded-lg border transition-colors ${
                      currentPage === totalPages
                        ? 'border-neutral-200 text-neutral-300 cursor-not-allowed'
                        : 'border-neutral-200 text-neutral-600 hover:bg-neutral-50 hover:border-brand-blue/50 hover:text-brand-blue'
                    }`}
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
};

export default AgentPropertiesPage;
