'use client';

import React from 'react';
import { ActivityItem } from './ActivityItem';
import { Activity } from '@/types/dashboard';
import { Clock } from 'lucide-react';

interface RecentActivityProps {
    activities: Activity[];
    maxItems?: number;
    className?: string;
}

export const RecentActivity: React.FC<RecentActivityProps> = ({
    activities,
    maxItems = 6,
    className = '',
}) => {
    const displayedActivities = activities.slice(0, maxItems);

    return (
        <section
            className={`
        bg-white dark:bg-neutral-800
        border border-neutral-200 dark:border-neutral-700
        rounded-2xl shadow-sm overflow-hidden
        ${className}
      `}
            aria-label="Recent Activity"
        >
            {/* Header */}
            <div className="flex items-center justify-between p-6 pb-2">
                <div>
                    <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">
                        Recent Activity
                    </h2>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
                        Latest updates from your properties
                    </p>
                </div>
                <Clock size={20} className="text-neutral-400" />
            </div>

            {/* Activity List */}
            <div className="divide-y divide-neutral-100 dark:divide-neutral-700/50">
                {displayedActivities.length > 0 ? (
                    displayedActivities.map((activity) => (
                        <ActivityItem key={activity.id} activity={activity} />
                    ))
                ) : (
                    <div className="p-8 text-center">
                        <Clock size={40} className="mx-auto text-neutral-300 dark:text-neutral-600 mb-3" />
                        <p className="text-neutral-500 dark:text-neutral-400">
                            No recent activity
                        </p>
                    </div>
                )}
            </div>
        </section>
    );
};

export default RecentActivity;
