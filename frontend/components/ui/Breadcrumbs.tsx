'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';
import { usePathname } from 'next/navigation';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items?: BreadcrumbItem[];
  homeHref?: string;
  className?: string;
}

export function Breadcrumbs({
  items,
  homeHref = '/',
  className = '',
}: BreadcrumbsProps) {
  const pathname = usePathname();

  // Auto-generate items from pathname if none provided
  const breadcrumbItems =
    items ||
    (() => {
      const segments = pathname.split('/').filter(Boolean);
      return segments.map((segment, index) => {
        const href = `/${segments.slice(0, index + 1).join('/')}`;
        // Capitalize and format the segment label
        const label = segment
          .replace(/-/g, ' ')
          .replace(/\b\w/g, (char) => char.toUpperCase());

        return {
          label,
          href: index === segments.length - 1 ? undefined : href,
        };
      });
    })();

  if (!breadcrumbItems.length) return null;

  return (
    <nav
      className={`flex items-center text-sm text-gray-500 mb-6 ${className}`}
      aria-label="Breadcrumb"
    >
      <ol className="flex items-center space-x-2">
        <li>
          <Link
            href={homeHref}
            className="text-gray-400 hover:text-brand-blue transition-colors flex items-center"
            title="Home"
          >
            <Home className="w-4 h-4" />
          </Link>
        </li>

        {breadcrumbItems.map((item, index) => {
          const isLast = index === breadcrumbItems.length - 1;

          return (
            <li
              key={`${item.label}-${index}`}
              className="flex items-center space-x-2"
            >
              <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
              {isLast || !item.href ? (
                <span
                  className="font-semibold text-gray-900 truncate max-w-[200px]"
                  aria-current="page"
                >
                  {item.label}
                </span>
              ) : (
                <Link
                  href={item.href}
                  className="hover:text-brand-blue transition-colors hover:underline truncate max-w-[150px]"
                >
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
