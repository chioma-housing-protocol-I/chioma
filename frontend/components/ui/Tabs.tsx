'use client';

import React, { useId, useRef, useState } from 'react';

import { cn } from '@/lib/utils';

export interface TabItem {
  id: string;
  label: React.ReactNode;
  content: React.ReactNode;
  disabled?: boolean;
}

export interface TabsProps {
  tabs: TabItem[];
  /** Controlled active tab id. */
  value?: string;
  /** Initial active tab id when uncontrolled. Defaults to the first enabled tab. */
  defaultValue?: string;
  onChange?: (id: string) => void;
  /**
   * `automatic` activates a tab as soon as it receives focus via the keyboard;
   * `manual` only moves focus and requires Enter/Space to activate.
   */
  activationMode?: 'automatic' | 'manual';
  orientation?: 'horizontal' | 'vertical';
  ariaLabel?: string;
  className?: string;
}

export function Tabs({
  tabs,
  value,
  defaultValue,
  onChange,
  activationMode = 'automatic',
  orientation = 'horizontal',
  ariaLabel,
  className = '',
}: TabsProps) {
  const baseId = useId();
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const firstEnabled = tabs.find((tab) => !tab.disabled)?.id;
  const [internalValue, setInternalValue] = useState(
    defaultValue ?? firstEnabled,
  );

  const isControlled = value !== undefined;
  const activeId = isControlled ? value : internalValue;

  const activate = (id: string) => {
    if (!isControlled) setInternalValue(id);
    if (id !== activeId) onChange?.(id);
  };

  const focusTab = (index: number) => {
    tabRefs.current[index]?.focus();
    if (activationMode === 'automatic') activate(tabs[index].id);
  };

  const findEnabled = (start: number, step: 1 | -1) => {
    const count = tabs.length;
    for (let offset = 1; offset <= count; offset += 1) {
      const index = (((start + step * offset) % count) + count) % count;
      if (!tabs[index].disabled) return index;
    }
    return start;
  };

  const handleKeyDown = (
    event: React.KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) => {
    const nextKey = orientation === 'horizontal' ? 'ArrowRight' : 'ArrowDown';
    const prevKey = orientation === 'horizontal' ? 'ArrowLeft' : 'ArrowUp';

    switch (event.key) {
      case nextKey:
        event.preventDefault();
        focusTab(findEnabled(index, 1));
        break;
      case prevKey:
        event.preventDefault();
        focusTab(findEnabled(index, -1));
        break;
      case 'Home':
        event.preventDefault();
        focusTab(findEnabled(tabs.length - 1, 1));
        break;
      case 'End':
        event.preventDefault();
        focusTab(findEnabled(0, -1));
        break;
      case 'Enter':
      case ' ':
        if (activationMode === 'manual') {
          event.preventDefault();
          activate(tabs[index].id);
        }
        break;
      default:
        break;
    }
  };

  const isVertical = orientation === 'vertical';

  return (
    <div className={cn(isVertical ? 'flex gap-4' : 'w-full', className)}>
      <div
        role="tablist"
        aria-label={ariaLabel}
        aria-orientation={orientation}
        className={cn(
          'flex',
          isVertical
            ? 'flex-col border-r border-neutral-200'
            : 'border-b border-neutral-200 overflow-x-auto',
        )}
      >
        {tabs.map((tab, index) => {
          const selected = tab.id === activeId;
          return (
            <button
              key={tab.id}
              ref={(el) => {
                tabRefs.current[index] = el;
              }}
              id={`${baseId}-tab-${tab.id}`}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={`${baseId}-panel-${tab.id}`}
              tabIndex={selected ? 0 : -1}
              disabled={tab.disabled}
              onClick={() => activate(tab.id)}
              onKeyDown={(event) => handleKeyDown(event, index)}
              className={cn(
                'whitespace-nowrap px-4 py-2 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50',
                isVertical
                  ? '-mr-px border-r-2 text-left'
                  : '-mb-px border-b-2',
                selected
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-neutral-600 hover:text-neutral-900',
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {tabs.map((tab) => (
        <div
          key={tab.id}
          id={`${baseId}-panel-${tab.id}`}
          role="tabpanel"
          aria-labelledby={`${baseId}-tab-${tab.id}`}
          hidden={tab.id !== activeId}
          tabIndex={0}
          className={cn('focus:outline-none', isVertical ? 'flex-1' : 'pt-4')}
        >
          {tab.id === activeId && tab.content}
        </div>
      ))}
    </div>
  );
}
