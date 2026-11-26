/**
 * PDU richness scoring and merging utilities for multi-packet / multi-file OTA logs.
 */

import type { Asn1Record, CanonicalAsn1Tree } from '../types/astTypes';

function isPlainRecord(val: unknown): val is Asn1Record {
  return typeof val === 'object' && val !== null && !Array.isArray(val);
}

/**
 * Locate any combination-list array inside a PDU (including nested rf-Parameters* extensions)
 * so richer PDUs with band combinations always beat stripped/filtered containers.
 */
function countCombosInPdu(pdu: Asn1Record): number {
  let maxCombos = 0;
  const stack: unknown[] = [pdu];
  let visited = 0;

  while (stack.length > 0 && visited < 5000) {
    const cur = stack.pop();
    visited++;
    if (!isPlainRecord(cur)) continue;

    for (const [k, v] of Object.entries(cur)) {
      if (
        Array.isArray(v) &&
        (k.startsWith('supportedBandCombinationList') ||
          k.startsWith('supportedBandCombination-r10') ||
          k.startsWith('supportedBandCombinationReduced-r13') ||
          k.startsWith('supportedBandCombinationAdd-r11'))
      ) {
        maxCombos += v.length;
      } else if (isPlainRecord(v)) {
        stack.push(v);
      }
    }
  }

  return maxCombos;
}

function countBandsInPdu(pdu: Asn1Record): number {
  const rf = pdu['rf-Parameters'];
  if (!isPlainRecord(rf)) return 0;
  const nrBands = rf['supportedBandListNR'];
  if (Array.isArray(nrBands)) return nrBands.length;
  const eutraBands = rf['supportedBandListEUTRA'];
  if (Array.isArray(eutraBands)) return eutraBands.length;
  return 0;
}

function countKeysBounded(node: unknown, limit = 8000): number {
  let count = 0;
  const stack: unknown[] = [node];
  while (stack.length > 0 && count < limit) {
    const cur = stack.pop();
    if (Array.isArray(cur)) {
      count += cur.length;
      for (let i = 0; i < cur.length && count < limit; i++) {
        if (typeof cur[i] === 'object' && cur[i] !== null) stack.push(cur[i]);
      }
    } else if (isPlainRecord(cur)) {
      const vals = Object.values(cur);
      count += vals.length;
      for (const v of vals) {
        if (typeof v === 'object' && v !== null) stack.push(v);
      }
    }
  }
  return count;
}

/**
 * Compute richness score for a PDU candidate.
 * Higher score means more combinations, more bands, and deeper capability information.
 */
export function scorePduRichness(pdu: Asn1Record): number {
  const combos = countCombosInPdu(pdu);
  const bands = countBandsInPdu(pdu);
  const keys = countKeysBounded(pdu);
  return combos * 10000 + bands * 100 + keys;
}

/**
 * Recursively fill missing keys or empty objects/arrays in primary from secondary
 * without overwriting populated values in primary.
 */
export function deepMergeFallback(primary: Asn1Record, secondary: Asn1Record): Asn1Record {
  const result: Asn1Record = { ...primary };

  for (const [key, secVal] of Object.entries(secondary)) {
    const priVal = result[key];

    if (priVal === undefined || priVal === null) {
      result[key] = secVal;
      continue;
    }

    if (Array.isArray(priVal)) {
      if (priVal.length === 0 && Array.isArray(secVal) && secVal.length > 0) {
        result[key] = secVal;
      }
      continue;
    }

    if (isPlainRecord(priVal)) {
      if (Object.keys(priVal).length === 0) {
        if (isPlainRecord(secVal) && Object.keys(secVal).length > 0) {
          result[key] = secVal;
        } else if (Array.isArray(secVal) && secVal.length > 0) {
          result[key] = secVal;
        }
      } else if (isPlainRecord(secVal)) {
        result[key] = deepMergeFallback(priVal, secVal);
      }
    }
  }

  return result;
}

/**
 * Select the richest PDU candidate and fill any missing sub-fields from remaining candidates.
 */
export function mergePduCandidates(candidates: Asn1Record[]): Asn1Record | undefined {
  const valid = candidates.filter((c) => isPlainRecord(c) && Object.keys(c).length > 0);
  if (valid.length === 0) return undefined;
  if (valid.length === 1) return valid[0];

  const sorted = [...valid].sort((a, b) => scorePduRichness(b) - scorePduRichness(a));
  let merged = sorted[0];
  for (let i = 1; i < sorted.length; i++) {
    merged = deepMergeFallback(merged, sorted[i]);
  }
  return merged;
}

/**
 * Merge multiple CanonicalAsn1Trees (e.g. separate LTE and NR-ENDC files for the same device).
 */
export function mergeCanonicalAsts(asts: CanonicalAsn1Tree[]): CanonicalAsn1Tree {
  if (asts.length === 0) {
    return {
      vendor: 'UNKNOWN',
      sourceFiles: [],
      pdus: {},
      warnings: [],
    };
  }
  if (asts.length === 1) return asts[0];

  const eutraCands: Asn1Record[] = [];
  const nrCands: Asn1Record[] = [];
  const mrdcCands: Asn1Record[] = [];
  const utraCands: Asn1Record[] = [];
  const sourceFiles: string[] = [];
  const warnings: string[] = [];
  let metadata: Record<string, string> | undefined;

  let vendor = asts[0].vendor;
  for (const ast of asts) {
    if (vendor === 'UNKNOWN' && ast.vendor !== 'UNKNOWN') vendor = ast.vendor;
    if (ast.pdus.eutra) eutraCands.push(ast.pdus.eutra);
    if (ast.pdus.nr) nrCands.push(ast.pdus.nr);
    if (ast.pdus.mrdc) mrdcCands.push(ast.pdus.mrdc);
    if (ast.pdus.utra) utraCands.push(ast.pdus.utra);
    sourceFiles.push(...ast.sourceFiles);
    warnings.push(...ast.warnings);
    if (!metadata && ast.metadata) metadata = ast.metadata;
  }

  return {
    vendor,
    fileName: asts[0].fileName,
    sourceFiles,
    pdus: {
      eutra: mergePduCandidates(eutraCands),
      nr: mergePduCandidates(nrCands),
      mrdc: mergePduCandidates(mrdcCands),
      utra: mergePduCandidates(utraCands),
    },
    warnings,
    metadata,
  };
}
