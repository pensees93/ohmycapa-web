/**
 * UTRA (3G) Canonical Feature Specifications
 */

import type { FeatureSpec } from './specTypes';

export const UTRA_FEATURE_SPECS: FeatureSpec[] = [
  {
    "major": "General",
    "middle": "DRX",
    "leaf": "supportForTwoDRXSchemesInPCH",
    "path": "v7e0NonCriticalExtensions.interRATHandoverInfo-v7e0ext.ue-RadioAccessCapability.supportForTwoDRXSchemesInPCH",
    "pathAlternatives": [
      "v390NonCriticalExtensions.present.v3a0NonCriticalExtensions.laterNonCriticalExtensions.interRATHandoverInfo-r3-add-ext.v7e0NonCriticalExtensions.interRATHandoverInfo-v7e0ext.ue-RadioAccessCapability.supportForTwoDRXSchemesInPCH"
    ],
    "kind": "bool",
    "description": "Two DRX schemes in PCH (TS 25.304)"
  },
  {
    "major": "General",
    "middle": "GNSS",
    "leaf": "ganssSupportIndication",
    "path": "v390NonCriticalExtensions.present.v3a0NonCriticalExtensions.laterNonCriticalExtensions.v3g0NonCriticalExtensions.v4b0NonCriticalExtensions.v4d0NonCriticalExtensions.v590NonCriticalExtensions.v690NonCriticalExtensions.v6b0NonCriticalExtensions.v6e0NonCriticalExtensions.v770NonCriticalExtensions.interRATHandoverInfo-v770ext.ue-RadioAccessCapabilityInfo.ganssSupportIndication",
    "kind": "bool",
    "description": "GANSS (GNSS) support indication (TS 25.305, Rel-7)"
  },
  {
    "major": "General",
    "middle": "GNSS",
    "leaf": "mac-ehsSupport",
    "path": "v390NonCriticalExtensions.present.v3a0NonCriticalExtensions.laterNonCriticalExtensions.v3g0NonCriticalExtensions.v4b0NonCriticalExtensions.v4d0NonCriticalExtensions.v590NonCriticalExtensions.v690NonCriticalExtensions.v6b0NonCriticalExtensions.v6e0NonCriticalExtensions.v770NonCriticalExtensions.interRATHandoverInfo-v770ext.ue-RadioAccessCapabilityInfo.mac-ehsSupport",
    "kind": "bool",
    "description": "MAC-ehs support (TS 25.321, Rel-7)"
  },
  {
    "major": "General",
    "middle": "Location",
    "leaf": "networkAssistedGPS-Supported",
    "path": "ue-CapabilityContainer.ue-RadioAccessCapability.ue-positioning-Capability.networkAssistedGPS-Supported",
    "pathAlternatives": [
      "ue-CapabilityContainer.present.ue-RadioAccessCapability.ue-positioning-Capability.networkAssistedGPS-Supported"
    ],
    "kind": "enum",
    "description": "Network assisted GPS support (TS 25.305)"
  },
  {
    "major": "General",
    "middle": "Location",
    "leaf": "rx-tx-TimeDifferenceType2Capable",
    "path": "v390NonCriticalExtensions.present.interRATHandoverInfo-v390ext.ue-RadioAccessCapability-v380ext.ue-PositioningCapabilityExt-v380.rx-tx-TimeDifferenceType2Capable",
    "kind": "bool",
    "description": "RX-TX time difference type 2 capability (TS 25.305)"
  },
  {
    "major": "General",
    "middle": "Location",
    "leaf": "standaloneLocMethodsSupported",
    "path": "ue-CapabilityContainer.ue-RadioAccessCapability.ue-positioning-Capability.standaloneLocMethodsSupported",
    "pathAlternatives": [
      "ue-CapabilityContainer.present.ue-RadioAccessCapability.ue-positioning-Capability.standaloneLocMethodsSupported"
    ],
    "kind": "bool",
    "description": "Standalone location methods (TS 25.305)"
  },
  {
    "major": "General",
    "middle": "Location",
    "leaf": "supportForIPDL",
    "path": "ue-CapabilityContainer.ue-RadioAccessCapability.ue-positioning-Capability.supportForIPDL",
    "pathAlternatives": [
      "ue-CapabilityContainer.present.ue-RadioAccessCapability.ue-positioning-Capability.supportForIPDL"
    ],
    "kind": "bool",
    "description": "IPDL support (TS 25.305)"
  },
  {
    "major": "General",
    "middle": "Location",
    "leaf": "supportForUE-GPS-TimingOfCellFrames",
    "path": "ue-CapabilityContainer.ue-RadioAccessCapability.ue-positioning-Capability.supportForUE-GPS-TimingOfCellFrames",
    "pathAlternatives": [
      "ue-CapabilityContainer.present.ue-RadioAccessCapability.ue-positioning-Capability.supportForUE-GPS-TimingOfCellFrames"
    ],
    "kind": "bool",
    "description": "UE GPS timing of cell frames (TS 25.305)"
  },
  {
    "major": "General",
    "middle": "Location",
    "leaf": "ue-BasedOTDOA-Supported",
    "path": "ue-CapabilityContainer.ue-RadioAccessCapability.ue-positioning-Capability.ue-BasedOTDOA-Supported",
    "pathAlternatives": [
      "ue-CapabilityContainer.present.ue-RadioAccessCapability.ue-positioning-Capability.ue-BasedOTDOA-Supported"
    ],
    "kind": "bool",
    "description": "UE-based OTDOA support (TS 25.305)"
  },
  {
    "major": "General",
    "middle": "Location",
    "leaf": "validity-CellPCH-UraPCH",
    "path": "interRATHandoverInfo-v3a0ext.ue-RadioAccessCapability-v3a0ext.ue-PositioningCapabilityExt-v3a0.validity-CellPCH-UraPCH",
    "pathAlternatives": [
      "v390NonCriticalExtensions.present.v3a0NonCriticalExtensions.interRATHandoverInfo-v3a0ext.ue-RadioAccessCapability-v3a0ext.ue-PositioningCapabilityExt-v3a0.validity-CellPCH-UraPCH"
    ],
    "kind": "bool",
    "description": "Validity in Cell_PCH/Ura_PCH (TS 25.305)"
  },
  {
    "major": "General",
    "middle": "RAT",
    "leaf": "multiModeCapability",
    "path": "ue-CapabilityContainer.ue-RadioAccessCapability.ue-MultiModeRAT-Capability.multiModeCapability",
    "pathAlternatives": [
      "ue-CapabilityContainer.present.ue-RadioAccessCapability.ue-MultiModeRAT-Capability.multiModeCapability"
    ],
    "kind": "enum",
    "description": "Multi-mode capability (fdd/tdd, TS 25.306)"
  },
  {
    "major": "General",
    "middle": "RAT",
    "leaf": "supportOfGSM",
    "path": "ue-CapabilityContainer.ue-RadioAccessCapability.ue-MultiModeRAT-Capability.multiRAT-CapabilityList.supportOfGSM",
    "pathAlternatives": [
      "ue-CapabilityContainer.present.ue-RadioAccessCapability.ue-MultiModeRAT-Capability.multiRAT-CapabilityList.supportOfGSM"
    ],
    "kind": "bool",
    "description": "Support of GSM (TS 25.306)"
  },
  {
    "major": "General",
    "middle": "RAT",
    "leaf": "supportOfMulticarrier",
    "path": "ue-CapabilityContainer.ue-RadioAccessCapability.ue-MultiModeRAT-Capability.multiRAT-CapabilityList.supportOfMulticarrier",
    "pathAlternatives": [
      "ue-CapabilityContainer.present.ue-RadioAccessCapability.ue-MultiModeRAT-Capability.multiRAT-CapabilityList.supportOfMulticarrier"
    ],
    "kind": "bool",
    "description": "Support of multicarrier (TS 25.306)"
  },
  {
    "major": "General",
    "middle": "Release",
    "leaf": "accessStratumReleaseIndicator",
    "path": "interRATHandoverInfo-v4b0ext.accessStratumReleaseIndicator",
    "pathAlternatives": [
      "v390NonCriticalExtensions.present.v3a0NonCriticalExtensions.laterNonCriticalExtensions.v3g0NonCriticalExtensions.v4b0NonCriticalExtensions.interRATHandoverInfo-v4b0ext.accessStratumReleaseIndicator"
    ],
    "kind": "enum",
    "description": "UTRA Access Stratum release indicator (TS 25.306)"
  },
  {
    "major": "General",
    "middle": "Reselection",
    "leaf": "supportForPriorityReselectionInUTRAN",
    "path": "v880NonCriticalExtensions.interRATHandoverInfo-v880ext.ue-RadioAccessCapabilityInfo.supportForPriorityReselectionInUTRAN",
    "pathAlternatives": [
      "v390NonCriticalExtensions.present.v3a0NonCriticalExtensions.laterNonCriticalExtensions.v3g0NonCriticalExtensions.v4b0NonCriticalExtensions.v4d0NonCriticalExtensions.v590NonCriticalExtensions.v690NonCriticalExtensions.v6b0NonCriticalExtensions.v6e0NonCriticalExtensions.v770NonCriticalExtensions.v790nonCriticalExtensions.v860NonCriticalExtensions.v880NonCriticalExtensions.interRATHandoverInfo-v880ext.ue-RadioAccessCapabilityInfo.supportForPriorityReselectionInUTRAN"
    ],
    "kind": "bool",
    "description": "Priority reselection in UTRAN (TS 25.304)"
  },
  {
    "major": "General",
    "middle": "SIB",
    "leaf": "supportForSIB11bis",
    "path": "v390NonCriticalExtensions.present.v3a0NonCriticalExtensions.laterNonCriticalExtensions.v3g0NonCriticalExtensions.v4b0NonCriticalExtensions.v4d0NonCriticalExtensions.v590NonCriticalExtensions.v690NonCriticalExtensions.v6b0NonCriticalExtensions.interRATHandoverInfo-v6b0ext.supportForSIB11bis",
    "kind": "bool",
    "description": "SIB 11bis support (TS 25.331, Rel-6)"
  },
  {
    "major": "Meas/Mob",
    "middle": "CompressedMode-EUTRA",
    "leaf": "compressedMode",
    "path": "v390NonCriticalExtensions.present.v3a0NonCriticalExtensions.laterNonCriticalExtensions.v3g0NonCriticalExtensions.v4b0NonCriticalExtensions.v4d0NonCriticalExtensions.v590NonCriticalExtensions.v690NonCriticalExtensions.v6b0NonCriticalExtensions.v6e0NonCriticalExtensions.v770NonCriticalExtensions.v790nonCriticalExtensions.v860NonCriticalExtensions.interRATHandoverInfo-v860ext.ue-RadioAccessCapabilityInfo.ue-RadioAccessCapabBandFDDList3.measurementCapability3.compressedModeMeasCapabEUTRAList.compressedMode",
    "kind": "bool",
    "description": "Compressed mode for EUTRA measurements (TS 25.306, Rel-8)"
  },
  {
    "major": "Meas/Mob",
    "middle": "CompressedMode-EUTRA",
    "leaf": "radioFrequencyBandEUTRA",
    "path": "v390NonCriticalExtensions.present.v3a0NonCriticalExtensions.laterNonCriticalExtensions.v3g0NonCriticalExtensions.v4b0NonCriticalExtensions.v4d0NonCriticalExtensions.v590NonCriticalExtensions.v690NonCriticalExtensions.v6b0NonCriticalExtensions.v6e0NonCriticalExtensions.v770NonCriticalExtensions.v790nonCriticalExtensions.v860NonCriticalExtensions.interRATHandoverInfo-v860ext.ue-RadioAccessCapabilityInfo.ue-RadioAccessCapabBandFDDList3.measurementCapability3.compressedModeMeasCapabEUTRAList",
    "pathAlternatives": [
      "v390NonCriticalExtensions.present.v3a0NonCriticalExtensions.laterNonCriticalExtensions.v3g0NonCriticalExtensions.v4b0NonCriticalExtensions.v4d0NonCriticalExtensions.v590NonCriticalExtensions.v690NonCriticalExtensions.v6b0NonCriticalExtensions.v6e0NonCriticalExtensions.v770NonCriticalExtensions.v790nonCriticalExtensions.v860NonCriticalExtensions.interRATHandoverInfo-v860ext.ue-RadioAccessCapabilityInfo.ue-RadioAccessCapabBandFDDList3.measurementCapability3.compressedModeMeasCapabEUTRAList.radioFrequencyBandEUTRA",
      "v390NonCriticalExtensions.present.v3a0NonCriticalExtensions.laterNonCriticalExtensions.v3g0NonCriticalExtensions.v4b0NonCriticalExtensions.v4d0NonCriticalExtensions.v590NonCriticalExtensions.v690NonCriticalExtensions.v6b0NonCriticalExtensions.v6e0NonCriticalExtensions.v770NonCriticalExtensions.v790nonCriticalExtensions.v860NonCriticalExtensions.v880NonCriticalExtensions.v920NonCriticalExtensions.v8b0NonCriticalExtensions.v950NonCriticalExtensions.va40NonCriticalExtensions.va80NonCriticalExtensions.vb50NonCriticalExtensions.interRATHandoverInfo-vb50ext.ue-RadioAccessCapabilityInfo-vb50ext.ue-RadioAccessCapabBandFDDList6.measurementCapability5.compressedModeMeasCapabEUTRAList",
      "v390NonCriticalExtensions.present.v3a0NonCriticalExtensions.laterNonCriticalExtensions.v3g0NonCriticalExtensions.v4b0NonCriticalExtensions.v4d0NonCriticalExtensions.v590NonCriticalExtensions.v690NonCriticalExtensions.v6b0NonCriticalExtensions.v6e0NonCriticalExtensions.v770NonCriticalExtensions.v790nonCriticalExtensions.v860NonCriticalExtensions.v880NonCriticalExtensions.v920NonCriticalExtensions.v8b0NonCriticalExtensions.v950NonCriticalExtensions.va40NonCriticalExtensions.va80NonCriticalExtensions.vb50NonCriticalExtensions.interRATHandoverInfo-vb50ext.ue-RadioAccessCapabilityInfo-vb50ext.ue-RadioAccessCapabBandFDDList6.measurementCapability5.compressedModeMeasCapabEUTRAList.radioFrequencyBandEUTRA"
    ],
    "kind": "numberList",
    "description": "Radio frequency band EUTRA extension (TS 25.101)"
  },
  {
    "major": "Meas/Mob",
    "middle": "CompressedMode-FDD",
    "leaf": "dl-MeasurementsFDD",
    "path": "ue-CapabilityContainer.ue-RadioAccessCapability-v370ext.ue-RadioAccessCapabBandFDDList.measurementCapability.compressedModeMeasCapabFDDList.dl-MeasurementsFDD",
    "pathAlternatives": [
      "v390NonCriticalExtensions.present.v3a0NonCriticalExtensions.laterNonCriticalExtensions.interRATHandoverInfo-r3-add-ext.interRATHandoverInfo-v690ext1.ue-RadioAccessCapability-v650ext.ue-RadioAccessCapabBandFDDList2.measurementCapability2.compressedModeMeasCapabFDDList.dl-MeasurementsFDD",
      "v390NonCriticalExtensions.present.v3a0NonCriticalExtensions.laterNonCriticalExtensions.interRATHandoverInfo-r3-add-ext.interRATHandoverInfo-v690ext1.ue-RadioAccessCapability-v650ext.ue-RadioAccessCapabBandFDDList-ext.compressedModeMeasCapabFDDList-ext.dl-MeasurementsFDD"
    ],
    "kind": "bool",
    "description": "DL measurements in compressed mode FDD (TS 25.306)"
  },
  {
    "major": "Meas/Mob",
    "middle": "CompressedMode-FDD",
    "leaf": "radioFrequencyBandFDD",
    "path": "ue-CapabilityContainer.ue-RadioAccessCapability-v370ext.ue-RadioAccessCapabBandFDDList.measurementCapability.compressedModeMeasCapabFDDList",
    "pathAlternatives": [
      "ue-CapabilityContainer.ue-RadioAccessCapability-v370ext.ue-RadioAccessCapabBandFDDList.measurementCapability.compressedModeMeasCapabFDDList.radioFrequencyBandFDD",
      "v390NonCriticalExtensions.present.v3a0NonCriticalExtensions.laterNonCriticalExtensions.interRATHandoverInfo-r3-add-ext.interRATHandoverInfo-v690ext1.ue-RadioAccessCapability-v650ext.ue-RadioAccessCapabBandFDDList2.measurementCapability2.compressedModeMeasCapabFDDList",
      "v390NonCriticalExtensions.present.v3a0NonCriticalExtensions.laterNonCriticalExtensions.interRATHandoverInfo-r3-add-ext.interRATHandoverInfo-v690ext1.ue-RadioAccessCapability-v650ext.ue-RadioAccessCapabBandFDDList2.measurementCapability2.compressedModeMeasCapabFDDList.radioFrequencyBandFDD",
      "v390NonCriticalExtensions.present.v3a0NonCriticalExtensions.laterNonCriticalExtensions.interRATHandoverInfo-r3-add-ext.interRATHandoverInfo-v690ext1.ue-RadioAccessCapability-v650ext.ue-RadioAccessCapabBandFDDList-ext.compressedModeMeasCapabFDDList-ext"
    ],
    "kind": "stringList",
    "description": "Radio frequency band for FDD measurements (TS 25.306)"
  },
  {
    "major": "Meas/Mob",
    "middle": "CompressedMode-FDD",
    "leaf": "radioFrequencyBandFDD2",
    "path": "v390NonCriticalExtensions.present.v3a0NonCriticalExtensions.laterNonCriticalExtensions.interRATHandoverInfo-r3-add-ext.interRATHandoverInfo-v690ext1.ue-RadioAccessCapability-v650ext.ue-RadioAccessCapabBandFDDList-ext.compressedModeMeasCapabFDDList-ext",
    "pathAlternatives": [
      "v390NonCriticalExtensions.present.v3a0NonCriticalExtensions.laterNonCriticalExtensions.interRATHandoverInfo-r3-add-ext.interRATHandoverInfo-v690ext1.ue-RadioAccessCapability-v650ext.ue-RadioAccessCapabBandFDDList-ext.compressedModeMeasCapabFDDList-ext.radioFrequencyBandFDD2",
      "v390NonCriticalExtensions.present.v3a0NonCriticalExtensions.laterNonCriticalExtensions.interRATHandoverInfo-r3-add-ext.interRATHandoverInfo-v690ext1.ue-RadioAccessCapability-v650ext.ue-RadioAccessCapabBandFDDList2.measurementCapability2.compressedModeMeasCapabFDDList2",
      "v390NonCriticalExtensions.present.v3a0NonCriticalExtensions.laterNonCriticalExtensions.interRATHandoverInfo-r3-add-ext.interRATHandoverInfo-v690ext1.ue-RadioAccessCapability-v650ext.ue-RadioAccessCapabBandFDDList2.measurementCapability2.compressedModeMeasCapabFDDList.radioFrequencyBandFDD2"
    ],
    "kind": "stringList",
    "description": "Radio frequency band FDD2 for measurements (TS 25.306)"
  },
  {
    "major": "Meas/Mob",
    "middle": "CompressedMode-FDD",
    "leaf": "ul-MeasurementsFDD",
    "path": "ue-CapabilityContainer.ue-RadioAccessCapability-v370ext.ue-RadioAccessCapabBandFDDList.measurementCapability.compressedModeMeasCapabFDDList.ul-MeasurementsFDD",
    "pathAlternatives": [
      "v390NonCriticalExtensions.present.v3a0NonCriticalExtensions.laterNonCriticalExtensions.interRATHandoverInfo-r3-add-ext.interRATHandoverInfo-v690ext1.ue-RadioAccessCapability-v650ext.ue-RadioAccessCapabBandFDDList2.measurementCapability2.compressedModeMeasCapabFDDList.ul-MeasurementsFDD",
      "v390NonCriticalExtensions.present.v3a0NonCriticalExtensions.laterNonCriticalExtensions.interRATHandoverInfo-r3-add-ext.interRATHandoverInfo-v690ext1.ue-RadioAccessCapability-v650ext.ue-RadioAccessCapabBandFDDList-ext.compressedModeMeasCapabFDDList-ext.ul-MeasurementsFDD"
    ],
    "kind": "bool",
    "description": "UL measurements in compressed mode FDD (TS 25.306)"
  },
  {
    "major": "Meas/Mob",
    "middle": "CompressedMode-GSM",
    "leaf": "dl-MeasurementsGSM",
    "path": "ue-CapabilityContainer.ue-RadioAccessCapability-v370ext.ue-RadioAccessCapabBandFDDList.measurementCapability.compressedModeMeasCapabGSMList.dl-MeasurementsGSM",
    "pathAlternatives": [
      "v390NonCriticalExtensions.present.v3a0NonCriticalExtensions.laterNonCriticalExtensions.interRATHandoverInfo-r3-add-ext.interRATHandoverInfo-v690ext1.ue-RadioAccessCapability-v650ext.ue-RadioAccessCapabBandFDDList2.measurementCapability2.compressedModeMeasCapabGSMList.dl-MeasurementsGSM"
    ],
    "kind": "bool",
    "description": "DL measurements in compressed mode GSM (TS 25.306)"
  },
  {
    "major": "Meas/Mob",
    "middle": "CompressedMode-GSM",
    "leaf": "radioFrequencyBandGSM",
    "path": "ue-CapabilityContainer.ue-RadioAccessCapability-v370ext.ue-RadioAccessCapabBandFDDList.measurementCapability.compressedModeMeasCapabGSMList",
    "pathAlternatives": [
      "ue-CapabilityContainer.ue-RadioAccessCapability-v370ext.ue-RadioAccessCapabBandFDDList.measurementCapability.compressedModeMeasCapabGSMList.radioFrequencyBandGSM",
      "v390NonCriticalExtensions.present.v3a0NonCriticalExtensions.laterNonCriticalExtensions.interRATHandoverInfo-r3-add-ext.interRATHandoverInfo-v690ext1.ue-RadioAccessCapability-v650ext.ue-RadioAccessCapabBandFDDList2.measurementCapability2.compressedModeMeasCapabGSMList",
      "v390NonCriticalExtensions.present.v3a0NonCriticalExtensions.laterNonCriticalExtensions.interRATHandoverInfo-r3-add-ext.interRATHandoverInfo-v690ext1.ue-RadioAccessCapability-v650ext.ue-RadioAccessCapabBandFDDList2.measurementCapability2.compressedModeMeasCapabGSMList.radioFrequencyBandGSM"
    ],
    "kind": "stringList",
    "description": "Radio frequency band for GSM measurements (TS 25.306)"
  },
  {
    "major": "Meas/Mob",
    "middle": "CompressedMode-GSM",
    "leaf": "ul-MeasurementsGSM",
    "path": "ue-CapabilityContainer.ue-RadioAccessCapability-v370ext.ue-RadioAccessCapabBandFDDList.measurementCapability.compressedModeMeasCapabGSMList.ul-MeasurementsGSM",
    "pathAlternatives": [
      "v390NonCriticalExtensions.present.v3a0NonCriticalExtensions.laterNonCriticalExtensions.interRATHandoverInfo-r3-add-ext.interRATHandoverInfo-v690ext1.ue-RadioAccessCapability-v650ext.ue-RadioAccessCapabBandFDDList2.measurementCapability2.compressedModeMeasCapabGSMList.ul-MeasurementsGSM"
    ],
    "kind": "bool",
    "description": "UL measurements in compressed mode GSM (TS 25.306)"
  },
  {
    "major": "PDCP",
    "middle": "Capability",
    "leaf": "losslessSRNS-RelocationSupport",
    "path": "ue-CapabilityContainer.ue-RadioAccessCapability.pdcp-Capability.losslessSRNS-RelocationSupport",
    "pathAlternatives": [
      "ue-CapabilityContainer.present.ue-RadioAccessCapability.pdcp-Capability.losslessSRNS-RelocationSupport"
    ],
    "kind": "bool",
    "description": "Lossless SRNS relocation support (TS 25.323 §5)"
  },
  {
    "major": "PHY",
    "middle": "Band",
    "leaf": "radioFrequencyBandFDD",
    "path": "ue-CapabilityContainer.ue-RadioAccessCapability-v370ext.ue-RadioAccessCapabBandFDDList",
    "pathAlternatives": [
      "v390NonCriticalExtensions.present.v3a0NonCriticalExtensions.laterNonCriticalExtensions.interRATHandoverInfo-r3-add-ext.interRATHandoverInfo-v690ext1.ue-RadioAccessCapability-v650ext.ue-RadioAccessCapabBandFDDList2",
      "v390NonCriticalExtensions.present.v3a0NonCriticalExtensions.laterNonCriticalExtensions.interRATHandoverInfo-r3-add-ext.interRATHandoverInfo-v690ext1.ue-RadioAccessCapability-v650ext.ue-RadioAccessCapabBandFDDList-ext.radioFrequencyBandFDD",
      "v390NonCriticalExtensions.present.v3a0NonCriticalExtensions.laterNonCriticalExtensions.v3g0NonCriticalExtensions.v4b0NonCriticalExtensions.v4d0NonCriticalExtensions.v590NonCriticalExtensions.v690NonCriticalExtensions.v6b0NonCriticalExtensions.v6e0NonCriticalExtensions.v770NonCriticalExtensions.v790nonCriticalExtensions.v860NonCriticalExtensions.interRATHandoverInfo-v860ext.ue-RadioAccessCapabilityInfo.ue-RadioAccessCapabBandFDDList3",
      "v390NonCriticalExtensions.present.v3a0NonCriticalExtensions.laterNonCriticalExtensions.v3g0NonCriticalExtensions.v4b0NonCriticalExtensions.v4d0NonCriticalExtensions.v590NonCriticalExtensions.v690NonCriticalExtensions.v6b0NonCriticalExtensions.v6e0NonCriticalExtensions.v770NonCriticalExtensions.v790nonCriticalExtensions.v860NonCriticalExtensions.interRATHandoverInfo-v860ext.ue-RadioAccessCapabilityInfo.ue-RadioAccessCapabBandFDDList3.radioFrequencyBandFDD",
      "v390NonCriticalExtensions.present.v3a0NonCriticalExtensions.laterNonCriticalExtensions.v3g0NonCriticalExtensions.v4b0NonCriticalExtensions.v4d0NonCriticalExtensions.v590NonCriticalExtensions.v690NonCriticalExtensions.v6b0NonCriticalExtensions.v6e0NonCriticalExtensions.v770NonCriticalExtensions.v790nonCriticalExtensions.v860NonCriticalExtensions.v880NonCriticalExtensions.v920NonCriticalExtensions.v8b0NonCriticalExtensions.v950NonCriticalExtensions.va40NonCriticalExtensions.va80NonCriticalExtensions.vb50NonCriticalExtensions.interRATHandoverInfo-vb50ext.ue-RadioAccessCapabilityInfo-vb50ext.ue-RadioAccessCapabBandFDDList6",
      "v390NonCriticalExtensions.present.v3a0NonCriticalExtensions.laterNonCriticalExtensions.v3g0NonCriticalExtensions.v4b0NonCriticalExtensions.v4d0NonCriticalExtensions.v590NonCriticalExtensions.v690NonCriticalExtensions.v6b0NonCriticalExtensions.v6e0NonCriticalExtensions.v770NonCriticalExtensions.v790nonCriticalExtensions.v860NonCriticalExtensions.v880NonCriticalExtensions.v920NonCriticalExtensions.v8b0NonCriticalExtensions.v950NonCriticalExtensions.va40NonCriticalExtensions.va80NonCriticalExtensions.vb50NonCriticalExtensions.interRATHandoverInfo-vb50ext.ue-RadioAccessCapabilityInfo-vb50ext.ue-RadioAccessCapabBandFDDList6.radioFrequencyBandFDD"
    ],
    "kind": "stringList",
    "description": "Radio frequency band FDD (TS 25.101)"
  },
  {
    "major": "PHY",
    "middle": "Band",
    "leaf": "radioFrequencyBandFDD2",
    "path": "v390NonCriticalExtensions.present.v3a0NonCriticalExtensions.laterNonCriticalExtensions.interRATHandoverInfo-r3-add-ext.interRATHandoverInfo-v690ext1.ue-RadioAccessCapability-v650ext.ue-RadioAccessCapabBandFDDList2",
    "pathAlternatives": [
      "v390NonCriticalExtensions.present.v3a0NonCriticalExtensions.laterNonCriticalExtensions.interRATHandoverInfo-r3-add-ext.interRATHandoverInfo-v690ext1.ue-RadioAccessCapability-v650ext.ue-RadioAccessCapabBandFDDList2.radioFrequencyBandFDD2",
      "v390NonCriticalExtensions.present.v3a0NonCriticalExtensions.laterNonCriticalExtensions.v3g0NonCriticalExtensions.v4b0NonCriticalExtensions.v4d0NonCriticalExtensions.v590NonCriticalExtensions.v690NonCriticalExtensions.v6b0NonCriticalExtensions.v6e0NonCriticalExtensions.v770NonCriticalExtensions.v790nonCriticalExtensions.v860NonCriticalExtensions.interRATHandoverInfo-v860ext.ue-RadioAccessCapabilityInfo.ue-RadioAccessCapabBandFDDList3.radioFrequencyBandFDD2",
      "v390NonCriticalExtensions.present.v3a0NonCriticalExtensions.laterNonCriticalExtensions.v3g0NonCriticalExtensions.v4b0NonCriticalExtensions.v4d0NonCriticalExtensions.v590NonCriticalExtensions.v690NonCriticalExtensions.v6b0NonCriticalExtensions.v6e0NonCriticalExtensions.v770NonCriticalExtensions.v790nonCriticalExtensions.v860NonCriticalExtensions.v880NonCriticalExtensions.v920NonCriticalExtensions.v8b0NonCriticalExtensions.v950NonCriticalExtensions.va40NonCriticalExtensions.va80NonCriticalExtensions.vb50NonCriticalExtensions.interRATHandoverInfo-vb50ext.ue-RadioAccessCapabilityInfo-vb50ext.ue-RadioAccessCapabBandFDDList6.radioFrequencyBandFDD2"
    ],
    "kind": "stringList",
    "description": "Radio frequency band FDD extension (TS 25.101)"
  },
  {
    "major": "PHY",
    "middle": "Band",
    "leaf": "txRxFrequencySeparation",
    "path": "ue-CapabilityContainer.ue-RadioAccessCapability-v370ext.ue-RadioAccessCapabBandFDDList.fddRF-Capability.txRxFrequencySeparation",
    "pathAlternatives": [
      "v390NonCriticalExtensions.present.v3a0NonCriticalExtensions.laterNonCriticalExtensions.interRATHandoverInfo-r3-add-ext.interRATHandoverInfo-v690ext1.ue-RadioAccessCapability-v650ext.ue-RadioAccessCapabBandFDDList2.fddRF-Capability.txRxFrequencySeparation"
    ],
    "kind": "enum",
    "description": "TX/RX frequency separation (TS 25.101)"
  },
  {
    "major": "PHY",
    "middle": "Band",
    "leaf": "ue-PowerClass",
    "path": "ue-CapabilityContainer.ue-RadioAccessCapability-v370ext.ue-RadioAccessCapabBandFDDList.fddRF-Capability.ue-PowerClass",
    "pathAlternatives": [
      "v390NonCriticalExtensions.present.v3a0NonCriticalExtensions.laterNonCriticalExtensions.interRATHandoverInfo-r3-add-ext.interRATHandoverInfo-v690ext1.ue-RadioAccessCapability-v650ext.ue-RadioAccessCapabBandFDDList2.fddRF-Capability.ue-PowerClass"
    ],
    "kind": "enum",
    "description": "UE power class (TS 25.101)"
  },
  {
    "major": "PHY",
    "middle": "DL",
    "leaf": "dummy-DL",
    "path": "ue-CapabilityContainer.ue-RadioAccessCapability.physicalChannelCapability.fddPhysChCapability.downlinkPhysChCapability.dummy",
    "kind": "bool",
    "description": "DL physical channel dummy placeholder (TS 25.211)"
  },
  {
    "major": "PHY",
    "middle": "DL",
    "leaf": "maxConvCodeBitsReceived",
    "path": "ue-CapabilityContainer.ue-RadioAccessCapability.transportChannelCapability.dl-TransChCapability.maxConvCodeBitsReceived",
    "pathAlternatives": [
      "ue-CapabilityContainer.present.ue-RadioAccessCapability.transportChannelCapability.dl-TransChCapability.maxConvCodeBitsReceived"
    ],
    "kind": "enum",
    "description": "Max convolutional coded bits received (TS 25.212)"
  },
  {
    "major": "PHY",
    "middle": "DL",
    "leaf": "maxNoBitsReceived",
    "path": "ue-CapabilityContainer.ue-RadioAccessCapability.transportChannelCapability.dl-TransChCapability.maxNoBitsReceived",
    "pathAlternatives": [
      "ue-CapabilityContainer.present.ue-RadioAccessCapability.transportChannelCapability.dl-TransChCapability.maxNoBitsReceived"
    ],
    "kind": "enum",
    "description": "Max bits received per TTI (TS 25.211)"
  },
  {
    "major": "PHY",
    "middle": "DL",
    "leaf": "maxNoDPCH-PDSCH-Codes",
    "path": "ue-CapabilityContainer.ue-RadioAccessCapability.physicalChannelCapability.fddPhysChCapability.downlinkPhysChCapability.maxNoDPCH-PDSCH-Codes",
    "pathAlternatives": [
      "ue-CapabilityContainer.present.ue-RadioAccessCapability.physicalChannelCapability.fddPhysChCapability.downlinkPhysChCapability.maxNoDPCH-PDSCH-Codes"
    ],
    "kind": "number",
    "description": "Max DPCH/PDSCH codes (TS 25.211)"
  },
  {
    "major": "PHY",
    "middle": "DL",
    "leaf": "maxNoPhysChBitsReceived",
    "path": "ue-CapabilityContainer.ue-RadioAccessCapability.physicalChannelCapability.fddPhysChCapability.downlinkPhysChCapability.maxNoPhysChBitsReceived",
    "pathAlternatives": [
      "ue-CapabilityContainer.present.ue-RadioAccessCapability.physicalChannelCapability.fddPhysChCapability.downlinkPhysChCapability.maxNoPhysChBitsReceived"
    ],
    "kind": "enum",
    "description": "Max physical channel bits received (TS 25.211)"
  },
  {
    "major": "PHY",
    "middle": "DL",
    "leaf": "maxNumberOfTF-DL",
    "path": "ue-CapabilityContainer.ue-RadioAccessCapability.transportChannelCapability.dl-TransChCapability.maxNumberOfTF",
    "pathAlternatives": [
      "ue-CapabilityContainer.present.ue-RadioAccessCapability.transportChannelCapability.dl-TransChCapability.maxNumberOfTF",
      "transportChannelCapability.dl-TransChCapability.maxNumberOfTF"
    ],
    "kind": "enum",
    "description": "Max number of TF DL (TS 25.211)"
  },
  {
    "major": "PHY",
    "middle": "DL",
    "leaf": "maxNumberOfTFC-DL",
    "path": "ue-CapabilityContainer.ue-RadioAccessCapability.transportChannelCapability.dl-TransChCapability.maxNumberOfTFC",
    "pathAlternatives": [
      "ue-CapabilityContainer.present.ue-RadioAccessCapability.transportChannelCapability.dl-TransChCapability.maxNumberOfTFC",
      "transportChannelCapability.dl-TransChCapability.maxNumberOfTFC"
    ],
    "kind": "enum",
    "description": "Max number of TFC DL (TS 25.211)"
  },
  {
    "major": "PHY",
    "middle": "DL",
    "leaf": "maxReceivedTransportBlocks",
    "path": "ue-CapabilityContainer.ue-RadioAccessCapability.transportChannelCapability.dl-TransChCapability.maxReceivedTransportBlocks",
    "pathAlternatives": [
      "ue-CapabilityContainer.present.ue-RadioAccessCapability.transportChannelCapability.dl-TransChCapability.maxReceivedTransportBlocks"
    ],
    "kind": "enum",
    "description": "Max received transport blocks (TS 25.211)"
  },
  {
    "major": "PHY",
    "middle": "DL",
    "leaf": "maxSimultaneousCCTrCH-Count",
    "path": "ue-CapabilityContainer.ue-RadioAccessCapability.transportChannelCapability.dl-TransChCapability.maxSimultaneousCCTrCH-Count",
    "pathAlternatives": [
      "ue-CapabilityContainer.present.ue-RadioAccessCapability.transportChannelCapability.dl-TransChCapability.maxSimultaneousCCTrCH-Count"
    ],
    "kind": "number",
    "description": "Max simultaneous CCTrCH count (TS 25.211)"
  },
  {
    "major": "PHY",
    "middle": "DL",
    "leaf": "maxSimultaneousTransChs-DL",
    "path": "ue-CapabilityContainer.ue-RadioAccessCapability.transportChannelCapability.dl-TransChCapability.maxSimultaneousTransChs",
    "pathAlternatives": [
      "ue-CapabilityContainer.present.ue-RadioAccessCapability.transportChannelCapability.dl-TransChCapability.maxSimultaneousTransChs",
      "transportChannelCapability.dl-TransChCapability.maxSimultaneousTransChs"
    ],
    "kind": "enum",
    "description": "Max simultaneous transport channels DL (TS 25.211)"
  },
  {
    "major": "PHY",
    "middle": "DL",
    "leaf": "supportForFDPCH",
    "path": "v390NonCriticalExtensions.present.v3a0NonCriticalExtensions.laterNonCriticalExtensions.v3g0NonCriticalExtensions.v4b0NonCriticalExtensions.v4d0NonCriticalExtensions.v590NonCriticalExtensions.v690NonCriticalExtensions.v6b0NonCriticalExtensions.v6e0NonCriticalExtensions.interRATHandoverInfo-v6e0ext.supportForFDPCH",
    "kind": "bool",
    "description": "F-DPCH (Fractional DPCH) support (TS 25.211, Rel-6)"
  },
  {
    "major": "PHY",
    "middle": "DL",
    "leaf": "supportForSF-512",
    "path": "ue-CapabilityContainer.ue-RadioAccessCapability.physicalChannelCapability.fddPhysChCapability.downlinkPhysChCapability.supportForSF-512",
    "pathAlternatives": [
      "ue-CapabilityContainer.present.ue-RadioAccessCapability.physicalChannelCapability.fddPhysChCapability.downlinkPhysChCapability.supportForSF-512"
    ],
    "kind": "bool",
    "description": "Support for SF 512 (TS 25.211)"
  },
  {
    "major": "PHY",
    "middle": "DL",
    "leaf": "turboDecodingSupport",
    "path": "ue-CapabilityContainer.ue-RadioAccessCapability.transportChannelCapability.dl-TransChCapability.turboDecodingSupport.supported",
    "pathAlternatives": [
      "ue-CapabilityContainer.present.ue-RadioAccessCapability.transportChannelCapability.dl-TransChCapability.turboDecodingSupport"
    ],
    "kind": "enum",
    "description": "Turbo decoding support (TS 25.212)"
  },
  {
    "major": "PHY",
    "middle": "HSDPA",
    "leaf": "hsdsch-physical-layer-category-ext",
    "path": "ue-CapabilityContainer.ue-RadioAccessCapabilityComp2.hsdsch-physical-layer-category-ext",
    "pathAlternatives": [
      "ue-RadioAccessCapabilityComp2.hsdsch-physical-layer-category-ext",
      "v390NonCriticalExtensions.present.v3a0NonCriticalExtensions.laterNonCriticalExtensions.v3g0NonCriticalExtensions.v4b0NonCriticalExtensions.v4d0NonCriticalExtensions.v590NonCriticalExtensions.v690NonCriticalExtensions.v6b0NonCriticalExtensions.v6e0NonCriticalExtensions.v770NonCriticalExtensions.interRATHandoverInfo-v770ext.ue-RadioAccessCapabilityComp2.hsdsch-physical-layer-category-ext"
    ],
    "kind": "number",
    "description": "HS-DSCH physical layer category extension (TS 25.306)"
  },
  {
    "major": "PHY",
    "middle": "HSDPA",
    "leaf": "hsdsch-physical-layer-category-ext2",
    "path": "v390NonCriticalExtensions.present.v3a0NonCriticalExtensions.laterNonCriticalExtensions.v3g0NonCriticalExtensions.v4b0NonCriticalExtensions.v4d0NonCriticalExtensions.v590NonCriticalExtensions.v690NonCriticalExtensions.v6b0NonCriticalExtensions.v6e0NonCriticalExtensions.v770NonCriticalExtensions.v790nonCriticalExtensions.v860NonCriticalExtensions.interRATHandoverInfo-v860ext.ue-RadioAccessCapabilityComp2.hsdsch-physical-layer-category-ext2",
    "kind": "number",
    "description": "HS-DSCH physical layer category extension 2 (TS 25.306, Rel-8)"
  },
  {
    "major": "PHY",
    "middle": "HSPA",
    "leaf": "discontinuousDpcchTransmission",
    "path": "v390NonCriticalExtensions.present.v3a0NonCriticalExtensions.laterNonCriticalExtensions.v3g0NonCriticalExtensions.v4b0NonCriticalExtensions.v4d0NonCriticalExtensions.v590NonCriticalExtensions.v690NonCriticalExtensions.v6b0NonCriticalExtensions.v6e0NonCriticalExtensions.v770NonCriticalExtensions.interRATHandoverInfo-v770ext.ue-RadioAccessCapabilityComp2.discontinuousDpcchTransmission",
    "kind": "bool",
    "description": "Discontinuous DPCCH transmission (TS 25.211, Rel-7)"
  },
  {
    "major": "PHY",
    "middle": "HSPA",
    "leaf": "enhancedFdpch",
    "path": "v390NonCriticalExtensions.present.v3a0NonCriticalExtensions.laterNonCriticalExtensions.v3g0NonCriticalExtensions.v4b0NonCriticalExtensions.v4d0NonCriticalExtensions.v590NonCriticalExtensions.v690NonCriticalExtensions.v6b0NonCriticalExtensions.v6e0NonCriticalExtensions.v770NonCriticalExtensions.interRATHandoverInfo-v770ext.ue-RadioAccessCapabilityComp2.enhancedFdpch",
    "kind": "bool",
    "description": "Enhanced F-DPCH support (TS 25.211, Rel-7)"
  },
  {
    "major": "PHY",
    "middle": "HSPA",
    "leaf": "physicalChannelCapabComp-hspdsch-r6",
    "path": "ue-CapabilityContainer.ue-RadioAccessCapabilityComp2.fddPhysicalChannelCapab-hspdsch-edch.physicalChannelCapabComp-hspdsch-r6",
    "pathAlternatives": [
      "ue-RadioAccessCapabilityComp2.fddPhysicalChannelCapab-hspdsch-edch.physicalChannelCapabComp-hspdsch-r6",
      "v390NonCriticalExtensions.present.v3a0NonCriticalExtensions.laterNonCriticalExtensions.v3g0NonCriticalExtensions.v4b0NonCriticalExtensions.v4d0NonCriticalExtensions.v590NonCriticalExtensions.v690NonCriticalExtensions.interRATHandoverInfo-v690ext.ue-RadioAccessCapabilityComp2.fddPhysicalChannelCapab-hspdsch-edch.physicalChannelCapabComp-hspdsch-r6"
    ],
    "kind": "number",
    "description": "Physical channel capability for HS-PDSCH (TS 25.306)"
  },
  {
    "major": "PHY",
    "middle": "HSPA",
    "leaf": "slotFormat4",
    "path": "v390NonCriticalExtensions.present.v3a0NonCriticalExtensions.laterNonCriticalExtensions.v3g0NonCriticalExtensions.v4b0NonCriticalExtensions.v4d0NonCriticalExtensions.v590NonCriticalExtensions.v690NonCriticalExtensions.v6b0NonCriticalExtensions.v6e0NonCriticalExtensions.v770NonCriticalExtensions.interRATHandoverInfo-v770ext.ue-RadioAccessCapabilityComp2.slotFormat4",
    "kind": "bool",
    "description": "Slot format 4 support (TS 25.211, Rel-7)"
  },
  {
    "major": "PHY",
    "middle": "HSPA",
    "leaf": "supportEDPDCHPowerInterpolation",
    "path": "v390NonCriticalExtensions.present.v3a0NonCriticalExtensions.laterNonCriticalExtensions.interRATHandoverInfo-r3-add-ext.v7e0NonCriticalExtensions.interRATHandoverInfo-v7e0ext.ue-RadioAccessCapability.supportEDPDCHPowerInterpolation",
    "kind": "bool",
    "description": "E-DPDCH power interpolation support (TS 25.211)"
  },
  {
    "major": "PHY",
    "middle": "HSPA",
    "leaf": "supportForEDPCCHPowerBoosting",
    "path": "interRATHandoverInfo-v790ext.supportForEDPCCHPowerBoosting",
    "pathAlternatives": [
      "v390NonCriticalExtensions.present.v3a0NonCriticalExtensions.laterNonCriticalExtensions.v3g0NonCriticalExtensions.v4b0NonCriticalExtensions.v4d0NonCriticalExtensions.v590NonCriticalExtensions.v690NonCriticalExtensions.v6b0NonCriticalExtensions.v6e0NonCriticalExtensions.v770NonCriticalExtensions.v790nonCriticalExtensions.interRATHandoverInfo-v790ext.supportForEDPCCHPowerBoosting"
    ],
    "kind": "bool",
    "description": "E-DPCCH power boosting support (TS 25.306)"
  },
  {
    "major": "PHY",
    "middle": "HSUPA",
    "leaf": "dl-CapabilityWithSimultaneousHS-DSCHConfig",
    "path": "ue-CapabilityContainer.ue-RadioAccessCapabilityComp2.fddPhysicalChannelCapab-hspdsch-edch.dl-CapabilityWithSimultaneousHS-DSCHConfig",
    "pathAlternatives": [
      "ue-RadioAccessCapabilityComp2.fddPhysicalChannelCapab-hspdsch-edch.dl-CapabilityWithSimultaneousHS-DSCHConfig",
      "v390NonCriticalExtensions.present.v3a0NonCriticalExtensions.laterNonCriticalExtensions.v3g0NonCriticalExtensions.v4b0NonCriticalExtensions.v4d0NonCriticalExtensions.v590NonCriticalExtensions.v690NonCriticalExtensions.interRATHandoverInfo-v690ext.ue-RadioAccessCapabilityComp2.fddPhysicalChannelCapab-hspdsch-edch.dl-CapabilityWithSimultaneousHS-DSCHConfig"
    ],
    "kind": "enum",
    "description": "DL capability with simultaneous HS-DSCH (TS 25.306)"
  },
  {
    "major": "PHY",
    "middle": "HSUPA",
    "leaf": "edch-PhysicalLayerCategory",
    "path": "ue-CapabilityContainer.ue-RadioAccessCapabilityComp2.fddPhysicalChannelCapab-hspdsch-edch.physicalChannelCapability-edch-r6.fdd-edch.supported.edch-PhysicalLayerCategory",
    "pathAlternatives": [
      "ue-RadioAccessCapabilityComp2.fddPhysicalChannelCapab-hspdsch-edch.physicalChannelCapability-edch-r6.fdd-edch.supported.edch-PhysicalLayerCategory",
      "v390NonCriticalExtensions.present.v3a0NonCriticalExtensions.laterNonCriticalExtensions.v3g0NonCriticalExtensions.v4b0NonCriticalExtensions.v4d0NonCriticalExtensions.v590NonCriticalExtensions.v690NonCriticalExtensions.interRATHandoverInfo-v690ext.ue-RadioAccessCapabilityComp2.fddPhysicalChannelCapab-hspdsch-edch.physicalChannelCapability-edch-r6.fdd-edch.supported.edch-PhysicalLayerCategory"
    ],
    "kind": "number",
    "description": "E-DCH physical layer category (TS 25.306)"
  },
  {
    "major": "PHY",
    "middle": "UL",
    "leaf": "dummy-UL",
    "path": "ue-CapabilityContainer.ue-RadioAccessCapability.physicalChannelCapability.fddPhysChCapability.uplinkPhysChCapability.dummy",
    "kind": "bool",
    "description": "UL physical channel dummy placeholder (TS 25.211)"
  },
  {
    "major": "PHY",
    "middle": "UL",
    "leaf": "maxConvCodeBitsTransmitted",
    "path": "ue-CapabilityContainer.ue-RadioAccessCapability.transportChannelCapability.ul-TransChCapability.maxConvCodeBitsTransmitted",
    "pathAlternatives": [
      "ue-CapabilityContainer.present.ue-RadioAccessCapability.transportChannelCapability.ul-TransChCapability.maxConvCodeBitsTransmitted"
    ],
    "kind": "enum",
    "description": "Max convolutional coded bits transmitted (TS 25.212)"
  },
  {
    "major": "PHY",
    "middle": "UL",
    "leaf": "maxNoBitsTransmitted",
    "path": "ue-CapabilityContainer.ue-RadioAccessCapability.transportChannelCapability.ul-TransChCapability.maxNoBitsTransmitted",
    "pathAlternatives": [
      "ue-CapabilityContainer.present.ue-RadioAccessCapability.transportChannelCapability.ul-TransChCapability.maxNoBitsTransmitted"
    ],
    "kind": "enum",
    "description": "Max bits transmitted per TTI (TS 25.211)"
  },
  {
    "major": "PHY",
    "middle": "UL",
    "leaf": "maxNoDPDCH-BitsTransmitted",
    "path": "ue-CapabilityContainer.ue-RadioAccessCapability.physicalChannelCapability.fddPhysChCapability.uplinkPhysChCapability.maxNoDPDCH-BitsTransmitted",
    "pathAlternatives": [
      "ue-CapabilityContainer.present.ue-RadioAccessCapability.physicalChannelCapability.fddPhysChCapability.uplinkPhysChCapability.maxNoDPDCH-BitsTransmitted"
    ],
    "kind": "enum",
    "description": "Max DPDCH bits transmitted (TS 25.211)"
  },
  {
    "major": "PHY",
    "middle": "UL",
    "leaf": "maxNumberOfTF-UL",
    "path": "ue-CapabilityContainer.ue-RadioAccessCapability.transportChannelCapability.ul-TransChCapability.maxNumberOfTF",
    "pathAlternatives": [
      "ue-CapabilityContainer.present.ue-RadioAccessCapability.transportChannelCapability.ul-TransChCapability.maxNumberOfTF",
      "transportChannelCapability.ul-TransChCapability.maxNumberOfTF"
    ],
    "kind": "enum",
    "description": "Max number of TF UL (TS 25.211)"
  },
  {
    "major": "PHY",
    "middle": "UL",
    "leaf": "maxNumberOfTFC-UL",
    "path": "ue-CapabilityContainer.ue-RadioAccessCapability.transportChannelCapability.ul-TransChCapability.maxNumberOfTFC",
    "pathAlternatives": [
      "ue-CapabilityContainer.present.ue-RadioAccessCapability.transportChannelCapability.ul-TransChCapability.maxNumberOfTFC",
      "transportChannelCapability.ul-TransChCapability.maxNumberOfTFC"
    ],
    "kind": "enum",
    "description": "Max number of TFC UL (TS 25.211)"
  },
  {
    "major": "PHY",
    "middle": "UL",
    "leaf": "maxSimultaneousTransChs-UL",
    "path": "ue-CapabilityContainer.ue-RadioAccessCapability.transportChannelCapability.ul-TransChCapability.maxSimultaneousTransChs",
    "pathAlternatives": [
      "ue-CapabilityContainer.present.ue-RadioAccessCapability.transportChannelCapability.ul-TransChCapability.maxSimultaneousTransChs",
      "transportChannelCapability.ul-TransChCapability.maxSimultaneousTransChs"
    ],
    "kind": "enum",
    "description": "Max simultaneous transport channels UL (TS 25.211)"
  },
  {
    "major": "PHY",
    "middle": "UL",
    "leaf": "maxTransmittedBlocks",
    "path": "ue-CapabilityContainer.ue-RadioAccessCapability.transportChannelCapability.ul-TransChCapability.maxTransmittedBlocks",
    "pathAlternatives": [
      "ue-CapabilityContainer.present.ue-RadioAccessCapability.transportChannelCapability.ul-TransChCapability.maxTransmittedBlocks"
    ],
    "kind": "enum",
    "description": "Max transmitted transport blocks (TS 25.211)"
  },
  {
    "major": "PHY",
    "middle": "UL",
    "leaf": "turboEncodingSupport",
    "path": "ue-CapabilityContainer.ue-RadioAccessCapability.transportChannelCapability.ul-TransChCapability.turboEncodingSupport.supported",
    "pathAlternatives": [
      "ue-CapabilityContainer.present.ue-RadioAccessCapability.transportChannelCapability.ul-TransChCapability.turboEncodingSupport"
    ],
    "kind": "enum",
    "description": "Turbo encoding support (TS 25.212)"
  },
  {
    "major": "RLC",
    "middle": "AM",
    "leaf": "maximumAM-EntityNumber",
    "path": "ue-CapabilityContainer.ue-RadioAccessCapability.rlc-Capability.maximumAM-EntityNumber",
    "pathAlternatives": [
      "ue-CapabilityContainer.present.ue-RadioAccessCapability.rlc-Capability.maximumAM-EntityNumber"
    ],
    "kind": "enum",
    "description": "Maximum AM entity number (TS 25.322)"
  },
  {
    "major": "RLC",
    "middle": "AM",
    "leaf": "maximumRLC-WindowSize",
    "path": "ue-CapabilityContainer.ue-RadioAccessCapability.rlc-Capability.maximumRLC-WindowSize",
    "pathAlternatives": [
      "ue-CapabilityContainer.present.ue-RadioAccessCapability.rlc-Capability.maximumRLC-WindowSize"
    ],
    "kind": "enum",
    "description": "Maximum RLC window size (TS 25.322 §6.2.2.5)"
  },
  {
    "major": "RLC",
    "middle": "AM",
    "leaf": "totalRLC-AM-BufferSize",
    "path": "ue-CapabilityContainer.ue-RadioAccessCapability.rlc-Capability.totalRLC-AM-BufferSize",
    "pathAlternatives": [
      "ue-CapabilityContainer.present.ue-RadioAccessCapability.rlc-Capability.totalRLC-AM-BufferSize"
    ],
    "kind": "enum",
    "description": "Total RLC AM buffer size (TS 25.322 §6.2.2.4)"
  }
];
