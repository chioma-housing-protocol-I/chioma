'use client';

import React, { createContext, useContext, useId, useState } from 'react';
import { ChevronDown } from 'lucide-react';

export type AccordionType = 'single' | 'multiple';

interface AccordionContextValue {
  openItems: string[];
  toggle: (value: string) => void;
}

const AccordionContext = createContext<AccordionContextValue | null>(null);

function useAccordionContext(): AccordionContextValue {
  const context = useContext(AccordionContext);
  if (!context) {
    throw new Error('AccordionItem must be used within an Accordion');
  }
  return context;
}

export interface AccordionProps {
  /** `single` keeps at most one item open; `multiple` allows any number. */
  type?: AccordionType;
  /** When `type` is `single`, allow closing the open item by clicking it again. */
  collapsible?: boolean;
  /** Initially open item values (uncontrolled). */
  defaultValue?: string[];
  /** Open item values (controlled). */
  value?: string[];
  /** Called with the new list of open item values whenever it changes. */
  onValueChange?: (value: string[]) => void;
  className?: string;
  children: React.ReactNode;
}

export function Accordion({
  type = 'single',
  collapsible = true,
  defaultValue = [],
  value,
  onValueChange,
  className = '',
  children,
}: AccordionProps) {
  const [internalValue, setInternalValue] = useState<string[]>(defaultValue);
  const isControlled = value !== undefined;
  const openItems = isControlled ? value : internalValue;

  const toggle = (itemValue: string) => {
    const isOpen = openItems.includes(itemValue);
    let next: string[];

    if (type === 'multiple') {
      next = isOpen
        ? openItems.filter((item) => item !== itemValue)
        : [...openItems, itemValue];
    } else if (isOpen) {
      if (!collapsible) return;
      next = [];
    } else {
      next = [itemValue];
    }

    if (!isControlled) setInternalValue(next);
    onValueChange?.(next);
  };

  return (
    <AccordionContext.Provider value={{ openItems, toggle }}>
      <div
        className={`divide-y divide-neutral-200 rounded-xl border border-neutral-200 bg-white ${className}`}
      >
        {children}
      </div>
    </AccordionContext.Provider>
  );
}

export interface AccordionItemProps {
  /** Unique identifier of this item within the accordion. */
  value: string;
  /** Content of the header button. */
  title: React.ReactNode;
  disabled?: boolean;
  className?: string;
  children: React.ReactNode;
}

export function AccordionItem({
  value,
  title,
  disabled = false,
  className = '',
  children,
}: AccordionItemProps) {
  const { openItems, toggle } = useAccordionContext();
  const isOpen = openItems.includes(value);
  const id = useId();
  const triggerId = `${id}-trigger`;
  const panelId = `${id}-panel`;

  return (
    <div className={className} data-state={isOpen ? 'open' : 'closed'}>
      <h3 className="m-0">
        <button
          type="button"
          id={triggerId}
          aria-expanded={isOpen}
          aria-controls={panelId}
          disabled={disabled}
          onClick={() => toggle(value)}
          className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left text-sm font-semibold text-neutral-900 transition hover:bg-neutral-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span>{title}</span>
          <ChevronDown
            aria-hidden="true"
            className={`h-4 w-4 shrink-0 text-neutral-500 transition-transform duration-200 ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </button>
      </h3>
      <div
        id={panelId}
        role="region"
        aria-labelledby={triggerId}
        hidden={!isOpen}
        className="px-4 pb-4 text-sm text-neutral-600"
      >
        {children}
      </div>
    </div>
  );
}
