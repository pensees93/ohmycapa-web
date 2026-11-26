/**
 * GitHub Issue payload builders for auto-registering newly discovered 3GPP FeatureSpecs
 * and reporting unrecognized UE capability log formats.
 */

import type { RatType } from '../types/astTypes';
import type { CommonCapaJson, FeatureKind, UnknownFeature } from '../types/capaTypes';

export const DEFAULT_GITHUB_REPO_URL = 'https://github.com/pensees93/ohmycapa-web';
export const AUTO_SPEC_START_MARKER = '<!-- OHMYCAPA_AUTO_SPEC_START -->';
export const AUTO_SPEC_END_MARKER = '<!-- OHMYCAPA_AUTO_SPEC_END -->';

export interface AutoSpecIssueEntry {
  rat: RatType;
  major: string;
  middle: string;
  leaf: string;
  path: string;
  kind: FeatureKind;
  description?: string;
  sampleValue?: unknown;
}

export interface UnclassifiedSpecIssueReport {
  title: string;
  markdownBody: string;
  issueUrl: string;
  totalCount: number;
  specs: AutoSpecIssueEntry[];
}

export interface ParseErrorIssueReport {
  title: string;
  markdownBody: string;
  issueUrl: string;
  requiresCopy: boolean;
}

const MAX_ISSUE_URL_BODY_LENGTH = 5500;
// Keep full prefilled URLs safely below Windows ShellExecuteW (~2,083 chars) limit.
const MAX_ISSUE_DRAFT_URL_LENGTH = 2000;
const RAT_ORDER: readonly RatType[] = ['nr', 'eutra', 'eutra-nr', 'utra'];

function normalizeRepoUrl(repoUrl: string): string {
  return repoUrl.replace(/\/+$/, '');
}

/**
 * Collect unique unclassified / auto-discovered feature specs from one or more normalized devices.
 */
export function collectAutoSpecEntries(
  devices: Array<CommonCapaJson | null | undefined>,
  ratFilter?: RatType
): AutoSpecIssueEntry[] {
  const seen = new Set<string>();
  const entries: AutoSpecIssueEntry[] = [];

  for (const device of devices) {
    if (!device?.features) continue;
    for (const rat of RAT_ORDER) {
      if (ratFilter && rat !== ratFilter) continue;
      const unknownList: UnknownFeature[] = device.features[rat]?.unclassified ?? [];
      for (const u of unknownList) {
        const dedupeKey = `${rat}|||${u.path}`;
        if (seen.has(dedupeKey)) continue;
        seen.add(dedupeKey);
        entries.push({
          rat,
          major: u.major,
          middle: u.middle,
          leaf: u.leaf,
          path: u.path,
          kind: u.kind,
          description: u.description ?? `Auto-discovered 3GPP capability (${u.path})`,
          sampleValue: u.value,
        });
      }
    }
  }

  return entries;
}

/**
 * Build a pre-filled GitHub Issue report and URL for newly discovered 3GPP FeatureSpecs.
 * Includes a machine-readable JSON block parsed by `.github/workflows/auto-add-spec.yml`.
 */
export function buildUnclassifiedSpecIssueReport(
  devices: Array<CommonCapaJson | null | undefined>,
  options: { repoUrl?: string; ratFilter?: RatType } = {}
): UnclassifiedSpecIssueReport {
  const repoUrl = normalizeRepoUrl(options.repoUrl ?? DEFAULT_GITHUB_REPO_URL);
  const specs = collectAutoSpecEntries(devices, options.ratFilter);
  const vendors = [...new Set(devices.map((d) => d?.meta.vendor).filter(Boolean))];
  const ratSummary = [...new Set(specs.map((s) => s.rat))].join(', ') || 'none';

  const title =
    specs.length === 1
      ? `[Auto-Spec] Add ${specs[0].rat.toUpperCase()} feature: ${specs[0].leaf}`
      : `[Auto-Spec] Add ${specs.length} newly discovered 3GPP feature(s) (${ratSummary})`;

  const payload = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    vendors,
    specs: specs.map(({ rat, major, middle, leaf, path, kind, description }) => ({
      rat,
      major,
      middle,
      leaf,
      path,
      kind,
      description,
    })),
  };

  const summaryLines = specs.map(
    (s) =>
      `- \`[${s.rat}]\` **${s.major} > ${s.middle} > ${s.leaf}** (\`${s.kind}\`) — \`${s.path}\` (sample: \`${JSON.stringify(s.sampleValue)}\`)`
  );

  const fullBody = [
    '## Newly Discovered 3GPP Features',
    '',
    `Detected **${specs.length}** unclassified feature(s) across vendor log(s): ${vendors.join(', ') || 'UNKNOWN'}.`,
    '',
    '### Summary',
    ...summaryLines,
    '',
    '### Machine-Readable Auto-Spec Payload (Do Not Edit Markers)',
    AUTO_SPEC_START_MARKER,
    '```json',
    JSON.stringify(payload, null, 2),
    '```',
    AUTO_SPEC_END_MARKER,
  ].join('\n');

  let urlBody = fullBody;
  if (urlBody.length > MAX_ISSUE_URL_BODY_LENGTH) {
    const compactPayload = {
      ...payload,
      specs: payload.specs.slice(0, 20),
      truncatedCount: Math.max(0, payload.specs.length - 20),
    };
    urlBody = [
      '## Newly Discovered 3GPP Features (Truncated for URL limit — paste clipboard if needed)',
      '',
      AUTO_SPEC_START_MARKER,
      '```json',
      JSON.stringify(compactPayload, null, 2),
      '```',
      AUTO_SPEC_END_MARKER,
    ].join('\n');
  }

  const params = new URLSearchParams({
    labels: 'auto-spec',
    title,
    body: urlBody,
  });

  return {
    title,
    markdownBody: fullBody,
    issueUrl: `${repoUrl}/issues/new?${params.toString()}`,
    totalCount: specs.length,
    specs,
  };
}

/** Prepare a draft with an optional literal log excerpt after the machine-readable block. */
export function prepareUnclassifiedSpecIssueDraft(report: UnclassifiedSpecIssueReport, rawLogExcerpt: string) {
  const excerpt = rawLogExcerpt.trimEnd();
  const codeBlock = excerpt.split(/\r\n?|\n/).map(line => `    ${line}`).join('\n');
  const markdownBody = excerpt ? `${report.markdownBody}\n\n### Raw log excerpt\n\n${codeBlock}` : report.markdownBody;
  const url = new URL(report.issueUrl);
  url.searchParams.set('body', markdownBody);
  const requiresCopy = url.href.length > MAX_ISSUE_DRAFT_URL_LENGTH;
  if (requiresCopy) url.searchParams.delete('body');
  return { markdownBody, issueUrl: url.href, requiresCopy };
}

/**
 * Build a pre-filled GitHub Issue URL for reporting unrecognized log formats or parse failures.
 */
export function buildParseErrorIssueReport(
  fileName: string,
  error: string,
  repoUrl = DEFAULT_GITHUB_REPO_URL
): ParseErrorIssueReport {
  const cleanRepo = normalizeRepoUrl(repoUrl);
  const title = `[Log-Format] Unrecognized or failed log: ${fileName}`;
  const trimmedError = error.length > 1500 ? `${error.slice(0, 1500)}...` : error;

  const markdownBody = [
    '## UE Capability Log Parse / Format Report',
    '',
    `- **File Name**: \`${fileName}\``,
    '- **Chipset Vendor / Tool**: _(e.g., SLSI/Wireshark, MTK/ELT, Qualcomm/QXDM, or new format)_',
    '',
    '### Error Details',
    '```text',
    trimmedError,
    '```',
    '',
    '### Sanitized Log Header Sample (First 30 lines, remove IMSI/IMEI if any)',
    '```text',
    '<!-- Paste first ~30 lines of the log here -->',
    '```',
  ].join('\n');

  const params = new URLSearchParams({
    labels: 'log-format,enhancement',
    title,
    body: markdownBody,
  });

  let issueUrl = `${cleanRepo}/issues/new?${params.toString()}`;
  const requiresCopy = issueUrl.length > MAX_ISSUE_DRAFT_URL_LENGTH;
  if (requiresCopy) {
    params.delete('body');
    issueUrl = `${cleanRepo}/issues/new?${params.toString()}`;
  }

  return {
    title,
    markdownBody,
    issueUrl,
    requiresCopy,
  };
}

/**
 * Parse and validate the `<!-- OHMYCAPA_AUTO_SPEC_START -->` JSON block from a GitHub Issue body.
 */
export function parseAutoSpecBlockFromIssueBody(body: string): AutoSpecIssueEntry[] {
  const startIdx = body.indexOf(AUTO_SPEC_START_MARKER);
  if (startIdx === -1) return [];
  const endIdx = body.indexOf(AUTO_SPEC_END_MARKER, startIdx + AUTO_SPEC_START_MARKER.length);
  if (endIdx === -1 || endIdx <= startIdx) {
    return [];
  }

  const section = body.slice(startIdx + AUTO_SPEC_START_MARKER.length, endIdx);
  const jsonMatch = section.match(/```json\s*([\s\S]*?)```/i) ?? [null, section.trim()];
  const rawJson = (jsonMatch[1] ?? '').trim();
  if (!rawJson) return [];

  let parsed: { specs?: unknown[] };
  try {
    parsed = JSON.parse(rawJson) as { specs?: unknown[] };
  } catch {
    return [];
  }
  if (!parsed || !Array.isArray(parsed.specs)) return [];

  const validRats = new Set<RatType>(['nr', 'eutra', 'eutra-nr', 'utra']);
  const validKinds = new Set<FeatureKind>(['bool', 'enum', 'number', 'stringList', 'numberList', 'presence', 'fgiBit']);

  const out: AutoSpecIssueEntry[] = [];
  for (const item of parsed.specs) {
    if (!item || typeof item !== 'object') continue;
    const rec = item as Record<string, unknown>;
    const rat = rec['rat'];
    const major = rec['major'];
    const middle = rec['middle'];
    const leaf = rec['leaf'];
    const path = rec['path'];
    const kind = rec['kind'];
    const description = rec['description'];

    if (
      typeof rat !== 'string' || !validRats.has(rat as RatType) ||
      typeof major !== 'string' || !major.trim() ||
      typeof middle !== 'string' || !middle.trim() ||
      typeof leaf !== 'string' || !leaf.trim() ||
      typeof path !== 'string' || !path.trim() ||
      typeof kind !== 'string' || !validKinds.has(kind as FeatureKind)
    ) {
      continue;
    }

    out.push({
      rat: rat as RatType,
      major: major.trim(),
      middle: middle.trim(),
      leaf: leaf.trim(),
      path: path.trim(),
      kind: kind as FeatureKind,
      ...(typeof description === 'string' && description.trim() ? { description: description.trim() } : {}),
    });
  }

  return out;
}
