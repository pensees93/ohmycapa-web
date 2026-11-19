/**
 * Stage 1: Canonical ASN.1 AST types.
 * Output of the vendor-specific syntax parsers before 3GPP domain normalization.
 */

export type CapaVendor = 'SLSI' | 'MTK' | 'QUALCOMM' | 'UNKNOWN';

export type RatType = 'nr' | 'eutra' | 'eutra-nr' | 'utra';

export type Asn1Record = Record<string, unknown>;

export type InputFormat =
  | 'OTA_SLSI'
  | 'OTA_MTK'
  | 'OTA_QUALCOMM'
  | 'COMMON_JSON'
  | 'SUMMARY_TEXT'
  | 'UNKNOWN';

export interface VendorDetectionResult {
  vendor: CapaVendor;
  format: InputFormat;
}

/**
 * Vendor-neutral canonical ASN.1 tree produced by Stage 1 parsers.
 * All ASN.1 TypeReference wrappers, list wrappers, bit strings, and CHOICE blocks
 * are normalized into a uniform JSON tree matching 3GPP TS 38.331 / 36.331 / 25.331 field names.
 */
export interface CanonicalAsn1Tree {
  vendor: CapaVendor;
  fileName?: string;
  sourceFiles: string[];
  pdus: {
    eutra?: Asn1Record;
    nr?: Asn1Record;
    mrdc?: Asn1Record;
    utra?: Asn1Record;
  };
  warnings: string[];
  metadata?: Record<string, string>;
}
