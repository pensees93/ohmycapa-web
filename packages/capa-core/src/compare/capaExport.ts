import * as XLSX from 'xlsx-js-style';
import type { CapaCompareResult } from '../types/compareTypes';
import type { CompareFormat, NRBandInfo, FeatureLeaf, RatType } from '../types/capaTypes';
import { generateCombinationKey, getBwClassCcCount } from '../normalizer/comboKey';
import { applySheetStyles, changedCellStyle, aOnlyCellStyle, bOnlyCellStyle } from '../utils/excelUtils';

const RAT_LABELS: Record<string, string> = {
  nr: 'NR (5G)', eutra: 'EUTRA (LTE)', 'eutra-nr': 'EUTRA-NR (MRDC)', utra: 'UTRA (3G)',
};

const STATUS_LABELS = {
  band: {
    same: 'Same',
    changed: 'Changed',
    'a-only': 'A-only',
    'b-only': 'B-only',
  },
  combo: {
    'exact-same': 'Exact (Same)',
    'exact-changed': 'Exact (Diff)',
    'a-only-covered': 'A-only (Covered)',
    'a-only-unique': 'A-only (Unique)',
    'b-only-covered': 'B-only (Covered)',
    'b-only-unique': 'B-only (Unique)',
  },
  feature: {
    same: 'Same',
    different: 'Different',
    'a-only': 'A-only',
    'b-only': 'B-only',
  },
} as const;

function statusLabel(type: keyof typeof STATUS_LABELS, status: string): string {
  return (STATUS_LABELS[type] as Record<string, string>)[status] ?? status;
}

function bandStatusLabel(status: string): string {
  return statusLabel('band', status);
}

function comboStatusLabel(status: string): string {
  return statusLabel('combo', status);
}

function featureDiffStatus(status: string): string {
  return statusLabel('feature', status);
}

function getStatusStyle(status: string): any {
  if (status === 'changed' || status === 'different' || status === 'exact-changed') return changedCellStyle;
  if (status === 'a-only' || status === 'a-only-covered' || status === 'a-only-unique') return aOnlyCellStyle;
  if (status === 'b-only' || status === 'b-only-covered' || status === 'b-only-unique') return bOnlyCellStyle;
  return undefined;
}

function applyStyle(ws: XLSX.WorkSheet, row: number, col: number, style: any): void {
  const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
  if (!ws[cellAddress]) ws[cellAddress] = { v: '', t: 's' };
  ws[cellAddress].s = style;
}

function valStr(v: unknown): string {
  if (v === undefined || v === null) return '--';
  if (Array.isArray(v)) return v.join(', ');
  return String(v);
}

function featureLeafValStr(v: FeatureLeaf['value'], kind: FeatureLeaf['kind']): string {
  if (v === undefined || v === null) return '--';
  if (kind === 'bool' || kind === 'fgiBit' || kind === 'presence') return v ? 'true' : 'false';
  if (Array.isArray(v)) return v.join(', ');
  return String(v);
}

function formatFeatureValue(
  v: FeatureLeaf['value'],
  kind: FeatureLeaf['kind'],
  diff?: any
): string {
  if ((kind === 'stringList' || kind === 'numberList') && diff) {
    return `${diff.common.join(',')}  +A:[${diff.onlyInA.join(',')}]  +B:[${diff.onlyInB.join(',')}]`;
  }
  return featureLeafValStr(v, kind);
}

/**
 * Append Features sheets to a workbook (compare mode)
 */
function appendFeaturesCompareSheets(
  wb: XLSX.WorkBook,
  result: CapaCompareResult,
  deviceAName: string,
  deviceBName: string
): void {
  if (!result.featuresDiff) return;
  for (const [rat, ratDiff] of Object.entries(result.featuresDiff) as [RatType, NonNullable<CapaCompareResult['featuresDiff']>[RatType]][]) {
    if (!ratDiff || ratDiff.diffs.length === 0) continue;
    const ratLabel = (RAT_LABELS[rat] ?? rat).substring(0, 16);
    const rows: unknown[][] = [
      [`Device A: ${deviceAName}`, `Device B: ${deviceBName}`],
      ['Major', 'Middle', 'Feature', `A Value`, `B Value`, 'Status', 'Description'],
    ];
    for (let i = 0; i < ratDiff.diffs.length; i++) {
      const d = ratDiff.diffs[i];
      const aVal = formatFeatureValue(d.a, d.kind, d.stringListDiff);
      const bVal = formatFeatureValue(d.b, d.kind, d.stringListDiff);
      rows.push([d.major, d.middle, d.leaf, aVal, bVal, featureDiffStatus(d.status), d.description ?? '']);
      
      // We can't apply styles to 'ws' before it's created, so we'll do it after aoa_to_sheet
    }
    const ws = XLSX.utils.aoa_to_sheet(rows);

    // Apply styles to Feature cells
    for (let i = 0; i < ratDiff.diffs.length; i++) {
      const d = ratDiff.diffs[i];
      const rowIdx = i + 2;
      const style = getStatusStyle(d.status);
      if (style) {
        if (d.status === 'different') {
          applyStyle(ws, rowIdx, 3, style); // A Value
          applyStyle(ws, rowIdx, 4, style); // B Value
          applyStyle(ws, rowIdx, 5, style); // Status
        } else if (d.status === 'a-only') {
          for (let col = 0; col < 7; col++) applyStyle(ws, rowIdx, col, style);
        } else if (d.status === 'b-only') {
          for (let col = 0; col < 7; col++) applyStyle(ws, rowIdx, col, style);
        }
      }
    }

    applySheetStyles(ws, 2); // 2 header rows (device info + column headers)
    XLSX.utils.book_append_sheet(wb, ws, `${ratLabel} Features`.substring(0, 31));
  }
}

/**
 * Append Features sheets to a workbook (single device mode)
 */
function appendFeaturesSingleSheets(wb: XLSX.WorkBook, device: CompareFormat): void {
  if (!device.features) return;
  for (const [rat, ratFeatures] of Object.entries(device.features) as [RatType, NonNullable<CompareFormat['features']>[RatType]][]) {
    if (!ratFeatures || ratFeatures.leaves.length === 0) continue;
    const ratLabel = (RAT_LABELS[rat] ?? rat).substring(0, 16);
    const rows: unknown[][] = [
      ['Major', 'Middle', 'Feature', 'Value', 'Description'],
    ];
    for (const leaf of ratFeatures.leaves) {
      rows.push([leaf.major, leaf.middle, leaf.leaf, featureLeafValStr(leaf.value, leaf.kind), leaf.description ?? '']);
    }
    const ws = XLSX.utils.aoa_to_sheet(rows);
    applySheetStyles(ws, 1); // 1 header row
    XLSX.utils.book_append_sheet(wb, ws, `${ratLabel} Features`.substring(0, 31));
  }
}

const yieldToMain = () => new Promise<void>(r => setTimeout(r, 0));

export async function buildCapaCompareWorkbook(result: CapaCompareResult): Promise<XLSX.WorkBook> {
  const wb = XLSX.utils.book_new();

  const deviceAName = result.meta.deviceA.fileName;
  const deviceBName = result.meta.deviceB.fileName;

  // ─── Summary sheet ────────────────────────────────────────────────────────
  const summaryRows: unknown[][] = [
    ['CAPA Compare Report'],
    ['Device A', deviceAName, `(${result.meta.deviceA.vendor})`],
    ['Device B', deviceBName, `(${result.meta.deviceB.vendor})`],
    [],
    ['RAT', 'Bands A', 'Bands B', 'Shared', 'Changed', 'A-only', 'B-only',
     'Combos Total', 'Exact', 'A-only Covered', 'A-only Unique', 'B-only Covered', 'B-only Unique',
     'Coverage A→B', 'Coverage B→A'],
  ];
  for (const [rat, s] of Object.entries(result.summary.perRat)) {
    if (!s) continue;
    const { bands, combos, coverage } = s;
    summaryRows.push([
      RAT_LABELS[rat] ?? rat,
      bands.shared + bands.aOnly, bands.shared + bands.bOnly,
      bands.shared, bands.changed, bands.aOnly, bands.bOnly,
      combos.exactSame + combos.exactChanged + combos.aOnlyCovered + combos.aOnlyUnique + combos.bOnlyCovered + combos.bOnlyUnique,
      combos.exactSame + combos.exactChanged,
      combos.aOnlyCovered, combos.aOnlyUnique,
      combos.bOnlyCovered, combos.bOnlyUnique,
      `${Math.round(coverage.aToB.coverageRate * 100)}%`,
      `${Math.round(coverage.bToA.coverageRate * 100)}%`,
    ]);
  }
  if (result.summary.keyDifferences.length > 0) {
    summaryRows.push([]);
    summaryRows.push(['Key Differences']);
    for (const d of result.summary.keyDifferences) summaryRows.push([d]);
  }
  const summaryWs = XLSX.utils.aoa_to_sheet(summaryRows);
  applySheetStyles(summaryWs, 5); // 5 header rows (title + device A/B info + empty + column headers)
  XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary');

  await yieldToMain();

  // ─── Band sheets ──────────────────────────────────────────────────────────
  for (const [rat, ratResult] of Object.entries(result.ratResults)) {
    if (!ratResult || ratResult.bandDiffs.length === 0) continue;
    const sheetName = `${(RAT_LABELS[rat] ?? rat).substring(0, 20)} Bands`;

    const rows: unknown[][] = [
      [`Device A: ${deviceAName}`, `Device B: ${deviceBName}`],
      ['Band', 'A PowerClass', 'B PowerClass', 'A DL MIMO', 'B DL MIMO',
       'A UL MIMO', 'B UL MIMO', 'A DL QAM', 'B DL QAM', 'A UL QAM', 'B UL QAM', 'Status'],
    ];
    for (const bd of ratResult.bandDiffs) {
      rows.push([
        bd.displayName,
        valStr(bd.powerClass?.a), valStr(bd.powerClass?.b),
        valStr(bd.dlMimo?.a), valStr(bd.dlMimo?.b),
        valStr(bd.ulMimo?.a), valStr(bd.ulMimo?.b),
        valStr(bd.dlQam?.a), valStr(bd.dlQam?.b),
        valStr(bd.ulQam?.a), valStr(bd.ulQam?.b),
        bandStatusLabel(bd.status),
      ]);
    }
    const ws = XLSX.utils.aoa_to_sheet(rows);

    // Apply styles to Band cells
    for (let i = 0; i < ratResult.bandDiffs.length; i++) {
      const bd = ratResult.bandDiffs[i];
      const rowIdx = i + 2; // header rows offset
      
      if (bd.status === 'a-only' || bd.status === 'b-only') {
        const style = getStatusStyle(bd.status);
        for (let col = 0; col < 12; col++) applyStyle(ws, rowIdx, col, style);
      } else if (bd.status === 'changed') {
        const props = [
          { d: bd.powerClass, cols: [1, 2] },
          { d: bd.dlMimo, cols: [3, 4] },
          { d: bd.ulMimo, cols: [5, 6] },
          { d: bd.dlQam, cols: [7, 8] },
          { d: bd.ulQam, cols: [9, 10] },
        ];
        for (const p of props) {
          if (p.d?.status && p.d.status !== 'same') {
            const style = getStatusStyle(p.d.status);
            for (const col of p.cols) applyStyle(ws, rowIdx, col, style);
          }
        }
        applyStyle(ws, rowIdx, 11, changedCellStyle); // Status column
      }
    }

    applySheetStyles(ws, 2); // 2 header rows
    XLSX.utils.book_append_sheet(wb, ws, sheetName.substring(0, 31));
  }

  await yieldToMain();

  // ─── Combo sheets ─────────────────────────────────────────────────────────
  for (const [rat, ratResult] of Object.entries(result.ratResults)) {
    if (!ratResult || ratResult.comboDiffs.length === 0) continue;
    const sheetName = `${(RAT_LABELS[rat] ?? rat).substring(0, 17)} Combos`;

    const rows: unknown[][] = [
      [`Device A: ${deviceAName}`, `Device B: ${deviceBName}`],
      ['Combo Key', 'CA Level', 'A PowerClass', 'B PowerClass', 'A BCS-EUTRA', 'B BCS-EUTRA', 'Status', 'Covering Supersets', 'Param Notes'],
    ];
    for (const cd of ratResult.comboDiffs) {
      rows.push([
        cd.key,
        cd.caLevel,
        valStr(cd.a?.powerClass),
        valStr(cd.b?.powerClass),
        valStr(cd.a?.supportedBandwidthCombinationSetEUTRA),
        valStr(cd.b?.supportedBandwidthCombinationSetEUTRA),
        comboStatusLabel(cd.status),
        (cd.coveringSupersets ?? []).join(' | '),
        (cd.paramNotes ?? []).join(' | '),
      ]);
    }
    const ws = XLSX.utils.aoa_to_sheet(rows);

    // Apply styles to Combo cells
    for (let i = 0; i < ratResult.comboDiffs.length; i++) {
      const cd = ratResult.comboDiffs[i];
      const rowIdx = i + 2; // header rows offset
      const style = getStatusStyle(cd.status);
      if (style) {
        applyStyle(ws, rowIdx, 6, style); // Status column
        if (cd.status !== 'exact-same') {
          applyStyle(ws, rowIdx, 8, style); // Param Notes column
          
          // Highlight PowerClass columns if they differ
          if (cd.a?.powerClass !== cd.b?.powerClass) {
            applyStyle(ws, rowIdx, 2, changedCellStyle);
            applyStyle(ws, rowIdx, 3, changedCellStyle);
          }
          // Highlight BCS-EUTRA columns if they differ
          if (valStr(cd.a?.supportedBandwidthCombinationSetEUTRA) !== valStr(cd.b?.supportedBandwidthCombinationSetEUTRA)) {
            applyStyle(ws, rowIdx, 4, changedCellStyle);
            applyStyle(ws, rowIdx, 5, changedCellStyle);
          }
        }
      }
    }

    applySheetStyles(ws, 2); // 2 header rows
    XLSX.utils.book_append_sheet(wb, ws, sheetName.substring(0, 31));
  }

  await yieldToMain();

  // ─── Features sheets ──────────────────────────────────────────────────────
  appendFeaturesCompareSheets(wb, result, deviceAName, deviceBName);

  return wb;
}

export async function exportCapaCompareToExcel(result: CapaCompareResult): Promise<void> {
  const wb = await buildCapaCompareWorkbook(result);
  const deviceAName = result.meta.deviceA.fileName;
  const deviceBName = result.meta.deviceB.fileName;
  const fileName = `CAPA_Compare_${deviceAName}_vs_${deviceBName}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

// ─── Single device export ─────────────────────────────────────────────────────

export async function buildSingleDeviceWorkbook(device: CompareFormat): Promise<XLSX.WorkBook> {
  const wb = XLSX.utils.book_new();
  const { fileName, vendor, detectedRats } = device.meta;

  // ─── Summary sheet ──────────────────────────────────────────────────────────
  const summaryRows: unknown[][] = [
    ['CAPA Device Report'],
    ['Device', fileName],
    ['Vendor', vendor],
    ['RATs', detectedRats.join(', ')],
    [],
    ['RAT', 'Bands', 'Combos (raw)'],
  ];
  for (const [rat, ratInfo] of Object.entries(device.rats)) {
    if (!ratInfo) continue;
    summaryRows.push([
      RAT_LABELS[rat] ?? rat,
      ratInfo.bands.length,
      ratInfo.bandCombinations.length,
    ]);
  }
  const summaryWs = XLSX.utils.aoa_to_sheet(summaryRows);
  applySheetStyles(summaryWs, 6); // 6 header rows
  XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary');

  await yieldToMain();

  // ─── Per-RAT sheets ─────────────────────────────────────────────────────────
  for (const [rat, ratInfo] of Object.entries(device.rats)) {
    if (!ratInfo) continue;
    const ratLabel = (RAT_LABELS[rat] ?? rat).substring(0, 20);
    const isNr = rat === 'nr';

    // Band sheet
    if (ratInfo.bands.length > 0) {
      const bandHeader = ['Band', 'Power Class', 'DL MIMO', 'UL MIMO', 'DL QAM', 'UL QAM'];
      if (isNr) {
        bandHeader.push('DL Min BW', 'UL Min BW', 'DL Max BW', 'UL Max BW', 'Channel BW (DL)', 'SRS', 'MaxUL-Duty', 'TCI', 'BWP-Restr', 'BWP-SameNum');
      }
      const bandRows: unknown[][] = [bandHeader];

      for (const b of ratInfo.bands) {
        const nr = b as NRBandInfo;
        const bwCell = (() => {
          if (!isNr || !nr.channelBWsDL) return '--';
          const dl = nr.channelBWsDL;
          const parts: string[] = [];
          const numSort = (a: string, b: string) => parseInt(a) - parseInt(b);
          if (dl['scs-15kHz']?.length) parts.push(`15k:${[...dl['scs-15kHz']].sort(numSort).join(',')}`);
          if (dl['scs-30kHz']?.length) parts.push(`30k:${[...dl['scs-30kHz']].sort(numSort).join(',')}`);
          if (dl['scs-60kHz']?.length) parts.push(`60k:${[...dl['scs-60kHz']].sort(numSort).join(',')}`);
          return parts.join(' ') || '--';
        })();

        const row: unknown[] = [
          b.displayName,
          valStr(nr.powerClass),
          valStr(nr.dlMimo),
          valStr(nr.ulMimo),
          valStr(nr.dlQam),
          valStr(nr.ulQam),
        ];
        if (isNr) {
          row.push(
            nr.dlMinBandwidth ?? '--',
            nr.ulMinBandwidth ?? '--',
            nr.dlBandwidth ?? '--',
            nr.ulBandwidth ?? '--',
            bwCell,
            nr.srs?.txSwitch ?? '--',
            nr.maxUplinkDutyCycle ?? '--',
            nr.multipleTCI ? 'O' : '--',
            nr.bwpWithoutRestriction ? 'O' : '--',
            nr.bwpSameNumerology ?? '--'
          );
        }
        bandRows.push(row);
      }
      const ws = XLSX.utils.aoa_to_sheet(bandRows);
      applySheetStyles(ws, 1); // 1 header row
      XLSX.utils.book_append_sheet(wb, ws, `${ratLabel} Bands`.substring(0, 31));
    }

    // Combo sheet — raw, no dedup
    if (ratInfo.bandCombinations.length > 0) {
      const comboRows: unknown[][] = [['#', 'FSC', 'CA Level', 'Combo Key', 'BCS', 'BCS-EUTRA', 'Power Class', 'DL CC', 'UL CC', 'Agg DL', 'Agg UL', 'SimRxTx', 'DiffNumSCS', 'DiffNumLargerSCS', 'CSI-RS NZP', 'CSI Ports', 'CSI Reports', 'PS-ENDC', 'TDM', 'SimRxTx(EN-DC)', 'Async(EN-DC)']];
      ratInfo.bandCombinations.forEach((combo, idx) => {
        const fsc = combo.featureSetCombination != null && combo.featureSetIndex != null
          ? `FSC-${combo.featureSetCombination}-${combo.featureSetIndex}`
          : '--';
        const ca = combo.caParametersNR;
        const mrdc = combo.mrdcParameters;
        comboRows.push([
          idx + 1,
          fsc,
          combo.bands.reduce((s, b) => s + getBwClassCcCount(b.bandwidthClassDL), 0),
          generateCombinationKey(combo),
          valStr(combo.supportedBandwidthCombinationSet),
          valStr(combo.supportedBandwidthCombinationSetEUTRA),
          valStr(combo.powerClass),
          valStr(combo.dlCc),
          valStr(combo.ulCc),
          combo.aggregatedBw?.totalDl ?? '--',
          combo.aggregatedBw?.totalUl ?? '--',
          ca?.simultaneousRxTxInterBandCA ? 'O' : '--',
          ca?.diffNumerologyWithinPUCCHGroupSmallerSCS ? 'O' : '--',
          ca?.diffNumerologyWithinPUCCHGroupLargerSCS ? 'O' : '--',
          valStr(ca?.maxNumberSimultaneousNZPCSIRSAllCC),
          valStr(ca?.totalNumberPortsSimultaneousNZPCSIRSAllCC),
          valStr(ca?.simultaneousCSIReportsAllCC),
          // MRDC Params
          mrdc?.dynamicPowerSharingENDC ? 'O' : '--',
          mrdc?.tdm_PatternConfig ? 'O' : '--',
          valStr(mrdc?.simultaneousRxTxInterBandENDC),
          valStr(mrdc?.asyncIntraBandENDC),
        ]);
      });
      const ws = XLSX.utils.aoa_to_sheet(comboRows);
      applySheetStyles(ws, 1); // 1 header row
      XLSX.utils.book_append_sheet(wb, ws, `${ratLabel} Combos`.substring(0, 31));
    }
  }

  // ─── Features sheets ──────────────────────────────────────────────────────
  appendFeaturesSingleSheets(wb, device);

  return wb;
}

export async function exportSingleDeviceToExcel(device: CompareFormat, side?: 'A' | 'B'): Promise<void> {
  const wb = await buildSingleDeviceWorkbook(device);
  const { fileName } = device.meta;
  const sideTag = side ? `Device${side}_` : 'Device_';
  XLSX.writeFile(wb, `CAPA_${sideTag}${fileName}.xlsx`);
}

/**
 * Serialize CommonCapaJson v2.0 into formatted JSON text.
 */
export function serializeCommonCapaJson(data: CompareFormat): string {
  return JSON.stringify(data, null, 2);
}
