'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

interface Arbiter {
  id: string;
  name: string;
  email: string;
  status: string;
  activeCases: number;
}

interface ArbiterAssignmentProps {
  arbiterId?: string | null;
  arbiters: Arbiter[];
  onSubmit: (data: ArbiterAssignmentPayload) => void;
  onClose: () => void;
  loading?: boolean;
}

export interface ArbiterAssignmentPayload {
  arbiterId: string;
  disputeId: string;
  notes: string;
  assignedAt: string;
}

export function ArbiterAssignment({
  arbiterId,
  arbiters,
  onSubmit,
  onClose,
  loading = false,
}: ArbiterAssignmentProps) {
  const [selectedArbiter, setSelectedArbiter] = useState(arbiterId || '');
  const [disputeId, setDisputeId] = useState('');
  const [notes, setNotes] = useState('');

  const selectedArbiterData = arbiters.find((a) => a.id === selectedArbiter);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedArbiter || !disputeId) {
      alert('Please fill all required fields');
      return;
    }
    onSubmit({
      arbiterId: selectedArbiter,
      disputeId,
      notes,
      assignedAt: new Date().toISOString(),
    });
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Assign Arbiter to Dispute</DialogTitle>
          <DialogDescription>
            Select an arbiter and dispute to establish the assignment
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Arbiter Selection */}
          <div>
            <Label htmlFor="arbiter">Arbiter *</Label>
            <Select value={selectedArbiter} onValueChange={setSelectedArbiter}>
              <SelectTrigger id="arbiter">
                <SelectValue placeholder="Select an arbiter" />
              </SelectTrigger>
              <SelectContent>
                {arbiters
                  .filter((a) => a.status === 'active')
                  .map((arbiter) => (
                    <SelectItem key={arbiter.id} value={arbiter.id}>
                      {arbiter.name} ({arbiter.activeCases} active cases)
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {/* Arbiter Info */}
          {selectedArbiterData && (
            <div className="bg-gray-50 p-3 rounded-md text-sm space-y-1">
              <p>
                <strong>Email:</strong> {selectedArbiterData.email}
              </p>
              <p>
                <strong>Status:</strong> {selectedArbiterData.status}
              </p>
              <p>
                <strong>Active Cases:</strong> {selectedArbiterData.activeCases}
              </p>
            </div>
          )}

          {/* Dispute Selection */}
          <div>
            <Label htmlFor="dispute">Dispute ID *</Label>
            <Input
              id="dispute"
              placeholder="Enter dispute ID or case number"
              value={disputeId}
              onChange={(e) => setDisputeId(e.target.value)}
              required
            />
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="notes">Assignment Notes</Label>
            <Textarea
              id="notes"
              placeholder="Optional notes for this assignment..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || !selectedArbiter || !disputeId}
            >
              {loading ? 'Assigning...' : 'Assign Arbiter'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
