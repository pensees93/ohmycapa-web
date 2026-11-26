import type {
  CapaCompareResult,
  CompareFormat,
  FeatureDiff,
  FeatureKind,
  FeatureLeaf,
  RatType,
} from '@ohmycapa/capa-core';
import { RAT_META_MAP, RAT_TABS } from '../constants/statusMeta';

export type GlobalFeatureStatusFilter = 'all' | 'diff' | 'different' | 'a-only' | 'b-only' | 'same';

export interface GlobalFeatureCompareItem {
  id: string;
  rowKey: string;
  rat: RatType;
  ratLabel: string;
  ratShortLabel: string;
  ratAccentColor: string;
  diff: FeatureDiff;
  formattedA: string;
  formattedB: string;
  searchHaystack: string;
}

export interface GlobalFeatureSingleItem {
  id: string;
  rowKey: string;
  rat: RatType;
  ratLabel: string;
  ratShortLabel: string;
  ratAccentColor: string;
  leaf: FeatureLeaf;
  formattedValue: string;
  searchHaystack: string;
}

export interface HighlightSegment {
  text: string;
  match: boolean;
}

export function getFeatureRowKey(major: string, middle: string, leaf: string): string {
  return `${major}|${middle}|${leaf}`;
}

export function getFeatureItemId(rat: RatType, major: string, middle: string, leaf: string): string {
  return `${rat}|${major}|${middle}|${leaf}`;
}

export function formatFeatureValue(v: FeatureDiff['a'], kind: FeatureKind): string {
  if (v === undefined || v === null) return '—';
  if (kind === 'bool' || kind === 'fgiBit' || kind === 'presence') {
    return v ? '✓' : '✗';
  }
  if ((kind === 'stringList' || kind === 'numberList') && Array.isArray(v)) {
    return v.length === 0 ? '(none)' : v.join(', ');
  }
  return String(v);
}

export function tokenizeQuery(query: string): string[] {
  return query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
}

function matchesAllTokens(haystack: string, tokens: readonly string[]): boolean {
  for (let i = 0; i < tokens.length; i++) {
    if (!haystack.includes(tokens[i])) return false;
  }
  return true;
}

function matchesStatus(status: FeatureDiff['status'], filter: GlobalFeatureStatusFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'diff') return status !== 'same';
  return status === filter;
}

/**
 * Builds a pre-indexed cross-RAT list of FeatureDiff items for instant global search
 * in Compare mode.
 */
export function buildGlobalCompareFeatureIndex(compareResult: CapaCompareResult): GlobalFeatureCompareItem[] {
  const result: GlobalFeatureCompareItem[] = [];
  const featuresDiff = compareResult.featuresDiff;
  if (!featuresDiff) return result;

  for (const tab of RAT_TABS) {
    const rat = tab.value;
    const ratDiff = featuresDiff[rat];
    if (!ratDiff || ratDiff.diffs.length === 0) continue;

    for (const diff of ratDiff.diffs) {
      const formattedA = formatFeatureValue(diff.a, diff.kind);
      const formattedB = formatFeatureValue(diff.b, diff.kind);
      const searchHaystack = [
        rat,
        tab.label,
        tab.shortLabel,
        diff.major,
        diff.middle,
        diff.leaf,
        diff.description ?? '',
        diff.path ?? '',
        formattedA,
        formattedB,
      ]
        .join('\n')
        .toLowerCase();

      result.push({
        id: getFeatureItemId(rat, diff.major, diff.middle, diff.leaf),
        rowKey: getFeatureRowKey(diff.major, diff.middle, diff.leaf),
        rat,
        ratLabel: tab.label,
        ratShortLabel: tab.shortLabel,
        ratAccentColor: tab.accentColor,
        diff,
        formattedA,
        formattedB,
        searchHaystack,
      });
    }
  }
  return result;
}

/**
 * Builds a pre-indexed cross-RAT list of FeatureLeaf items for instant global search
 * in Single Device mode.
 */
export function buildGlobalSingleFeatureIndex(device: CompareFormat): GlobalFeatureSingleItem[] {
  const result: GlobalFeatureSingleItem[] = [];
  const features = device.features;
  if (!features) return result;

  for (const tab of RAT_TABS) {
    const rat = tab.value;
    const ratFeatures = features[rat];
    if (!ratFeatures || ratFeatures.leaves.length === 0) continue;

    for (const leaf of ratFeatures.leaves) {
      const formattedValue = formatFeatureValue(leaf.value, leaf.kind);
      const searchHaystack = [
        rat,
        tab.label,
        tab.shortLabel,
        leaf.major,
        leaf.middle,
        leaf.leaf,
        leaf.description ?? '',
        leaf.path ?? '',
        formattedValue,
      ]
        .join('\n')
        .toLowerCase();

      result.push({
        id: getFeatureItemId(rat, leaf.major, leaf.middle, leaf.leaf),
        rowKey: getFeatureRowKey(leaf.major, leaf.middle, leaf.leaf),
        rat,
        ratLabel: tab.label,
        ratShortLabel: tab.shortLabel,
        ratAccentColor: tab.accentColor,
        leaf,
        formattedValue,
        searchHaystack,
      });
    }
  }
  return result;
}

export interface GlobalCompareFilterResult {
  items: GlobalFeatureCompareItem[];
  ratCounts: Partial<Record<RatType, number>>;
  statusCounts: Record<GlobalFeatureStatusFilter, number>;
  totalMatchingQuery: number;
}

/**
 * Filters global Compare feature items with multi-token AND search, status filter,
 * and optional RAT filter, computing consistent per-RAT and per-status counts.
 */
export function filterGlobalCompareFeatures(
  index: readonly GlobalFeatureCompareItem[],
  options: {
    query: string;
    status: GlobalFeatureStatusFilter;
    rats: ReadonlySet<RatType> | null;
  }
): GlobalCompareFilterResult {
  const tokens = tokenizeQuery(options.query);
  const hasRatFilter = Boolean(options.rats && options.rats.size > 0);
  const items: GlobalFeatureCompareItem[] = [];
  const ratCounts: Partial<Record<RatType, number>> = {};
  const statusCounts: Record<GlobalFeatureStatusFilter, number> = {
    all: 0,
    diff: 0,
    different: 0,
    'a-only': 0,
    'b-only': 0,
    same: 0,
  };
  let totalMatchingQuery = 0;

  for (const item of index) {
    if (tokens.length > 0 && !matchesAllTokens(item.searchHaystack, tokens)) {
      continue;
    }
    totalMatchingQuery++;

    const ratMatches = !hasRatFilter || options.rats!.has(item.rat);
    const statusMatches = matchesStatus(item.diff.status, options.status);

    if (statusMatches) {
      ratCounts[item.rat] = (ratCounts[item.rat] ?? 0) + 1;
    }

    if (ratMatches) {
      statusCounts.all++;
      if (item.diff.status === 'same') {
        statusCounts.same++;
      } else {
        statusCounts.diff++;
        statusCounts[item.diff.status]++;
      }
    }

    if (ratMatches && statusMatches) {
      items.push(item);
    }
  }

  return { items, ratCounts, statusCounts, totalMatchingQuery };
}

export interface GlobalSingleFilterResult {
  items: GlobalFeatureSingleItem[];
  ratCounts: Partial<Record<RatType, number>>;
  totalMatchingQuery: number;
}

/**
 * Filters global Single-device feature items with multi-token AND search and RAT filter.
 */
export function filterGlobalSingleFeatures(
  index: readonly GlobalFeatureSingleItem[],
  options: {
    query: string;
    rats: ReadonlySet<RatType> | null;
  }
): GlobalSingleFilterResult {
  const tokens = tokenizeQuery(options.query);
  const hasRatFilter = Boolean(options.rats && options.rats.size > 0);
  const items: GlobalFeatureSingleItem[] = [];
  const ratCounts: Partial<Record<RatType, number>> = {};
  let totalMatchingQuery = 0;

  for (const item of index) {
    if (tokens.length > 0 && !matchesAllTokens(item.searchHaystack, tokens)) {
      continue;
    }
    totalMatchingQuery++;
    ratCounts[item.rat] = (ratCounts[item.rat] ?? 0) + 1;

    if (!hasRatFilter || options.rats!.has(item.rat)) {
      items.push(item);
    }
  }

  return { items, ratCounts, totalMatchingQuery };
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Splits text into non-overlapping highlighted segments matching whitespace-separated
 * query tokens (case-insensitive, regex-safe).
 */
export function splitHighlightSegments(text: string, query: string): HighlightSegment[] {
  if (!text) return [];
  const tokens = Array.from(new Set(tokenizeQuery(query))).sort((a, b) => b.length - a.length);
  if (tokens.length === 0) return [{ text, match: false }];

  const pattern = new RegExp(`(${tokens.map(escapeRegExp).join('|')})`, 'gi');
  const segments: HighlightSegment[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match[0].length === 0) {
      pattern.lastIndex++;
      continue;
    }
    if (match.index > lastIndex) {
      segments.push({ text: text.slice(lastIndex, match.index), match: false });
    }
    segments.push({ text: match[0], match: true });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    segments.push({ text: text.slice(lastIndex), match: false });
  }

  return segments.length > 0 ? segments : [{ text, match: false }];
}

/**
 * Formats a feature compare row as clean plain text for one-click clipboard copy.
 */
export function formatFeatureCompareCopyText(params: {
  rat?: RatType;
  diff: FeatureDiff;
  deviceAName?: string;
  deviceBName?: string;
}): string {
  const { rat, diff, deviceAName = 'Device A', deviceBName = 'Device B' } = params;
  const ratPrefix = rat ? `[${RAT_META_MAP[rat].shortLabel}] ` : '';
  const pathPart = diff.path ?? `${diff.major}.${diff.middle}.${diff.leaf}`;
  const valA = diff.status === 'b-only' ? '—' : formatFeatureValue(diff.a, diff.kind);
  const valB = diff.status === 'a-only' ? '—' : formatFeatureValue(diff.b, diff.kind);
  return `${ratPrefix}${diff.leaf} (${pathPart}) | ${deviceAName}: ${valA} | ${deviceBName}: ${valB}`;
}

/**
 * Formats a single-device feature row as clean plain text for one-click clipboard copy.
 */
export function formatSingleFeatureCopyText(params: {
  rat?: RatType;
  leaf: FeatureLeaf;
}): string {
  const { rat, leaf } = params;
  const ratPrefix = rat ? `[${RAT_META_MAP[rat].shortLabel}] ` : '';
  const pathPart = leaf.path ?? `${leaf.major}.${leaf.middle}.${leaf.leaf}`;
  return `${ratPrefix}${leaf.leaf} (${pathPart}): ${formatFeatureValue(leaf.value, leaf.kind)}`;
}
