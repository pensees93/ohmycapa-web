/**
 * Indentation-based ASN.1 Dissector Parser for SLSI (Wireshark) & MTK (ELT/NLT) OTA logs.
 * Produces the exact same CanonicalAsn1Tree shape as the Qualcomm ASN.1 parser.
 */

import type { Asn1Record, CanonicalAsn1Tree, CapaVendor } from '../types/astTypes';
import { hexDescToBitString } from './bitString';
import { mergePduCandidates } from './pduMerger';

interface IndentedLine {
  depth: number;
  trimmed: string;
  lineIndex: number;
}

const RE_ITEMS = /^(\d+)\s+items?$/i;
const RE_ITEM_X = /^Item\s+\d+$/i;
const RE_SPARE = /^spare/i;
const RE_BIT_PREFIX = /^([.01\s]{8,})\s+(.*)/;
const RE_BIT_DISSECTION = /^[.01\s]{4,}\s*=/;
const RE_BIT_LENGTH = /bit\s+length\s+\d+/i;
const RE_ELLIPSIS_CLEAN = /[….]{2,}$/;
const RE_PAREN_INDEX = /\(\d+\)$/;
const RE_ENUM_SUFFIX = /^(.*?)\s*\(\d+\)\s*$/;
const RE_UPPER_TYPE_REF = /^[A-Z][A-Za-z0-9-]*$/;

function isPlainRecord(val: unknown): val is Asn1Record {
  return typeof val === 'object' && val !== null && !Array.isArray(val);
}

function lineDepth(line: string): number {
  let depth = 0;
  for (let i = 0, len = line.length; i < len; i++) {
    const ch = line[i];
    if (ch === ' ') depth++;
    else if (ch === '\t') depth += 4;
    else break;
  }
  return depth;
}

/**
 * Normalize flat lists in MTK logs where "Item N" and its children appear at the same depth
 * as the parent "key: N items" line.
 */
export function normalizeFlatLists(rawLines: string[]): IndentedLine[] {
  const out: IndentedLine[] = [];
  const len = rawLines.length;
  let i = 0;

  while (i < len) {
    const line = rawLines[i];
    const trimmed = line.trim();
    if (!trimmed) {
      i++;
      continue;
    }

    const depth = lineDepth(line);
    const colonIdx = trimmed.indexOf(':');

    if (colonIdx !== -1) {
      const valueStr = trimmed.slice(colonIdx + 1).trim();
      const itemsMatch = valueStr.match(RE_ITEMS);
      if (itemsMatch) {
        const expectedCount = parseInt(itemsMatch[1], 10);
        let j = i + 1;
        while (j < len && !rawLines[j].trim()) j++;

        if (j < len) {
          const nextTrimmed = rawLines[j].trim();
          const nextDepth = lineDepth(rawLines[j]);

          if (nextDepth === depth && RE_ITEM_X.test(nextTrimmed)) {
            out.push({ depth, trimmed, lineIndex: i });
            i++;
            let inItem = false;
            let itemCount = 0;
            let firstItemFlatCount = 0;
            let curItemFlatCount = 0;
            let curItemHasDescendant = false;
            while (i < len) {
              const fl = rawLines[i];
              const ft = fl.trim();
              if (!ft) {
                i++;
                continue;
              }
              const fd = lineDepth(fl);
              if (fd < depth) break;
              if (fd === depth && RE_ITEM_X.test(ft)) {
                if (itemCount === 1 && firstItemFlatCount === 0) {
                  firstItemFlatCount = curItemFlatCount;
                }
                itemCount++;
                curItemFlatCount = 0;
                curItemHasDescendant = false;
                out.push({ depth: depth + 4, trimmed: ft, lineIndex: i });
                inItem = true;
              } else if (inItem) {
                if (fd === depth) {
                  const itemBodyComplete =
                    curItemHasDescendant ||
                    (firstItemFlatCount > 0 ? curItemFlatCount >= firstItemFlatCount : curItemFlatCount >= 1);
                  if (itemCount >= expectedCount && itemBodyComplete) {
                    break;
                  }
                  curItemFlatCount++;
                } else {
                  curItemHasDescendant = true;
                }
                out.push({ depth: fd + 8, trimmed: ft, lineIndex: i });
              } else {
                break;
              }
              i++;
            }
            continue;
          }
        }
      }
    }

    out.push({ depth, trimmed, lineIndex: i });
    i++;
  }

  return out;
}

/**
 * Locate all RRC capability message blocks while skipping MTK raw hex buffers & trace metadata.
 */
function extractMessageBlocks(validLines: IndentedLine[]): Array<{ start: number; end: number }> {
  const blocks: Array<{ start: number; end: number }> = [];
  const len = validLines.length;
  let activeStart = -1;
  let activeMode: 'MTK' | 'SLSI' | null = null;
  let activeRootDepth = 0;

  for (let i = 0; i < len; i++) {
    const { depth, trimmed } = validLines[i];

    // MTK block header
    if (trimmed === 'Message Content') {
      if (activeStart >= 0) blocks[blocks.length - 1].end = i;
      activeStart = i;
      activeMode = 'MTK';
      activeRootDepth = depth;
      blocks.push({ start: i, end: len });
      continue;
    }

    // MTK trailing / next packet boundaries
    if (
      activeStart >= 0 &&
      activeMode === 'MTK' &&
      (trimmed.startsWith('Trace Id') ||
        trimmed.startsWith('Trace Name') ||
        trimmed.startsWith('[MS->NW]') ||
        trimmed.startsWith('raw data'))
    ) {
      blocks[blocks.length - 1].end = i;
      activeStart = -1;
      activeMode = null;
      continue;
    }

    // SLSI block header at root depth 0 (only when not already inside an MTK/SLSI block at deeper indent)
    if (
      depth === 0 &&
      (trimmed === 'UL-DCCH-Message' ||
        trimmed === 'NR Radio Resource Control (RRC) protocol' ||
        trimmed === 'LTE Radio Resource Control (RRC) protocol')
    ) {
      if (activeStart >= 0) blocks[blocks.length - 1].end = i;
      activeStart = i;
      activeMode = 'SLSI';
      activeRootDepth = 0;
      blocks.push({ start: i, end: len });
      continue;
    }

    if (activeStart >= 0 && activeMode === 'MTK' && depth < activeRootDepth) {
      blocks[blocks.length - 1].end = i;
      activeStart = -1;
      activeMode = null;
    }
  }

  if (blocks.length === 0 && len > 0) {
    blocks.push({ start: 0, end: len });
  }

  return blocks;
}

function cleanLineKey(rawKey: string): string {
  let key = rawKey.trim();

  if (key.includes('[')) {
    if (key.charCodeAt(0) === 91) {
      key = key.replace(/^\[|\]$/g, '').trim();
    } else {
      key = key.split('[')[0].trim();
    }
  }

  const lastChar = key.charCodeAt(key.length - 1);
  if (lastChar === 46 || lastChar === 8230) {
    key = key.replace(RE_ELLIPSIS_CLEAN, '').trim();
  } else if (lastChar === 41) {
    key = key.replace(RE_PAREN_INDEX, '').trim();
  }

  if (key.charCodeAt(0) === 61) {
    key = key.replace(/^=\s*/, '').trim();
  }

  return key;
}

function parseLineKeyAndRawValue(text: string): { key: string; rawValue: string | null; hasColon: boolean } {
  const colonIndex = text.indexOf(':');
  if (colonIndex !== -1) {
    return {
      key: cleanLineKey(text.slice(0, colonIndex)),
      rawValue: text.slice(colonIndex + 1).trim(),
      hasColon: true,
    };
  }
  return {
    key: cleanLineKey(text),
    rawValue: null,
    hasColon: false,
  };
}

function parseLeafScalarValue(rawValue: string | null, hasColon: boolean): unknown {
  if (!hasColon || rawValue === null) {
    // Childless no-colon line (e.g. "phyLayerParameters-v920", "BandCombination-v1560") -> empty object
    return {};
  }

  let val = rawValue.trim();
  let description: string | undefined;

  const bracketIdx = val.indexOf('[');
  if (bracketIdx !== -1) {
    description = val.slice(bracketIdx).replace(/^\[|\]$/g, '').trim();
    val = val.slice(0, bracketIdx).trim();
  }

  // Convert bit-string fields immediately to canonical "'...'B"
  if (description && RE_BIT_LENGTH.test(description)) {
    const bitStr = hexDescToBitString(val, description);
    if (bitStr !== null) return bitStr;
  }

  const enumMatch = val.match(RE_ENUM_SUFFIX);
  if (enumMatch) {
    val = enumMatch[1].trim();
  }

  if (RE_ITEMS.test(val)) {
    // Empty list ("0 items" with no children) -> []
    return [];
  }

  const lower = val.toLowerCase();
  if (lower === 'true') return true;
  if (lower === 'false') return false;
  if (lower === 'null') return null;

  if (val !== '' && !val.includes(' ')) {
    if (/^-?\d+$/.test(val)) {
      return Number(val);
    }
  }

  if (val === '' && description) {
    return description;
  }

  return val;
}

/**
 * Parse a single message block into a nested JS structure.
 */
function parseIndentationBlock(
  validLines: IndentedLine[],
  startIndex: number,
  endIndex: number
): Asn1Record {
  const root: Asn1Record = {};
  const stack: Array<{ depth: number; container: Asn1Record | unknown[] }> = [
    { depth: -1, container: root },
  ];

  let i = startIndex;
  while (i < endIndex) {
    const { depth, trimmed } = validLines[i];

    // Skip bracket-only annotation lines such as "[bandEUTRA: 5 -> band 5]"
    if (trimmed.charCodeAt(0) === 91 && trimmed.endsWith(']')) {
      i++;
      continue;
    }

    const bitMatch = trimmed.match(RE_BIT_PREFIX);
    const text = (bitMatch ? bitMatch[2] : trimmed).trim();
    const { key, rawValue, hasColon } = parseLineKeyAndRawValue(text);

    if (!key || RE_SPARE.test(key)) {
      i++;
      continue;
    }

    // Unwind stack to matching parent
    while (stack.length > 1 && stack[stack.length - 1].depth >= depth) {
      stack.pop();
    }

    const parentEntry = stack[stack.length - 1];
    const parentContainer = parentEntry.container;
    const nextLine = i + 1 < endIndex ? validLines[i + 1] : undefined;
    const hasChildren = nextLine !== undefined && nextLine.depth > depth;
    const isListItem = RE_ITEM_X.test(key);

    // Check if children are Wireshark bit-dissection lines (e.g. "0... .... = Indicator 1: ...")
    if (hasChildren && nextLine && RE_BIT_DISSECTION.test(nextLine.trimmed)) {
      const bitStr = parseLeafScalarValue(rawValue, hasColon);
      if (Array.isArray(parentContainer)) {
        parentContainer.push(bitStr);
      } else {
        parentContainer[key] = bitStr;
      }
      // Skip all bit-dissection descendants
      i++;
      while (i < endIndex && validLines[i].depth > depth) {
        i++;
      }
      continue;
    }

    if (hasChildren) {
      const isListParent = rawValue !== null && RE_ITEMS.test(rawValue.trim());
      const newContainer: Asn1Record | unknown[] = isListParent ? [] : {};

      if (isListItem) {
        if (Array.isArray(parentContainer)) {
          parentContainer.push(newContainer);
        }
      } else if (!Array.isArray(parentContainer)) {
        parentContainer[key] = newContainer;
      }

      stack.push({ depth, container: newContainer });
    } else {
      const leafValue = parseLeafScalarValue(rawValue, hasColon);
      if (isListItem) {
        if (Array.isArray(parentContainer)) {
          parentContainer.push(leafValue);
        }
      } else if (!Array.isArray(parentContainer)) {
        parentContainer[key] = leafValue;
      }
    }

    i++;
  }

  return root;
}

/**
 * Recursively unwrap ITU-T X.680 ASN.1 TypeReference single-key wrappers
 * (e.g. `{ BandNR: { bandNR: 78 } }` -> `{ bandNR: 78 }`,
 *       `{ FreqBandIndicatorEUTRA: 3 }` -> `3`,
 *       `{ FeatureSet: { nr: { ... } } }` -> `{ nr: { ... } }`).
 */
export function unwrapAsn1TypeWrappers(node: unknown): unknown {
  if (Array.isArray(node)) {
    return node.map((item) => unwrapAsn1TypeWrappers(item));
  }

  if (!isPlainRecord(node)) {
    return node;
  }

  const keys = Object.keys(node);
  if (keys.length === 1 && RE_UPPER_TYPE_REF.test(keys[0])) {
    return unwrapAsn1TypeWrappers(node[keys[0]]);
  }
  if (
    keys.length === 2 &&
    typeof node['present'] === 'string' &&
    isPlainRecord(node['UE-RadioAccessCapabilityInfo'])
  ) {
    return { present: unwrapAsn1TypeWrappers(node['UE-RadioAccessCapabilityInfo']) };
  }

  const out: Asn1Record = {};
  for (const key of keys) {
    out[key] = unwrapAsn1TypeWrappers(node[key]);
  }
  return out;
}

/**
 * Locate ue-CapabilityRAT-ContainerList inside a parsed message block.
 */
function findRatContainerList(msg: Asn1Record): unknown[] | null {
  let root: Asn1Record = msg;
  if (isPlainRecord(root['Message Content'])) {
    root = root['Message Content'];
  }
  if (isPlainRecord(root['NR Radio Resource Control (RRC) protocol'])) {
    root = root['NR Radio Resource Control (RRC) protocol'];
  }
  if (isPlainRecord(root['LTE Radio Resource Control (RRC) protocol'])) {
    root = root['LTE Radio Resource Control (RRC) protocol'];
  }

  const ulDcch = isPlainRecord(root['UL-DCCH-Message']) ? root['UL-DCCH-Message'] : root;
  const message = isPlainRecord(ulDcch['message']) ? ulDcch['message'] : ulDcch;
  const c1 = isPlainRecord(message['c1']) ? message['c1'] : message;
  const ueCapInfo =
    (isPlainRecord(c1['ueCapabilityInformation']) ? c1['ueCapabilityInformation'] : undefined) ??
    (isPlainRecord(c1['ueCapabilityInformation-r8']) ? c1['ueCapabilityInformation-r8'] : undefined) ??
    c1;

  const critExt = isPlainRecord(ueCapInfo['criticalExtensions']) ? ueCapInfo['criticalExtensions'] : ueCapInfo;

  // Variant A: criticalExtensions -> c1 -> ueCapabilityInformation-r8 -> ue-CapabilityRAT-ContainerList
  // Variant B: criticalExtensions -> ueCapabilityInformation -> ue-CapabilityRAT-ContainerList
  const critC1 = isPlainRecord(critExt['c1']) ? critExt['c1'] : undefined;
  const ueCapR8 = critC1 && isPlainRecord(critC1['ueCapabilityInformation-r8'])
    ? critC1['ueCapabilityInformation-r8']
    : critC1;
  const ueCapDirect = isPlainRecord(critExt['ueCapabilityInformation'])
    ? critExt['ueCapabilityInformation']
    : undefined;

  const rawList =
    ueCapR8?.['ue-CapabilityRAT-ContainerList'] ??
    ueCapDirect?.['ue-CapabilityRAT-ContainerList'] ??
    critExt['ue-CapabilityRAT-ContainerList'];

  return Array.isArray(rawList) ? rawList : null;
}

/**
 * Parse SLSI (Wireshark) or MTK (ELT/NLT) indentation-based log into a CanonicalAsn1Tree.
 */
export function parseIndentationCapa(
  content: string,
  vendor: CapaVendor,
  fileName?: string
): CanonicalAsn1Tree {
  const rawLines = content.split(/\r?\n/);
  const validLines = normalizeFlatLists(rawLines);
  const blocks = extractMessageBlocks(validLines);

  const eutraList: Asn1Record[] = [];
  const nrList: Asn1Record[] = [];
  const mrdcList: Asn1Record[] = [];
  const utraList: Asn1Record[] = [];
  const warnings: string[] = [];

  for (const block of blocks) {
    const rawMsg = parseIndentationBlock(validLines, block.start, block.end);
    const containerList = findRatContainerList(rawMsg);

    if (containerList) {
      for (const rawContainer of containerList) {
        const container = unwrapAsn1TypeWrappers(rawContainer);
        if (!isPlainRecord(container)) continue;

        const ratType = container['rat-Type'];
        const rawPayload = container['ueCapabilityRAT-Container'] ?? container['ue-CapabilityRAT-Container'];
        if (!isPlainRecord(rawPayload)) continue;

        if (ratType === 'eutra') eutraList.push(rawPayload);
        else if (ratType === 'nr') nrList.push(rawPayload);
        else if (ratType === 'eutra-nr') mrdcList.push(rawPayload);
        else if (ratType === 'utra') utraList.push(rawPayload);
      }
    } else {
      // Fallback for standalone decoded PDUs without UL-DCCH-Message envelope
      const unwrapPdu = (key: string): Asn1Record | undefined => {
        if (!isPlainRecord(rawMsg[key])) return undefined;
        const unwrapped = unwrapAsn1TypeWrappers(rawMsg[key]);
        return isPlainRecord(unwrapped) ? unwrapped : undefined;
      };
      const eutraStandalone = unwrapPdu('UE-EUTRA-Capability');
      const nrStandalone = unwrapPdu('UE-NR-Capability');
      const mrdcStandalone = unwrapPdu('UE-MRDC-Capability');
      const utraStandalone = unwrapPdu('InterRATHandoverInfo');
      if (eutraStandalone) eutraList.push(eutraStandalone);
      if (nrStandalone) nrList.push(nrStandalone);
      if (mrdcStandalone) mrdcList.push(mrdcStandalone);
      if (utraStandalone) utraList.push(utraStandalone);
    }
  }

  return {
    vendor,
    fileName,
    sourceFiles: fileName ? [fileName] : [],
    pdus: {
      eutra: mergePduCandidates(eutraList),
      nr: mergePduCandidates(nrList),
      mrdc: mergePduCandidates(mrdcList),
      utra: mergePduCandidates(utraList),
    },
    warnings,
  };
}
