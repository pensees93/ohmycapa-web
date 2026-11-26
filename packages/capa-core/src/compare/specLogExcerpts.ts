import { buildCanonicalFeatureMap, normalizeSpecLookupPath } from '../normalizer/featureNormalizer';
import { normalizeFlatLists } from '../syntax/indentationParser';
import type { RatType } from '../types/astTypes';
import type { ParsedFile } from '../types/compareTypes';
import type { AutoSpecIssueEntry } from './githubIssueReport';

const PDU_RAT = new Map<string, RatType>([
  ['UE-NR-Capability', 'nr'],
  ['UE-EUTRA-Capability', 'eutra'],
  ['UE-MRDC-Capability', 'eutra-nr'],
  ['UE-RadioAccessCapability', 'utra'],
  ['UE-RadioAccessCapabilityInfo', 'utra'],
  ['InterRATHandoverInfo', 'utra'],
]);
const RE_BIT_PREFIX = /^([.01\s]{8,})\s+(.*)/;
const MAX_CONTEXT_LINES = 8;
const MAX_EXCERPT_LENGTH = 1200;
const MAX_PREFILL_LENGTH = 4000;

interface SourceField {
  key: string;
  depth: number;
  lineIndex: number;
}

function findPduLevel(fields: SourceField[]): number {
  for (let index = fields.length - 1; index >= 0; index--) {
    if (PDU_RAT.has(fields[index].key)) return index;
  }
  return -1;
}

// Item labels, ASN.1 type wrappers, and extension containers have no canonical path segment.
const isSourceWrapper = (key: string) => /^[A-Z]/.test(key) || !normalizeSpecLookupPath(key);

function matchParent(fields: SourceField[], path: string[], fallback: number, pduLevel: number): number | undefined {
  const pduKey = pduLevel >= 0 ? fields[pduLevel].key : '';
  let level = fields.length - 1;
  let parent = fallback;
  for (let index = path.length - 2; index >= 0; index--) {
    const seg = path[index];
    while (level > pduLevel && fields[level].key !== seg) {
      if (!isSourceWrapper(fields[level--].key)) return undefined;
    }
    if (level <= pduLevel) {
      // Qualcomm Stage 1 wraps UE-RadioAccessCapabilityInfo under a virtual ue-CapabilityContainer node.
      if (seg === 'ue-CapabilityContainer' && pduKey === 'UE-RadioAccessCapabilityInfo') {
        continue;
      }
      return undefined;
    }
    if (parent === fallback) parent = fields[level].lineIndex;
    level--;
  }
  if (pduLevel >= 0 && fields.slice(pduLevel + 1, level + 1).some(field => !isSourceWrapper(field.key))) return undefined;
  return parent;
}

function findExcerpts(
  text: string,
  specs: AutoSpecIssueEntry[],
  fileHasOneRat: boolean,
): Map<AutoSpecIssueEntry, string> {
  const rawLines = text.split(/\r\n?|\n/);
  const lines = normalizeFlatLists(rawLines);
  const pathsByLeaf = new Map<string, Array<{ spec: AutoSpecIssueEntry; path: string[] }>>();
  for (const spec of specs) {
    const path = normalizeSpecLookupPath(spec.path).split('.');
    const leaf = path[path.length - 1];
    const matches = pathsByLeaf.get(leaf) ?? [];
    matches.push({ spec, path });
    pathsByLeaf.set(leaf, matches);
  }
  const fields: SourceField[] = [];
  const found = new Map<AutoSpecIssueEntry, string>();

  for (let index = 0; index < lines.length && found.size < specs.length; index++) {
    const { depth, trimmed, lineIndex } = lines[index];
    // Qualcomm ASN.1 puts '{' on its own line at the parent key's indentation depth.
    if (trimmed === '{') continue;
    while (fields.length && fields[fields.length - 1].depth >= depth) fields.pop();
    if (trimmed.startsWith('}')) continue;

    const cleanTrimmed = trimmed.replace(RE_BIT_PREFIX, '$2').trim();
    const key = /^(?:value\s+)?(?:=\s*)?\[?([A-Za-z][\w-]*)/.exec(cleanTrimmed)?.[1];
    if (!key) continue;

    for (const { spec, path } of pathsByLeaf.get(key) ?? []) {
      if (found.has(spec)) continue;
      const pduLevel = findPduLevel(fields);
      if (pduLevel >= 0 ? PDU_RAT.get(fields[pduLevel].key) !== spec.rat : !fileHasOneRat) continue;
      const parent = matchParent(fields, path, lineIndex, pduLevel);
      if (parent === undefined) continue;

      const start = Math.max(parent, lineIndex - MAX_CONTEXT_LINES);
      let end = lineIndex + 1;
      for (let next = index + 1; next < lines.length; next++) {
        const nextLine = lines[next];
        if (nextLine.lineIndex > lineIndex + MAX_CONTEXT_LINES) break;
        if (nextLine.depth < depth) break;
        if (nextLine.depth === depth && nextLine.trimmed !== '{' && !nextLine.trimmed.startsWith('}')) break;
        end = nextLine.lineIndex + 1;
      }
      const excerpt = rawLines.slice(start, end).join('\n');
      if (excerpt.length <= MAX_EXCERPT_LENGTH) found.set(spec, excerpt);
      else if (rawLines[lineIndex].length <= MAX_EXCERPT_LENGTH) found.set(spec, rawLines[lineIndex]);
    }
    fields.push({ key, depth, lineIndex });
  }
  return found;
}

/** Find small, editable source excerpts in parsed logs with matching capability paths. */
export async function collectSpecLogExcerpts(specs: AutoSpecIssueEntry[], files: ParsedFile[]): Promise<string> {
  const pending = new Set(specs);
  const excerpts = new Set<string>();
  let length = 0;

  for (const { ast, file, status } of files) {
    if (!pending.size) break;
    if (status !== 'done' || !ast) continue;
    const candidates = [...pending].filter(spec => {
      const pdu = ast.pdus[spec.rat === 'eutra-nr' ? 'mrdc' : spec.rat];
      return pdu && buildCanonicalFeatureMap(pdu).has(normalizeSpecLookupPath(spec.path));
    });
    if (!candidates.length) continue;
    const text = await file.text().catch(() => '');
    const fileHasOneRat = Object.values(ast.pdus).filter(Boolean).length === 1;
    for (const [spec, excerpt] of findExcerpts(text, candidates, fileHasOneRat)) {
      pending.delete(spec);
      if (excerpts.has(excerpt)) continue;
      if (length + excerpt.length > MAX_PREFILL_LENGTH) return [...excerpts].join('\n\n');
      excerpts.add(excerpt);
      length += excerpt.length + 2;
    }
  }
  return [...excerpts].join('\n\n');
}
