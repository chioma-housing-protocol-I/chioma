'use client';

import React from 'react';
import { StatusType } from '@/types/dashboard';

interface StatusBadgeProps {
    status: StatusType;
    className?: string;
}

const statusConfig: Record<StatusType, { label: string; className: string }> = {
    occupied: {
        label: 'Occupied',
        className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    },
    vacant: {
        label: 'Vacant',
        className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    },
    maintenance: {
        label: 'Maintenance',
        className: 'bg-slate-100 text-slate-700 dark:bg-slate-700/30 dark:text-slate-400',
    },
    pending: {
        label: 'Pending',
        className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    },
    completed: {
        label: 'Completed',
        className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    },
    received: {
        label: 'Received',
        className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = '' }) => {
    const config = statusConfig[status];

    return (
        <span
            className={`
        inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold
        ${config.className}
        ${className}
      `}
            role="status"
            aria-label={`Status: ${config.label}`}
        >
            {config.label}
        </span>
    );
};

export default StatusBadge;
