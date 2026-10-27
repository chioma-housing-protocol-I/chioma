'use client';

import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Search } from 'lucide-react';

import { cn } from '@/lib/utils';

export interface SelectOption<T = unknown> {
  value: string;
  label: string;
  disabled?: boolean;
  /** Arbitrary payload made available to custom renderers. */
  data?: T;
}

export interface SearchableSelectProps<T = unknown> {
  options: SelectOption<T>[];
  value: string | null;
  onChange: (value: string, option: SelectOption<T>) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  /** Hide the search input for short lists. */
  searchable?: boolean;
  /** Custom filter; defaults to a case-insensitive label match. */
  filterOption?: (option: SelectOption<T>, query: string) => boolean;
  /** Custom rendering for each option row in the list. */
  renderOption?: (
    option: SelectOption<T>,
    state: { selected: boolean; active: boolean },
  ) => React.ReactNode;
  /** Custom rendering for the selected value inside the trigger. */
  renderValue?: (option: SelectOption<T>) => React.ReactNode;
  /** Fixed row height in px, used to virtualize the list. */
  itemHeight?: number;
  /** Maximum height of the list in px before it scrolls. */
  maxListHeight?: number;
  disabled?: boolean;
  ariaLabel?: string;
  className?: string;
}

const OVERSCAN = 4;

const defaultFilter = (option: SelectOption, query: string) =>
  option.label.toLowerCase().includes(query.toLowerCase());

export function SearchableSelect<T = unknown>({
  options,
  value,
  onChange,
  placeholder = 'Select an option',
  searchPlaceholder = 'Search...',
  emptyMessage = 'No results found',
  searchable = true,
  filterOption = defaultFilter,
  renderOption,
  renderValue,
  itemHeight = 36,
  maxListHeight = 240,
  disabled = false,
  ariaLabel,
  className = '',
}: SearchableSelectProps<T>) {
  const baseId = useId();
  const listboxId = `${baseId}-listbox`;
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);
  const [scrollTop, setScrollTop] = useState(0);

  const selectedOption = options.find((option) => option.value === value);

  const filtered = useMemo(
    () =>
      query.trim()
        ? options.filter((option) => filterOption(option, query.trim()))
        : options,
    [options, query, filterOption],
  );

  const listHeight = Math.min(maxListHeight, filtered.length * itemHeight);
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - OVERSCAN);
  const endIndex = Math.min(
    filtered.length,
    Math.ceil((scrollTop + listHeight) / itemHeight) + OVERSCAN,
  );
  const visibleOptions = filtered.slice(startIndex, endIndex);

  const open = () => {
    if (disabled) return;
    const selectedIndex = options.findIndex(
      (option) => option.value === value,
    );
    setQuery('');
    setIsOpen(true);
    setActiveIndex(
      selectedIndex >= 0
        ? selectedIndex
        : options.findIndex((option) => !option.disabled),
    );
  };

  const close = (restoreFocus = true) => {
    setIsOpen(false);
    setQuery('');
    if (restoreFocus) triggerRef.current?.focus();
  };

  const select = (option: SelectOption<T>) => {
    if (option.disabled) return;
    onChange(option.value, option);
    close();
  };

  // Close when clicking outside the component.
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Focus the search input (or list) on open.
  useEffect(() => {
    if (!isOpen) return;
    if (searchable) searchRef.current?.focus();
    else listRef.current?.focus();
  }, [isOpen, searchable]);

  // Keep the active option scrolled into view inside the virtualized list.
  useEffect(() => {
    const list = listRef.current;
    if (!isOpen || !list || activeIndex < 0) return;
    const top = activeIndex * itemHeight;
    const bottom = top + itemHeight;
    if (top < list.scrollTop) {
      list.scrollTop = top;
    } else if (bottom > list.scrollTop + list.clientHeight) {
      list.scrollTop = bottom - list.clientHeight;
    }
  }, [activeIndex, isOpen, itemHeight]);

  const moveActive = (from: number, step: 1 | -1) => {
    let index = from;
    for (let i = 0; i < filtered.length; i += 1) {
      index += step;
      if (index < 0 || index >= filtered.length) return;
      if (!filtered[index].disabled) {
        setActiveIndex(index);
        return;
      }
    }
  };

  const handleListKeyDown = (event: React.KeyboardEvent) => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        moveActive(activeIndex, 1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        moveActive(activeIndex, -1);
        break;
      case 'Home':
        if (searchable && event.target === searchRef.current) break;
        event.preventDefault();
        moveActive(-1, 1);
        break;
      case 'End':
        if (searchable && event.target === searchRef.current) break;
        event.preventDefault();
        moveActive(filtered.length, -1);
        break;
      case 'PageDown':
        event.preventDefault();
        moveActive(
          Math.min(
            filtered.length - 1,
            activeIndex + Math.floor(listHeight / itemHeight),
          ) - 1,
          1,
        );
        break;
      case 'PageUp':
        event.preventDefault();
        moveActive(
          Math.max(0, activeIndex - Math.floor(listHeight / itemHeight)) + 1,
          -1,
        );
        break;
      case 'Enter':
        event.preventDefault();
        if (filtered[activeIndex]) select(filtered[activeIndex]);
        break;
      case 'Escape':
        event.preventDefault();
        close();
        break;
      case 'Tab':
        close(false);
        break;
      default:
        break;
    }
  };

  const handleTriggerKeyDown = (event: React.KeyboardEvent) => {
    if (
      !isOpen &&
      ['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(event.key)
    ) {
      event.preventDefault();
      open();
    }
  };

  const activeOptionId =
    activeIndex >= 0 ? `${baseId}-option-${activeIndex}` : undefined;

  return (
    <div ref={containerRef} className={cn('relative w-full', className)}>
      <button
        ref={triggerRef}
        type="button"
        role="combobox"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        disabled={disabled}
        onClick={() => (isOpen ? close() : open())}
        onKeyDown={handleTriggerKeyDown}
        className="flex h-10 w-full items-center justify-between rounded-md border border-neutral-200 bg-white px-3 py-2 text-left text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span
          className={cn('truncate', !selectedOption && 'text-neutral-500')}
        >
          {selectedOption
            ? renderValue
              ? renderValue(selectedOption)
              : selectedOption.label
            : placeholder}
        </span>
        <ChevronDown
          className={cn(
            'ml-2 h-4 w-4 shrink-0 opacity-50 transition-transform',
            isOpen && 'rotate-180',
          )}
        />
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-md border border-neutral-200 bg-white shadow-lg">
          {searchable && (
            <div className="flex items-center gap-2 border-b border-neutral-200 px-3">
              <Search className="h-4 w-4 shrink-0 text-neutral-400" />
              <input
                ref={searchRef}
                type="text"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setActiveIndex(0);
                  setScrollTop(0);
                  if (listRef.current) listRef.current.scrollTop = 0;
                }}
                onKeyDown={handleListKeyDown}
                placeholder={searchPlaceholder}
                aria-label={searchPlaceholder}
                aria-autocomplete="list"
                aria-controls={listboxId}
                aria-activedescendant={activeOptionId}
                className="h-9 w-full bg-transparent text-sm text-neutral-900 outline-none placeholder:text-neutral-400"
              />
            </div>
          )}

          {filtered.length === 0 ? (
            <p className="px-3 py-2 text-sm text-neutral-500">{emptyMessage}</p>
          ) : (
            <ul
              ref={listRef}
              id={listboxId}
              role="listbox"
              tabIndex={searchable ? -1 : 0}
              aria-activedescendant={searchable ? undefined : activeOptionId}
              onKeyDown={searchable ? undefined : handleListKeyDown}
              onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
              className="relative overflow-y-auto focus:outline-none"
              style={{ height: listHeight }}
            >
              <li
                role="presentation"
                aria-hidden="true"
                style={{ height: startIndex * itemHeight }}
              />
              {visibleOptions.map((option, offset) => {
                const index = startIndex + offset;
                const selected = option.value === value;
                const active = index === activeIndex;
                return (
                  <li
                    key={option.value}
                    id={`${baseId}-option-${index}`}
                    role="option"
                    aria-selected={selected}
                    aria-disabled={option.disabled || undefined}
                    onMouseDown={(event) => event.preventDefault()}
                    onMouseEnter={() =>
                      !option.disabled && setActiveIndex(index)
                    }
                    onClick={() => select(option)}
                    style={{ height: itemHeight }}
                    className={cn(
                      'flex cursor-pointer select-none items-center px-3 text-sm text-neutral-900',
                      active && 'bg-neutral-100',
                      option.disabled && 'cursor-not-allowed opacity-50',
                    )}
                  >
                    {renderOption ? (
                      renderOption(option, { selected, active })
                    ) : (
                      <>
                        <span className="flex-1 truncate">{option.label}</span>
                        {selected && (
                          <Check className="ml-2 h-4 w-4 text-blue-600" />
                        )}
                      </>
                    )}
                  </li>
                );
              })}
              <li
                role="presentation"
                aria-hidden="true"
                style={{ height: (filtered.length - endIndex) * itemHeight }}
              />
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
