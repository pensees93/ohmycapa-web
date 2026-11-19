import React, { createContext, use, useState, useCallback, useEffect, startTransition, useMemo } from 'react';
import type { ReactNode } from 'react';
import {
  compareCapaFormats,
  detectInputFormat,
  normalizeMultipleCapa,
  parseCapaText,
  parseCommonCapaJson,
  validateCapaFileHeader,
  validateFileExtension,
} from '@ohmycapa/capa-core';
import type {
  CanonicalAsn1Tree,
  CapaCompareResult,
  CapaVendor,
  ComboDisplayOptions,
  CommonCapaJson,
  DeviceState,
  ParsedFile,
  RatType,
} from '@ohmycapa/capa-core';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface CapaCompareSessionSnapshot {
  formatVersion: 'ohmycapa-session-v1';
  exportedAt: string;
  deviceA: CommonCapaJson;
  deviceB: CommonCapaJson;
}

export function isCapaSessionSnapshot(value: unknown): value is CapaCompareSessionSnapshot {
  if (!value || typeof value !== 'object') return false;
  const obj = value as Record<string, unknown>;
  return (
    obj.formatVersion === 'ohmycapa-session-v1' &&
    typeof obj.deviceA === 'object' &&
    obj.deviceA !== null &&
    typeof obj.deviceB === 'object' &&
    obj.deviceB !== null
  );
}

interface CapaCompareContextType {
  deviceA: DeviceState;
  deviceB: DeviceState;
  compareResult: CapaCompareResult | null;
  activeRat: RatType;
  isComparing: boolean;
  comboOptions: ComboDisplayOptions;
  setActiveRat: (rat: RatType) => void;
  setComboOptions: React.Dispatch<React.SetStateAction<ComboDisplayOptions>>;
  addFiles: (side: 'a' | 'b', files: File[]) => Promise<void>;
  removeFile: (side: 'a' | 'b', fileName: string) => void;
  setDeviceName: (side: 'a' | 'b', name: string) => void;
  clearDevice: (side: 'a' | 'b') => void;
  clearAll: () => void;
  loadDevices: (deviceAJson: CommonCapaJson, deviceBJson: CommonCapaJson) => void;
  swapDevices: () => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const EMPTY_DEVICE: DeviceState = {
  files: [],
  normalized: null,
  deviceName: '',
  isProcessing: false,
};

function guessDeviceName(files: File[]): string {
  if (files.length === 0) return '';
  const name = files[0].name;
  return name
    .replace(/\.(txt|json)$/i, '')
    .replace(/_(eutra|nr|utra|eutra-nr|eutra_utra|eutra-nr_nr)[^_]*$/i, '')
    .trim();
}

function normalizeFiles(files: ParsedFile[], deviceName: string): DeviceState['normalized'] {
  const doneFiles = files.filter(f => f.status === 'done');
  if (doneFiles.length === 0) return null;

  try {
    const asts = doneFiles
      .map(f => f.ast)
      .filter((ast): ast is CanonicalAsn1Tree => ast !== null);

    if (asts.length > 0) {
      return normalizeMultipleCapa(asts, deviceName);
    }

    const commonJsons = doneFiles.map(f => f.commonJson).filter(Boolean);
    if (commonJsons.length > 0) {
      const latest = commonJsons[commonJsons.length - 1]!;
      return {
        ...latest,
        meta: {
          ...latest.meta,
          deviceName,
        },
      };
    }

    return null;
  } catch (e) {
    console.error('Normalization error:', e);
    return null;
  }
}

async function parseFile(file: File): Promise<ParsedFile> {
  try {
    console.log(`[CapaCompare] Validating ${file.name}...`);
    const extValid = validateFileExtension(file.name);
    if (!extValid.valid) {
      throw new Error(`Extension validation failed: ${extValid.error}`);
    }

    console.log(`[CapaCompare] Reading ${file.name} (${file.size} bytes)...`);
    const text = await file.text();

    const headerValid = validateCapaFileHeader(text);
    if (!headerValid.valid) {
      throw new Error(headerValid.error ?? 'Unknown file format.');
    }

    const detected = detectInputFormat(text);
    if (detected.format === 'COMMON_JSON') {
      const commonJson = parseCommonCapaJson(text);
      return {
        file,
        ast: null,
        commonJson,
        vendor: commonJson.meta.vendor,
        status: 'done',
      };
    }

    const ast = parseCapaText(text, file.name);
    if (ast.warnings.length > 0) {
      console.warn(`[CapaCompare] Warnings for ${file.name}:`, ast.warnings);
    }

    return {
      file,
      ast,
      commonJson: null,
      vendor: ast.vendor,
      status: 'done',
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`[CapaCompare] Failed to parse ${file.name}:`, error);
    const errorDetail = msg.includes('\n')
      ? msg
      : `${msg}\n\nFile: ${file.name}\nSize: ${file.size} bytes`;
    throw new Error(errorDetail);
  }
}

function getDeviceSetter(side: 'a' | 'b', setterA: any, setterB: any) {
  return side === 'a' ? setterA : setterB;
}

// ─── Context ─────────────────────────────────────────────────────────────────

const CapaCompareContext = createContext<CapaCompareContextType | undefined>(undefined);

export const CapaCompareProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [deviceA, setDeviceA] = useState<DeviceState>(EMPTY_DEVICE);
  const [deviceB, setDeviceB] = useState<DeviceState>(EMPTY_DEVICE);
  const [compareResult, setCompareResult] = useState<CapaCompareResult | null>(null);
  const [activeRat, setActiveRat] = useState<RatType>('nr');
  const [isComparing, setIsComparing] = useState(false);
  const [comboOptions, setComboOptions] = useState<ComboDisplayOptions>({
    showQam: true,
    showMimo: true,
  });

  const memoizedCompareResult = useMemo(() => {
    if (deviceA.normalized && deviceB.normalized) {
      return compareCapaFormats(deviceA.normalized, deviceB.normalized, comboOptions);
    }
    return null;
  }, [deviceA.normalized, deviceB.normalized, comboOptions]);

  useEffect(() => {
    if (memoizedCompareResult) {
      setIsComparing(true);
      startTransition(() => {
        setCompareResult(memoizedCompareResult);
        setActiveRat(prev => {
          if (memoizedCompareResult.ratResults[prev]) return prev;
          const rats: RatType[] = ['nr', 'eutra', 'eutra-nr', 'utra'];
          return rats.find(r => memoizedCompareResult.ratResults[r]) ?? prev;
        });
        setIsComparing(false);
      });
    } else {
      setCompareResult(null);
      setIsComparing(false);
    }
  }, [memoizedCompareResult]);

  const loadDevices = useCallback((deviceAJson: CommonCapaJson, deviceBJson: CommonCapaJson) => {
    const fileA = new File(
      [JSON.stringify(deviceAJson, null, 2)],
      deviceAJson.meta.fileName || `${deviceAJson.meta.deviceName || 'DeviceA'}.json`,
      { type: 'application/json' }
    );
    const fileB = new File(
      [JSON.stringify(deviceBJson, null, 2)],
      deviceBJson.meta.fileName || `${deviceBJson.meta.deviceName || 'DeviceB'}.json`,
      { type: 'application/json' }
    );
    setDeviceA({
      files: [{
        file: fileA,
        ast: null,
        commonJson: deviceAJson,
        vendor: deviceAJson.meta.vendor,
        status: 'done',
      }],
      normalized: deviceAJson,
      deviceName: deviceAJson.meta.deviceName || deviceAJson.meta.fileName || 'Device A',
      isProcessing: false,
    });
    setDeviceB({
      files: [{
        file: fileB,
        ast: null,
        commonJson: deviceBJson,
        vendor: deviceBJson.meta.vendor,
        status: 'done',
      }],
      normalized: deviceBJson,
      deviceName: deviceBJson.meta.deviceName || deviceBJson.meta.fileName || 'Device B',
      isProcessing: false,
    });
  }, []);

  const addFiles = useCallback(
    async (side: 'a' | 'b', newFiles: File[]) => {
      if (newFiles.length === 1 && newFiles[0].name.toLowerCase().endsWith('.json')) {
        try {
          const rawText = await newFiles[0].text();
          const parsedJson = JSON.parse(rawText) as unknown;
          if (isCapaSessionSnapshot(parsedJson)) {
            loadDevices(parsedJson.deviceA, parsedJson.deviceB);
            return;
          }
        } catch {
          // Fall through to standard file parsing
        }
      }

      const setter = side === 'a' ? setDeviceA : setDeviceB;

      setter(prev => ({
        ...prev,
        isProcessing: true,
        deviceName: prev.deviceName || guessDeviceName(newFiles),
        files: [
          ...prev.files,
          ...newFiles.map(f => ({
            file: f,
            ast: null,
            commonJson: null,
            vendor: 'UNKNOWN' as CapaVendor,
            status: 'parsing' as const,
          })),
        ],
      }));

      // Yield to browser paint loop so loading indicators render smoothly on large logs
      await new Promise<void>(r => setTimeout(r, 16));

      const parsed = await Promise.all(
        newFiles.map(f =>
          parseFile(f).catch(err => ({
            file: f,
            ast: null,
            commonJson: null,
            vendor: 'UNKNOWN' as CapaVendor,
            status: 'error' as const,
            error: String(err),
          }))
        )
      );

      setter(prev => {
        const parsedMap = new Map(parsed.map(p => [p.file, p]));
        const updatedFiles = prev.files.map(pf => parsedMap.get(pf.file) ?? pf);
        const normalized = normalizeFiles(updatedFiles, prev.deviceName);
        return { ...prev, files: updatedFiles, normalized, isProcessing: false };
      });
    },
    [loadDevices]
  );

  const removeFile = useCallback((side: 'a' | 'b', fileName: string) => {
    const setter = getDeviceSetter(side, setDeviceA, setDeviceB);
    setter((prev: DeviceState) => {
      const files = prev.files.filter((f: ParsedFile) => f.file.name !== fileName);
      const normalized = normalizeFiles(files, prev.deviceName);
      return { ...prev, files, normalized };
    });
  }, []);

  const setDeviceName = useCallback((side: 'a' | 'b', name: string) => {
    const setter = getDeviceSetter(side, setDeviceA, setDeviceB);
    setter((prev: DeviceState) => ({ ...prev, deviceName: name }));
  }, []);

  const clearDevice = useCallback((side: 'a' | 'b') => {
    const setter = getDeviceSetter(side, setDeviceA, setDeviceB);
    setter(EMPTY_DEVICE);
  }, []);

  const clearAll = useCallback(() => {
    setDeviceA(EMPTY_DEVICE);
    setDeviceB(EMPTY_DEVICE);
  }, []);

  const swapDevices = useCallback(() => {
    setDeviceA(deviceB);
    setDeviceB(deviceA);
  }, [deviceA, deviceB]);

  const value: CapaCompareContextType = {
    deviceA,
    deviceB,
    compareResult,
    activeRat,
    isComparing,
    comboOptions,
    setActiveRat,
    setComboOptions,
    addFiles,
    removeFile,
    setDeviceName,
    clearDevice,
    clearAll,
    loadDevices,
    swapDevices,
  };

  return (
    <CapaCompareContext.Provider value={value}>
      {children}
    </CapaCompareContext.Provider>
  );
};

export function useCapaCompare(): CapaCompareContextType {
  const ctx = use(CapaCompareContext);
  if (ctx === undefined) {
    throw new Error('useCapaCompare must be used within a CapaCompareProvider');
  }
  return ctx;
}
