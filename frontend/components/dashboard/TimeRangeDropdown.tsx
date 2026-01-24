'use client';

import React from 'react';
import { TimeRange } from '@/types/dashboard';
import { ChevronDown } from 'lucide-react';

interface TimeRangeDropdownProps {
    value: TimeRange;
    onChange: (value: TimeRange) => void;
    className?: string;
}

const timeRangeOptions: { value: TimeRange; label: string }[] = [
    { value: '6months', label: 'Last 6 Months' },
    { value: '1year', label: 'Last Year' },
    { value: 'alltime', label: 'All Time' },
];

export const TimeRangeDropdown: React.FC<TimeRangeDropdownProps> = ({
    value,
    onChange,
    className = '',
}) => {
    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        onChange(e.target.value as TimeRange);
    };

    return (
        <div className={`relative inline-block ${className}`}>
            <select
                value={value}
                onChange={handleChange}
                className="
          appearance-none
          bg-white dark:bg-neutral-800
          border border-neutral-200 dark:border-neutral-700
          rounded-lg px-4 py-2 pr-10
          text-sm font-medium text-neutral-700 dark:text-neutral-300
          cursor-pointer
          hover:border-neutral-300 dark:hover:border-neutral-600
          focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent
          transition-all duration-200
        "
                aria-label="Select time range"
            >
                {timeRangeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>
            <ChevronDown
                size={16}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 pointer-events-none"
            />
        </div>
    );
};

export default TimeRangeDropdown;
