'use client';

import React, { useEffect } from 'react';
import {
  motion,
  AnimatePresence,
  useMotionValue,
  animate,
} from 'framer-motion';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  /** Sheet height as a CSS value. Defaults to 'auto'. */
  height?: string;
}

/**
 * Mobile-friendly bottom sheet with drag-to-dismiss support.
 * Slides up from the bottom and can be dismissed by dragging down or
 * tapping the backdrop.
 */
export function BottomSheet({
  isOpen,
  onClose,
  title,
  children,
  height = 'auto',
}: BottomSheetProps) {
  const y = useMotionValue(0);

  useEffect(() => {
    if (isOpen) y.set(0);
  }, [isOpen, y]);

  const handleDragEnd = (
    _: unknown,
    info: { offset: { y: number }; velocity: { y: number } },
  ) => {
    if (info.offset.y > 120 || info.velocity.y > 500) {
      animate(y, 600, { duration: 0.2 }).then(onClose);
    } else {
      animate(y, 0, { type: 'spring', stiffness: 400, damping: 30 });
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          />

          {/* Sheet */}
          <motion.div
            key="sheet"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 400, damping: 40 }}
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={{ top: 0, bottom: 0.2 }}
            onDragEnd={handleDragEnd}
            className="fixed bottom-0 left-0 right-0 z-50 bg-slate-900 border-t border-white/10 rounded-t-3xl shadow-2xl"
            style={{ height, y }}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-4 pb-2 cursor-grab active:cursor-grabbing">
              <div className="w-10 h-1 bg-white/20 rounded-full" />
            </div>

            {title && (
              <div className="px-6 pb-4 border-b border-white/10">
                <h2 className="text-lg font-bold text-white">{title}</h2>
              </div>
            )}

            <div className="overflow-y-auto px-6 pb-safe-bottom">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
