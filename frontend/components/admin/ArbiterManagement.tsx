'use client';

import { useState, useCallback } from 'react';
import { ArbiterList } from './ArbiterList';
import { ArbiterStats } from './ArbiterStats';
import { ArbiterAssignment } from './ArbiterAssignment';
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

export function ArbiterManagement({ initialArbiters = [] }: ArbiterManagementProps) {
  const [arbiters, setArbiters] = useState<Arbiter[]>(initialArbiters);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [selectedArbiterId, setSelectedArbiterId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleAssign = useCallback((arbiterId: string) => {
    setSelectedArbiterId(arbiterId);
    setShowAssignmentModal(true);
  }, []);

  const handleAssignmentSubmit = useCallback(async (data: any) => {
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
  }, [selectedArbiterId]);

  const handleUpdateStatus = useCallback(async (arbiterId: string, status: string) => {
    setLoading(true);
    try {
      // TODO: Call API to update arbiter status
      setArbiters(arbiters.map(a =>
        a.id === arbiterId ? { ...a, status: status as any } : a
      ));
    } catch (error) {
      console.error('Status update error:', error);
    } finally {
      setLoading(false);
    }
  }, [arbiters]);

  const handleViewDetails = useCallback((arbiterId: string) => {
    // TODO: Open details modal or navigate to details page
    console.log('Viewing details for:', arbiterId);
  }, []);

  const stats = {
    totalArbiters: arbiters.length,
    activeArbiters: arbiters.filter(a => a.status === 'active').length,
    avgResolutionTime: Math.round(
      arbiters.reduce((sum, a) => sum + a.resolutionTime, 0) / arbiters.length
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
          onUpdateStatus={handleUpdateStatus}
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
