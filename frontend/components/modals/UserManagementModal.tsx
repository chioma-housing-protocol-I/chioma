'use client';

import React, { useState } from 'react';
import { BaseModal } from './BaseModal';
import {
  User,
  Mail,
  Phone,
  Shield,
  CheckCircle2,
  Ban,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface UserData {
  id?: string;
  name: string;
  email: string;
  phone?: string;
  role: 'tenant' | 'landlord' | 'agent' | 'admin';
  status: 'active' | 'suspended' | 'inactive';
  isVerified: boolean;
}

interface UserManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  user?: UserData;
  mode?: 'create' | 'edit' | 'view';
  onSubmit?: (data: UserData) => Promise<void>;
  onSuspend?: (userId: string) => Promise<void>;
  onDelete?: (userId: string) => Promise<void>;
}

export const UserManagementModal: React.FC<UserManagementModalProps> = ({
  isOpen,
  onClose,
  user,
  mode = 'view',
  onSubmit,
  onSuspend,
  onDelete,
}) => {
  const [formData, setFormData] = useState<UserData>(
    user || {
      name: '',
      email: '',
      phone: '',
      role: 'tenant',
      status: 'active',
      isVerified: false,
    },
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const isViewMode = mode === 'view';
  const isCreateMode = mode === 'create';

  const handleSubmit = async () => {
    if (!onSubmit) return;

    // Validation
    if (!formData.name || !formData.email) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast.error('Please enter a valid email address');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      toast.success(
        isCreateMode
          ? 'User created successfully'
          : 'User updated successfully',
      );
      onClose();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to save user',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSuspend = async () => {
    if (!onSuspend || !user?.id) return;

    if (!window.confirm('Are you sure you want to suspend this user?')) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSuspend(user.id);
      toast.success('User suspended successfully');
      onClose();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to suspend user',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete || !user?.id) return;

    setIsSubmitting(true);
    try {
      await onDelete(user.id);
      toast.success('User deleted successfully');
      onClose();
      setShowDeleteConfirm(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to delete user',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (field: keyof UserData, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const roles = [
    { value: 'tenant', label: 'Tenant', color: 'bg-blue-100 text-blue-700' },
    {
      value: 'landlord',
      label: 'Landlord',
      color: 'bg-purple-100 text-purple-700',
    },
    { value: 'agent', label: 'Agent', color: 'bg-green-100 text-green-700' },
    { value: 'admin', label: 'Admin', color: 'bg-red-100 text-red-700' },
  ];

  const statuses = [
    { value: 'active', label: 'Active', color: 'bg-green-100 text-green-700' },
    {
      value: 'suspended',
      label: 'Suspended',
      color: 'bg-red-100 text-red-700',
    },
    {
      value: 'inactive',
      label: 'Inactive',
      color: 'bg-gray-100 text-gray-700',
    },
  ];

  const getRoleBadge = () => {
    const role = roles.find((r) => r.value === formData.role);
    return (
      <span
        className={`text-xs font-semibold px-3 py-1 rounded-lg ${role?.color}`}
      >
        {role?.label}
      </span>
    );
  };

  const getStatusBadge = () => {
    const status = statuses.find((s) => s.value === formData.status);
    return (
      <span
        className={`text-xs font-semibold px-3 py-1 rounded-lg ${status?.color}`}
      >
        {status?.label}
      </span>
    );
  };

  if (showDeleteConfirm) {
    return (
      <BaseModal
        isOpen={isOpen}
        onClose={() => setShowDeleteConfirm(false)}
        title="Confirm Deletion"
        subtitle="This action cannot be undone"
        size="sm"
        footer={
          <div className="flex items-center justify-end gap-3 w-full">
            <button
              onClick={() => setShowDeleteConfirm(false)}
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl font-bold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-white/10 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl font-bold text-white bg-red-600 hover:bg-red-700 shadow-md transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 size={18} />
                  Delete User
                </>
              )}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/30 rounded-2xl p-6 text-center">
            <AlertTriangle className="mx-auto text-red-600 mb-4" size={48} />
            <h3 className="text-lg font-bold text-red-900 dark:text-red-100 mb-2">
              Delete User Account
            </h3>
            <p className="text-sm text-red-800 dark:text-red-200">
              Are you sure you want to permanently delete{' '}
              <span className="font-bold">{user?.name}</span>? This will remove
              all associated data and cannot be undone.
            </p>
          </div>
        </div>
      </BaseModal>
    );
  }

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={
        isCreateMode
          ? 'Create New User'
          : isViewMode
            ? 'User Details'
            : 'Edit User'
      }
      subtitle={isViewMode ? formData.email : 'Fill in the user information'}
      size="md"
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            {isViewMode && (
              <>
                {getRoleBadge()}
                {getStatusBadge()}
                {formData.isVerified && (
                  <span className="text-xs font-semibold px-3 py-1 rounded-lg bg-blue-100 text-blue-700 flex items-center gap-1">
                    <CheckCircle2 size={14} />
                    Verified
                  </span>
                )}
              </>
            )}
          </div>
          <div className="flex items-center gap-3">
            {isViewMode && onSuspend && formData.status === 'active' && (
              <button
                onClick={handleSuspend}
                disabled={isSubmitting}
                className="px-4 py-2.5 rounded-xl font-bold text-white bg-amber-600 hover:bg-amber-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                <Ban size={16} />
                Suspend
              </button>
            )}
            {isViewMode && onDelete && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                disabled={isSubmitting}
                className="px-4 py-2.5 rounded-xl font-bold text-white bg-red-600 hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                <Trash2 size={16} />
                Delete
              </button>
            )}
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl font-bold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-white/10 transition-colors disabled:opacity-50"
            >
              {isViewMode ? 'Close' : 'Cancel'}
            </button>
            {!isViewMode && (
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="px-6 py-2.5 rounded-xl font-bold text-white bg-brand-blue hover:bg-blue-700 shadow-md transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={18} />
                    {isCreateMode ? 'Create User' : 'Save Changes'}
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Basic Information */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/30 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-brand-blue/10 rounded-xl flex items-center justify-center">
              <User className="text-brand-blue" size={20} />
            </div>
            <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
              Basic Information
            </h3>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
                Full Name *
              </label>
              {isViewMode ? (
                <p className="text-neutral-900 dark:text-white font-medium">
                  {formData.name}
                </p>
              ) : (
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  className="w-full px-4 py-2.5 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-blue"
                  placeholder="John Doe"
                />
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2 flex items-center gap-2">
                <Mail size={16} />
                Email Address *
              </label>
              {isViewMode ? (
                <p className="text-neutral-900 dark:text-white font-medium">
                  {formData.email}
                </p>
              ) : (
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  className="w-full px-4 py-2.5 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-blue"
                  placeholder="john@example.com"
                />
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2 flex items-center gap-2">
                <Phone size={16} />
                Phone Number
              </label>
              {isViewMode ? (
                <p className="text-neutral-900 dark:text-white font-medium">
                  {formData.phone || 'Not provided'}
                </p>
              ) : (
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  className="w-full px-4 py-2.5 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-blue"
                  placeholder="+1 (555) 123-4567"
                />
              )}
            </div>
          </div>
        </div>

        {/* Role and Status */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-neutral-50 dark:bg-neutral-800/50 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/20 rounded-xl flex items-center justify-center">
                <Shield className="text-purple-600" size={20} />
              </div>
              <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
                Role
              </h3>
            </div>
            {isViewMode ? (
              getRoleBadge()
            ) : (
              <select
                value={formData.role}
                onChange={(e) => handleChange('role', e.target.value)}
                className="w-full px-4 py-2.5 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-blue"
              >
                {roles.map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="bg-neutral-50 dark:bg-neutral-800/50 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900/20 rounded-xl flex items-center justify-center">
                <CheckCircle2 className="text-green-600" size={20} />
              </div>
              <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
                Status
              </h3>
            </div>
            {isViewMode ? (
              getStatusBadge()
            ) : (
              <select
                value={formData.status}
                onChange={(e) => handleChange('status', e.target.value)}
                className="w-full px-4 py-2.5 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-blue"
              >
                {statuses.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Verification Status */}
        {!isCreateMode && (
          <div className="bg-neutral-50 dark:bg-neutral-800/50 rounded-2xl p-6">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isVerified}
                onChange={(e) => handleChange('isVerified', e.target.checked)}
                disabled={isViewMode}
                className="w-5 h-5 rounded border-neutral-300 text-brand-blue focus:ring-brand-blue disabled:opacity-50"
              />
              <div>
                <p className="font-semibold text-neutral-900 dark:text-white">
                  Email Verified
                </p>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  User has verified their email address
                </p>
              </div>
            </label>
          </div>
        )}
      </div>
    </BaseModal>
  );
};
