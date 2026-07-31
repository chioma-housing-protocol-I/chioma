'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CalendarDays, Users, CheckCircle, XCircle } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { LoadingButton } from '@/components/loading/LoadingButton';
import toast from 'react-hot-toast';

const STATUS_TABS = ['all', 'pending', 'confirmed', 'completed', 'cancelled'];

interface Booking {
  id: string;
  guestName?: string;
  guest?: { firstName?: string };
  propertyTitle?: string;
  property?: { title?: string };
  checkInDate?: string;
  startDate?: string;
  checkOutDate?: string;
  endDate?: string;
  guests?: number;
  status?: string;
  [key: string]: unknown;
}

export default function HostBookingsPage() {
  const [status, setStatus] = useState('all');
  const queryClient = useQueryClient();

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ['host-bookings', status],
    queryFn: async () => {
      const params = new URLSearchParams({
        role: 'host',
        ...(status !== 'all' && { status }),
      });
      const res = await fetch(`/api/bookings?${params}`);
      if (!res.ok) return [];
      const data = await res.json();
      return data.data ?? data ?? [];
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: string }) => {
      const res = await fetch(`/api/bookings/${id}/${action}`, {
        method: 'PATCH',
      });
      if (!res.ok) throw new Error('Failed');
    },
    onMutate: async ({ id, action }) => {
      const nextStatus = action === 'confirm' ? 'confirmed' : 'cancelled';
      await queryClient.cancelQueries({ queryKey: ['host-bookings'] });
      const snapshots = queryClient
        .getQueriesData<Booking[]>({ queryKey: ['host-bookings'] })
        .map(([key, data]) => [key, data] as const);

      queryClient.setQueriesData<Booking[]>(
        { queryKey: ['host-bookings'] },
        (old) =>
          old?.map((b) => (b.id === id ? { ...b, status: nextStatus } : b)),
      );

      return { snapshots };
    },
    onError: (_err, _vars, context) => {
      if (context?.snapshots) {
        for (const [key, data] of context.snapshots) {
          queryClient.setQueryData(key, data);
        }
      }
      toast.error('Something went wrong');
    },
    onSuccess: () => {
      toast.success('Booking updated');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['host-bookings'] });
    },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Bookings</h1>

      {/* Status tabs */}
      <div className="flex gap-2 flex-wrap">
        {STATUS_TABS.map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={`px-4 py-2 rounded-xl text-sm font-medium capitalize transition-all ${
              status === s
                ? 'bg-blue-500 text-white'
                : 'bg-white/5 border border-white/10 text-blue-200/70 hover:bg-white/10'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <LoadingSpinner />
        </div>
      ) : bookings.length === 0 ? (
        <div className="text-center py-20 text-blue-300/60">
          No bookings found
        </div>
      ) : (
        <div className="space-y-4">
          {bookings.map((b: Booking) => (
            <div
              key={b.id}
              className="backdrop-blur-xl bg-slate-800/50 border border-white/10 rounded-2xl p-5"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-semibold">
                    {b.guestName ?? b.guest?.firstName ?? 'Guest'}
                  </h3>
                  <p className="text-sm text-blue-300/60">
                    {b.propertyTitle ?? b.property?.title}
                  </p>
                </div>
                <StatusBadge status={b.status} />
              </div>
              <div className="flex gap-6 text-sm text-blue-200/60 mb-4">
                <span className="flex items-center gap-1">
                  <CalendarDays size={14} />
                  {b.checkInDate ?? b.startDate} → {b.checkOutDate ?? b.endDate}
                </span>
                <span className="flex items-center gap-1">
                  <Users size={14} />
                  {b.guests ?? 1} guests
                </span>
              </div>
              {b.status === 'pending' && (
                <div className="flex gap-3">
                  <LoadingButton
                    loading={updateStatus.isPending}
                    onClick={() =>
                      updateStatus.mutate({ id: b.id, action: 'confirm' })
                    }
                    className="flex-1 py-2 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-xl text-sm hover:bg-emerald-500/30 transition-colors"
                  >
                    <CheckCircle size={16} /> Confirm
                  </LoadingButton>
                  <LoadingButton
                    loading={updateStatus.isPending}
                    onClick={() =>
                      updateStatus.mutate({ id: b.id, action: 'cancel' })
                    }
                    className="flex-1 py-2 bg-red-500/20 border border-red-500/30 text-red-400 rounded-xl text-sm hover:bg-red-500/30 transition-colors"
                  >
                    <XCircle size={16} /> Decline
                  </LoadingButton>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status?: string }) {
  const map: Record<string, string> = {
    confirmed: 'bg-emerald-500/20 text-emerald-400',
    pending: 'bg-amber-500/20 text-amber-400',
    cancelled: 'bg-red-500/20 text-red-400',
    completed: 'bg-blue-500/20 text-blue-400',
  };
  return (
    <span
      className={`text-xs px-3 py-1 rounded-full capitalize ${map[status ?? ''] ?? 'bg-white/10 text-blue-300/60'}`}
    >
      {status}
    </span>
  );
}
