'use client';

import React, { useRef } from 'react';
import { motion, useMotionValue, animate } from 'framer-motion';

interface PinchZoomImageProps {
  src: string;
  alt: string;
  className?: string;
  minScale?: number;
  maxScale?: number;
}

/**
 * Image component that supports pinch-to-zoom on touch devices.
 * Uses pointer events to track two-finger gestures and updates scale.
 * Double-tap resets zoom to 1.
 */
export function PinchZoomImage({
  src,
  alt,
  className,
  minScale = 1,
  maxScale = 4,
}: PinchZoomImageProps) {
  const scale = useMotionValue(1);
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const lastDist = useRef<number | null>(null);
  const lastTap = useRef<number>(0);
  const activePointers = useRef<Map<number, PointerEvent>>(new Map());

  const getDistance = (a: PointerEvent, b: PointerEvent): number => {
    const dx = a.clientX - b.clientX;
    const dy = a.clientY - b.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    activePointers.current.set(e.pointerId, e.nativeEvent);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    activePointers.current.set(e.pointerId, e.nativeEvent);
    const pointers = Array.from(activePointers.current.values());
    if (pointers.length === 2) {
      const dist = getDistance(pointers[0], pointers[1]);
      if (lastDist.current !== null) {
        const delta = dist / lastDist.current;
        const next = Math.min(
          maxScale,
          Math.max(minScale, scale.get() * delta),
        );
        scale.set(next);
      }
      lastDist.current = dist;
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    activePointers.current.delete(e.pointerId);
    if (activePointers.current.size < 2) {
      lastDist.current = null;
    }

    // Double-tap to reset zoom
    const now = Date.now();
    if (now - lastTap.current < 300) {
      animate(scale, 1, { type: 'spring', stiffness: 400, damping: 30 });
      animate(x, 0, { type: 'spring', stiffness: 400, damping: 30 });
      animate(y, 0, { type: 'spring', stiffness: 400, damping: 30 });
    }
    lastTap.current = now;
  };

  return (
    <div
      className={`overflow-hidden touch-none select-none ${className ?? ''}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <motion.img
        src={src}
        alt={alt}
        style={{ scale, x, y }}
        drag={scale.get() > 1}
        dragConstraints={{ left: -200, right: 200, top: -200, bottom: 200 }}
        dragElastic={0.1}
        className="w-full h-full object-cover pointer-events-none"
      />
    </div>
  );
}
