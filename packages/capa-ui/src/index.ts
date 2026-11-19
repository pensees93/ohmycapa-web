export { default as CapaComparePage } from './CapaComparePage';
export type { CapaComparePageProps } from './CapaComparePage';

export { FeaturesCompareView } from './components/FeaturesCompareView';
export type { FeaturesCompareViewProps } from './components/FeaturesCompareView';
export { SingleDeviceFeaturesView } from './components/FeaturesCompareView';
export type { SingleDeviceFeaturesViewProps } from './components/FeaturesCompareView';

export { BandCompareTable } from './components/BandCompareTable';
export { ComboCompareView } from './components/ComboCompareView';
export { SingleDeviceView } from './components/SingleDeviceView';
export { CapaCompareProvider, isCapaSessionSnapshot } from './contexts/CapaCompareContext';
export type { CapaCompareSessionSnapshot } from './contexts/CapaCompareContext';
export { useCapaCompare } from './hooks/useCapaCompare';
export { STATUS_COLOR, DEVICE_COLOR, COMBO_STATUS_META, BAND_STATUS_ROW_BG, BAND_STATUS_LABELS } from './constants/statusMeta';
export {
  registerFileSaveHandler,
  registerJsonSaveHandler,
  exportCommonJsonCompat,
  exportSessionSnapshot,
} from './utils/tauriExportUtils';
export type { SaveFileFn, SaveTextFn } from './utils/tauriExportUtils';
export { registerTauriAdapter } from './utils/tauriAdapter';
export type { ReadTextFileFn, OnDragDropFn } from './utils/tauriAdapter';
