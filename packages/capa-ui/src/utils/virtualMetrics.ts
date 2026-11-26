export interface VisibleRange {
  startIndex: number;
  endIndex: number;
}

/**
 * Builds cumulative Y-offsets of length `count + 1` where `offsets[0] === 0`
 * and `offsets[i + 1] - offsets[i]` is the measured (or estimated) height of item `i`.
 */
export function buildPrefixOffsets(
  count: number,
  getKey: (index: number) => string,
  getEstimatedHeight: (index: number) => number,
  measuredHeights: ReadonlyMap<string, number>,
): Float64Array {
  const offsets = new Float64Array(count + 1);
  let acc = 0;
  for (let i = 0; i < count; i++) {
    const measured = measuredHeights.get(getKey(i));
    const h = measured !== undefined && measured > 0 ? measured : Math.max(1, getEstimatedHeight(i));
    acc += h;
    offsets[i + 1] = acc;
  }
  return offsets;
}

/**
 * Binary-searches cumulative `offsets` (length `count + 1`) to find the inclusive
 * `[startIndex, endIndex]` range visible inside `[scrollTop, scrollTop + viewportHeight]`
 * expanded by `overscan` items above and below. Returns `{ startIndex: 0, endIndex: -1 }`
 * when the list is empty.
 */
export function findVisibleRange(
  offsets: Float64Array,
  scrollTop: number,
  viewportHeight: number,
  overscan = 8,
): VisibleRange {
  const count = offsets.length - 1;
  if (count <= 0) {
    return { startIndex: 0, endIndex: -1 };
  }

  const clampedTop = Math.max(0, scrollTop);
  const clampedBottom = clampedTop + Math.max(1, viewportHeight);
  const safeOverscan = Math.max(0, overscan);

  // First index `i` where `offsets[i + 1] > clampedTop` (item's bottom is below scrollTop).
  let lo = 0;
  let hi = count - 1;
  let firstVisible = count - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >>> 1;
    if (offsets[mid + 1] > clampedTop) {
      firstVisible = mid;
      hi = mid - 1;
    } else {
      lo = mid + 1;
    }
  }

  // Last index `i` where `offsets[i] < clampedBottom` (item's top is above viewport bottom).
  lo = firstVisible;
  hi = count - 1;
  let lastVisible = firstVisible;
  while (lo <= hi) {
    const mid = (lo + hi) >>> 1;
    if (offsets[mid] < clampedBottom) {
      lastVisible = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }

  return {
    startIndex: Math.max(0, firstVisible - safeOverscan),
    endIndex: Math.min(count - 1, lastVisible + safeOverscan),
  };
}
