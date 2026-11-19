/**
 * EUTRA Feature Group Indicator (FGI) bit tables
 * Source: 3GPP TS 36.331 Annex B (Table B.1-1, Table B.1-1a) and Annex C (Table C.1-1)
 * Descriptions verified against 3GPP TS 36.331 & Wireshark LTE dissector.
 *
 * IMPORTANT: This file covers ONLY indicators defined in TS 36.331 Releases 8–10.
 * Indicators 65–100 are NOT DEFINED in these releases (gap is intentional per spec).
 * Indicators 133+ are not addressed (see Release 11+ specs if needed).
 *
 * Bit numbering scheme (absolute indicator numbers per TS 36.331):
 *   featureGroupIndicators     → Indicators 1–32 (Annex B, Table B.1-1)
 *   featureGroupIndRel9Add-r9  → Indicators 33–64 (Annex B, Table B.1-1a)
 *   featureGroupIndRel10-r10   → Indicators 101–132 (Annex C, Table C.1-1)
 *
 * Within each 32-bit bitstring, raw bit index = absoluteIndicator - firstIndicator
 * where firstIndicator is 1, 33, or 101 respectively.
 */

export interface FgiBitSpec {
  bit: number;        // Absolute indicator number (1–32, 33–64, 101–132)
  shortName: string;  // Short label for UI
  description: string; // Full 3GPP description
  release: 'R9' | 'R9-Add' | 'R10';
}

/**
 * Generate undefined FGI indicator entries for a bit range.
 * Used to fill gaps in the FGI tables for reserved/unspecified indicators.
 */
function createUndefinedIndicators(
  startBit: number,
  endBit: number,
  release: 'R9' | 'R9-Add' | 'R10'
): FgiBitSpec[] {
  return Array.from({ length: endBit - startBit + 1 }, (_, i) => {
    const bit = startBit + i;
    return {
      bit,
      shortName: `Undefined (Indicator ${bit})`,
      description: 'Undefined — not specified in TS 36.331',
      release,
    };
  });
}

/**
 * FGI Release 8/9 — featureGroupIndicators (32-bit, Indicators 1–32)
 * 3GPP TS 36.331 Annex B, Table B.1-1
 */
export const FGI_REL9_TABLE: FgiBitSpec[] = [
  { bit: 1,  shortName: 'Intra-SF PUSCH freq hop; DCI 3a; Aperiodic CQI Mode 2-0&2-2',
    description: 'Intra-subframe freq hopping for PUSCH scheduled by UL grant; DCI format 3a; Aperiodic CQI/PMI/RI report on PUSCH: Mode 2-0 & 2-2', release: 'R9' },
  { bit: 2,  shortName: 'Simul CQI+ACK/NACK PUCCH; Abs TPC; RA type1; Periodic CQI Mode 2-0&2-1',
    description: 'Simultaneous CQI & ACK/NACK on PUCCH (format 2a/2b); Absolute TPC command for PUSCH; Resource alloc type 1 for PDSCH; Periodic CQI/PMI/RI report on PUCCH: Mode 2-0 & 2-1', release: 'R9' },
  { bit: 3,  shortName: '5-bit RLC UM SN; 7-bit PDCP SN',
    description: '5bit RLC UM SN; 7bit PDCP SN', release: 'R9' },
  { bit: 4,  shortName: 'Short DRX cycle',
    description: 'Short DRX cycle', release: 'R9' },
  { bit: 5,  shortName: 'Long DRX cycle; DRX command MAC CE',
    description: 'Long DRX cycle; DRX command MAC control element', release: 'R9' },
  { bit: 6,  shortName: 'Prioritised bit rate',
    description: 'Prioritised bit rate', release: 'R9' },
  { bit: 7,  shortName: 'RLC UM',
    description: 'RLC UM (Unacknowledged Mode)', release: 'R9' },
  { bit: 8,  shortName: 'EUTRA→UTRA CELL_DCH PS HO',
    description: 'EUTRA RRC_CONNECTED to UTRA CELL_DCH PS handover', release: 'R9' },
  { bit: 9,  shortName: 'EUTRA→GERAN GSM_Dedicated HO',
    description: 'EUTRA RRC_CONNECTED to GERAN GSM_Dedicated handover', release: 'R9' },
  { bit: 10, shortName: 'EUTRA→GERAN Packet_Idle CCO / NACC',
    description: 'EUTRA RRC_CONNECTED to GERAN (Packet_) Idle by Cell Change Order; with NACC', release: 'R9' },
  { bit: 11, shortName: 'EUTRA→CDMA2000 1xRTT CS Active HO',
    description: 'EUTRA RRC_CONNECTED to CDMA2000 1xRTT CS Active handover', release: 'R9' },
  { bit: 12, shortName: 'EUTRA→CDMA2000 HRPD Active HO',
    description: 'EUTRA RRC_CONNECTED to CDMA2000 HRPD Active handover', release: 'R9' },
  { bit: 13, shortName: 'Inter-freq HO (within FDD or TDD)',
    description: 'Inter-frequency handover (within FDD or TDD)', release: 'R9' },
  { bit: 14, shortName: 'Meas Event A4 (Neighbour>threshold) & A5',
    description: 'Measurement reporting event: Event A4 - Neighbour > threshold; Event A5 - Serving < threshold1 & Neighbour > threshold2', release: 'R9' },
  { bit: 15, shortName: 'Meas Event B1 (Neighbour>threshold)',
    description: 'Measurement reporting event: Event B1 - Neighbour > threshold', release: 'R9' },
  { bit: 16, shortName: 'Non-ANR periodical measurement reporting',
    description: 'Non-ANR related periodical measurement reporting', release: 'R9' },
  { bit: 17, shortName: 'ANR intra-freq meas reporting events',
    description: 'ANR related intra-frequency measurement reporting events', release: 'R9' },
  { bit: 18, shortName: 'ANR inter-freq meas reporting events',
    description: 'ANR related inter-frequency measurement reporting events', release: 'R9' },
  { bit: 19, shortName: 'ANR inter-RAT meas reporting events',
    description: 'ANR related inter-RAT measurement reporting events', release: 'R9' },
  { bit: 20, shortName: 'SRB1+SRB2+8xAM DRB (or 5xAM+3xUM if ind.7)',
    description: 'SRB1 and SRB2 for DCCH + 8x AM DRB; SRB1 and SRB2 for DCCH + 5x AM DRB + 3x UM DRB (if indicator 7 is supported)', release: 'R9' },
  { bit: 21, shortName: 'Predefined intra/inter-SF PUSCH freq hop (N_sb>1)',
    description: 'Predefined intra- and inter-subframe frequency hopping for PUSCH with N_sb > 1; Predefined inter-subframe frequency hopping for PUSCH with N_sb > 1', release: 'R9' },
  { bit: 22, shortName: 'UTRAN meas + Event B2 in E-UTRA connected',
    description: 'UTRAN measurements, reporting and measurement reporting event B2 in E-UTRA connected mode', release: 'R9' },
  { bit: 23, shortName: 'GERAN meas + Event B2 in E-UTRA connected',
    description: 'GERAN measurements, reporting and measurement reporting event B2 in E-UTRA connected mode', release: 'R9' },
  { bit: 24, shortName: '1xRTT meas + Event B2 in E-UTRA connected',
    description: '1xRTT measurements, reporting and measurement reporting event B2 in E-UTRA connected mode', release: 'R9' },
  { bit: 25, shortName: 'Inter-freq meas and reporting (E-UTRA connected)',
    description: 'Inter-frequency measurements and reporting in E-UTRA connected mode', release: 'R9' },
  { bit: 26, shortName: 'HRPD meas + Event B2 in E-UTRA connected',
    description: 'HRPD measurements, reporting and measurement reporting event B2 in E-UTRA connected mode', release: 'R9' },
  { bit: 27, shortName: 'EUTRA→UTRA CELL_DCH CS HO',
    description: 'EUTRA RRC_CONNECTED to UTRA CELL_DCH CS handover', release: 'R9' },
  { bit: 28, shortName: 'TTI bundling',
    description: 'TTI bundling', release: 'R9' },
  { bit: 29, shortName: 'Semi-Persistent Scheduling (SPS)',
    description: 'Semi-Persistent Scheduling', release: 'R9' },
  { bit: 30, shortName: 'Handover between FDD and TDD',
    description: 'Handover between FDD and TDD', release: 'R9' },
  { bit: 31, shortName: 'Multi-band information (MBI)',
    description: 'Mechanisms defined for cells broadcasting multi band information', release: 'R9' },
  { bit: 32, shortName: 'Undefined (Indicator 32)',
    description: 'Undefined — not specified in TS 36.331', release: 'R9' },
] as const;

/**
 * FGI Release 9 Additional — featureGroupIndRel9Add-r9 (32-bit, Indicators 33–64)
 * 3GPP TS 36.331 Annex B, Table B.1-1a
 * Absolute indicator numbers: bit field index i → Indicator (33 + i)
 */
const REL9_ADD_DEFINED: FgiBitSpec[] = [
  { bit: 33, shortName: 'Inter-RAT ANR — UTRAN FDD',
    description: 'Inter-RAT ANR features for UTRAN FDD', release: 'R9-Add' },
  { bit: 34, shortName: 'Inter-RAT ANR — GERAN',
    description: 'Inter-RAT ANR features for GERAN', release: 'R9-Add' },
  { bit: 35, shortName: 'Inter-RAT ANR — 1xRTT',
    description: 'Inter-RAT ANR features for 1xRTT', release: 'R9-Add' },
  { bit: 36, shortName: 'Inter-RAT ANR — HRPD',
    description: 'Inter-RAT ANR features for HRPD', release: 'R9-Add' },
  { bit: 37, shortName: 'Inter-RAT ANR — UTRAN TDD',
    description: 'Inter-RAT ANR features for UTRAN TDD', release: 'R9-Add' },
  { bit: 38, shortName: 'EUTRA→UTRA TDD CELL_DCH PS HO',
    description: 'EUTRA RRC_CONNECTED to UTRA TDD CELL_DCH PS handover', release: 'R9-Add' },
  { bit: 39, shortName: 'UTRAN TDD meas + Event B2 in E-UTRA connected',
    description: 'UTRAN TDD measurements, reporting and measurement reporting event B2 in E-UTRA connected mode', release: 'R9-Add' },
  { bit: 40, shortName: 'EUTRA→UTRA TDD CELL_DCH CS HO',
    description: 'EUTRA RRC_CONNECTED to UTRA TDD CELL_DCH CS handover', release: 'R9-Add' },
  { bit: 41, shortName: 'Meas Event B1 (UTRAN FDD Neighbour>threshold)',
    description: 'Measurement reporting event: Event B1 - Neighbour > threshold for UTRAN FDD', release: 'R9-Add' },
  { bit: 42, shortName: 'DCI format 3a',
    description: 'DCI format 3a', release: 'R9-Add' },
];

export const FGI_REL9_ADD_TABLE: FgiBitSpec[] = [
  ...REL9_ADD_DEFINED,
  ...createUndefinedIndicators(43, 64, 'R9-Add'),
];

/**
 * FGI Release 10 — featureGroupIndRel10-r10 (32-bit, Indicators 101–132)
 * 3GPP TS 36.331 Annex C, Table C.1-1
 * Absolute indicator numbers: bit field index i → Indicator (101 + i)
 */
const REL10_DEFINED: FgiBitSpec[] = [
  { bit: 101, shortName: 'DMRS with OCC and SGH disabling',
    description: 'DMRS with OCC (orthogonal cover code) and SGH (sequence group hopping) disabling', release: 'R10' },
  { bit: 102, shortName: 'Trigger type 1 SRS (aperiodic, up to X ports)',
    description: 'Trigger type 1 SRS (aperiodic SRS) transmission (Up to X ports)', release: 'R10' },
  { bit: 103, shortName: 'PDSCH TM9 with up to 4 CSI-RS ports',
    description: 'PDSCH TM9 when up to 4 CSI reference signal ports are configured', release: 'R10' },
  { bit: 104, shortName: 'PDSCH TM9 TDD with 8 CSI-RS ports',
    description: 'PDSCH TM9 for TDD when 8 CSI reference signal ports are configured', release: 'R10' },
  { bit: 105, shortName: 'PUCCH RM2-0 (TM9 ≤4 CSI-RS) & RM2-1 (TM9 ≤4)',
    description: 'PUCCH RM2-0 when PDSCH TM9 is configured and RM2-1 when PDSCH TM9 and up to 4 CSI reference signal ports are configured', release: 'R10' },
  { bit: 106, shortName: 'PUCCH RM2-1 (TM9 + 8 CSI-RS ports)',
    description: 'PUCCH RM2-1 when PDSCH TM9 and 8 CSI reference signal ports are configured', release: 'R10' },
  { bit: 107, shortName: 'PUSCH RM2-0 (TM9 ≤4 CSI-RS) & RM2-2 (TM9 ≤4)',
    description: 'PUSCH RM2-0 when PDSCH TM9 is configured and RM2-2 when PDSCH TM9 and up to 4 CSI reference signal ports are configured', release: 'R10' },
  { bit: 108, shortName: 'PUSCH RM2-2 (TM9 + 8 CSI-RS ports)',
    description: 'PUSCH RM2-2 when PDSCH TM9 and 8 CSI reference signal ports are configured', release: 'R10' },
  { bit: 109, shortName: 'PUCCH RM1-1 submode 1',
    description: 'PUCCH RM1-1 submode 1', release: 'R10' },
  { bit: 110, shortName: 'PUCCH RM1-1 submode 2',
    description: 'PUCCH RM1-1 submode 2', release: 'R10' },
  { bit: 111, shortName: 'Meas Event A6',
    description: 'Measurement reporting trigger Event A6', release: 'R10' },
  { bit: 112, shortName: 'SCell addition within HO to EUTRA',
    description: 'SCell addition within the Handover to EUTRA procedure', release: 'R10' },
  { bit: 113, shortName: 'Trigger type 0 SRS (periodic, X Serving Cells)',
    description: 'Trigger type 0 SRS (periodic SRS) transmission on X Serving Cells', release: 'R10' },
  { bit: 114, shortName: 'Report UTRA CPICH RSCP & Ec/N0 in Meas Report',
    description: 'Reporting of both UTRA CPICH RSCP and Ec/N0 in a Measurement Report', release: 'R10' },
  { bit: 115, shortName: 'Time domain ICIC RLM/RRM CSI meas restriction',
    description: 'Time domain ICIC RLM/RRM / ICIC RRM / ICIC CSI measurement sf restriction for the serving cell / neighbour cells', release: 'R10' },
  { bit: 116, shortName: 'Relative TX phase continuity for UL SM',
    description: 'Relative transmit phase continuity for spatial multiplexing in UL', release: 'R10' },
];

export const FGI_REL10_TABLE: FgiBitSpec[] = [
  ...REL10_DEFINED,
  ...createUndefinedIndicators(117, 132, 'R10'),
];
