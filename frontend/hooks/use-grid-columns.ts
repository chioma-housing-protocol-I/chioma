'use client';

import { useEffect, useState } from 'react';

// Mirrors the `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4` breakpoints used
// by the responsive card grids so JS-driven virtualization lines up with
// the CSS layout it replaces.
const BREAKPOINTS: Array<{ minWidth: number; columns: number }> = [
  { minWidth: 1024, columns: 4 },
  { minWidth: 640, columns: 2 },
  { minWidth: 0, columns: 1 },
];

function resolveColumns(width: number): number {
  const match = BREAKPOINTS.find((bp) => width >= bp.minWidth);
  return match?.columns ?? 1;
}

export function useGridColumns(): number {
  const [columns, setColumns] = useState(() =>
    typeof window === 'undefined' ? 1 : resolveColumns(window.innerWidth),
  );

  useEffect(() => {
    const update = () => setColumns(resolveColumns(window.innerWidth));
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  return columns;
}
