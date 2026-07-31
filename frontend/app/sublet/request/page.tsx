'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { LoadingButton } from '@/components/loading/LoadingButton';

export default function SubletRequestPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    propertyId: '',
    startDate: '',
    endDate: '',
    reason: '',
    subletPrice: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/subletting/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      toast.success('Sublet request submitted');
      router.push('/sublet/manage');
    } catch {
      toast.error('Failed to submit request');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white px-4 py-8">
      <div className="max-w-lg mx-auto">
        <Link
          href="/sublet"
          className="inline-flex items-center gap-2 text-blue-300/60 hover:text-white mb-8 transition-colors"
        >
          <ArrowLeft size={18} /> Back
        </Link>
        <h1 className="text-3xl font-bold mb-2">Request Subletting Approval</h1>
        <p className="text-blue-300/60 mb-8">
          Submit a request to sublet your rental to another guest
        </p>

        <form
          onSubmit={handleSubmit}
          className="backdrop-blur-xl bg-slate-800/50 border border-white/10 rounded-2xl p-6 space-y-5"
        >
          <div>
            <label className="block text-sm font-medium text-blue-200/70 mb-2">
              Property ID
            </label>
            <input
              required
              value={form.propertyId}
              onChange={(e) => setForm({ ...form, propertyId: e.target.value })}
              placeholder="Your rental property ID"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-blue-300/30 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-blue-200/70 mb-2">
                Start Date
              </label>
              <input
                required
                type="date"
                value={form.startDate}
                onChange={(e) =>
                  setForm({ ...form, startDate: e.target.value })
                }
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-blue-200/70 mb-2">
                End Date
              </label>
              <input
                required
                type="date"
                value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-blue-200/70 mb-2">
              Nightly Price ($)
            </label>
            <input
              required
              type="number"
              min="0"
              value={form.subletPrice}
              onChange={(e) =>
                setForm({ ...form, subletPrice: e.target.value })
              }
              placeholder="0.00"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-blue-300/30 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-blue-200/70 mb-2">
              Reason
            </label>
            <textarea
              required
              rows={3}
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
              placeholder="Why are you subletting?"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-blue-300/30 focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none"
            />
          </div>
          <LoadingButton
            type="submit"
            loading={isSubmitting}
            className="w-full py-3 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl font-semibold hover:from-blue-600 hover:to-indigo-700 transition-all disabled:opacity-60"
          >
            Submit Request
          </LoadingButton>
        </form>
      </div>
    </div>
  );
}
