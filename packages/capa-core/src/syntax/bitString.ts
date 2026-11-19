/**
 * Bit string normalization utilities for Stage 1 syntax parsing.
 */

const RE_BIT_LENGTH = /bit\s+length\s+(\d+)/i;
const RE_LSB_PAD = /(\d+)\s+LSB\s+pad\s+bits/i;

/**
 * Normalize an ASN.1 bit string or hex string by removing internal whitespace.
 * Example: "'0101 0111'B" -> "'01010111'B"
 */
export function normalizeBitString(raw: string): string {
  return raw.replace(/\s+/g, '');
}

/**
 * Convert Wireshark/ELT hex value + bit-length description into canonical "'...'B" notation.
 * Uses BigInt so bit strings wider than 32 bits (e.g., 64-bit measGapPatterns-r15) never overflow.
 *
 * Example:
 *   hex = "77c0", description = "bit length 10, 6 LSB pad bits, 0111 0111  11.. .... decimal value 479"
 *   -> "'0111011111'B"
 */
export function hexDescToBitString(hexOrNum: string | number, description: string): string | null {
  const bitLenMatch = description.match(RE_BIT_LENGTH);
  if (!bitLenMatch) return null;

  const bitLength = parseInt(bitLenMatch[1], 10);
  if (!Number.isFinite(bitLength) || bitLength <= 0 || bitLength > 4096) return null;

  const lsbPadMatch = description.match(RE_LSB_PAD);
  const lsbPadBits = lsbPadMatch ? parseInt(lsbPadMatch[1], 10) : 0;

  let hexStr: string | null = null;
  if (typeof hexOrNum === 'string') {
    const cleaned = hexOrNum.trim().replace(/^0x/i, '');
    if (/^[0-9a-fA-F]+$/.test(cleaned)) {
      hexStr = cleaned;
    }
  } else if (typeof hexOrNum === 'number' && Number.isFinite(hexOrNum) && hexOrNum >= 0) {
    hexStr = Math.trunc(hexOrNum).toString(16);
  }

  if (hexStr !== null) {
    try {
      const value = BigInt(`0x${hexStr}`);
      const shifted = lsbPadBits > 0 ? value >> BigInt(lsbPadBits) : value;
      const binary = shifted.toString(2).padStart(bitLength, '0');
      const bits = binary.length > bitLength ? binary.slice(binary.length - bitLength) : binary;
      return `'${bits}'B`;
    } catch {
      // Fall through to description bit-pattern fallback
    }
  }

  // Fallback: extract explicit bit pattern from description before "decimal value"
  const beforeDecimal = description.split(/decimal\s+value/i)[0] ?? '';
  const patternSection = beforeDecimal.replace(RE_BIT_LENGTH, '').replace(RE_LSB_PAD, '');
  const extractedBits = patternSection.replace(/[^01]/g, '');
  if (extractedBits.length >= bitLength) {
    return `'${extractedBits.slice(0, bitLength)}'B`;
  }

  return null;
}
