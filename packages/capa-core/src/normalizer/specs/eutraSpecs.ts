/**
 * EUTRA (LTE) Canonical Feature Specifications
 */

import type { FeatureSpec } from './specTypes';

export const EUTRA_FEATURE_SPECS: FeatureSpec[] = [
  {
    "major": "General",
    "middle": "AS Release",
    "leaf": "accessStratumRelease",
    "path": "accessStratumRelease",
    "kind": "enum",
    "description": "Access Stratum release indicator (TS 36.306)"
  },
  {
    "major": "General",
    "middle": "Filters",
    "leaf": "appliedCapabilityFilterCommon-r15",
    "path": "appliedCapabilityFilterCommon-r15",
    "kind": "enum",
    "description": "Common capability filter applied (TS 36.331, Rel-15)"
  },
  {
    "major": "General",
    "middle": "MBMS",
    "leaf": "mbms-SCell-r11",
    "path": "mbms-Parameters-r11.mbms-SCell-r11",
    "kind": "bool",
    "description": "MBMS on SCell support (TS 36.331, Rel-11)"
  },
  {
    "major": "General",
    "middle": "Positioning",
    "leaf": "otdoa-UE-Assisted-r10",
    "path": "otdoa-PositioningCapabilities-r10.otdoa-UE-Assisted-r10",
    "kind": "bool",
    "description": "OTDOA UE assisted positioning (TS 36.305, Rel-10)"
  },
  {
    "major": "General",
    "middle": "Rel11+",
    "leaf": "ue-Rx-TxTimeDiffMeasurements-r11",
    "path": "otherParameters-r11.ue-Rx-TxTimeDiffMeasurements-r11",
    "kind": "bool",
    "description": "UE Rx-Tx time difference measurements (TS 36.214 §5.2.8, Rel-11)"
  },
  {
    "major": "General",
    "middle": "UE Category",
    "leaf": "ue-Category",
    "path": "ue-Category",
    "kind": "number",
    "description": "UE category (Rel-8, TS 36.306 §4.1)"
  },
  {
    "major": "General",
    "middle": "UE Category",
    "leaf": "ue-Category-v1020",
    "path": "ue-Category-v1020",
    "kind": "number",
    "description": "UE category extension (Rel-10)"
  },
  {
    "major": "General",
    "middle": "UE Category",
    "leaf": "ue-Category-v1170",
    "path": "ue-Category-v1170",
    "kind": "number",
    "description": "UE category extension (Rel-11)"
  },
  {
    "major": "General",
    "middle": "UE Category",
    "leaf": "ue-Category-v11a0",
    "path": "ue-Category-v11a0",
    "kind": "number",
    "description": "UE category extension (Rel-11 advanced)"
  },
  {
    "major": "General",
    "middle": "UE Category",
    "leaf": "ue-CategoryDL-r12",
    "path": "ue-CategoryDL-r12",
    "kind": "number",
    "description": "UE DL category (Rel-12, TS 36.306)"
  },
  {
    "major": "General",
    "middle": "UE Category",
    "leaf": "ue-CategoryDL-v1260",
    "path": "ue-CategoryDL-v1260",
    "kind": "number",
    "description": "UE DL category extension (Rel-12.6)"
  },
  {
    "major": "General",
    "middle": "UE Category",
    "leaf": "ue-CategoryDL-v1330",
    "path": "ue-CategoryDL-v1330",
    "kind": "number",
    "description": "UE DL category extension (Rel-13.3)"
  },
  {
    "major": "General",
    "middle": "UE Category",
    "leaf": "ue-CategoryDL-v1450",
    "path": "ue-CategoryDL-v1450",
    "kind": "number",
    "description": "UE DL category extension (Rel-14.5, TS 36.306)"
  },
  {
    "major": "General",
    "middle": "UE Category",
    "leaf": "ue-CategoryUL-r12",
    "path": "ue-CategoryUL-r12",
    "kind": "number",
    "description": "UE UL category (Rel-12, TS 36.306)"
  },
  {
    "major": "General",
    "middle": "UE Category",
    "leaf": "ue-CategoryUL-v1430",
    "path": "ue-CategoryUL-v1430",
    "kind": "number",
    "description": "UE UL category extension (Rel-14.3, e.g., n16→16)"
  },
  {
    "major": "General",
    "middle": "RRC Segmentation",
    "leaf": "ul-RRC-Segmentation-r16",
    "path": "other-Parameters-v1690.ul-RRC-Segmentation-r16",
    "kind": "bool",
    "description": "UL RRC segmentation support (TS 36.331, Rel-16)"
  },
  {
    "major": "General",
    "middle": "RRC Segmentation",
    "leaf": "ul-RRC-MaxCapaSegments-r17",
    "path": "ul-RRC-MaxCapaSegments-r17",
    "kind": "bool",
    "description": "Support for maximum number of capability segments for UL RRC capability transfer (TS 36.331, Rel-17)"
  },
  {
    "major": "InterRAT",
    "middle": "GERAN",
    "leaf": "e-RedirectionGERAN-r9",
    "path": "interRAT-ParametersGERAN-v920.e-RedirectionGERAN-r9",
    "kind": "bool",
    "description": "Enhanced GERAN redirection support (Rel-9)"
  },
  {
    "major": "InterRAT",
    "middle": "GERAN",
    "leaf": "interRAT-PS-HO-ToGERAN",
    "path": "interRAT-Parameters.geran.interRAT-PS-HO-ToGERAN",
    "kind": "bool",
    "description": "Inter-RAT PS handover to GERAN (TS 36.306)"
  },
  {
    "major": "InterRAT",
    "middle": "GERAN",
    "leaf": "SupportedBandGERAN",
    "path": "interRAT-Parameters.geran.supportedBandListGERAN",
    "kind": "stringList",
    "description": "Supported GERAN bands (TS 36.331)"
  },
  {
    "major": "InterRAT",
    "middle": "NR (Rel-15)",
    "leaf": "bandNR-r15",
    "path": "irat-ParametersNR-r15.supportedBandListEN-DC-r15",
    "pathAlternatives": [
      "irat-ParametersNR-r15.supportedBandListEN-DC-r15.bandNR-r15"
    ],
    "kind": "numberList",
    "description": "Supported NR band for EN-DC (TS 36.331, Rel-15)"
  },
  {
    "major": "InterRAT",
    "middle": "NR (Rel-15)",
    "leaf": "bandNR-sa-r15",
    "path": "irat-ParametersNR-v1540.supportedBandListNR-SA-r15",
    "pathAlternatives": [
      "irat-ParametersNR-v1540.supportedBandListNR-SA-r15.bandNR-r15"
    ],
    "kind": "numberList",
    "description": "Supported NR band for SA (TS 36.331, Rel-15)"
  },
  {
    "major": "InterRAT",
    "middle": "NR (Rel-15)",
    "leaf": "en-DC",
    "path": "irat-ParametersNR-r15.en-DC-r15",
    "kind": "bool",
    "description": "EN-DC (E-UTRA NR Dual Connectivity) support (TS 37.340)"
  },
  {
    "major": "InterRAT",
    "middle": "NR (Rel-15)",
    "leaf": "eutra-EPC-HO-ToNR-FDD-FR1-r15",
    "path": "irat-ParametersNR-v1540.eutra-EPC-HO-ToNR-FDD-FR1-r15",
    "kind": "bool",
    "description": "HO to NR FDD FR1 (TS 36.306, Rel-15)"
  },
  {
    "major": "InterRAT",
    "middle": "NR (Rel-15)",
    "leaf": "eutra-EPC-HO-ToNR-TDD-FR1-r15",
    "path": "irat-ParametersNR-v1540.eutra-EPC-HO-ToNR-TDD-FR1-r15",
    "kind": "bool",
    "description": "HO to NR TDD FR1 (TS 36.306, Rel-15)"
  },
  {
    "major": "InterRAT",
    "middle": "NR (Rel-15)",
    "leaf": "ims-VoiceOverNR-FR1-r15",
    "path": "irat-ParametersNR-v1540.ims-VoiceOverNR-FR1-r15",
    "kind": "bool",
    "description": "IMS voice over NR FR1 support (TS 36.306, Rel-15)"
  },
  {
    "major": "InterRAT",
    "middle": "NR (Rel-15)",
    "leaf": "sa-NR-r15",
    "path": "irat-ParametersNR-v1540.sa-NR-r15",
    "kind": "bool",
    "description": "Standalone NR capability (TS 36.306, Rel-15)"
  },
  {
    "major": "InterRAT",
    "middle": "NR (Rel-15)",
    "leaf": "eventB2-r15",
    "path": "irat-ParametersNR-r15.eventB2-r15",
    "kind": "bool",
    "description": "Event B2 measurement reporting for NR (TS 36.331, Rel-15)"
  },
  {
    "major": "InterRAT",
    "middle": "NR (Rel-16)",
    "leaf": "extendedBand-n77-r16",
    "path": "irat-ParametersNR-v1660.extendedBand-n77-r16",
    "kind": "bool",
    "description": "Extended band n77 support for wider frequency range (TS 36.101, Rel-16)"
  },
  {
    "major": "InterRAT",
    "middle": "UTRA",
    "leaf": "e-RedirectionUTRA-r9",
    "path": "interRAT-ParametersUTRA-v920.e-RedirectionUTRA-r9",
    "kind": "bool",
    "description": "Enhanced UTRA redirection support (Rel-9)"
  },
  {
    "major": "InterRAT",
    "middle": "UTRA",
    "leaf": "mfbi-UTRA-r9",
    "path": "interRAT-ParametersUTRA-v9h0.mfbi-UTRA-r9",
    "kind": "bool",
    "description": "Multi-frequency band indicator for UTRA (TS 36.306, Rel-9)"
  },
  {
    "major": "InterRAT",
    "middle": "UTRA",
    "leaf": "SupportedBandUTRA-FDD",
    "path": "interRAT-Parameters.utraFDD.supportedBandListUTRA-FDD",
    "kind": "stringList",
    "description": "Supported UTRA FDD bands (TS 36.331)"
  },
  {
    "major": "MAC",
    "middle": "Rel15+",
    "leaf": "eLCID-Support-r15",
    "path": "mac-Parameters-v1550.eLCID-Support-r15",
    "kind": "bool",
    "description": "Extended Logical Channel ID support (TS 36.321, Rel-15)"
  },
  {
    "major": "MAC",
    "middle": "General",
    "leaf": "extendedNumberOfDRBs-r15",
    "path": "extendedNumberOfDRBs-r15",
    "kind": "bool",
    "description": "Support for up to 15 Data Radio Bearers (TS 36.331, Rel-15)"
  },
  {
    "major": "MAC",
    "middle": "Rel12+",
    "leaf": "logicalChannelSR-ProhibitTimer-r12",
    "path": "mac-Parameters-r12.logicalChannelSR-ProhibitTimer-r12",
    "kind": "bool",
    "description": "SR prohibit timer per logical channel (TS 36.321, Rel-12)"
  },
  {
    "major": "MAC",
    "middle": "Rel12+",
    "leaf": "longDRX-Command-r12",
    "path": "mac-Parameters-r12.longDRX-Command-r12",
    "kind": "bool",
    "description": "Long DRX command support (TS 36.321 §5.7, Rel-12)"
  },
  {
    "major": "IMS",
    "middle": "MMTEL (Rel-14)",
    "leaf": "recommendedBitRate-r14",
    "path": "mmtel-Parameters-r14.recommendedBitRate-r14",
    "kind": "bool",
    "description": "Bit rate recommendation for GBR bearers (TS 36.306, Rel-14)"
  },
  {
    "major": "IMS",
    "middle": "MMTEL (Rel-14)",
    "leaf": "recommendedBitRateQuery-r14",
    "path": "mmtel-Parameters-r14.recommendedBitRateQuery-r14",
    "kind": "bool",
    "description": "Bit rate recommendation query support (TS 36.306, Rel-14)"
  },
  {
    "major": "MAC",
    "middle": "Rel14+",
    "leaf": "shortSPS-IntervalFDD-r14",
    "path": "mac-Parameters-v1430.shortSPS-IntervalFDD-r14",
    "kind": "bool",
    "description": "Short SPS interval FDD (TS 36.321 §5.7, Rel-14)"
  },
  {
    "major": "MAC",
    "middle": "Rel14+",
    "leaf": "skipUplinkDynamic-r14",
    "path": "mac-Parameters-v1430.skipUplinkDynamic-r14",
    "kind": "bool",
    "description": "Skip uplink dynamic (TS 36.321, Rel-14)"
  },
  {
    "major": "MAC",
    "middle": "Rel14+",
    "leaf": "skipUplinkSPS-r14",
    "path": "mac-Parameters-v1430.skipUplinkSPS-r14",
    "kind": "bool",
    "description": "Skip uplink SPS (TS 36.321, Rel-14)"
  },
  {
    "major": "MAC",
    "middle": "Rel14+",
    "leaf": "shortSPS-IntervalTDD-r14",
    "path": "mac-Parameters-v1430.shortSPS-IntervalTDD-r14",
    "kind": "bool",
    "description": "Short SPS interval for TDD support (TS 36.321 §5.10, Rel-14)"
  },
  {
    "major": "Meas/Mob",
    "middle": "Rel13+",
    "leaf": "allowedCellList-r13",
    "path": "measParameters-v1310.allowedCellList-r13",
    "kind": "bool",
    "description": "Allowed cell list for measurement (TS 36.331 §5.5.2, Rel-13)"
  },
  {
    "major": "Meas/Mob",
    "middle": "CSG Proximity",
    "leaf": "interFreqProximityIndication-r9",
    "path": "csg-ProximityIndicationParameters-r9.interFreqProximityIndication-r9",
    "kind": "bool",
    "description": "Inter-frequency CSG proximity indication (TS 36.304, Rel-9)"
  },
  {
    "major": "Meas/Mob",
    "middle": "CSG Proximity",
    "leaf": "intraFreqProximityIndication-r9",
    "path": "csg-ProximityIndicationParameters-r9.intraFreqProximityIndication-r9",
    "kind": "bool",
    "description": "Intra-frequency CSG proximity indication (TS 36.304, Rel-9)"
  },
  {
    "major": "Meas/Mob",
    "middle": "CSG Proximity",
    "leaf": "utran-ProximityIndication-r9",
    "path": "csg-ProximityIndicationParameters-r9.utran-ProximityIndication-r9",
    "kind": "bool",
    "description": "Proximity indication for UTRAN CSG cells (TS 36.331, Rel-9)"
  },
  {
    "major": "Meas/Mob",
    "middle": "Rel10+",
    "leaf": "loggedMeasurementsIdle-r10",
    "path": "ue-BasedNetwPerfMeasParameters-r10.loggedMeasurementsIdle-r10",
    "kind": "bool",
    "description": "Logged measurements in idle mode (TS 36.331, Rel-10)"
  },
  {
    "major": "Meas/Mob",
    "middle": "Neigh Cell SI",
    "leaf": "interFreqSI-AcquisitionForHO-r9",
    "path": "neighCellSI-AcquisitionParameters-r9.interFreqSI-AcquisitionForHO-r9",
    "kind": "bool",
    "description": "Inter-frequency SI acquisition for HO (TS 36.331, Rel-9)"
  },
  {
    "major": "Meas/Mob",
    "middle": "Neigh Cell SI",
    "leaf": "intraFreqSI-AcquisitionForHO-r9",
    "path": "neighCellSI-AcquisitionParameters-r9.intraFreqSI-AcquisitionForHO-r9",
    "kind": "bool",
    "description": "Intra-frequency SI acquisition for HO (TS 36.331, Rel-9)"
  },
  {
    "major": "Meas/Mob",
    "middle": "Neigh Cell SI",
    "leaf": "utran-SI-AcquisitionForHO-r9",
    "path": "neighCellSI-AcquisitionParameters-r9.utran-SI-AcquisitionForHO-r9",
    "kind": "bool",
    "description": "UTRAN SI acquisition for HO (TS 36.331, Rel-9)"
  },
  {
    "major": "Meas/Mob",
    "middle": "Rel11+",
    "leaf": "rsrqMeasWideband-r11",
    "path": "measParameters-v1130.rsrqMeasWideband-r11",
    "kind": "bool",
    "description": "RSRQ wideband measurement (TS 36.214 §5.2, Rel-11)"
  },
  {
    "major": "Meas/Mob",
    "middle": "Rel12+",
    "leaf": "alternativeTimeToTrigger-r12",
    "path": "measParameters-v1250.alternativeTimeToTrigger-r12",
    "kind": "bool",
    "description": "Support for alternative timeToTrigger (TS 36.306, Rel-12)"
  },
  {
    "major": "Meas/Mob",
    "middle": "Rel12+",
    "leaf": "crs-DiscoverySignalsMeas-r12",
    "path": "measParameters-v1250.crs-DiscoverySignalsMeas-r12",
    "kind": "bool",
    "description": "CRS discovery signals measurement (TS 36.214, Rel-12)"
  },
  {
    "major": "Meas/Mob",
    "middle": "Rel12+",
    "leaf": "extendedMaxMeasId-r12",
    "path": "measParameters-v1250.extendedMaxMeasId-r12",
    "kind": "bool",
    "description": "Extended max measurement ID (TS 36.331, Rel-12)"
  },
  {
    "major": "Meas/Mob",
    "middle": "Rel12+",
    "leaf": "extendedRSRQ-LowerRange-r12",
    "path": "measParameters-v1250.extendedRSRQ-LowerRange-r12",
    "kind": "bool",
    "description": "Extended lower range of RSRQ measurement (TS 36.306, Rel-12)"
  },
  {
    "major": "Meas/Mob",
    "middle": "Rel12+",
    "leaf": "incMonEUTRA-r12",
    "path": "measParameters-v1250.incMonEUTRA-r12",
    "kind": "bool",
    "description": "Incremental monitoring EUTRA (TS 36.133, Rel-12)"
  },
  {
    "major": "Meas/Mob",
    "middle": "Rel12+",
    "leaf": "rsrq-OnAllSymbols-r12",
    "path": "measParameters-v1250.rsrq-OnAllSymbols-r12",
    "kind": "bool",
    "description": "RSRQ measurement over all OFDM symbols (TS 36.306, Rel-12)"
  },
  {
    "major": "Meas/Mob",
    "middle": "Rel12+",
    "leaf": "timerT312-r12",
    "path": "measParameters-v1250.timerT312-r12",
    "kind": "bool",
    "description": "Timer T312 support (TS 36.331 §5.3.11, Rel-12)"
  },
  {
    "major": "Meas/Mob",
    "middle": "Rel13+",
    "leaf": "extendedFreqPriorities-r13",
    "path": "measParameters-v1310.extendedFreqPriorities-r13",
    "kind": "bool",
    "description": "Extended frequency priorities (TS 36.331, Rel-13)"
  },
  {
    "major": "Meas/Mob",
    "middle": "Rel13+",
    "leaf": "extendedMaxObjectId-r13",
    "path": "measParameters-v1310.extendedMaxObjectId-r13",
    "kind": "bool",
    "description": "Extended max object ID (TS 36.331, Rel-13)"
  },
  {
    "major": "Meas/Mob",
    "middle": "Rel13+",
    "leaf": "multiBandInfoReport-r13",
    "path": "measParameters-v1310.multiBandInfoReport-r13",
    "kind": "bool",
    "description": "MBMS-related multiband information reporting (TS 36.331, Rel-13)"
  },
  {
    "major": "Meas/Mob",
    "middle": "Rel13+",
    "leaf": "rs-SINR-Meas-r13",
    "path": "measParameters-v1310.rs-SINR-Meas-r13",
    "kind": "bool",
    "description": "RS-SINR measurement (TS 36.214 §5.2, Rel-13)"
  },
  {
    "major": "Meas/Mob",
    "middle": "Rel13+",
    "leaf": "whiteCellList-r13",
    "path": "measParameters-v1310.whiteCellList-r13",
    "kind": "bool",
    "description": "Measurement reporting based on white cell list (TS 36.331, Rel-13)"
  },
  {
    "major": "Meas/Mob",
    "middle": "Rel15+",
    "leaf": "eutra-CGI-Reporting-ENDC-r15",
    "path": "neighCellSI-AcquisitionParameters-v1550.eutra-CGI-Reporting-ENDC-r15",
    "pathAlternatives": [
      "eutra-CGI-Reporting-ENDC-r15"
    ],
    "kind": "bool",
    "description": "EUTRA CGI reporting for EN-DC (TS 36.331, Rel-15)"
  },
  {
    "major": "InterRAT",
    "middle": "Rel15+",
    "leaf": "utra-GERAN-CGI-Reporting-ENDC-r15",
    "path": "neighCellSI-AcquisitionParameters-v1550.utra-GERAN-CGI-Reporting-ENDC-r15",
    "pathAlternatives": [
      "utra-GERAN-CGI-Reporting-ENDC-r15"
    ],
    "kind": "bool",
    "description": "CGI reporting for UTRA/GERAN cells in EN-DC (TS 36.331, Rel-15)"
  },
  {
    "major": "Meas/Mob",
    "middle": "Rel15+",
    "leaf": "measGapPatterns-r15",
    "path": "measParameters-v1520.measGapPatterns-r15",
    "kind": "enum",
    "description": "Rel-15 measurement gap patterns support (TS 36.133)"
  },
  {
    "major": "Meas/Mob",
    "middle": "Rel15+",
    "leaf": "reportCGI-NR-EN-DC-r15",
    "path": "neighCellSI-AcquisitionParameters-v1530.reportCGI-NR-EN-DC-r15",
    "kind": "bool",
    "description": "Report CGI for NR EN-DC (TS 36.331, Rel-15)"
  },
  {
    "major": "Meas/Mob",
    "middle": "Rel15+",
    "leaf": "reportCGI-NR-NoEN-DC-r15",
    "path": "neighCellSI-AcquisitionParameters-v1530.reportCGI-NR-NoEN-DC-r15",
    "kind": "bool",
    "description": "Report CGI for NR non-EN-DC (TS 36.331, Rel-15)"
  },
  {
    "major": "Meas/Mob",
    "middle": "Rel16+",
    "leaf": "eutra-SI-AcquisitionForHO-ENDC-r16",
    "path": "neighCellSI-AcquisitionParameters-v1610.eutra-SI-AcquisitionForHO-ENDC-r16",
    "kind": "bool",
    "description": "EUTRA System Information acquisition for handover in EN-DC (TS 36.331, Rel-16)"
  },
  {
    "major": "Meas/Mob",
    "middle": "SON",
    "leaf": "rach-Report-r9",
    "path": "son-Parameters-r9.rach-Report-r9",
    "kind": "bool",
    "description": "RACH report for SON (TS 36.902, Rel-9)"
  },
  {
    "major": "Meas/Mob",
    "middle": "Rel10+",
    "leaf": "standaloneGNSS-Location-r10",
    "path": "ue-BasedNetwPerfMeasParameters-r10.standaloneGNSS-Location-r10",
    "kind": "bool",
    "description": "Standalone GNSS location capability (TS 36.305, Rel-10)"
  },
  {
    "major": "PDCP",
    "middle": "Rel11+",
    "leaf": "pdcp-SN-Extension-r11",
    "path": "pdcp-Parameters-v1130.pdcp-SN-Extension-r11",
    "kind": "bool",
    "description": "PDCP SN extension (15-bit, Rel-11, TS 36.323 §6.2)"
  },
  {
    "major": "PDCP",
    "middle": "Rel13+",
    "leaf": "pdcp-SN-Extension-18bits-r13",
    "path": "pdcp-Parameters-v1310.pdcp-SN-Extension-18bits-r13",
    "kind": "bool",
    "description": "PDCP SN extension 18-bit (Rel-13, TS 36.323 §6.2)"
  },
  {
    "major": "PDCP",
    "middle": "Rel14+",
    "leaf": "supportedUplinkOnlyROHC-Profiles-r14",
    "path": "pdcp-Parameters-v1430.supportedUplinkOnlyROHC-Profiles-r14",
    "kind": "presence",
    "description": "Uplink-only ROHC profiles (Rel-14, TS 36.323)"
  },
  {
    "major": "PDCP",
    "middle": "Rel15 (NR)",
    "leaf": "outOfOrderDelivery-r15",
    "path": "pdcp-ParametersNR-r15.outOfOrderDelivery-r15",
    "kind": "bool",
    "description": "Out-of-order delivery for NR PDCP (Rel-15, TS 38.323)"
  },
  {
    "major": "PDCP",
    "middle": "Rel15 (NR)",
    "leaf": "rohc-ContextContinue-r15",
    "path": "pdcp-ParametersNR-r15.rohc-ContextContinue-r15",
    "kind": "bool",
    "description": "ROHC context continuation for NR PDCP (Rel-15, TS 38.323)"
  },
  {
    "major": "PDCP",
    "middle": "Rel15 (NR)",
    "leaf": "rohc-ContextMaxSessions-r15",
    "path": "pdcp-ParametersNR-r15.rohc-ContextMaxSessions-r15",
    "kind": "enum",
    "description": "Max ROHC context sessions for NR PDCP (Rel-15, TS 38.323)"
  },
  {
    "major": "PDCP",
    "middle": "Rel15 (NR)",
    "leaf": "sn-SizeLo-r15",
    "path": "pdcp-ParametersNR-r15.sn-SizeLo-r15",
    "kind": "bool",
    "description": "SN size low (12-bit) for NR PDCP (Rel-15)"
  },
  {
    "major": "PDCP",
    "middle": "Rel16+",
    "leaf": "pdcp-VersionChangeWithoutHO-r16",
    "path": "pdcp-Parameters-v1610.pdcp-VersionChangeWithoutHO-r16",
    "kind": "bool",
    "description": "PDCP version change without handover (TS 36.323, Rel-16)"
  },
  {
    "major": "PDCP",
    "middle": "ROHC",
    "leaf": "maxNumberROHC-ContextSessions",
    "path": "pdcp-Parameters.maxNumberROHC-ContextSessions",
    "kind": "enum",
    "description": "Max simultaneous ROHC context sessions"
  },
  {
    "major": "PDCP",
    "middle": "ROHC",
    "leaf": "profile0x0006-r14",
    "path": "pdcp-Parameters-v1430.supportedUplinkOnlyROHC-Profiles-r14.profile0x0006-r14",
    "kind": "bool",
    "description": "ROHC profile 0x0006 support (Rel-14, TS 36.323)"
  },
  {
    "major": "PDCP",
    "middle": "ROHC",
    "leaf": "profile0x0006-r15",
    "path": "pdcp-ParametersNR-r15.rohc-ProfilesUL-Only-r15.profile0x0006-r15",
    "kind": "bool",
    "description": "ROHC profile 0x0006 support for NR PDCP (Rel-15)"
  },
  {
    "major": "PHY",
    "middle": "Rel13+",
    "leaf": "aperiodicCSI-Reporting-r13",
    "path": "phyLayerParameters-v1310.aperiodicCSI-Reporting-r13",
    "kind": "enum",
    "description": "Aperiodic CSI reporting support (TS 36.213 §7.2, Rel-13)"
  },
  {
    "major": "PHY",
    "middle": "Common",
    "leaf": "alternativeTBS-Index-r14",
    "path": "phyLayerParameters-v1430.alternativeTBS-Index-r14",
    "kind": "bool",
    "description": "Alternative TBS index (TS 36.213 §7.1.7, Rel-14)"
  },
  {
    "major": "PHY",
    "middle": "Common",
    "leaf": "alternativeTBS-Indices-r12",
    "path": "phyLayerParameters-v1280.alternativeTBS-Indices-r12",
    "kind": "bool",
    "description": "Alternative TBS indices (TS 36.213 §7.1.7, Rel-12)"
  },
  {
    "major": "PHY",
    "middle": "Common",
    "leaf": "codebook-HARQ-ACK-r13",
    "path": "phyLayerParameters-v1310.codebook-HARQ-ACK-r13",
    "kind": "enum",
    "description": "Codebook-based HARQ-ACK feedback (TS 36.213 §7.3, Rel-13)"
  },
  {
    "major": "PHY",
    "middle": "Common",
    "leaf": "discoverySignalsInDeactSCell-r12",
    "path": "phyLayerParameters-v1250.discoverySignalsInDeactSCell-r12",
    "kind": "bool",
    "description": "Discovery signals in deactivated SCell (TS 36.211 §6.13, Rel-12)"
  },
  {
    "major": "PHY",
    "middle": "Common",
    "leaf": "dmrs-LessUpPTS-r14",
    "path": "phyLayerParameters-v1430.dmrs-LessUpPTS-r14",
    "kind": "bool",
    "description": "PUSCH transmission in UpPTS without DMRS (TS 36.306, Rel-14)"
  },
  {
    "major": "PHY",
    "middle": "Common",
    "leaf": "e-HARQ-Pattern-FDD-r12",
    "path": "phyLayerParameters-v1250.e-HARQ-Pattern-FDD-r12",
    "kind": "bool",
    "description": "Enhanced HARQ pattern for FDD (TS 36.213 §10.1, Rel-12)"
  },
  {
    "major": "PHY",
    "middle": "Common",
    "leaf": "enhancedDualLayerFDD-r9",
    "path": "phyLayerParameters-v920.enhancedDualLayerFDD-r9",
    "kind": "bool",
    "description": "Enhanced dual-layer FDD (TS 36.306, Rel-9)"
  },
  {
    "major": "PHY",
    "middle": "Common",
    "leaf": "enhancedDualLayerTDD-r9",
    "path": "phyLayerParameters-v920.enhancedDualLayerTDD-r9",
    "kind": "bool",
    "description": "Enhanced dual-layer TDD (TS 36.213, Rel-9)"
  },
  {
    "major": "PHY",
    "middle": "Common",
    "leaf": "interBandTDD-CA-WithDifferentConfig-r11",
    "path": "phyLayerParameters-v1170.interBandTDD-CA-WithDifferentConfig-r11",
    "kind": "enum",
    "description": "Inter-band TDD CA with different UL/DL configurations (TS 36.306, Rel-11)"
  },
  {
    "major": "PHY",
    "middle": "Common",
    "leaf": "multiACK-CSI-Reporting-r11",
    "path": "phyLayerParameters-v1130.multiACK-CSI-Reporting-r11",
    "kind": "bool",
    "description": "Multi-ACK CSI reporting (TS 36.213 §7.2.3, Rel-11)"
  },
  {
    "major": "PHY",
    "middle": "Common",
    "leaf": "multiClusterPUSCH-WithinCC-r10",
    "path": "phyLayerParameters-v1020.multiClusterPUSCH-WithinCC-r10",
    "kind": "bool",
    "description": "Multi-cluster PUSCH within CC (Rel-10, TS 36.211)"
  },
  {
    "major": "PHY",
    "middle": "Common",
    "leaf": "noResourceRestrictionForTTIBundling-r12",
    "path": "phyLayerParameters-v1250.noResourceRestrictionForTTIBundling-r12",
    "kind": "bool",
    "description": "No resource restriction for TTI bundling (TS 36.321 §5.5, Rel-12)"
  },
  {
    "major": "PHY",
    "middle": "Common",
    "leaf": "pmi-Disabling-r10",
    "path": "phyLayerParameters-v1020.pmi-Disabling-r10",
    "kind": "bool",
    "description": "PMI disabling support (Rel-10, TS 36.213 §7.2)"
  },
  {
    "major": "PHY",
    "middle": "Common",
    "leaf": "pucch-Format4-r13",
    "path": "phyLayerParameters-v1310.pucch-Format4-r13",
    "kind": "bool",
    "description": "PUCCH format 4 support (TS 36.211, Rel-13)"
  },
  {
    "major": "PHY",
    "middle": "Common",
    "leaf": "pucch-Format5-r13",
    "path": "phyLayerParameters-v1310.pucch-Format5-r13",
    "kind": "bool",
    "description": "PUCCH format 5 support (TS 36.211, Rel-13)"
  },
  {
    "major": "PHY",
    "middle": "Common",
    "leaf": "pusch-FeedbackMode-r12",
    "path": "phyLayerParameters-v1250.pusch-FeedbackMode-r12",
    "kind": "bool",
    "description": "PUSCH feedback mode (TS 36.213 §10.1, Rel-12)"
  },
  {
    "major": "PHY",
    "middle": "Common",
    "leaf": "simultaneousPUCCH-PUSCH-r10",
    "path": "phyLayerParameters-v1020.simultaneousPUCCH-PUSCH-r10",
    "kind": "bool",
    "description": "Simultaneous transmission of PUCCH and PUSCH (TS 36.306, Rel-10)"
  },
  {
    "major": "PHY",
    "middle": "Common",
    "leaf": "srs-Enhancements-r13",
    "path": "phyLayerParameters-v1320.mimo-UE-Parameters-r13.srs-Enhancements-r13",
    "kind": "bool",
    "description": "SRS enhancements support (TS 36.213, Rel-13)"
  },
  {
    "major": "PHY",
    "middle": "Common",
    "leaf": "tm5-FDD-r9",
    "path": "phyLayerParameters-v9d0.tm5-FDD-r9",
    "kind": "bool",
    "description": "Transmission Mode 5 support in FDD (TS 36.306, Rel-9)"
  },
  {
    "major": "PHY",
    "middle": "Common",
    "leaf": "tm9-With-8Tx-FDD",
    "path": "phyLayerParameters-v1020.tm9-With-8Tx-FDD-r10",
    "pathAlternatives": [
      "phyLayerParameters-v1060.tm9-With-8Tx-FDD-r10"
    ],
    "kind": "bool",
    "description": "TM9 with 8 TX antenna ports FDD (TS 36.213, Rel-10)"
  },
  {
    "major": "PHY",
    "middle": "FDD-Add",
    "leaf": "tm9-With-8Tx-FDD-v1060",
    "path": "fdd-Add-UE-EUTRA-Capabilities-v1060.phyLayerParameters-v1060.tm9-With-8Tx-FDD-r10",
    "kind": "bool",
    "description": "TM9 with 8 TX antenna ports FDD in FDD-Add-v1060 (TS 36.213, Rel-10)"
  },
  {
    "major": "PHY",
    "middle": "Common",
    "leaf": "ue-SpecificRefSigsSupported",
    "path": "phyLayerParameters.ue-SpecificRefSigsSupported",
    "kind": "bool",
    "description": "UE-specific reference signals support (TS 36.211)"
  },
  {
    "major": "PHY",
    "middle": "Common",
    "leaf": "ue-TxAntennaSelectionSupported",
    "path": "phyLayerParameters.ue-TxAntennaSelectionSupported",
    "kind": "bool",
    "description": "UE transmit antenna selection support (TS 36.214)"
  },
  {
    "major": "PHY",
    "middle": "LAA (Rel-13)",
    "leaf": "downlinkLAA-r13",
    "path": "laa-Parameters-r13.downlinkLAA-r13",
    "kind": "bool",
    "description": "Downlink Licensed Assisted Access support (TS 36.300, Rel-13)"
  },
  {
    "major": "PHY",
    "middle": "Rel13+",
    "leaf": "srs-EnhancementsTDD-r13",
    "path": "phyLayerParameters-v1320.mimo-UE-Parameters-r13.srs-EnhancementsTDD-r13",
    "kind": "bool",
    "description": "SRS enhancements for TDD (TS 36.213 §8.2, Rel-13)"
  },
  {
    "major": "PHY",
    "middle": "Rel14",
    "leaf": "demodulationEnhancements-r14",
    "path": "highSpeedEnhParameters-r14.demodulationEnhancements-r14",
    "kind": "bool",
    "description": "High-speed demodulation enhancements (TS 36.101, Rel-14)"
  },
  {
    "major": "PHY",
    "middle": "Rel14",
    "leaf": "measurementEnhancements-r14",
    "path": "highSpeedEnhParameters-r14.measurementEnhancements-r14",
    "kind": "bool",
    "description": "High-speed measurement enhancements (TS 36.133, Rel-14)"
  },
  {
    "major": "PHY",
    "middle": "Rel14",
    "leaf": "prach-Enhancements-r14",
    "path": "highSpeedEnhParameters-r14.prach-Enhancements-r14",
    "kind": "bool",
    "description": "High-speed PRACH enhancements (TS 36.141, Rel-14)"
  },
  {
    "major": "PHY",
    "middle": "Rel11+",
    "leaf": "tdd-SpecialSubframe-r11",
    "path": "phyLayerParameters-v1130.tdd-SpecialSubframe-r11",
    "kind": "bool",
    "description": "TDD special subframe configuration (TS 36.211 §6.2.3, Rel-11)"
  },
  {
    "major": "PHY",
    "middle": "Common",
    "leaf": "tm5-TDD-r9",
    "path": "phyLayerParameters-v9d0.tm5-TDD-r9",
    "kind": "bool",
    "description": "TM5 (MU-MIMO) for TDD support (TS 36.211 §6.3, Rel-9)"
  },
  {
    "major": "RF",
    "middle": "Rel10+",
    "leaf": "multiNS-Pmax-r10",
    "path": "rf-Parameters-v10j0.multiNS-Pmax-r10",
    "kind": "bool",
    "description": "Multi-NS Pmax (TS 36.101, Rel-10)"
  },
  {
    "major": "RF",
    "middle": "Rel11+",
    "leaf": "freqBandRetrieval-r11",
    "path": "rf-Parameters-v1180.freqBandRetrieval-r11",
    "kind": "bool",
    "description": "Frequency band retrieval (TS 36.101, Rel-11)"
  },
  {
    "major": "RF",
    "middle": "Rel12+",
    "leaf": "freqBandPriorityAdjustment-r12",
    "path": "rf-Parameters-v1250.freqBandPriorityAdjustment-r12",
    "kind": "bool",
    "description": "Frequency band priority adjustment (TS 36.101, Rel-12)"
  },
  {
    "major": "RF",
    "middle": "Rel12+",
    "leaf": "maxLayersMIMO-Indication-r12",
    "path": "rf-Parameters-v12b0.maxLayersMIMO-Indication-r12",
    "kind": "bool",
    "description": "Max layers MIMO indication (TS 36.306, Rel-12)"
  },
  {
    "major": "RF",
    "middle": "Rel13+",
    "leaf": "maximumCCsRetrieval-r13",
    "path": "rf-Parameters-v1310.maximumCCsRetrieval-r13",
    "kind": "bool",
    "description": "Maximum CCs retrieval (TS 36.306, Rel-13)"
  },
  {
    "major": "RF",
    "middle": "Rel13+",
    "leaf": "reducedIntNonContComb-r13",
    "path": "rf-Parameters-v1310.reducedIntNonContComb-r13",
    "kind": "bool",
    "description": "Reduced inter non-contiguous combination (TS 36.101, Rel-13)"
  },
  {
    "major": "RF",
    "middle": "Rel13+",
    "leaf": "skipFallbackCombinations-r13",
    "path": "rf-Parameters-v1310.skipFallbackCombinations-r13",
    "kind": "bool",
    "description": "Skip fallback combinations (TS 36.101, Rel-13)"
  },
  {
    "major": "RF",
    "middle": "Rel13+",
    "leaf": "reducedIntNonContCombRequested-r13",
    "path": "rf-Parameters-v1310.eNB-RequestedParameters-r13.reducedIntNonContCombRequested-r13",
    "kind": "bool",
    "description": "Reduced inter non-contiguous combination requested (TS 36.101, Rel-13)"
  },
  {
    "major": "RF",
    "middle": "Rel13+",
    "leaf": "requestedCCsDL-r13",
    "path": "rf-Parameters-v1310.eNB-RequestedParameters-r13.requestedCCsDL-r13",
    "kind": "number",
    "description": "Requested DL CCs (TS 36.101, Rel-13)"
  },
  {
    "major": "RF",
    "middle": "Rel13+",
    "leaf": "requestedCCsUL-r13",
    "path": "rf-Parameters-v1310.eNB-RequestedParameters-r13.requestedCCsUL-r13",
    "kind": "number",
    "description": "Requested UL CCs (TS 36.101, Rel-13)"
  },
  {
    "major": "RF",
    "middle": "Rel14+",
    "leaf": "diffFallbackCombReport-r14",
    "path": "rf-Parameters-v1430.diffFallbackCombReport-r14",
    "kind": "bool",
    "description": "Different fallback combination report (TS 36.101, Rel-14)"
  },
  {
    "major": "RLC",
    "middle": "Rel14+",
    "leaf": "extendedPollByte-r14",
    "path": "rlc-Parameters-v1430.extendedPollByte-r14",
    "kind": "bool",
    "description": "Extended poll byte in RLC support (TS 36.322, Rel-14)"
  },
  {
    "major": "RLC",
    "middle": "Rel12+",
    "leaf": "extended-RLC-LI-Field-r12",
    "path": "rlc-Parameters-r12.extended-RLC-LI-Field-r12",
    "kind": "bool",
    "description": "Extended RLC LI field 15-bit (TS 36.322, Rel-12)"
  },
  {
    "major": "RLC",
    "middle": "Rel13+",
    "leaf": "extendedRLC-SN-SO-Field-r13",
    "path": "rlc-Parameters-v1310.extendedRLC-SN-SO-Field-r13",
    "kind": "bool",
    "description": "Extended RLC SN and SO field (18-bit, TS 36.322 §6.2, Rel-13)"
  },
  {
    "major": "RLC",
    "middle": "Rel15+",
    "leaf": "flexibleUM-AM-Combinations-r15",
    "path": "rlc-Parameters-v1530.flexibleUM-AM-Combinations-r15",
    "kind": "bool",
    "description": "Flexible UM/AM combinations (TS 36.322, Rel-15)"
  }
];
