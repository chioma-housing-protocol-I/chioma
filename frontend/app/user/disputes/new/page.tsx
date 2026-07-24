'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuthStore } from '@/store/authStore';
import { Uploader } from '@/components/ui/Uploader';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { useUserAgreements } from '@/lib/query/hooks/use-agreements';
import type { DisputeType } from '@/lib/dashboard-data';
import { createDispute } from '@/lib/disputes/api';

export default function NewDisputePage() {
  const router = useRouter();
  const { user, isAuthenticated, loading } = useAuthStore();
  const { data: agreementsResult, isLoading: agreementsLoading } =
    useUserAgreements();
  const agreements = agreementsResult?.data ?? [];
  const [formData, setFormData] = useState({
    agreementId: '',
    disputeType: '' as DisputeType | '',
    description: '',
    requestedAmount: '',
  });
  const [evidenceFiles, setEvidenceFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);

  if (loading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== 'user') {
    return (
      <div className="min-h-[40vh] flex flex-col items-center justify-center text-center p-8">
        <h1 className="text-3xl font-bold text-white mb-4">Access Denied</h1>
        <p className="text-xl mb-8 text-blue-200/80">
          Only tenants can file disputes.
        </p>
        <Link href="/">
          <Button>Connect Wallet</Button>
        </Link>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !formData.agreementId ||
      !formData.disputeType ||
      !formData.description
    ) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSubmitting(true);
    try {
      await createDispute({
        agreementId: formData.agreementId,
        disputeType: formData.disputeType,
        description: formData.description,
        requestedAmount: formData.requestedAmount
          ? Number(formData.requestedAmount)
          : undefined,
        evidenceFiles,
      });

      toast.success('Dispute filed successfully');
      router.push('/user/disputes');
    } catch (error) {
      console.error('Failed to create dispute:', error);
      toast.error('Failed to file dispute. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8 flex items-center text-sm text-neutral-400 space-x-2">
        <Link
          href="/user/disputes"
          className="hover:text-white transition-colors flex items-center gap-1"
        >
          <ArrowLeft size={16} />
          All Disputes
        </Link>
        <span>→</span>
        <span className="font-semibold text-white">New Dispute</span>
      </div>

      <div className="bg-white/90 backdrop-blur-xl rounded-3xl p-8 border border-white/20 shadow-2xl">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold tracking-tight text-neutral-900 mb-3">
            File New Dispute
          </h1>
          <p className="text-xl text-neutral-600 max-w-md mx-auto">
            Report issues with your rental property or agreement
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Agreement
              </label>
              <Select
                value={formData.agreementId}
                onValueChange={(value) =>
                  setFormData({ ...formData, agreementId: value })
                }
                disabled={agreementsLoading}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      agreementsLoading
                        ? 'Loading agreements...'
                        : 'Select agreement'
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {agreements.map((agreement) => (
                    <SelectItem key={agreement.id} value={agreement.id}>
                      {agreement.displayTitle}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Requested Amount ($)
              </label>
              <Input
                type="number"
                placeholder="0.00"
                value={formData.requestedAmount}
                onChange={(e) =>
                  setFormData({ ...formData, requestedAmount: e.target.value })
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Dispute Type
            </label>
            <Select
              value={formData.disputeType}
              onValueChange={(value) =>
                setFormData({
                  ...formData,
                  disputeType: value as DisputeType,
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MAINTENANCE">Maintenance Issue</SelectItem>
                <SelectItem value="SECURITY_DEPOSIT">
                  Security Deposit
                </SelectItem>
                <SelectItem value="RENT_PAYMENT">Rent Payment</SelectItem>
                <SelectItem value="PROPERTY_DAMAGE">Property Damage</SelectItem>
                <SelectItem value="TERMINATION">Termination</SelectItem>
                <SelectItem value="OTHER">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Description
            </label>
            <Textarea
              rows={6}
              placeholder="Provide detailed description of the issue..."
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              className="resize-none"
            />
          </div>

          <div>
            <Label>Evidence (photos, receipts, emails)</Label>
            <Uploader
              label="Evidence"
              accept="image/*,application/pdf"
              multiple
              maxFiles={5}
              onFilesSelected={setEvidenceFiles}
            />
            {evidenceFiles.length > 0 && (
              <p className="text-sm text-neutral-500 mt-2">
                {evidenceFiles.length} file(s) selected
              </p>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-neutral-200">
            <Link href="/user/disputes" className="flex-1">
              <Button type="button" variant="outline" className="w-full">
                Cancel
              </Button>
            </Link>
            <Button
              type="submit"
              className="flex-1 font-semibold"
              disabled={submitting}
            >
              {submitting ? 'Creating Dispute...' : 'File Dispute'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
