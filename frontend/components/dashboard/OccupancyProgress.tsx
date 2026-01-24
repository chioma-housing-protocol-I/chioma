'use client';

import React, { useEffect, useState } from 'react';

interface OccupancyProgressProps {
    percentage: number;
    size?: number;
    strokeWidth?: number;
    className?: string;
}

export const OccupancyProgress: React.FC<OccupancyProgressProps> = ({
    percentage,
    size = 120,
    strokeWidth = 10,
    className = '',
}) => {
    const [animatedPercentage, setAnimatedPercentage] = useState(0);

    // Animation on mount
    useEffect(() => {
        const timer = setTimeout(() => {
            setAnimatedPercentage(percentage);
        }, 100);
        return () => clearTimeout(timer);
    }, [percentage]);

    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (animatedPercentage / 100) * circumference;

    // Color based on percentage
    const getColor = (pct: number): string => {
        if (pct >= 80) return '#10B981'; // Green - healthy
        if (pct >= 60) return '#F59E0B'; // Amber - moderate
        return '#EF4444'; // Red - low
    };

    const color = getColor(percentage);

    return (
        <div className={`relative inline-flex items-center justify-center ${className}`}>
            <svg
                width={size}
                height={size}
                viewBox={`0 0 ${size} ${size}`}
                className="transform -rotate-90"
                role="progressbar"
                aria-valuenow={percentage}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Occupancy rate: ${percentage}%`}
            >
                {/* Background circle */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={strokeWidth}
                    className="text-neutral-200 dark:text-neutral-700"
                />
                {/* Progress circle */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke={color}
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    className="transition-all duration-1000 ease-out"
                />
            </svg>
            {/* Percentage text in center */}
            <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl font-bold text-neutral-900 dark:text-white">
                    {percentage}%
                </span>
            </div>
        </div>
    );
};

export default OccupancyProgress;
