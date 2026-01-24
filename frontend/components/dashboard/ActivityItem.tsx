'use client';

import React from 'react';
import {
    DollarSign,
    FileText,
    ClipboardCheck,
    Wrench,
    UserPlus
} from 'lucide-react';
import { StatusBadge } from './StatusBadge';
import { Activity } from '@/types/dashboard';

interface ActivityItemProps {
    activity: Activity;
    className?: string;
}

const iconMap: Record<Activity['icon'], React.ReactNode> = {
    payment: <DollarSign size={20} />,
    document: <FileText size={20} />,
    inspection: <ClipboardCheck size={20} />,
    maintenance: <Wrench size={20} />,
    tenant: <UserPlus size={20} />,
};

const iconBgMap: Record<Activity['icon'], string> = {
    payment: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
    document: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    inspection: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
    maintenance: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
    tenant: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400',
};

export const ActivityItem: React.FC<ActivityItemProps> = ({
    activity,
    className = '',
}) => {
    return (
        <div
            className={`
        flex items-start gap-4 p-4 rounded-xl
        hover:bg-neutral-50 dark:hover:bg-neutral-700/50
        transition-colors duration-200
        ${className}
      `}
        >
            {/* Icon */}
            <div
                className={`
          flex-shrink-0 w-10 h-10 rounded-full
          flex items-center justify-center
          ${iconBgMap[activity.icon]}
        `}
            >
                {iconMap[activity.icon]}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                        <h4 className="text-sm font-semibold text-neutral-900 dark:text-white truncate">
                            {activity.title}
                        </h4>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400 truncate">
                            {activity.description}
                        </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <span className="text-xs text-neutral-400 dark:text-neutral-500 whitespace-nowrap">
                            {activity.timestamp}
                        </span>
                        <StatusBadge status={activity.status} />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ActivityItem;
