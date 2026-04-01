'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/store/authStore';
import { Building2, Home, Briefcase } from 'lucide-react';

interface RoleSelectionModalProps {
  walletAddress: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function RoleSelectionModal({
  walletAddress,
  isOpen,
  onClose,
}: RoleSelectionModalProps) {
  const router = useRouter();
  const { setTokens } = useAuth();
  const [selectedRole, setSelectedRole] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  if (!isOpen) return null;

  const roles = [
    {
      id: 'tenant',
      label: 'Tenant',
      description: 'I rent properties and pay rent',
      icon: Home,
      color: 'from-blue-500 to-cyan-500',
    },
    {
      id: 'landlord',
      label: 'Landlord',
      description: 'I own and manage properties',
      icon: Building2,
      color: 'from-purple-500 to-pink-500',
    },
    {
      id: 'agent',
      label: 'Agent',
      description: 'I manage properties for others',
      icon: Briefcase,
      color: 'from-orange-500 to-red-500',
    },
  ];

  const handleSelectRole = async (role: string) => {
    setIsLoading(true);
    setSelectedRole(role);

    try {
      // Create a user object with selected role
      const mockUser = {
        id: 'user-' + Date.now(),
        email: walletAddress,
        firstName: 'User',
        lastName: 'Account',
        role: role as any,
      };

      setTokens('mock-token', 'mock-refresh', mockUser);

      // Navigate to appropriate dashboard
      const dashboardMap: Record<string, string> = {
        tenant: '/tenant',
        landlord: '/landlords',
        agent: '/agents',
      };

      router.push(dashboardMap[role] || '/');
    } catch (error) {
      console.error('Failed to select role:', error);
      setIsLoading(false);
      setSelectedRole(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-8 max-w-2xl w-full border border-white/10 shadow-2xl">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-white mb-2">
            Welcome to Chioma
          </h2>
          <p className="text-blue-200/60">Select your role to get started</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {roles.map((role) => {
            const Icon = role.icon;
            const isSelected = selectedRole === role.id;

            return (
              <button
                key={role.id}
                onClick={() => handleSelectRole(role.id)}
                disabled={isLoading}
                className={`relative p-6 rounded-xl border-2 transition-all duration-300 group ${
                  isSelected
                    ? 'border-blue-500 bg-blue-500/10'
                    : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'
                } ${isLoading && !isSelected ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {/* Background gradient */}
                <div
                  className={`absolute inset-0 rounded-xl opacity-0 group-hover:opacity-10 transition-opacity bg-gradient-to-br ${role.color}`}
                />

                {/* Content */}
                <div className="relative z-10 flex flex-col items-center text-center">
                  <div
                    className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 transition-all ${
                      isSelected
                        ? `bg-gradient-to-br ${role.color} text-white`
                        : 'bg-white/10 text-blue-300 group-hover:bg-white/20'
                    }`}
                  >
                    <Icon size={24} />
                  </div>

                  <h3 className="font-semibold text-white mb-1 text-lg">
                    {role.label}
                  </h3>
                  <p className="text-sm text-blue-200/60 leading-relaxed">
                    {role.description}
                  </p>

                  {isSelected && isLoading && (
                    <div className="mt-4 flex items-center justify-center gap-2">
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
                      <span className="text-xs text-blue-300">
                        Redirecting...
                      </span>
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        <p className="text-center text-xs text-blue-200/40 mt-8">
          You can change your role later in settings
        </p>
      </div>
    </div>
  );
}
