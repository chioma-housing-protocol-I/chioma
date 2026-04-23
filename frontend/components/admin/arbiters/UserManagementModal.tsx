'use client';

import React, { useState, useMemo } from 'react';
import { X, Search, UserPlus, Loader } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAdminUsers } from '@/lib/query/hooks/use-admin-users';
import type { User } from '@/types';

interface UserManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  arbiterAddress: string;
  currentUserId?: number | null;
  onUserSelected: (user: User) => Promise<void>;
  isLoading?: boolean;
}

export function UserManagementModal({
  isOpen,
  onClose,
  arbiterAddress,
  currentUserId,
  onUserSelected,
  isLoading = false,
}: UserManagementModalProps) {
  const [search, setSearch] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: usersData } = useAdminUsers({
    page: 1,
    limit: 100,
    search,
  });

  const users = useMemo(() => usersData?.data ?? [], [usersData?.data]);

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const searchLower = search.toLowerCase();
      return (
        user.email.toLowerCase().includes(searchLower) ||
        (user.name?.toLowerCase().includes(searchLower) ?? false)
      );
    });
  }, [users, search]);

  const handleSelectUser = async (user: User) => {
    setSelectedUserId(user.id);
    setIsSubmitting(true);

    try {
      await onUserSelected(user);
      toast.success(`Linked arbiter to user ${user.email}`);
      setSearch('');
      setSelectedUserId(null);
      onClose();
    } catch (error) {
      toast.error('Failed to link arbiter to user');
      setSelectedUserId(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 rounded-2xl border border-white/10 p-6 max-w-2xl w-full max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-white">
              Link User to Arbiter
            </h2>
            <p className="text-sm text-blue-200/60 mt-1">
              Arbiter: {arbiterAddress.substring(0, 20)}...
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-2 hover:bg-white/10 rounded-lg disabled:opacity-50"
          >
            <X className="h-5 w-5 text-white" />
          </button>
        </div>

        {/* Search */}
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-200/40" />
            <input
              type="text"
              placeholder="Search by email or name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              disabled={isSubmitting}
              className="w-full pl-10 pr-4 py-2 rounded-lg bg-slate-800 border border-white/10 text-white placeholder-blue-200/40 focus:outline-none focus:border-blue-500 disabled:opacity-50"
            />
          </div>
        </div>

        {/* Users List */}
        <div className="flex-1 overflow-y-auto space-y-2 mb-4">
          {filteredUsers.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-blue-200/60">
              {search ? 'No users found' : 'Start typing to search users'}
            </div>
          ) : (
            filteredUsers.map((user) => (
              <button
                key={user.id}
                onClick={() => handleSelectUser(user)}
                disabled={isSubmitting || selectedUserId === user.id}
                className={`w-full p-3 rounded-lg border transition-all text-left ${
                  selectedUserId === user.id
                    ? 'bg-blue-500/20 border-blue-500/50'
                    : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-white font-medium">
                      {user.name || 'N/A'}
                    </p>
                    <p className="text-sm text-blue-200/60">{user.email}</p>
                    <div className="flex gap-2 mt-1">
                      <span className="text-xs px-2 py-1 rounded bg-blue-500/20 text-blue-300">
                        {user.role}
                      </span>
                      {user.isVerified && (
                        <span className="text-xs px-2 py-1 rounded bg-green-500/20 text-green-300">
                          Verified
                        </span>
                      )}
                    </div>
                  </div>
                  {selectedUserId === user.id && isSubmitting && (
                    <Loader className="h-5 w-5 text-blue-400 animate-spin" />
                  )}
                  {selectedUserId === user.id && !isSubmitting && (
                    <UserPlus className="h-5 w-5 text-green-400" />
                  )}
                </div>
              </button>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 pt-4 border-t border-white/10">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 rounded-lg border border-white/10 px-4 py-2 text-white hover:bg-white/5 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            disabled={!selectedUserId || isSubmitting}
            className="flex-1 rounded-lg bg-blue-500/20 border border-blue-500/30 px-4 py-2 text-blue-300 hover:bg-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Linking...' : 'Link User'}
          </button>
        </div>
      </div>
    </div>
  );
}
