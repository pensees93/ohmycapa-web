#!/usr/bin/env node
/**
 * Apply machine-readable auto-discovered 3GPP FeatureSpecs from a GitHub Issue body
 * (`<!-- OHMYCAPA_AUTO_SPEC_START -->` ... `<!-- OHMYCAPA_AUTO_SPEC_END -->`)
 * into `packages/capa-core/src/normalizer/specs/{nr,eutra,mrdc,utra}Specs.ts`.
 *
 * Usage:
 *   ISSUE_BODY="..." node scripts/apply-issue-specs.mjs
 *   node scripts/apply-issue-specs.mjs path/to/issue-body.md [--dry-run]
 */

import fs from 'node:fs';
import path from 'node:path';

const START_MARKER = '<!-- OHMYCAPA_AUTO_SPEC_START -->';
const END_MARKER = '<!-- OHMYCAPA_AUTO_SPEC_END -->';

const VALID_RATS = new Set(['nr', 'eutra', 'eutra-nr', 'utra']);
const VALID_KINDS = new Set(['bool', 'enum', 'number', 'stringList', 'numberList', 'presence', 'fgiBit']);

const SPEC_FILE_BY_RAT = {
  nr: 'packages/capa-core/src/normalizer/specs/nrSpecs.ts',
  eutra: 'packages/capa-core/src/normalizer/specs/eutraSpecs.ts',
  'eutra-nr': 'packages/capa-core/src/normalizer/specs/mrdcSpecs.ts',
  utra: 'packages/capa-core/src/normalizer/specs/utraSpecs.ts',
};

function parseAutoSpecBlock(body) {
  const startIdx = body.indexOf(START_MARKER);
  const endIdx = body.indexOf(END_MARKER);
  if (startIdx === -1 || endIdx === -1 || endIdx <= startIdx) {
    return [];
  }

  const section = body.slice(startIdx + START_MARKER.length, endIdx);
  const jsonMatch = section.match(/```json\s*([\s\S]*?)```/i) ?? [null, section.trim()];
  const rawJson = (jsonMatch[1] ?? '').trim();
  if (!rawJson) return [];

  const parsed = JSON.parse(rawJson);
  if (!parsed || !Array.isArray(parsed.specs)) return [];

  const entries = [];
  for (const item of parsed.specs) {
    if (!item || typeof item !== 'object') continue;
    const { rat, major, middle, leaf, path: specPath, kind, description } = item;
    if (
      typeof rat !== 'string' || !VALID_RATS.has(rat) ||
      typeof major !== 'string' || !major.trim() ||
      typeof middle !== 'string' || !middle.trim() ||
      typeof leaf !== 'string' || !leaf.trim() ||
      typeof specPath !== 'string' || !specPath.trim() ||
      typeof kind !== 'string' || !VALID_KINDS.has(kind)
    ) {
      continue;
    }

    entries.push({
      rat,
      major: major.trim(),
      middle: middle.trim(),
      leaf: leaf.trim(),
      path: specPath.trim(),
      kind,
      description:
        typeof description === 'string' && description.trim()
          ? description.trim()
          : `Auto-registered 3GPP capability (${specPath.trim()})`,
    });
  }
  return entries;
}

function loadSpecFile(absPath) {
  const src = fs.readFileSync(absPath, 'utf8');
  const eqIdx = src.indexOf('= [') + 2;
  const endBracketIdx = src.lastIndexOf(']');
  if (eqIdx < 2 || endBracketIdx <= eqIdx) {
    throw new Error(`Invalid FeatureSpec array structure in ${absPath}`);
  }
  const header = src.slice(0, eqIdx);
  const arr = JSON.parse(src.slice(eqIdx, endBracketIdx + 1));
  return { header, arr };
}

function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const fileArg = args.find((a) => !a.startsWith('--'));

  let issueBody = process.env.ISSUE_BODY ?? '';
  if (fileArg) {
    issueBody = fs.readFileSync(path.resolve(fileArg), 'utf8');
  }

  if (!issueBody.trim()) {
    console.log('No issue body provided; nothing to apply.');
    return;
  }

  const incoming = parseAutoSpecBlock(issueBody);
  if (incoming.length === 0) {
    console.log('No valid auto-spec entries found between markers.');
    return;
  }

  const byRat = new Map();
  for (const entry of incoming) {
    if (!byRat.has(entry.rat)) byRat.set(entry.rat, []);
    byRat.get(entry.rat).push(entry);
  }

  let totalAdded = 0;

  for (const [rat, entries] of byRat.entries()) {
    const relFile = SPEC_FILE_BY_RAT[rat];
    const absFile = path.resolve(relFile);
    const { header, arr } = loadSpecFile(absFile);

    const existingKeys = new Set(arr.map((s) => `${s.major}|${s.middle}|${s.leaf}`));
    const existingPaths = new Set();
    for (const s of arr) {
      existingPaths.add(s.path);
      for (const alt of s.pathAlternatives ?? []) {
        existingPaths.add(alt);
      }
    }

    let addedForRat = 0;
    for (const item of entries) {
      const key = `${item.major}|${item.middle}|${item.leaf}`;
      if (existingKeys.has(key) || existingPaths.has(item.path)) {
        continue;
      }

      const newSpec = {
        major: item.major,
        middle: item.middle,
        leaf: item.leaf,
        path: item.path,
        kind: item.kind,
        description: item.description,
      };

      arr.push(newSpec);
      existingKeys.add(key);
      existingPaths.add(item.path);
      addedForRat++;
      totalAdded++;
      console.log(`[apply-issue-specs] + ${rat}: ${key} (${item.kind}) -> ${item.path}`);
    }

    if (addedForRat > 0 && !dryRun) {
      fs.writeFileSync(absFile, `${header}${JSON.stringify(arr, null, 2)};\n`, 'utf8');
      console.log(`[apply-issue-specs] Updated ${relFile} (+${addedForRat})`);
    }
  }

  console.log(`[apply-issue-specs] Complete. Total added: ${totalAdded}${dryRun ? ' (dry-run)' : ''}`);
}

main();
