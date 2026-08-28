'use client';

import React, { useEffect, useRef } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
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
 * Slides up from the bottom and can be dismissed by dragging down,
 * tapping the backdrop, or pressing Escape. Built on Radix's Dialog
 * primitive (forceMount + our own AnimatePresence) so focus is trapped
 * while open and restored to the trigger on close.
 */
export function BottomSheet({
  isOpen,
  onClose,
  title,
  children,
  height = 'auto',
}: BottomSheetProps) {
  const y = useMotionValue(0);
  // No Dialog.Trigger is rendered (this is externally controlled), so Radix
  // has nothing to return focus to on close — capture it ourselves.
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      y.set(0);
      previouslyFocusedRef.current =
        document.activeElement as HTMLElement | null;
    }
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
    <Dialog.Root
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <AnimatePresence>
        {isOpen && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild forceMount>
              <motion.div
                key="backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                data-testid="bottom-sheet-overlay"
                className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
              />
            </Dialog.Overlay>

            <Dialog.Content
              asChild
              forceMount
              aria-modal="true"
              onCloseAutoFocus={(e) => {
                e.preventDefault();
                previouslyFocusedRef.current?.focus();
              }}
            >
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
                className="fixed bottom-0 left-0 right-0 z-50 bg-slate-900 border-t border-white/10 rounded-t-3xl shadow-2xl focus:outline-none"
                style={{ height, y }}
              >
                {/* Drag handle */}
                <div className="flex justify-center pt-4 pb-2 cursor-grab active:cursor-grabbing">
                  <div className="w-10 h-1 bg-white/20 rounded-full" />
                </div>

                <Dialog.Title
                  className={
                    title
                      ? 'px-6 pb-4 border-b border-white/10 text-lg font-bold text-white'
                      : 'sr-only'
                  }
                >
                  {title ?? 'Dialog'}
                </Dialog.Title>

                <div className="overflow-y-auto px-6 pb-safe-bottom">
                  {children}
                </div>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}
