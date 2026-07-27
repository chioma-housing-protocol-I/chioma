'use client';

import { useEffect, useState } from 'react';

/**
 * Skip link component for keyboard users to jump directly to main content.
 * Improves navigation efficiency for screen reader and keyboard-only users.
 */
export function SkipLink() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Show skip link when Tab is pressed
      if (e.key === 'Tab') {
        setIsVisible(true);
      }
    };

    const handleClick = () => {
      setIsVisible(false);
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('click', handleClick);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('click', handleClick);
    };
  }, []);

  const handleSkip = () => {
    const mainContent = document.querySelector('main') || document.querySelector('[role="main"]');
    if (mainContent) {
      (mainContent as HTMLElement).focus();
      // Scroll to main content for visual users
      mainContent.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    setIsVisible(false);
  };

  return (
    <button
      onClick={handleSkip}
      className={`
        fixed top-4 left-4 z-[9999]
        px-4 py-2 rounded-lg
        bg-brand-blue text-white font-semibold
        shadow-lg transition-all duration-200
        focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-offset-2
        ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-full pointer-events-none'}
      `}
      aria-label="Skip to main content"
    >
      Skip to main content
    </button>
  );
}
