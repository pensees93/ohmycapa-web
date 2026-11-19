import * as XLSX from 'xlsx-js-style';
import {
  buildCapaCompareWorkbook,
  buildSingleDeviceWorkbook,
  serializeCommonCapaJson,
} from '@ohmycapa/capa-core';
import type { CapaCompareResult, CommonCapaJson, CompareFormat } from '@ohmycapa/capa-core';

export type SaveFileFn = (buffer: Uint8Array, fileName: string) => Promise<void>;
export type SaveTextFn = (content: string, fileName: string) => Promise<void>;

// Module-level registry — OhMyCapa registers Tauri-specific handlers at startup.
// PLM never calls these, so they stay null and fall back to browser download.
let registeredSaveFn: SaveFileFn | null = null;
let registeredJsonSaveFn: SaveTextFn | null = null;

export function registerFileSaveHandler(fn: SaveFileFn): void {
  registeredSaveFn = fn;
}

export function registerJsonSaveHandler(fn: SaveTextFn): void {
  registeredJsonSaveFn = fn;
}

async function saveFile(wb: XLSX.WorkBook, fileName: string): Promise<void> {
  if (registeredSaveFn) {
    const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' }) as Uint8Array;
    await registeredSaveFn(buffer, fileName);
  } else {
    XLSX.writeFile(wb, fileName);
  }
}

export async function exportCapaCompareToExcelCompat(result: CapaCompareResult): Promise<void> {
  const wb = await buildCapaCompareWorkbook(result);
  const deviceAName = result.meta.deviceA.fileName;
  const deviceBName = result.meta.deviceB.fileName;
  await saveFile(wb, `CAPA_Compare_${deviceAName}_vs_${deviceBName}.xlsx`);
}

export async function exportSingleDeviceToExcelCompat(
  device: CompareFormat,
  side?: 'A' | 'B'
): Promise<void> {
  const wb = await buildSingleDeviceWorkbook(device);
  const { fileName } = device.meta;
  const sideTag = side ? `Device${side}_` : 'Device_';
  await saveFile(wb, `CAPA_${sideTag}${fileName}.xlsx`);
}

export async function exportCommonJsonCompat(
  data: CommonCapaJson,
  side?: 'A' | 'B'
): Promise<void> {
  const jsonText = serializeCommonCapaJson(data);
  const baseName = data.meta.deviceName || data.meta.fileName || 'Device';
  const safeBase = baseName.replace(/[^a-zA-Z0-9._-]+/g, '_');
  const sideTag = side ? `Device${side}_` : 'Device_';
  const fileName = `CAPA_${sideTag}${safeBase}.json`;

  if (registeredJsonSaveFn) {
    await registeredJsonSaveFn(jsonText, fileName);
    return;
  }

  const blob = new Blob([jsonText], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export function exportSessionSnapshot(
  deviceA: CommonCapaJson,
  deviceB: CommonCapaJson
): void {
  const safeA = (deviceA.meta.deviceName || deviceA.meta.fileName || 'DeviceA').replace(/[^a-zA-Z0-9._-]+/g, '_');
  const safeB = (deviceB.meta.deviceName || deviceB.meta.fileName || 'DeviceB').replace(/[^a-zA-Z0-9._-]+/g, '_');
  const payload = {
    formatVersion: 'ohmycapa-session-v1' as const,
    exportedAt: new Date().toISOString(),
    deviceA,
    deviceB,
  };
  const jsonText = JSON.stringify(payload, null, 2);
  const blob = new Blob([jsonText], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `CAPA_Session_${safeA}_vs_${safeB}.capa-session.json`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
