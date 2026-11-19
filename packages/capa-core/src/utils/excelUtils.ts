import * as XLSX from 'xlsx-js-style';

/**
 * Default style for all cells: font size 8, Arial
 */
export const defaultCellStyle = {
  font: { sz: 8, name: 'Arial' },
  alignment: { vertical: 'center', horizontal: 'left' },
};

/**
 * Header style: font size 8, bold, grey background, centered
 */
export const headerCellStyle = {
  font: { sz: 8, name: 'Arial', bold: true },
  alignment: { vertical: 'center', horizontal: 'center' },
  fill: { fgColor: { rgb: 'E0E0E0' } },
};

/**
 * Style for "Changed" or "Different" cells (Yellow)
 */
export const changedCellStyle = {
  ...defaultCellStyle,
  fill: { fgColor: { rgb: 'FFF2CC' } },
};

/**
 * Style for "A-only" cells (Light Green)
 */
export const aOnlyCellStyle = {
  ...defaultCellStyle,
  fill: { fgColor: { rgb: 'E2EFDA' } },
};

/**
 * Style for "B-only" cells (Light Red/Pink)
 */
export const bOnlyCellStyle = {
  ...defaultCellStyle,
  fill: { fgColor: { rgb: 'FCE4D6' } },
};

/**
 * Calculate column widths based on content.
 */
export function calculateColumnWidths(ws: any, minWidth: number = 8, maxWidth: number = 60): number[] {
  const sheetJS = XLSX as any;
  const colWidths: number[] = [];
  const range = sheetJS.utils.decode_range(ws['!ref'] || 'A1');

  for (let col = range.s.c; col <= range.e.c; col++) {
    let maxLen = minWidth;
    for (let row = range.s.r; row <= range.e.r; row++) {
      const cellAddress = sheetJS.utils.encode_cell({ r: row, c: col });
      const cell = ws[cellAddress];
      if (cell && cell.v != null) {
        const cellValue = String(cell.v);
        const lines = cellValue.split('\n');
        const lineLen = Math.max(...lines.map((l: string) => l.length));
        const adjustedLen = lineLen * 1.2 + 2;
        maxLen = Math.max(maxLen, Math.min(adjustedLen, maxWidth));
      }
    }
    colWidths.push(Math.round(maxLen));
  }
  return colWidths;
}

/**
 * Apply cell styles and column widths to a worksheet.
 */
export function applySheetStyles(ws: any, headerRowCount: number = 1): void {
  const sheetJS = XLSX as any;
  const range = sheetJS.utils.decode_range(ws['!ref'] || 'A1');

  for (let row = range.s.r; row <= range.e.r; row++) {
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddress = sheetJS.utils.encode_cell({ r: row, c: col });
      const cell = ws[cellAddress];
      if (!cell) continue;

      // Preserve existing style if present, otherwise apply default/header
      if (!cell.s) {
        if (row < headerRowCount) {
          cell.s = headerCellStyle;
        } else {
          cell.s = defaultCellStyle;
        }
      }
    }
  }

  const colWidths = calculateColumnWidths(ws);
  ws['!cols'] = colWidths.map(w => ({ wch: w }));
}
