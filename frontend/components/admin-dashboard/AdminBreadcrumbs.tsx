'use client';

import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';
import { getAdminBreadcrumbItems } from './navigation';

export default function AdminBreadcrumbs({ pathname }: { pathname: string }) {
  const items = getAdminBreadcrumbItems(pathname);

  if (items.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className="px-4 sm:px-6 pt-3">
      <ol className="flex items-center gap-2 text-xs sm:text-sm text-blue-200/75">
        <li>
          <Link
            href="/admin"
            className="inline-flex items-center hover:text-white transition-colors"
            title="Admin Home"
          >
            <Home size={14} />
          </Link>
        </li>
        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <li
              key={`${item.label}-${index}`}
              className="inline-flex items-center gap-2"
            >
              <ChevronRight size={14} className="text-blue-300/40" />
              {isLast || !item.href ? (
                <span className="text-white font-medium">{item.label}</span>
              ) : (
                <Link
                  href={item.href}
                  className="hover:text-white transition-colors truncate"
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
