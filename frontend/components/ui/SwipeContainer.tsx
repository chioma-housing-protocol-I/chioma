'use client';

import React from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';

interface SwipeContainerProps {
  children: React.ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  /** Minimum distance in pixels to trigger a swipe. Defaults to 80. */
  threshold?: number;
  className?: string;
}

/**
 * Wraps content in a horizontally swipeable container.
 * Call onSwipeLeft / onSwipeRight to handle navigation or list actions.
 */
export function SwipeContainer({
  children,
  onSwipeLeft,
  onSwipeRight,
  threshold = 80,
  className,
}: SwipeContainerProps) {
  const x = useMotionValue(0);
  const opacity = useTransform(
    x,
    [-threshold * 2, 0, threshold * 2],
    [0.4, 1, 0.4],
  );

  const handleDragEnd = (_: unknown, info: { offset: { x: number } }) => {
    const { x: dx } = info.offset;
    if (dx < -threshold && onSwipeLeft) {
      animate(x, -300, { duration: 0.2 }).then(() => {
        x.set(0);
        onSwipeLeft();
      });
    } else if (dx > threshold && onSwipeRight) {
      animate(x, 300, { duration: 0.2 }).then(() => {
        x.set(0);
        onSwipeRight();
      });
    } else {
      animate(x, 0, { type: 'spring', stiffness: 400, damping: 30 });
    }
  };

  return (
    <motion.div
      style={{ x, opacity }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.3}
      onDragEnd={handleDragEnd}
      className={className}
    >
      {children}
    </motion.div>
  );
}
