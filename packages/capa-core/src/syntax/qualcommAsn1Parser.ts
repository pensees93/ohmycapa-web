/**
 * Qualcomm QXDM / QCAT ASN.1 Value Notation (ITU-T X.680) Parser.
 * Converts raw Qualcomm capability dumps into a CanonicalAsn1Tree.
 */

import type { Asn1Record, CanonicalAsn1Tree } from '../types/astTypes';
import { normalizeBitString } from './bitString';
import { mergePduCandidates } from './pduMerger';

type TokenType = '{' | '}' | ',' | ':' | 'STR' | 'IDENT';

interface Token {
  type: TokenType;
  val: string;
}

const RE_PDU_HEADER = /value\s+(\S+)\s+::=\s*/g;
const RE_INT = /^-?\d+$/;
const RE_SPARE = /^spare/i;

function isPlainRecord(val: unknown): val is Asn1Record {
  return typeof val === 'object' && val !== null && !Array.isArray(val);
}

/**
 * Tokenize an ASN.1 Value Notation block `{ ... }`.
 */
function tokenizeAsn1(input: string): Token[] {
  const tokens: Token[] = [];
  const len = input.length;
  let i = 0;

  while (i < len) {
    const ch = input[i];

    // Whitespace
    if (ch === ' ' || ch === '\t' || ch === '\r' || ch === '\n') {
      i++;
      continue;
    }

    // ASN.1 line comments: -- ...
    if (ch === '-' && input[i + 1] === '-') {
      while (i < len && input[i] !== '\n') i++;
      continue;
    }

    // Punctuation
    if (ch === '{' || ch === '}' || ch === ',' || ch === ':') {
      tokens.push({ type: ch, val: ch });
      i++;
      continue;
    }

    // Single-quoted BIT STRING / HEX STRING: '...'B or '...'H
    if (ch === '\'') {
      let j = i + 1;
      while (j < len && input[j] !== '\'') j++;
      if (j < len) j++; // consume closing quote
      if (j < len && (input[j] === 'B' || input[j] === 'H')) j++;
      tokens.push({ type: 'STR', val: normalizeBitString(input.slice(i, j)) });
      i = j;
      continue;
    }

    // Double-quoted IA5String / VisibleString
    if (ch === '"') {
      let j = i + 1;
      while (j < len && input[j] !== '"') {
        if (input[j] === '\\' && j + 1 < len) j += 2;
        else j++;
      }
      const endContent = j < len ? j : len;
      if (j < len) j++;
      tokens.push({ type: 'STR', val: input.slice(i + 1, endContent) });
      i = j;
      continue;
    }

    // Identifier or number
    let j = i;
    while (j < len) {
      const c = input[j];
      if (
        c === ' ' ||
        c === '\t' ||
        c === '\r' ||
        c === '\n' ||
        c === '{' ||
        c === '}' ||
        c === ',' ||
        c === ':' ||
        c === '\'' ||
        c === '"'
      ) {
        break;
      }
      j++;
    }
    tokens.push({ type: 'IDENT', val: input.slice(i, j) });
    i = j;
  }

  return tokens;
}

/**
 * Parse a single ASN.1 Value Notation block into canonical JSON values.
 */
function parseAsn1Block(blockText: string): unknown {
  const toks = tokenizeAsn1(blockText);
  let pos = 0;

  const peek = (offset = 0): Token | undefined => toks[pos + offset];
  const consume = (): Token => toks[pos++];

  function parseValue(): unknown {
    const t = peek();
    if (!t) throw new Error('Unexpected end of ASN.1 block');

    if (t.type === '{') {
      return parseBrace();
    }

    if (t.type === 'STR') {
      const strVal = consume().val;
      const nextTok = peek();
      if (nextTok?.type === 'IDENT' && nextTok.val === 'CONTAINING') {
        consume();
        return parseValue();
      }
      return strVal;
    }

    if (t.type === 'IDENT') {
      if (t.val === 'CONTAINING') {
        consume();
        return parseValue();
      }

      // CHOICE notation: "alt : value" (supports chained choices and inline "supported : b6400")
      if (peek(1)?.type === ':') {
        const altName = consume().val;
        consume(); // ':'
        return { [altName]: parseValue() };
      }

      const raw = consume().val;
      if (raw === 'TRUE') return true;
      if (raw === 'FALSE') return false;
      if (raw === 'NULL') return null;
      if (RE_INT.test(raw)) return Number(raw);
      return raw;
    }

    throw new Error(`Unexpected ASN.1 token: ${t.type} (${t.val})`);
  }

  function parseBrace(): unknown {
    consume(); // '{'
    if (peek()?.type === '}') {
      consume();
      return {};
    }

    const t0 = peek();
    const t1 = peek(1);

    // Determine whether "{ ... }" represents a SEQUENCE OF (array) or SEQUENCE (object):
    // - Nested '{' or quoted BIT/HEX string -> array of items
    // - IDENT followed by ',' or '}' (list of primitives/enums) or ':' (SEQUENCE OF CHOICE) -> array
    // - IDENT followed by another value (or '{') -> SEQUENCE key/value pairs
    const isSeqOf =
      t0 !== undefined &&
      (t0.type === '{' ||
        t0.type === 'STR' ||
        (t0.type === 'IDENT' &&
          (t0.val === 'CONTAINING' || t1?.type === ',' || t1?.type === '}' || t1?.type === ':')));

    if (isSeqOf) {
      const items: unknown[] = [];
      while (peek() && peek()!.type !== '}') {
        items.push(parseValue());
        if (peek()?.type === ',') consume();
      }
      if (peek()?.type === '}') consume();
      return items;
    }

    const obj: Asn1Record = {};
    while (peek() && peek()!.type !== '}') {
      const keyTok = peek();
      if (!keyTok || keyTok.type !== 'IDENT') {
        // Recover cleanly by skipping stray punctuation if malformed
        consume();
        continue;
      }
      const key = consume().val;
      const val = parseValue();
      if (!RE_SPARE.test(key)) {
        obj[key] = val;
      }
      if (peek()?.type === ',') consume();
    }
    if (peek()?.type === '}') consume();
    return obj;
  }

  return parseValue();
}

/**
 * Find the matching closing brace index for the opening brace at `startIdx`,
 * ignoring braces inside quoted strings or `--` comments.
 */
function findMatchingBraceEnd(content: string, startIdx: number): number {
  let balance = 0;
  const len = content.length;

  for (let i = startIdx; i < len; i++) {
    const ch = content[i];
    if (ch === '\'') {
      i++;
      while (i < len && content[i] !== '\'') i++;
      continue;
    }
    if (ch === '"') {
      i++;
      while (i < len && content[i] !== '"') {
        if (content[i] === '\\') i++;
        i++;
      }
      continue;
    }
    if (ch === '-' && content[i + 1] === '-') {
      while (i < len && content[i] !== '\n') i++;
      continue;
    }
    if (ch === '{') {
      balance++;
    } else if (ch === '}') {
      balance--;
      if (balance === 0) return i + 1;
    }
  }

  return len;
}

/**
 * Extract packet header metadata lines (e.g. Pkt Version, RRC Release Number) before first PDU.
 */
function extractPacketMetadata(content: string): Record<string, string> | undefined {
  const firstPduIdx = content.indexOf('::=');
  const headerSlice = firstPduIdx >= 0 ? content.slice(0, firstPduIdx) : content.slice(0, 2000);
  const metadata: Record<string, string> = {};

  for (const line of headerSlice.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('===') || !trimmed.includes('=') || trimmed.includes('{')) {
      continue;
    }
    const eqIdx = trimmed.indexOf('=');
    const k = trimmed.slice(0, eqIdx).trim();
    const v = trimmed.slice(eqIdx + 1).trim();
    if (k && v) {
      metadata[k] = v;
    }
  }

  return Object.keys(metadata).length > 0 ? metadata : undefined;
}

/**
 * Parse a Qualcomm ASN.1 Value Notation log into a CanonicalAsn1Tree.
 */
export function parseQualcommAsn1(content: string, fileName?: string): CanonicalAsn1Tree {
  const eutraList: Asn1Record[] = [];
  const nrList: Asn1Record[] = [];
  const mrdcList: Asn1Record[] = [];
  const interRatList: Asn1Record[] = [];
  const radioCapInfoList: Asn1Record[] = [];
  const warnings: string[] = [];

  RE_PDU_HEADER.lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = RE_PDU_HEADER.exec(content)) !== null) {
    const pduName = match[1];
    let cursor = match.index + match[0].length;
    // Skip whitespace, ASN.1 '--' comments, and optional top-level CHOICE prefix (e.g. "c1 :")
    while (cursor < content.length) {
      const ch = content[cursor];
      if (ch === ' ' || ch === '\t' || ch === '\r' || ch === '\n') {
        cursor++;
      } else if (ch === '-' && content[cursor + 1] === '-') {
        while (cursor < content.length && content[cursor] !== '\n') cursor++;
      } else {
        break;
      }
    }
    if (content[cursor] !== '{') {
      const choicePrefix = /^[A-Za-z][\w-]*\s*:\s*/.exec(content.slice(cursor, cursor + 80));
      if (choicePrefix && content[cursor + choicePrefix[0].length] === '{') {
        cursor += choicePrefix[0].length;
      } else {
        // Scalar/hex/empty value declaration (e.g. "value Foo ::= 'AA'H") has no '{ ... }' block
        continue;
      }
    }
    const braceStart = cursor;

    const braceEnd = findMatchingBraceEnd(content, braceStart);
    const blockText = content.slice(braceStart, braceEnd);
    RE_PDU_HEADER.lastIndex = braceEnd;

    try {
      const parsed = parseAsn1Block(blockText);
      if (!isPlainRecord(parsed)) continue;

      switch (pduName) {
        case 'UE-EUTRA-Capability':
          eutraList.push(parsed);
          break;
        case 'UE-NR-Capability':
          nrList.push(parsed);
          break;
        case 'UE-MRDC-Capability':
          mrdcList.push(parsed);
          break;
        case 'InterRATHandoverInfo':
          interRatList.push(parsed);
          break;
        case 'UE-RadioAccessCapabilityInfo':
          radioCapInfoList.push(parsed);
          break;
        default:
          // Ignore outer UL-DCCH-Message wrapper; decoded RAT containers appear as separate PDUs
          break;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      warnings.push(`Failed to parse Qualcomm PDU ${pduName}: ${msg}`);
    }
  }

  // Merge candidates per RAT (picking richest PDU + filling missing fields)
  const eutra = mergePduCandidates(eutraList);
  const nr = mergePduCandidates(nrList);
  const mrdc = mergePduCandidates(mrdcList);
  const mergedInterRat = mergePduCandidates(interRatList);
  const mergedRadioCap = mergePduCandidates(radioCapInfoList);

  // Unify UTRA representation: attach decoded UE-RadioAccessCapabilityInfo under ue-CapabilityContainer.present
  // so it matches SLSI and MTK's canonical UTRA tree structure.
  let utra: Asn1Record | undefined;
  if (mergedInterRat && mergedRadioCap) {
    utra = {
      ...mergedInterRat,
      'ue-CapabilityContainer': { present: mergedRadioCap },
    };
  } else if (mergedInterRat) {
    utra = mergedInterRat;
  } else if (mergedRadioCap) {
    utra = { 'ue-CapabilityContainer': { present: mergedRadioCap } };
  }

  return {
    vendor: 'QUALCOMM',
    fileName,
    sourceFiles: fileName ? [fileName] : [],
    pdus: { eutra, nr, mrdc, utra },
    warnings,
    metadata: extractPacketMetadata(content),
  };
}
