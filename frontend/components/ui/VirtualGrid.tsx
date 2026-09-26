'use client';

import React, {
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';

interface VirtualGridProps<T> {
  items: T[];
  columns: number;
  rowHeight: number;
  gap?: number;
  renderItem: (item: T, index: number) => ReactNode;
  header?: ReactNode;
  footer?: ReactNode;
  className?: string;
  innerClassName?: string;
  gridClassName?: string;
  style?: CSSProperties;
  overscanRows?: number;
  'data-testid'?: string;
}

// Row-based windowed grid: only rows within (viewport height + overscan) of
// the scroll position are mounted. Rows auto-size to content — `rowHeight`
// is an estimate used to pick which rows are in range and to size the
// scroll-height spacer, not a hard cap, so mildly variable card heights
// (e.g. an optional amenities row) don't cause overlap.
export function VirtualGrid<T>({
  items,
  columns,
  rowHeight,
  gap = 0,
  renderItem,
  header,
  footer,
  className = '',
  innerClassName = '',
  gridClassName = '',
  style,
  overscanRows = 3,
  'data-testid': dataTestId,
}: VirtualGridProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewport, setViewport] = useState({ height: 0, scrollTop: 0 });

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () =>
      setViewport({ height: el.clientHeight, scrollTop: el.scrollTop });
    update();

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', update);
      return () => window.removeEventListener('resize', update);
    }
    const resizeObserver = new ResizeObserver(update);
    resizeObserver.observe(el);
    return () => resizeObserver.disconnect();
  }, []);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setViewport((v) => ({ ...v, scrollTop: e.currentTarget.scrollTop }));
  };

  const safeColumns = Math.max(1, columns);
  const rowStep = rowHeight + gap;
  const rowCount = Math.ceil(items.length / safeColumns);

  const startRow = Math.max(
    0,
    Math.floor(viewport.scrollTop / rowStep) - overscanRows,
  );
  const visibleRowSpan = viewport.height
    ? Math.ceil(viewport.height / rowStep) + overscanRows * 2
    : rowCount;
  const endRow = Math.min(rowCount, startRow + visibleRowSpan);

  const startIndex = startRow * safeColumns;
  const endIndex = Math.min(items.length, endRow * safeColumns);
  const visibleItems = items.slice(startIndex, endIndex);

  const totalHeight = rowCount * rowStep;

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className={`overflow-y-auto ${className}`}
      style={style}
    >
      <div className={innerClassName}>
        {header}
        <div style={{ height: totalHeight, position: 'relative' }}>
          <div
            data-testid={dataTestId}
            className={gridClassName}
            style={{
              position: 'absolute',
              top: startRow * rowStep,
              left: 0,
              right: 0,
              display: 'grid',
              gridTemplateColumns: `repeat(${safeColumns}, minmax(0, 1fr))`,
              gap,
            }}
          >
            {visibleItems.map((item, i) => renderItem(item, startIndex + i))}
          </div>
        </div>
        {footer}
      </div>
    </div>
  );
}
