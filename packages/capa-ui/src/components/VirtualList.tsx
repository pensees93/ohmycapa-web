import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Box } from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';
import { buildPrefixOffsets, findVisibleRange, type VisibleRange } from '../utils/virtualMetrics';

const EMPTY_OFFSETS = new Float64Array([0]);

export interface VirtualListProps<T> {
  items: readonly T[];
  getItemKey: (item: T, index: number) => string;
  estimateHeight: (item: T, index: number) => number;
  renderItem: (item: T, index: number) => React.ReactNode;
  overscan?: number;
  threshold?: number;
  minContentWidth?: number;
  resetScrollKey?: string | number;
  className?: string;
  sx?: SxProps<Theme>;
}

export function VirtualList<T>({
  items,
  getItemKey,
  estimateHeight,
  renderItem,
  overscan = 10,
  threshold = 80,
  minContentWidth,
  resetScrollKey,
  className,
  sx,
}: VirtualListProps<T>): React.ReactElement {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const measuredHeightsRef = useRef<Map<string, number>>(new Map());
  const rowNodeMapRef = useRef<Map<HTMLDivElement, string>>(new Map());
  const observerRef = useRef<ResizeObserver | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastWidthRef = useRef<number>(0);

  const [viewportHeight, setViewportHeight] = useState<number>(640);
  const [measureVersion, setMeasureVersion] = useState<number>(0);
  const [scrollRange, setScrollRange] = useState<VisibleRange>({ startIndex: 0, endIndex: -1 });

  const isVirtualized = items.length > threshold;

  const getKeyAt = useCallback((i: number) => getItemKey(items[i], i), [items, getItemKey]);
  const getEstimateAt = useCallback((i: number) => estimateHeight(items[i], i), [items, estimateHeight]);

  const offsets = useMemo(() => {
    if (!isVirtualized || items.length === 0) return EMPTY_OFFSETS;
    return buildPrefixOffsets(items.length, getKeyAt, getEstimateAt, measuredHeightsRef.current);
    // `measureVersion` invalidates prefix offsets after ResizeObserver commits a batch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVirtualized, items.length, getKeyAt, getEstimateAt, measureVersion]);

  const offsetsRef = useRef(offsets);
  offsetsRef.current = offsets;
  const viewportHeightRef = useRef(viewportHeight);
  viewportHeightRef.current = viewportHeight;
  const overscanRef = useRef(overscan);
  overscanRef.current = overscan;

  // Track scroll viewport dimensions and reset height cache if container width changes significantly.
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const updateSize = () => {
      const nextH = el.clientHeight || 640;
      const nextW = el.clientWidth;
      if (lastWidthRef.current > 0 && Math.abs(nextW - lastWidthRef.current) >= 2) {
        measuredHeightsRef.current.clear();
        setMeasureVersion(v => v + 1);
      }
      lastWidthRef.current = nextW;
      setViewportHeight(prev => (Math.abs(prev - nextH) >= 1 ? nextH : prev));
    };

    updateSize();

    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(updateSize);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Shared ResizeObserver measuring actual rendered row heights.
  useEffect(() => {
    if (!isVirtualized || typeof ResizeObserver === 'undefined') {
      observerRef.current?.disconnect();
      observerRef.current = null;
      return;
    }

    const ro = new ResizeObserver(entries => {
      let changed = false;
      for (const entry of entries) {
        const el = entry.target as HTMLDivElement;
        const key = rowNodeMapRef.current.get(el);
        if (!key) continue;
        const borderSize = entry.borderBoxSize?.[0]?.blockSize;
        const measured = Math.ceil(borderSize && borderSize > 0 ? borderSize : entry.contentRect.height);
        if (measured <= 0) continue;
        const prev = measuredHeightsRef.current.get(key);
        if (prev === undefined || Math.abs(prev - measured) >= 1) {
          measuredHeightsRef.current.set(key, measured);
          changed = true;
        }
      }
      if (changed && rafRef.current === null) {
        rafRef.current = requestAnimationFrame(() => {
          rafRef.current = null;
          setMeasureVersion(v => v + 1);
        });
      }
    });

    observerRef.current = ro;
    for (const el of rowNodeMapRef.current.keys()) {
      ro.observe(el);
    }

    return () => {
      ro.disconnect();
      observerRef.current = null;
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [isVirtualized]);

  // Reset scroll offset cleanly when switching filter/group mode/tab keys.
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = 0;
    if (isVirtualized && items.length > 0) {
      const next = findVisibleRange(offsetsRef.current, 0, viewportHeightRef.current, overscanRef.current);
      setScrollRange(next);
    } else {
      setScrollRange({ startIndex: 0, endIndex: Math.min(items.length - 1, -1) });
    }
    // Only reset scroll position when `resetScrollKey` or virtualization mode flips.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetScrollKey, isVirtualized]);

  const handleScroll = useCallback(() => {
    if (!isVirtualized) return;
    const el = scrollRef.current;
    if (!el) return;
    const next = findVisibleRange(offsetsRef.current, el.scrollTop, viewportHeightRef.current, overscanRef.current);
    setScrollRange(prev =>
      prev.startIndex === next.startIndex && prev.endIndex === next.endIndex ? prev : next
    );
  }, [isVirtualized]);

  const activeRange = useMemo(() => {
    if (!isVirtualized || items.length === 0) {
      return { startIndex: 0, endIndex: items.length - 1 };
    }
    const scrollTop = scrollRef.current?.scrollTop ?? 0;
    const computed = findVisibleRange(offsets, scrollTop, viewportHeight, overscan);
    // Keep dependency on `scrollRange` so discrete scroll ticks recompute cleanly.
    void scrollRange;
    return {
      startIndex: Math.max(0, Math.min(items.length - 1, computed.startIndex)),
      endIndex: Math.max(-1, Math.min(items.length - 1, computed.endIndex)),
    };
  }, [isVirtualized, items.length, offsets, viewportHeight, overscan, scrollRange]);

  const totalHeight = isVirtualized && items.length > 0 ? offsets[items.length] : 0;

  return (
    <Box
      ref={scrollRef}
      onScroll={handleScroll}
      className={className}
      sx={[
        {
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          overflowX: 'auto',
          position: 'relative',
        },
        ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
      ]}
    >
      {items.length === 0 ? null : !isVirtualized ? (
        <div style={minContentWidth ? { minWidth: minContentWidth } : undefined}>
          {items.map((item, idx) => (
            <React.Fragment key={getItemKey(item, idx)}>
              {renderItem(item, idx)}
            </React.Fragment>
          ))}
        </div>
      ) : (
        <div
          style={{
            position: 'relative',
            height: totalHeight,
            minWidth: minContentWidth,
            width: '100%',
          }}
        >
          {(() => {
            const nodes: React.ReactNode[] = [];
            for (let i = activeRange.startIndex; i <= activeRange.endIndex; i++) {
              const item = items[i];
              const key = getItemKey(item, i);
              const top = offsets[i];
              nodes.push(
                <div
                  key={key}
                  data-vkey={key}
                  ref={node => {
                    if (node) {
                      rowNodeMapRef.current.set(node, key);
                      observerRef.current?.observe(node);
                    } else {
                      for (const [el, k] of rowNodeMapRef.current.entries()) {
                        if (k === key && !el.isConnected) {
                          observerRef.current?.unobserve(el);
                          rowNodeMapRef.current.delete(el);
                        }
                      }
                    }
                  }}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    transform: `translateY(${top}px)`,
                  }}
                >
                  {renderItem(item, i)}
                </div>
              );
            }
            return nodes;
          })()}
        </div>
      )}
    </Box>
  );
}
