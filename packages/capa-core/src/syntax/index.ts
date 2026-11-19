/**
 * Stage 1 Entry Point: Parse raw OTA logs (SLSI / MTK / Qualcomm) into CanonicalAsn1Tree,
 * or load pre-exported CommonCapaJson v2.0 files.
 */

import type { CanonicalAsn1Tree } from '../types/astTypes';
import type { CommonCapaJson } from '../types/capaTypes';
import { detectInputFormat } from './detectVendor';
import { parseIndentationCapa } from './indentationParser';
import { parseQualcommAsn1 } from './qualcommAsn1Parser';

export { detectInputFormat } from './detectVendor';
export { mergeCanonicalAsts, mergePduCandidates, scorePduRichness } from './pduMerger';
export { hexDescToBitString, normalizeBitString } from './bitString';

/**
 * Parse a raw 3GPP OTA text log (SLSI, MTK, or Qualcomm) into a vendor-neutral CanonicalAsn1Tree.
 */
export function parseCapaText(content: string, fileName?: string): CanonicalAsn1Tree {
  const detection = detectInputFormat(content);

  if (detection.format === 'SUMMARY_TEXT') {
    throw new Error('Non-OTA capability summary text is not supported; raw 3GPP OTA log is required.');
  }
  if (detection.format === 'COMMON_JSON') {
    throw new Error('CommonCapaJson v2.0 input detected; use parseCommonCapaJson() instead.');
  }
  if (detection.format === 'OTA_QUALCOMM') {
    return parseQualcommAsn1(content, fileName);
  }
  if (detection.format === 'OTA_MTK' || detection.format === 'OTA_SLSI') {
    return parseIndentationCapa(content, detection.vendor, fileName);
  }

  throw new Error('Unknown UE capability format (expected SLSI, MTK, or Qualcomm 3GPP OTA log).');
}

/**
 * Parse and validate a CommonCapaJson v2.0 JSON string.
 */
export function parseCommonCapaJson(content: string): CommonCapaJson {
  const parsed = JSON.parse(content) as CommonCapaJson;
  if (!parsed || typeof parsed !== 'object' || parsed.schemaVersion !== '2.0' || !parsed.rats || !parsed.meta) {
    throw new Error('Invalid CommonCapaJson v2.0 document.');
  }
  return parsed;
}
