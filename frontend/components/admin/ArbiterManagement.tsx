'use client';

import { useState, useCallback } from 'react';
import { ArbiterList } from './ArbiterList';
import { ArbiterStats } from './ArbiterStats';
import {
  ArbiterAssignment,
  type ArbiterAssignmentPayload,
} from './ArbiterAssignment';
import { Button } from '@/components/ui/button';

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

interface ArbiterManagementProps {
  initialArbiters?: Arbiter[];
}

export function ArbiterManagement({
  initialArbiters = [],
}: ArbiterManagementProps) {
  const [arbiters] = useState<Arbiter[]>(initialArbiters);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [selectedArbiterId, setSelectedArbiterId] = useState<string | null>(
    null,
  );
  const [loading, setLoading] = useState(false);

  const handleAssign = useCallback((arbiterId: string) => {
    setSelectedArbiterId(arbiterId);
    setShowAssignmentModal(true);
  }, []);

  const handleAssignmentSubmit = useCallback(
    async (data: ArbiterAssignmentPayload) => {
      setLoading(true);
      try {
        // TODO: Call API to assign arbiter to dispute
        console.log('Assigning arbiter:', selectedArbiterId, data);
        setShowAssignmentModal(false);
        // Show success toast
      } catch (error) {
        console.error('Assignment error:', error);
        // Show error toast
      } finally {
        setLoading(false);
      }
    },
    [selectedArbiterId],
  );

  const handleViewDetails = useCallback((arbiterId: string) => {
    // TODO: Open details modal or navigate to details page
    console.log('Viewing details for:', arbiterId);
  }, []);

  const stats = {
    totalArbiters: arbiters.length,
    activeArbiters: arbiters.filter((a) => a.status === 'active').length,
    avgResolutionTime: Math.round(
      arbiters.reduce((sum, a) => sum + a.resolutionTime, 0) / arbiters.length,
    ),
    avgRating: (
      arbiters.reduce((sum, a) => sum + a.rating, 0) / arbiters.length
    ).toFixed(1),
  };

  return (
    <div className="space-y-8">
      {/* Stats Overview */}
      <ArbiterStats stats={stats} />

      {/* Arbiter List */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Arbiters</h2>
          <Button onClick={() => setShowAssignmentModal(true)}>
            Quick Assign
          </Button>
        </div>
        <ArbiterList
          arbiters={arbiters}
          onAssign={handleAssign}
          onViewDetails={handleViewDetails}
          loading={loading}
        />
      </div>

      {/* Assignment Modal */}
      {showAssignmentModal && (
        <ArbiterAssignment
          arbiterId={selectedArbiterId}
          arbiters={arbiters}
          onSubmit={handleAssignmentSubmit}
          onClose={() => setShowAssignmentModal(false)}
          loading={loading}
        />
      )}
    </div>
  );
}
