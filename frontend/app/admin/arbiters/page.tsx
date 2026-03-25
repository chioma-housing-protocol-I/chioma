'use client';

import { useEffect, useState } from 'react';
import { ArbiterManagement } from '@/components/admin/ArbiterManagement';

interface Arbiter {
  id: string;
  name: string;
  email: string;
  status: 'active' | 'inactive' | 'on-leave';
  experience: number;
  totalCases: number;
  resolvedCases: number;
  rating: number;
  resolutionTime: number;
  activeCases: number;
  joinDate: string;
}

export default function ArbitersPage() {
  const [arbiters, setArbiters] = useState<Arbiter[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: Fetch arbiters from API
    // For now, use mock data
    const mockArbiters: Arbiter[] = [
      {
        id: '1',
        name: 'John Doe',
        email: 'john@example.com',
        status: 'active',
        experience: 5,
        totalCases: 45,
        resolvedCases: 43,
        rating: 4.8,
        resolutionTime: 72,
        activeCases: 2,
        joinDate: '2022-01-15',
      },
      {
        id: '2',
        name: 'Jane Smith',
        email: 'jane@example.com',
        status: 'active',
        experience: 7,
        totalCases: 68,
        resolvedCases: 67,
        rating: 4.9,
        resolutionTime: 60,
        activeCases: 1,
        joinDate: '2020-06-20',
      },
      {
        id: '3',
        name: 'Mike Johnson',
        email: 'mike@example.com',
        status: 'on-leave',
        experience: 3,
        totalCases: 28,
        resolvedCases: 27,
        rating: 4.6,
        resolutionTime: 84,
        activeCases: 0,
        joinDate: '2023-03-10',
      },
      {
        id: '4',
        name: 'Sarah Wilson',
        email: 'sarah@example.com',
        status: 'active',
        experience: 6,
        totalCases: 52,
        resolvedCases: 51,
        rating: 4.7,
        resolutionTime: 66,
        activeCases: 3,
        joinDate: '2021-09-05',
      },
      {
        id: '5',
        name: 'David Brown',
        email: 'david@example.com',
        status: 'inactive',
        experience: 4,
        totalCases: 35,
        resolvedCases: 35,
        rating: 4.5,
        resolutionTime: 96,
        activeCases: 0,
        joinDate: '2022-11-12',
      },
    ];

    setArbiters(mockArbiters);
    setLoading(false);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Arbiter Management</h1>
          <p className="mt-2 text-gray-600">
            Manage arbiters, assign them to disputes, and track their performance
          </p>
        </div>

        {/* Main Content */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-gray-500">Loading arbiters...</p>
          </div>
        ) : (
          <ArbiterManagement initialArbiters={arbiters} />
        )}
      </div>
    </div>
  );
}
