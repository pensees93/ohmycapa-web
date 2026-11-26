import { describe, expect, it } from 'vitest';
import { buildPrefixOffsets, findVisibleRange } from '../src/utils/virtualMetrics';

describe('virtualMetrics', () => {
  it('handles empty collections cleanly', () => {
    const offsets = buildPrefixOffsets(0, i => String(i), () => 40, new Map());
    expect(Array.from(offsets)).toEqual([0]);
    expect(findVisibleRange(offsets, 0, 600, 5)).toEqual({ startIndex: 0, endIndex: -1 });
  });

  it('uses measured heights when available and falls back to estimates', () => {
    const keys = ['a', 'b', 'c', 'd'];
    const measured = new Map<string, number>([
      ['b', 72],
      ['d', 54],
    ]);
    const offsets = buildPrefixOffsets(
      keys.length,
      i => keys[i],
      i => (i === 0 ? 30 : 40),
      measured,
    );
    expect(Array.from(offsets)).toEqual([0, 30, 102, 142, 196]);
  });

  it('finds visible bounds at top, middle, and bottom with overscan clamping', () => {
    const offsets = buildPrefixOffsets(100, i => `k${i}`, () => 40, new Map());

    expect(findVisibleRange(offsets, 0, 200, 5)).toEqual({ startIndex: 0, endIndex: 9 });
    // ScrollTop 800 -> items 20..24 visible inside [800, 1000)
    expect(findVisibleRange(offsets, 800, 200, 4)).toEqual({ startIndex: 16, endIndex: 28 });
    // Exact boundary slightly above 800
    expect(findVisibleRange(offsets, 799, 200, 0)).toEqual({ startIndex: 19, endIndex: 24 });
    // Scrolled past bottom should clamp safely to the tail
    expect(findVisibleRange(offsets, 5000, 300, 5)).toEqual({ startIndex: 94, endIndex: 99 });
  });

  it('handles variable height rows accurately across binary search', () => {
    const heights = [36, 120, 40, 88, 36, 36, 200, 36];
    const offsets = buildPrefixOffsets(
      heights.length,
      i => String(i),
      i => heights[i],
      new Map(),
    );
    // Cumulative offsets: [0, 36, 156, 196, 284, 320, 356, 556, 592]
    expect(findVisibleRange(offsets, 160, 150, 1)).toEqual({ startIndex: 1, endIndex: 5 });
    expect(findVisibleRange(offsets, 400, 50, 0)).toEqual({ startIndex: 6, endIndex: 6 });
  });
});
