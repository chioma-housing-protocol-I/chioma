'use client';

import React from 'react';

interface UserAvatarProps {
  firstName: string;
  lastName: string;
  role?: 'tenant' | 'landlord' | 'agent';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const roleColors: Record<string, string> = {
  landlord: 'bg-blue-100 text-blue-700',
  tenant: 'bg-emerald-100 text-emerald-700',
  agent: 'bg-orange-100 text-orange-700',
};

const sizeClasses = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
};

export function UserAvatar({
  firstName,
  lastName,
  role = 'tenant',
  size = 'md',
  className = '',
}: UserAvatarProps) {
  const initials = `${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase();
  const colorClass = roleColors[role] ?? roleColors.tenant;

  return (
    <div
      className={`${sizeClasses[size]} ${colorClass} rounded-full flex items-center justify-center font-semibold shrink-0 ${className}`}
      aria-label={`${firstName} ${lastName}`}
    >
      {initials}
    </div>
  );
}
