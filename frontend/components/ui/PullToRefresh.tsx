'use client';

import React, { useState } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { RefreshCw } from 'lucide-react';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  /** Distance in pixels required to trigger refresh. Defaults to 72. */
  threshold?: number;
  children: React.ReactNode;
  className?: string;
}

/**
 * Pull-to-refresh wrapper for mobile lists.
 * Drag down past `threshold` pixels to trigger `onRefresh`.
 */
export function PullToRefresh({
  onRefresh,
  threshold = 72,
  children,
  className,
}: PullToRefreshProps) {
  const y = useMotionValue(0);
  const [refreshing, setRefreshing] = useState(false);
  const indicatorOpacity = useTransform(y, [0, threshold], [0, 1]);
  const indicatorScale = useTransform(y, [0, threshold], [0.5, 1]);
  const indicatorRotate = useTransform(y, [0, threshold * 2], [0, 360]);

  const handleDragEnd = async (_: unknown, info: { offset: { y: number } }) => {
    if (info.offset.y >= threshold && !refreshing) {
      setRefreshing(true);
      await animate(y, threshold / 2, { duration: 0.1 });
      try {
        await onRefresh();
      } finally {
        await animate(y, 0, { type: 'spring', stiffness: 300, damping: 30 });
        setRefreshing(false);
      }
    } else {
      animate(y, 0, { type: 'spring', stiffness: 400, damping: 30 });
    }
  };

  return (
    <div className={`relative overflow-hidden ${className ?? ''}`}>
      {/* Refresh indicator */}
      <motion.div
        style={{ opacity: indicatorOpacity, scale: indicatorScale }}
        className="absolute top-0 left-0 right-0 flex items-center justify-center py-3 pointer-events-none z-10"
      >
        <motion.div
          style={{ rotate: refreshing ? undefined : indicatorRotate }}
        >
          <RefreshCw
            size={20}
            className={`text-blue-400 ${refreshing ? 'animate-spin' : ''}`}
          />
        </motion.div>
      </motion.div>

      <motion.div
        style={{ y }}
        drag={refreshing ? false : 'y'}
        dragConstraints={{ top: 0, bottom: threshold }}
        dragElastic={{ top: 0, bottom: 0.4 }}
        onDragEnd={handleDragEnd}
      >
        {children}
      </motion.div>
    </div>
  );
}
