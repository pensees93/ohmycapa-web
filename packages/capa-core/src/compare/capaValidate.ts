/**
 * Validation utilities for UE Capability inputs (OTA logs and CommonCapaJson v2.0).
 */

import { detectInputFormat } from '../syntax/detectVendor';

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

const VALID_EXTENSIONS = ['.txt', '.log', '.json'];

/**
 * Validate supported file extension (.txt, .log, .json).
 */
export function validateFileExtension(fileName: string): ValidationResult {
  const lower = fileName.toLowerCase();
  const hasValidExt = VALID_EXTENSIONS.some((ext) => lower.endsWith(ext));
  if (!hasValidExt) {
    return {
      valid: false,
      error: 'Unsupported file format. Please upload a .txt, .log, or .json capability file.',
    };
  }
  return { valid: true };
}

/**
 * Validate UE capability file content header / format using Stage 1 detection.
 */
export function validateCapaFileHeader(content: string): ValidationResult {
  if (!content || !content.trim()) {
    return { valid: false, error: 'File content is empty.' };
  }

  const detected = detectInputFormat(content);
  if (
    detected.format === 'OTA_SLSI' ||
    detected.format === 'OTA_MTK' ||
    detected.format === 'OTA_QUALCOMM' ||
    detected.format === 'COMMON_JSON'
  ) {
    return { valid: true };
  }

  if (detected.format === 'SUMMARY_TEXT') {
    return {
      valid: false,
      error:
        'Non-OTA capability summary text is not supported; raw 3GPP OTA log or CommonCapaJson v2.0 is required.',
    };
  }

  return {
    valid: false,
    error:
      'Unrecognized UE capability format. Only SLSI/MTK/Qualcomm 3GPP OTA logs or CommonCapaJson v2.0 JSON files are supported.',
  };
}
