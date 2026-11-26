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
  addFiles: (side: 'a' | 'b', files: File[]) => Promise<{ hasError: boolean }>;
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
    .replace(/\.(txt|log|json)$/i, '')
    .replace(/_(eutra|nr|utra|eutra-nr|eutra_utra|eutra-nr_nr)[^_]*$/i, '')
    .trim();
}

function normalizeFiles(files: ParsedFile[], deviceName: string): DeviceState['normalized'] {
  const doneFiles = files.filter(f => f.status === 'done');
  if (doneFiles.length === 0) return null;

  try {
    type CapaDoc = ReturnType<typeof normalizeMultipleCapa>;

    function mergeRatPair<
      B extends { displayName: string },
      C extends NonNullable<CapaDoc['rats']['nr']>['bandCombinations'][number],
      FS extends { index: number } = { index: number },
      R extends { bands: B[]; bandCombinations: C[]; featureSets?: FS[] } = { bands: B[]; bandCombinations: C[]; featureSets?: FS[] }
    >(base: R | undefined, inc: R | undefined): R | undefined {
      if (!base) return inc;
      if (!inc) return base;
      const bandMap = new Map<string, B>();
      for (const b of base.bands) bandMap.set(b.displayName, b);
      for (const b of inc.bands) bandMap.set(b.displayName, b);
      const comboMap = new Map<string, C>();
      for (const c of [...base.bandCombinations, ...inc.bandCombinations]) {
        const k = `${c.key ?? JSON.stringify(c.bands)}|${c.powerClass ?? ''}`;
        comboMap.set(k, c);
      }
      const merged: R = {
        ...base,
        ...inc,
        bands: Array.from(bandMap.values()),
        bandCombinations: Array.from(comboMap.values()),
      };
      if (base.featureSets || inc.featureSets) {
        const fsMap = new Map<number, FS>();
        for (const fs of base.featureSets ?? []) fsMap.set(fs.index, fs);
        for (const fs of inc.featureSets ?? []) fsMap.set(fs.index, fs);
        merged.featureSets = Array.from(fsMap.values());
      }
      return merged;
    }

    function mergeCommonCapaDocs(docs: CapaDoc[], targetName: string): CapaDoc {
      const first = docs[0]!;
      if (docs.length === 1) {
        return {
          ...first,
          meta: { ...first.meta, deviceName: targetName },
        };
      }
      let acc: CapaDoc = {
        ...first,
        meta: { ...first.meta, deviceName: targetName },
        rats: { ...first.rats },
        features: first.features ? { ...first.features } : undefined,
        diagnostics: {
          warnings: [...first.diagnostics.warnings],
          errors: [...first.diagnostics.errors],
          parsedLines: first.diagnostics.parsedLines,
          skippedLines: first.diagnostics.skippedLines,
        },
      };
      const ratKeys: RatType[] = ['nr', 'eutra', 'eutra-nr', 'utra'];
      const detectedSet = new Set<RatType>(first.meta.detectedRats);
      const sourceFileSet = new Set<string>(first.meta.sourceFiles ?? (first.meta.fileName ? [first.meta.fileName] : []));

      for (const inc of docs.slice(1)) {
        for (const r of inc.meta.detectedRats) detectedSet.add(r);
        for (const sf of inc.meta.sourceFiles ?? (inc.meta.fileName ? [inc.meta.fileName] : [])) {
          sourceFileSet.add(sf);
        }
        acc.meta = {
          ...acc.meta,
          deviceName: targetName,
          vendor: acc.meta.vendor !== 'UNKNOWN' ? acc.meta.vendor : inc.meta.vendor,
          sourceFiles: Array.from(sourceFileSet),
          detectedRats: Array.from(detectedSet),
          asRelease: (acc.meta.asRelease || inc.meta.asRelease)
            ? { ...acc.meta.asRelease, ...inc.meta.asRelease }
            : undefined,
          fileSize: (acc.meta.fileSize !== undefined || inc.meta.fileSize !== undefined)
            ? (acc.meta.fileSize ?? 0) + (inc.meta.fileSize ?? 0)
            : undefined,
          totalLines: (acc.meta.totalLines !== undefined || inc.meta.totalLines !== undefined)
            ? (acc.meta.totalLines ?? 0) + (inc.meta.totalLines ?? 0)
            : undefined,
        };
        acc.rats = {
          nr: mergeRatPair(acc.rats.nr, inc.rats.nr),
          eutra: mergeRatPair(acc.rats.eutra, inc.rats.eutra),
          'eutra-nr': mergeRatPair(acc.rats['eutra-nr'], inc.rats['eutra-nr']),
          utra: mergeRatPair(acc.rats.utra, inc.rats.utra),
        };
        if (inc.features) {
          const nextFeatures = { ...(acc.features ?? {}) };
          for (const rk of ratKeys) {
            const rfA = nextFeatures[rk];
            const rfB = inc.features[rk];
            if (!rfA && rfB) {
              nextFeatures[rk] = rfB;
            } else if (rfA && rfB) {
              const leafMap = new Map<string, (typeof rfA.leaves)[number]>();
              for (const l of rfA.leaves) leafMap.set(`${l.major}|${l.middle}|${l.leaf}`, l);
              for (const l of rfB.leaves) leafMap.set(`${l.major}|${l.middle}|${l.leaf}`, l);
              const unkMap = new Map<string, NonNullable<typeof rfA.unclassified>[number]>();
              for (const u of rfA.unclassified ?? []) unkMap.set(`${u.path}|${u.codeSnippet}`, u);
              for (const u of rfB.unclassified ?? []) unkMap.set(`${u.path}|${u.codeSnippet}`, u);
              const unclassified = Array.from(unkMap.values());
              nextFeatures[rk] = {
                leaves: Array.from(leafMap.values()),
                ...(unclassified.length > 0 ? { unclassified } : {}),
              };
            }
          }
          acc.features = nextFeatures;
        }
        acc.diagnostics = {
          warnings: [...acc.diagnostics.warnings, ...inc.diagnostics.warnings],
          errors: [...acc.diagnostics.errors, ...inc.diagnostics.errors],
          parsedLines: (acc.diagnostics.parsedLines !== undefined || inc.diagnostics.parsedLines !== undefined)
            ? (acc.diagnostics.parsedLines ?? 0) + (inc.diagnostics.parsedLines ?? 0)
            : undefined,
          skippedLines: (acc.diagnostics.skippedLines !== undefined || inc.diagnostics.skippedLines !== undefined)
            ? (acc.diagnostics.skippedLines ?? 0) + (inc.diagnostics.skippedLines ?? 0)
            : undefined,
        };
      }
      return acc;
    }

    const asts = doneFiles
      .map(f => f.ast)
      .filter((ast): ast is CanonicalAsn1Tree => ast !== null);

    const commonJsons = doneFiles
      .map(f => f.commonJson)
      .filter((cj): cj is NonNullable<typeof cj> => cj != null);

    const docs: CapaDoc[] = [
      ...(asts.length > 0 ? [normalizeMultipleCapa(asts, deviceName)] : []),
      ...commonJsons,
    ];
    if (docs.length > 0) {
      return mergeCommonCapaDocs(docs, deviceName);
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
          const hasData = (rat: RatType) =>
            Boolean(memoizedCompareResult.ratResults[rat]) ||
            (memoizedCompareResult.featuresDiff?.[rat]?.diffs.length ?? 0) > 0;
          if (hasData(prev)) return prev;
          const rats: RatType[] = ['nr', 'eutra', 'eutra-nr', 'utra'];
          return rats.find(hasData) ?? prev;
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
    async (side: 'a' | 'b', newFiles: File[]): Promise<{ hasError: boolean }> => {
      if (newFiles.length === 1 && newFiles[0].name.toLowerCase().endsWith('.json')) {
        try {
          const rawText = await newFiles[0].text();
          const parsedJson = JSON.parse(rawText) as unknown;
          if (isCapaSessionSnapshot(parsedJson)) {
            loadDevices(parsedJson.deviceA, parsedJson.deviceB);
            return { hasError: false };
          }
        } catch {
          // Fall through to standard file parsing
        }
      }

      const setter = side === 'a' ? setDeviceA : setDeviceB;
      const dedupedNewFiles = Array.from(new Map(newFiles.map(f => [f.name, f])).values());
      const incomingNames = new Set(dedupedNewFiles.map(f => f.name));

      setter(prev => ({
        ...prev,
        isProcessing: true,
        files: [
          ...prev.files.filter(f => !incomingNames.has(f.file.name)),
          ...dedupedNewFiles.map(f => ({
            file: f,
            ast: null,
            commonJson: null,
            vendor: 'UNKNOWN' as CapaVendor,
            status: 'parsing' as const,
          })),
        ],
      }));

      const parsed = await Promise.all(
        dedupedNewFiles.map(f =>
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
        const doneInputFiles = updatedFiles.filter(f => f.status === 'done').map(f => f.file);
        const deviceName = doneInputFiles.length > 0 ? (prev.deviceName || guessDeviceName(doneInputFiles)) : '';
        const normalized = normalizeFiles(updatedFiles, deviceName);
        return {
          ...prev,
          deviceName,
          files: updatedFiles,
          normalized,
          isProcessing: updatedFiles.some(f => f.status === 'parsing'),
        };
      });
      return { hasError: parsed.some(p => p.status === 'error') };
    },
    [loadDevices]
  );

  const removeFile = useCallback((side: 'a' | 'b', fileName: string) => {
    const setter = getDeviceSetter(side, setDeviceA, setDeviceB);
    setter((prev: DeviceState) => {
      const files = prev.files.filter((f: ParsedFile) => f.file.name !== fileName);
      const hasDone = files.some((f: ParsedFile) => f.status === 'done');
      const deviceName = hasDone ? prev.deviceName : '';
      const normalized = normalizeFiles(files, deviceName);
      return { ...prev, files, deviceName, normalized };
    });
  }, []);

  const setDeviceName = useCallback((side: 'a' | 'b', name: string) => {
    const setter = getDeviceSetter(side, setDeviceA, setDeviceB);
    setter((prev: DeviceState) => ({
      ...prev,
      deviceName: name,
      normalized: prev.normalized
        ? { ...prev.normalized, meta: { ...prev.normalized.meta, deviceName: name } }
        : prev.normalized,
    }));
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

export function useOptionalCapaCompare() {
  return use(CapaCompareContext);
}

export function useCapaCompare(): CapaCompareContextType {
  const ctx = useOptionalCapaCompare();
  if (ctx === undefined) {
    throw new Error('useCapaCompare must be used within a CapaCompareProvider');
  }
  return ctx;
}
