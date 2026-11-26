/**
 * Format & Vendor detector for raw UE Capability inputs.
 */

import type { VendorDetectionResult } from '../types/astTypes';

const RE_SUMMARY_HEADER = /^-+\s*(?:EUTRA|NR|MRDC|UTRA)\s+\d+\s+Items?-+/im;
const RE_QCOM_HEADER = /(?:LTE|NR5G)\s+RRC\s+OTA\s+Packet/i;

/**
 * Detect whether raw input is CommonCapaJson v2.0, summary text, or SLSI/MTK/Qualcomm OTA text.
 */
export function detectInputFormat(content: string): VendorDetectionResult {
  const trimmed = content.trim();
  if (!trimmed) {
    return { vendor: 'UNKNOWN', format: 'UNKNOWN' };
  }

  // 1. CommonCapaJson v2.0 JSON file
  if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed) as Record<string, unknown>;
      if (
        parsed &&
        typeof parsed === 'object' &&
        parsed['schemaVersion'] === '2.0' &&
        parsed['rats'] &&
        typeof parsed['rats'] === 'object' &&
        parsed['meta'] &&
        typeof parsed['meta'] === 'object'
      ) {
        const meta = parsed['meta'] as Record<string, unknown>;
        const v = meta['vendor'];
        const vendor = v === 'SLSI' || v === 'MTK' || v === 'QUALCOMM' ? v : 'UNKNOWN';
        return { vendor, format: 'COMMON_JSON' };
      }
    } catch {
      // Not valid JSON; continue text detection
    }
  }

  // 2. Non-OTA summary text (e.g. "---------------- EUTRA 23 Items----------------")
  const head = content.slice(0, 4096);
  if (RE_SUMMARY_HEADER.test(head) && !content.includes('UL-DCCH-Message') && !content.includes('::=')) {
    return { vendor: 'UNKNOWN', format: 'SUMMARY_TEXT' };
  }

  // 3. Qualcomm QXDM/QCAT ASN.1 Value Notation
  if (content.includes('::=') || head.includes('Interpreted PDU:') || RE_QCOM_HEADER.test(head)) {
    return { vendor: 'QUALCOMM', format: 'OTA_QUALCOMM' };
  }

  // 4. MTK ELT / NLT export (must check before SLSI because MTK logs contain UL-DCCH-Message inside Message Content)
  if (
    head.includes('[MS->NW]') ||
    head.includes('global_peer_msg_id') ||
    content.includes('Message Content') ||
    content.includes('Trace Id') ||
    content.includes('\tUL-DCCH-Message')
  ) {
    return { vendor: 'MTK', format: 'OTA_MTK' };
  }

  // 5. SLSI Wireshark RRC Dissector text
  if (
    head.includes('UL-DCCH-Message') ||
    head.includes('NR Radio Resource Control (RRC) protocol') ||
    head.includes('LTE Radio Resource Control (RRC) protocol') ||
    content.includes('UL-DCCH-Message') ||
    /\b(?:UE-NR-Capability|UE-EUTRA-Capability|UE-MRDC-Capability|InterRATHandoverInfo)\b/.test(head)
  ) {
    return { vendor: 'SLSI', format: 'OTA_SLSI' };
  }

  return { vendor: 'UNKNOWN', format: 'UNKNOWN' };
}
