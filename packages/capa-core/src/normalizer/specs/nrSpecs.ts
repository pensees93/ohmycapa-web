/**
 * NR (5G) Canonical Feature Specifications
 */

import type { FeatureSpec } from './specTypes';

export const NR_FEATURE_SPECS: FeatureSpec[] = [
  {
    "major": "General",
    "middle": "AS Release",
    "leaf": "accessStratumRelease",
    "path": "accessStratumRelease",
    "kind": "enum",
    "description": "Access Stratum release indicator (TS 38.306)"
  },
  {
    "major": "General",
    "middle": "Filters",
    "leaf": "includeNR-DC",
    "path": "receivedFilters.capabilityRequestFilterCommon.mrdc-Request.includeNR-DC",
    "kind": "bool",
    "description": "NR-DC inclusion in capability request filter (TS 38.331 §6.2.2)"
  },
  {
    "major": "General",
    "middle": "Filters",
    "leaf": "omitEN-DC",
    "path": "receivedFilters.capabilityRequestFilterCommon.mrdc-Request.omitEN-DC",
    "kind": "bool",
    "description": "Omit EN-DC from capability request filter (TS 38.331 §6.2.2)"
  },
  {
    "major": "General",
    "middle": "Filters",
    "leaf": "rrc-SegAllowed-r16",
    "path": "receivedFilters.rrc-SegAllowed-r16",
    "kind": "enum",
    "description": "RRC segmentation allowed indication (TS 38.331 §6.2.2, Rel-16)"
  },
  {
    "major": "General",
    "middle": "Filters",
    "leaf": "type1-SinglePanel-r16",
    "path": "receivedFilters.capabilityRequestFilterCommon.codebookTypeRequest-r16.type1-SinglePanel-r16",
    "kind": "bool",
    "description": "Type 1 single panel codebook request filter (TS 38.331 §6.2.2, Rel-16)"
  },
  {
    "major": "General",
    "middle": "Inactive State",
    "leaf": "inactiveState",
    "path": "inactiveState",
    "kind": "enum",
    "description": "RRC Inactive state support (TS 38.331)"
  },
  {
    "major": "General",
    "middle": "MPS Priority",
    "leaf": "mpsPriorityIndication-r16",
    "path": "mpsPriorityIndication-r16",
    "kind": "enum",
    "description": "MPS priority indication support (TS 38.331, Rel-16)"
  },
  {
    "major": "General",
    "middle": "Overheating Ind",
    "leaf": "overheatingInd",
    "path": "overheatingInd",
    "kind": "enum",
    "description": "Overheating assistance information support (TS 38.331)"
  },
  {
    "major": "General",
    "middle": "Power Saving",
    "leaf": "maxCC-Preference-r16",
    "path": "powSav-Parameters-r16.powSav-ParametersCommon-r16.maxCC-Preference-r16",
    "kind": "enum",
    "description": "Maximum CC preference reporting (TS 38.331, Rel-16)"
  },
  {
    "major": "General",
    "middle": "Power Saving",
    "leaf": "releasePreference-r16",
    "path": "powSav-Parameters-r16.powSav-ParametersCommon-r16.releasePreference-r16",
    "kind": "enum",
    "description": "Release preference reporting (TS 38.331, Rel-16)"
  },
  {
    "major": "General",
    "middle": "RRC Segmentation",
    "leaf": "ul-RRC-Segmentation-r16",
    "path": "ul-RRC-Segmentation-r16",
    "kind": "bool",
    "description": "UL RRC segmentation support (TS 38.331, Rel-16)"
  },
  {
    "major": "General",
    "middle": "RRC Segmentation",
    "leaf": "ul-RRC-MaxCapaSegments-r17",
    "path": "ul-RRC-MaxCapaSegments-r17",
    "kind": "enum",
    "description": "Support for maximum number of capability segments for UL RRC capability transfer (TS 38.331, Rel-17)"
  },
  {
    "major": "IMS",
    "middle": "Common",
    "leaf": "voiceFallbackIndicationEPS-r16",
    "path": "ims-Parameters.ims-ParametersCommon.voiceFallbackIndicationEPS-r16",
    "kind": "bool",
    "description": "Voice fallback indication for EPS (TS 38.306, Rel-16)"
  },
  {
    "major": "IMS",
    "middle": "FRX-Diff",
    "leaf": "voiceOverNR",
    "path": "ims-Parameters.ims-ParametersFRX-Diff.voiceOverNR",
    "kind": "bool",
    "description": "Voice over NR support (TS 38.306)"
  },
  {
    "major": "InterRAT",
    "middle": "EUTRA",
    "leaf": "FreqBandIndicatorEUTRA",
    "path": "interRAT-Parameters.eutra.supportedBandListEUTRA",
    "kind": "numberList",
    "description": "Supported EUTRA bands for inter-RAT (TS 38.306)"
  },
  {
    "major": "InterRAT",
    "middle": "EUTRA",
    "leaf": "mfbi-EUTRA",
    "path": "interRAT-Parameters.eutra.eutra-ParametersCommon.mfbi-EUTRA",
    "kind": "bool",
    "description": "Multi-frequency band indicator for EUTRA (TS 38.101)"
  },
  {
    "major": "InterRAT",
    "middle": "EUTRA",
    "leaf": "multiNS-Pmax-EUTRA",
    "path": "interRAT-Parameters.eutra.eutra-ParametersCommon.multiNS-Pmax-EUTRA",
    "kind": "enum",
    "description": "Multi-NS Pmax for EUTRA (TS 38.101)"
  },
  {
    "major": "InterRAT",
    "middle": "EUTRA",
    "leaf": "rs-SINR-MeasEUTRA",
    "path": "interRAT-Parameters.eutra.eutra-ParametersCommon.rs-SINR-MeasEUTRA",
    "kind": "bool",
    "description": "RS-SINR measurement for EUTRA"
  },
  {
    "major": "InterRAT",
    "middle": "EUTRA",
    "leaf": "rsrqMeasWidebandEUTRA",
    "path": "interRAT-Parameters.eutra.eutra-ParametersXDD-Diff.rsrqMeasWidebandEUTRA",
    "kind": "bool",
    "description": "RSRQ wideband measurement for EUTRA"
  },
  {
    "major": "MAC",
    "middle": "Common",
    "leaf": "lastTransmissionUL-r17",
    "path": "mac-Parameters.mac-ParametersCommon.lastTransmissionUL-r17",
    "kind": "enum",
    "description": "Reporting time since last UL transmission (TS 38.331, Rel-17)"
  },
  {
    "major": "MAC",
    "middle": "Common",
    "leaf": "lch-ToSCellRestriction",
    "path": "mac-Parameters.mac-ParametersCommon.lch-ToSCellRestriction",
    "kind": "enum",
    "description": "Logical channel to SCell restriction support (TS 38.321 §5.4)"
  },
  {
    "major": "MAC",
    "middle": "Common",
    "leaf": "lcp-Restriction",
    "path": "mac-Parameters.mac-ParametersCommon.lcp-Restriction",
    "kind": "enum",
    "description": "Logical channel prioritization restriction support (TS 38.321 §5.4)"
  },
  {
    "major": "MAC",
    "middle": "XDD-Diff",
    "leaf": "multipleConfiguredGrants",
    "path": "mac-Parameters.mac-ParametersXDD-Diff.multipleConfiguredGrants",
    "kind": "enum",
    "description": "Multiple configured grants support (TS 38.321 §5.8)"
  },
  {
    "major": "MAC",
    "middle": "XDD-Diff",
    "leaf": "multipleSR-Configurations",
    "path": "mac-Parameters.mac-ParametersXDD-Diff.multipleSR-Configurations",
    "kind": "enum",
    "description": "Multiple Scheduling Request configurations support (TS 38.321 §5.4)"
  },
  {
    "major": "MAC",
    "middle": "XDD-Diff",
    "leaf": "logicalChannelSR-DelayTimer",
    "path": "mac-Parameters.mac-ParametersXDD-Diff.logicalChannelSR-DelayTimer",
    "kind": "bool",
    "description": "Logical channel SR delay timer support"
  },
  {
    "major": "MAC",
    "middle": "XDD-Diff",
    "leaf": "longDRX-Cycle",
    "path": "mac-Parameters.mac-ParametersXDD-Diff.longDRX-Cycle",
    "kind": "bool",
    "description": "Long DRX cycle support (TS 38.321 §5.7)"
  },
  {
    "major": "MAC",
    "middle": "XDD-Diff",
    "leaf": "shortDRX-Cycle",
    "path": "mac-Parameters.mac-ParametersXDD-Diff.shortDRX-Cycle",
    "kind": "bool",
    "description": "Short DRX cycle support (TS 38.321 §5.7)"
  },
  {
    "major": "Meas/Mob",
    "middle": "Common",
    "leaf": "eutra-CGI-Reporting",
    "path": "measAndMobParameters.measAndMobParametersCommon.eutra-CGI-Reporting",
    "kind": "bool",
    "description": "EUTRA CGI reporting"
  },
  {
    "major": "Meas/Mob",
    "middle": "Common",
    "leaf": "eventB-MeasAndReport",
    "path": "measAndMobParameters.measAndMobParametersCommon.eventB-MeasAndReport",
    "kind": "bool",
    "description": "Event-B measurement reporting"
  },
  {
    "major": "Meas/Mob",
    "middle": "Common",
    "leaf": "nr-CGI-Reporting",
    "path": "measAndMobParameters.measAndMobParametersCommon.nr-CGI-Reporting",
    "kind": "bool",
    "description": "NR CGI reporting"
  },
  {
    "major": "Meas/Mob",
    "middle": "Common",
    "leaf": "nr-CGI-Reporting-ENDC",
    "path": "measAndMobParameters.measAndMobParametersCommon.nr-CGI-Reporting-ENDC",
    "kind": "bool",
    "description": "NR CGI reporting for EN-DC"
  },
  {
    "major": "Meas/Mob",
    "middle": "Common",
    "leaf": "pcellT312-r16",
    "path": "measAndMobParameters.measAndMobParametersCommon.pcellT312-r16",
    "kind": "enum",
    "description": "T312 based fast failure recovery for PCell (TS 38.306, Rel-16)"
  },
  {
    "major": "Meas/Mob",
    "middle": "Common",
    "leaf": "periodicEUTRA-MeasAndReport",
    "path": "measAndMobParameters.measAndMobParametersCommon.periodicEUTRA-MeasAndReport",
    "kind": "bool",
    "description": "Periodic EUTRA measurement reporting"
  },
  {
    "major": "Meas/Mob",
    "middle": "Common",
    "leaf": "ssb-AndCSI-RS-RLM",
    "path": "measAndMobParameters.measAndMobParametersCommon.ssb-AndCSI-RS-RLM",
    "kind": "bool",
    "description": "SSB and CSI-RS based RLM (TS 38.133)"
  },
  {
    "major": "Meas/Mob",
    "middle": "Common",
    "leaf": "ssb-RLM",
    "path": "measAndMobParameters.measAndMobParametersCommon.ssb-RLM",
    "kind": "bool",
    "description": "SSB-based RLM (TS 38.133)"
  },
  {
    "major": "Meas/Mob",
    "middle": "Common",
    "leaf": "supportedGapPattern",
    "path": "measAndMobParameters.measAndMobParametersCommon.supportedGapPattern",
    "kind": "enum",
    "description": "Supported gap pattern (TS 38.133)"
  },
  {
    "major": "Meas/Mob",
    "middle": "FRX-Diff",
    "leaf": "csi-RS-RLM",
    "path": "measAndMobParameters.measAndMobParametersFRX-Diff.csi-RS-RLM",
    "kind": "bool",
    "description": "CSI-RS based RLM"
  },
  {
    "major": "Meas/Mob",
    "middle": "FRX-Diff",
    "leaf": "handoverInterF-FRX",
    "path": "measAndMobParameters.measAndMobParametersFRX-Diff.handoverInterF",
    "kind": "enum",
    "description": "Inter-frequency handover (FRX-Diff, TS 38.133)"
  },
  {
    "major": "Meas/Mob",
    "middle": "FRX-Diff",
    "leaf": "handoverLTE-EPC-FRX",
    "path": "measAndMobParameters.measAndMobParametersFRX-Diff.handoverLTE-EPC",
    "kind": "enum",
    "description": "Handover to LTE EPC (FRX-Diff, TS 38.133)"
  },
  {
    "major": "Meas/Mob",
    "middle": "FRX-Diff",
    "leaf": "maxNumberResource-CSI-RS-RLM",
    "path": "measAndMobParameters.measAndMobParametersFRX-Diff.maxNumberResource-CSI-RS-RLM",
    "kind": "enum",
    "description": "Max number of CSI-RS resources for RLM (TS 38.133)"
  },
  {
    "major": "Meas/Mob",
    "middle": "FRX-Diff",
    "leaf": "simultaneousRxDataSSB-DiffNumerology",
    "path": "measAndMobParameters.measAndMobParametersFRX-Diff.simultaneousRxDataSSB-DiffNumerology",
    "kind": "bool",
    "description": "Simultaneous RX data and SSB with different numerology (TS 38.133)"
  },
  {
    "major": "Meas/Mob",
    "middle": "FRX-Diff",
    "leaf": "ss-SINR-Meas",
    "path": "measAndMobParameters.measAndMobParametersFRX-Diff.ss-SINR-Meas",
    "kind": "bool",
    "description": "SS-SINR measurement"
  },
  {
    "major": "Meas/Mob",
    "middle": "GNSS Location R16",
    "leaf": "gnss-Location-r16",
    "path": "ue-BasedPerfMeas-Parameters-r16.gnss-Location-r16",
    "kind": "bool",
    "description": "GNSS location capability (TS 38.306, Rel-16)"
  },
  {
    "major": "Meas/Mob",
    "middle": "Common",
    "leaf": "handoverFDD-TDD",
    "path": "measAndMobParameters.measAndMobParametersCommon.handoverFDD-TDD",
    "kind": "enum",
    "description": "Handover between FDD and TDD (TS 38.306)"
  },
  {
    "major": "Meas/Mob",
    "middle": "Common",
    "leaf": "independentGapConfig",
    "path": "measAndMobParameters.measAndMobParametersCommon.independentGapConfig",
    "kind": "enum",
    "description": "Independent measurement gap configuration support (TS 38.306)"
  },
  {
    "major": "Meas/Mob",
    "middle": "Common",
    "leaf": "maxNumberCSI-RS-RRM-RS-SINR",
    "path": "measAndMobParameters.measAndMobParametersCommon.maxNumberCSI-RS-RRM-RS-SINR",
    "kind": "enum",
    "description": "Max number of CSI-RS resources for RRM/RS-SINR measurement (TS 38.133)"
  },
  {
    "major": "Meas/Mob",
    "middle": "Common",
    "leaf": "reportAddNeighMeasForPeriodic-r16",
    "path": "measAndMobParameters.measAndMobParametersCommon.reportAddNeighMeasForPeriodic-r16",
    "kind": "enum",
    "description": "Reporting of additional neighboring cells for periodic reporting (TS 38.331, Rel-16)"
  },
  {
    "major": "Meas/Mob",
    "middle": "FRX-Diff",
    "leaf": "csi-RSRP-AndRSRQ-MeasWithoutSSB",
    "path": "measAndMobParameters.measAndMobParametersFRX-Diff.csi-RSRP-AndRSRQ-MeasWithoutSSB",
    "kind": "enum",
    "description": "CSI-RSRP and CSI-RSRQ measurement without SSB (TS 38.133)"
  },
  {
    "major": "Meas/Mob",
    "middle": "FRX-Diff",
    "leaf": "csi-RSRP-AndRSRQ-MeasWithSSB",
    "path": "measAndMobParameters.measAndMobParametersFRX-Diff.csi-RSRP-AndRSRQ-MeasWithSSB",
    "kind": "enum",
    "description": "CSI-RSRP and CSI-RSRQ measurement with SSB (TS 38.133)"
  },
  {
    "major": "Meas/Mob",
    "middle": "FRX-Diff",
    "leaf": "csi-SINR-Meas",
    "path": "measAndMobParameters.measAndMobParametersFRX-Diff.csi-SINR-Meas",
    "kind": "enum",
    "description": "CSI-SINR measurement support (TS 38.133)"
  },
  {
    "major": "Meas/Mob",
    "middle": "XDD-Diff",
    "leaf": "sftd-MeasNR-Neigh",
    "path": "measAndMobParameters.measAndMobParametersXDD-Diff.sftd-MeasNR-Neigh",
    "kind": "enum",
    "description": "SFTD measurement for NR neighbor cells (TS 38.133 §10.2)"
  },
  {
    "major": "Meas/Mob",
    "middle": "RACH Report R16",
    "leaf": "rach-Report-r16",
    "path": "son-Parameters-r16.rach-Report-r16",
    "kind": "bool",
    "description": "RACH report (TS 38.306, Rel-16)"
  },
  {
    "major": "Meas/Mob",
    "middle": "XDD-Diff",
    "leaf": "eventA-MeasAndReport",
    "path": "measAndMobParameters.measAndMobParametersXDD-Diff.eventA-MeasAndReport",
    "kind": "bool",
    "description": "Event-A triggered measurement reporting"
  },
  {
    "major": "Meas/Mob",
    "middle": "XDD-Diff",
    "leaf": "handoverInterF",
    "path": "measAndMobParameters.measAndMobParametersXDD-Diff.handoverInterF",
    "kind": "bool",
    "description": "Inter-frequency handover"
  },
  {
    "major": "Meas/Mob",
    "middle": "XDD-Diff",
    "leaf": "handoverLTE-EPC",
    "path": "measAndMobParameters.measAndMobParametersXDD-Diff.handoverLTE-EPC",
    "kind": "bool",
    "description": "Handover to LTE EPC"
  },
  {
    "major": "Meas/Mob",
    "middle": "XDD-Diff",
    "leaf": "intraAndInterF-MeasAndReport",
    "path": "measAndMobParameters.measAndMobParametersXDD-Diff.intraAndInterF-MeasAndReport",
    "kind": "bool",
    "description": "Intra- and inter-frequency measurement and reporting"
  },
  {
    "major": "MRDC",
    "middle": "General Parameters NRDC",
    "leaf": "splitDRB-withUL-Both-MCG-SCG",
    "path": "nrdc-Parameters.generalParametersNRDC.splitDRB-withUL-Both-MCG-SCG",
    "kind": "enum",
    "description": "Split DRB with UL on both MCG and SCG support (TS 37.340, Rel-15)"
  },
  {
    "major": "MRDC",
    "middle": "Meas And Mob Parameters NRDC V1610",
    "leaf": "pscellT312-r16",
    "path": "nrdc-Parameters-v1610.measAndMobParametersNRDC-v1610.measAndMobParametersMRDC-Common-v1610.pscellT312-r16",
    "kind": "enum",
    "description": "T312 timer for PSCell in NR-DC (TS 38.331 §5.3.11, Rel-16)"
  },
  {
    "major": "PDCP",
    "middle": "Misc",
    "leaf": "shortSN",
    "path": "pdcp-Parameters.shortSN",
    "kind": "bool",
    "description": "Short PDCP SN (7-bit) support (TS 38.323 §6.2)"
  },
  {
    "major": "PDCP",
    "middle": "Out Of Order Delivery",
    "leaf": "outOfOrderDelivery",
    "path": "pdcp-Parameters.outOfOrderDelivery",
    "kind": "enum",
    "description": "Out-of-order PDCP SDU delivery support (TS 38.323 §5.4)"
  },
  {
    "major": "PDCP",
    "middle": "General",
    "leaf": "pdcp-DuplicationMCG-OrSCG-DRB",
    "path": "pdcp-Parameters.pdcp-DuplicationMCG-OrSCG-DRB",
    "kind": "enum",
    "description": "CA-based PDCP duplication over MCG or SCG DRB support (TS 38.306)"
  },
  {
    "major": "PDCP",
    "middle": "General",
    "leaf": "pdcp-DuplicationSRB",
    "path": "pdcp-Parameters.pdcp-DuplicationSRB",
    "kind": "enum",
    "description": "PDCP duplication for SRB support (TS 38.306)"
  },
  {
    "major": "PDCP",
    "middle": "ROHC",
    "leaf": "continueROHC-Context",
    "path": "pdcp-Parameters.continueROHC-Context",
    "kind": "bool",
    "description": "Continue ROHC context after HO (TS 38.323 §5.7.2)"
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
    "leaf": "uplinkOnlyROHC-Profiles",
    "path": "pdcp-Parameters.uplinkOnlyROHC-Profiles",
    "kind": "stringList",
    "description": "ROHC profiles supported in UL only"
  },
  {
    "major": "PHY",
    "middle": "Band",
    "leaf": "bwp-SameNumerology",
    "path": "rf-Parameters.supportedBandListNR.bwp-SameNumerology",
    "kind": "enum",
    "description": "BWP adaptation with same numerology support (upto 2 or 4 BWPs, TS 38.306 §4.2.7)"
  },
  {
    "major": "PHY",
    "middle": "Band",
    "leaf": "bwp-WithoutRestriction",
    "path": "rf-Parameters.supportedBandListNR.bwp-WithoutRestriction",
    "kind": "bool",
    "description": "BWP operation without bandwidth restriction (TS 38.306 §4.2.7)"
  },
  {
    "major": "PHY",
    "middle": "Band",
    "leaf": "maxUplinkDutyCycle-PC2-FR1",
    "path": "rf-Parameters.supportedBandListNR.maxUplinkDutyCycle-PC2-FR1",
    "kind": "enum",
    "description": "Max uplink duty cycle for PC2 FR1 (TS 38.101-1)"
  },
  {
    "major": "PHY",
    "middle": "Band",
    "leaf": "multipleTCI",
    "path": "rf-Parameters.supportedBandListNR.multipleTCI",
    "kind": "bool",
    "description": "Multiple TCI support (TS 38.214)"
  },
  {
    "major": "PHY",
    "middle": "Band",
    "leaf": "powerBoosting-pi2BPSK",
    "path": "rf-Parameters.supportedBandListNR.powerBoosting-pi2BPSK",
    "kind": "bool",
    "description": "Power boosting with pi/2 BPSK support (TS 38.101-1)"
  },
  {
    "major": "PHY",
    "middle": "Band",
    "leaf": "pusch-256QAM",
    "path": "rf-Parameters.supportedBandListNR.pusch-256QAM",
    "kind": "bool",
    "description": "PUSCH 256QAM support (TS 38.214)"
  },
  {
    "major": "PHY",
    "middle": "Band",
    "leaf": "rateMatchingLTE-CRS",
    "path": "rf-Parameters.supportedBandListNR.rateMatchingLTE-CRS",
    "kind": "bool",
    "description": "PDSCH rate matching around LTE CRS for DSS support (TS 38.306 §4.2.7)"
  },
  {
    "major": "PHY",
    "middle": "Band",
    "leaf": "ue-PowerClass",
    "path": "rf-Parameters.supportedBandListNR.ue-PowerClass",
    "kind": "enum",
    "description": "UE power class (TS 38.101)"
  },
  {
    "major": "PHY",
    "middle": "Beam",
    "leaf": "aperiodicBeamReport",
    "path": "rf-Parameters.supportedBandListNR.mimo-ParametersPerBand.aperiodicBeamReport",
    "kind": "bool",
    "description": "Aperiodic beam report support (TS 38.214)"
  },
  {
    "major": "PHY",
    "middle": "Beam",
    "leaf": "maxNumberCSI-RS-BFD",
    "path": "rf-Parameters.supportedBandListNR.mimo-ParametersPerBand.maxNumberCSI-RS-BFD",
    "kind": "number",
    "description": "Max CSI-RS for BFD (TS 38.214)"
  },
  {
    "major": "PHY",
    "middle": "Beam",
    "leaf": "maxNumberCSI-RS-SSB-CBD",
    "path": "rf-Parameters.supportedBandListNR.mimo-ParametersPerBand.maxNumberCSI-RS-SSB-CBD",
    "pathAlternatives": [
      "rf-Parameters.supportedBandListNR.maxNumberCSI-RS-SSB-CBD"
    ],
    "kind": "number",
    "description": "Max CSI-RS/SSB for CBD (TS 38.214)"
  },
  {
    "major": "PHY",
    "middle": "Beam",
    "leaf": "maxNumberNonGroupBeamReporting",
    "path": "rf-Parameters.supportedBandListNR.mimo-ParametersPerBand.maxNumberNonGroupBeamReporting",
    "kind": "enum",
    "description": "Max number non-group beam reporting (TS 38.214)"
  },
  {
    "major": "PHY",
    "middle": "Beam",
    "leaf": "maxNumberSSB-BFD",
    "path": "rf-Parameters.supportedBandListNR.mimo-ParametersPerBand.maxNumberSSB-BFD",
    "kind": "number",
    "description": "Max SSB for BFD (TS 38.214)"
  },
  {
    "major": "PHY",
    "middle": "Beam",
    "leaf": "periodicBeamReport",
    "path": "rf-Parameters.supportedBandListNR.mimo-ParametersPerBand.periodicBeamReport",
    "kind": "bool",
    "description": "Periodic beam report support (TS 38.214)"
  },
  {
    "major": "PHY",
    "middle": "Beam",
    "leaf": "pusch-TransCoherence",
    "path": "rf-Parameters.supportedBandListNR.mimo-ParametersPerBand.pusch-TransCoherence",
    "kind": "enum",
    "description": "PUSCH transmission coherence (TS 38.214)"
  },
  {
    "major": "PHY",
    "middle": "Common",
    "leaf": "absoluteTPC-Command",
    "path": "phy-Parameters.phy-ParametersFRX-Diff.absoluteTPC-Command",
    "kind": "bool",
    "description": "Absolute TPC command support (TS 38.213)"
  },
  {
    "major": "PHY",
    "middle": "Common",
    "leaf": "almostContiguousCP-OFDM-UL",
    "path": "phy-Parameters.phy-ParametersFRX-Diff.almostContiguousCP-OFDM-UL",
    "kind": "bool",
    "description": "Almost contiguous CP-OFDM UL support (TS 38.101)"
  },
  {
    "major": "PHY",
    "middle": "Common",
    "leaf": "bwp-SwitchingDelay",
    "path": "phy-Parameters.phy-ParametersCommon.bwp-SwitchingDelay",
    "kind": "enum",
    "description": "BWP switching delay type (TS 38.214)"
  },
  {
    "major": "PHY",
    "middle": "Common",
    "leaf": "cbg-FlushIndication-DL",
    "path": "phy-Parameters.phy-ParametersCommon.cbg-FlushIndication-DL",
    "kind": "enum",
    "description": "CBG flush indication for DL (TS 38.214 §5.1)"
  },
  {
    "major": "PHY",
    "middle": "Common",
    "leaf": "cbg-TransIndication-DL",
    "path": "phy-Parameters.phy-ParametersCommon.cbg-TransIndication-DL",
    "kind": "enum",
    "description": "CBG transmission indication for DL (TS 38.214 §5.1)"
  },
  {
    "major": "PHY",
    "middle": "Common",
    "leaf": "configuredUL-GrantType1",
    "path": "phy-Parameters.phy-ParametersCommon.configuredUL-GrantType1",
    "kind": "enum",
    "description": "Configured UL Grant Type 1 support (TS 38.214)"
  },
  {
    "major": "PHY",
    "middle": "Common",
    "leaf": "configuredUL-GrantType2",
    "path": "phy-Parameters.phy-ParametersCommon.configuredUL-GrantType2",
    "kind": "enum",
    "description": "Configured UL Grant Type 2 support (TS 38.214)"
  },
  {
    "major": "PHY",
    "middle": "Common",
    "leaf": "csi-ReportWithoutPMI",
    "path": "phy-Parameters.phy-ParametersFRX-Diff.csi-ReportWithoutPMI",
    "kind": "bool",
    "description": "CSI report without PMI (TS 38.214)"
  },
  {
    "major": "PHY",
    "middle": "Common",
    "leaf": "csi-RS-CFRA-ForHO",
    "path": "phy-Parameters.phy-ParametersCommon.csi-RS-CFRA-ForHO",
    "kind": "enum",
    "description": "CSI-RS based CFRA for handover (TS 38.213 §8.3)"
  },
  {
    "major": "PHY",
    "middle": "Common",
    "leaf": "diffSymbol",
    "path": "phy-Parameters.phy-ParametersFRX-Diff.mux-SR-HARQ-ACK-CSI-PUCCH-OncePerSlot.diffSymbol",
    "kind": "enum",
    "description": "Different symbol mux for SR/HARQ-ACK/CSI PUCCH once per slot (TS 38.213)"
  },
  {
    "major": "PHY",
    "middle": "Common",
    "leaf": "dl-64QAM-MCS-TableAlt",
    "path": "phy-Parameters.phy-ParametersCommon.dl-64QAM-MCS-TableAlt",
    "pathAlternatives": [
      "phy-Parameters.phy-ParametersFRX-Diff.dl-64QAM-MCS-TableAlt"
    ],
    "kind": "bool",
    "description": "Alternative 64QAM MCS table for PDSCH (TS 38.306)"
  },
  {
    "major": "PHY",
    "middle": "Common",
    "leaf": "dl-SchedulingOffset-PDSCH-TypeA",
    "path": "phy-Parameters.phy-ParametersXDD-Diff.dl-SchedulingOffset-PDSCH-TypeA",
    "kind": "bool",
    "description": "DL scheduling offset PDSCH type A (TS 38.214)"
  },
  {
    "major": "PHY",
    "middle": "Common",
    "leaf": "dl-SchedulingOffset-PDSCH-TypeA-FRX",
    "path": "phy-Parameters.phy-ParametersFRX-Diff.dl-SchedulingOffset-PDSCH-TypeA",
    "kind": "enum",
    "description": "DL scheduling offset PDSCH type A (FRX-Diff, TS 38.214)"
  },
  {
    "major": "PHY",
    "middle": "Common",
    "leaf": "dl-SchedulingOffset-PDSCH-TypeB",
    "path": "phy-Parameters.phy-ParametersFRX-Diff.dl-SchedulingOffset-PDSCH-TypeB",
    "pathAlternatives": [
      "phy-Parameters.phy-ParametersXDD-Diff.dl-SchedulingOffset-PDSCH-TypeB"
    ],
    "kind": "enum",
    "description": "DL scheduling offset PDSCH type B (TS 38.214)"
  },
  {
    "major": "PHY",
    "middle": "Common",
    "leaf": "downlinkSPS",
    "path": "phy-Parameters.phy-ParametersCommon.downlinkSPS",
    "kind": "enum",
    "description": "Downlink Semi-Persistent Scheduling (SPS) support (TS 38.306)"
  },
  {
    "major": "PHY",
    "middle": "Common",
    "leaf": "dynamicBetaOffsetInd-HARQ-ACK-CSI",
    "path": "phy-Parameters.phy-ParametersCommon.dynamicBetaOffsetInd-HARQ-ACK-CSI",
    "kind": "bool",
    "description": "Dynamic beta offset indication for HARQ-ACK/CSI (TS 38.213)"
  },
  {
    "major": "PHY",
    "middle": "Common",
    "leaf": "dynamicHARQ-ACK-CodeB-CBG-Retx-DL",
    "path": "phy-Parameters.phy-ParametersCommon.dynamicHARQ-ACK-CodeB-CBG-Retx-DL",
    "kind": "enum",
    "description": "Dynamic HARQ-ACK codebook size for CBG retransmission (TS 38.306)"
  },
  {
    "major": "PHY",
    "middle": "Common",
    "leaf": "dynamicHARQ-ACK-Codebook",
    "path": "phy-Parameters.phy-ParametersCommon.dynamicHARQ-ACK-Codebook",
    "kind": "bool",
    "description": "Dynamic HARQ-ACK codebook support (TS 38.213 §9.1)"
  },
  {
    "major": "PHY",
    "middle": "Common",
    "leaf": "dynamicPRB-BundlingDL",
    "path": "phy-Parameters.phy-ParametersCommon.dynamicPRB-BundlingDL",
    "kind": "bool",
    "description": "Dynamic PRB bundling for DL (TS 38.214)"
  },
  {
    "major": "PHY",
    "middle": "Common",
    "leaf": "dynamicSwitchRA-Type0-1-PDSCH",
    "path": "phy-Parameters.phy-ParametersCommon.dynamicSwitchRA-Type0-1-PDSCH",
    "kind": "enum",
    "description": "Dynamic switching between RA Type 0 and 1 for PDSCH (TS 38.306)"
  },
  {
    "major": "PHY",
    "middle": "Common",
    "leaf": "dynamicSwitchRA-Type0-1-PUSCH",
    "path": "phy-Parameters.phy-ParametersCommon.dynamicSwitchRA-Type0-1-PUSCH",
    "kind": "bool",
    "description": "Dynamic switch RA Type 0/1 PUSCH (TS 38.214)"
  },
  {
    "major": "PHY",
    "middle": "Common",
    "leaf": "fr1fdd-FR1TDD-CA-SpCellOnFR1FDD",
    "path": "phy-Parameters.phy-ParametersCommon.spCellPlacement.fr1fdd-FR1TDD-CA-SpCellOnFR1FDD",
    "kind": "enum",
    "description": "FR1 FDD/TDD CA with SpCell on FR1 FDD (TS 38.101)"
  },
  {
    "major": "PHY",
    "middle": "Common",
    "leaf": "fr1fdd-FR1TDD-CA-SpCellOnFR1TDD",
    "path": "phy-Parameters.phy-ParametersCommon.spCellPlacement.fr1fdd-FR1TDD-CA-SpCellOnFR1TDD",
    "kind": "enum",
    "description": "FR1 FDD/TDD CA with SpCell on FR1 TDD (TS 38.101)"
  },
  {
    "major": "PHY",
    "middle": "Common",
    "leaf": "fr1fdd-FR1TDD-FR2TDD-CA-SpCellOnFR1FDD",
    "path": "phy-Parameters.phy-ParametersCommon.spCellPlacement.fr1fdd-FR1TDD-FR2TDD-CA-SpCellOnFR1FDD",
    "kind": "enum",
    "description": "FR1 FDD/TDD/FR2 TDD CA with SpCell on FR1 FDD (TS 38.101)"
  },
  {
    "major": "PHY",
    "middle": "Common",
    "leaf": "fr1fdd-FR1TDD-FR2TDD-CA-SpCellOnFR1TDD",
    "path": "phy-Parameters.phy-ParametersCommon.spCellPlacement.fr1fdd-FR1TDD-FR2TDD-CA-SpCellOnFR1TDD",
    "kind": "enum",
    "description": "FR1 FDD/TDD/FR2 TDD CA with SpCell on FR1 TDD (TS 38.101)"
  },
  {
    "major": "PHY",
    "middle": "Common",
    "leaf": "fr1fdd-FR2TDD-CA-SpCellOnFR1FDD",
    "path": "phy-Parameters.phy-ParametersCommon.spCellPlacement.fr1fdd-FR2TDD-CA-SpCellOnFR1FDD",
    "kind": "enum",
    "description": "FR1 FDD/FR2 TDD CA with SpCell on FR1 FDD (TS 38.101)"
  },
  {
    "major": "PHY",
    "middle": "Common",
    "leaf": "fr1tdd-FR2TDD-CA-SpCellOnFR1TDD",
    "path": "phy-Parameters.phy-ParametersCommon.spCellPlacement.fr1tdd-FR2TDD-CA-SpCellOnFR1TDD",
    "kind": "enum",
    "description": "FR1 TDD/FR2 TDD CA with SpCell on FR1 TDD (TS 38.101)"
  },
  {
    "major": "PHY",
    "middle": "Common",
    "leaf": "interleavingVRB-ToPRB-PDSCH",
    "path": "phy-Parameters.phy-ParametersCommon.interleavingVRB-ToPRB-PDSCH",
    "kind": "enum",
    "description": "Interleaved VRB-to-PRB mapping for PDSCH (TS 38.306)"
  },
  {
    "major": "PHY",
    "middle": "Common",
    "leaf": "interSlotFreqHopping-PUSCH",
    "path": "phy-Parameters.phy-ParametersCommon.interSlotFreqHopping-PUSCH",
    "kind": "enum",
    "description": "Inter-slot frequency hopping for PUSCH (TS 38.306)"
  },
  {
    "major": "PHY",
    "middle": "Common",
    "leaf": "intraSlotFreqHopping-PUSCH",
    "path": "phy-Parameters.phy-ParametersCommon.intraSlotFreqHopping-PUSCH",
    "pathAlternatives": [
      "phy-Parameters.phy-ParametersFRX-Diff.intraSlotFreqHopping-PUSCH"
    ],
    "kind": "bool",
    "description": "Intra-slot frequency hopping for PUSCH (TS 38.306)"
  },
  {
    "major": "PHY",
    "middle": "Common",
    "leaf": "maxLayersMIMO-Indication",
    "path": "phy-Parameters.phy-ParametersCommon.maxLayersMIMO-Indication",
    "kind": "bool",
    "description": "Max layers MIMO indication (TS 38.306)"
  },
  {
    "major": "PHY",
    "middle": "Common",
    "leaf": "maxNumberResourcesPerBand",
    "path": "phy-Parameters.phy-ParametersCommon.codebookVariantsList-r16.maxNumberResourcesPerBand",
    "pathAlternatives": [
      "phy-Parameters.phy-ParametersFRX-Diff.codebookVariantsList-r16.maxNumberResourcesPerBand"
    ],
    "kind": "number",
    "description": "Max number of NZP CSI-RS resources per band (TS 38.214, Rel-16)"
  },
  {
    "major": "PHY",
    "middle": "Common",
    "leaf": "maxNumberSearchSpaces",
    "path": "phy-Parameters.phy-ParametersCommon.maxNumberSearchSpaces",
    "kind": "enum",
    "description": "Max number of search spaces (TS 38.213)"
  },
  {
    "major": "PHY",
    "middle": "Common",
    "leaf": "maxNumberTxPortsPerResource",
    "path": "phy-Parameters.phy-ParametersCommon.codebookVariantsList-r16.maxNumberTxPortsPerResource",
    "pathAlternatives": [
      "phy-Parameters.phy-ParametersFRX-Diff.codebookVariantsList-r16.maxNumberTxPortsPerResource"
    ],
    "kind": "enum",
    "description": "Max number of TX ports per NZP CSI-RS resource (TS 38.214, Rel-16)"
  },
  {
    "major": "PHY",
    "middle": "Common",
    "leaf": "multipleCORESET",
    "path": "phy-Parameters.phy-ParametersFRX-Diff.multipleCORESET",
    "kind": "bool",
    "description": "Multiple CORESET support"
  },
  {
    "major": "PHY",
    "middle": "Common",
    "leaf": "mux-HARQ-ACK-PUSCH-DiffSymbol",
    "path": "phy-Parameters.phy-ParametersFRX-Diff.mux-HARQ-ACK-PUSCH-DiffSymbol",
    "kind": "bool",
    "description": "Mux HARQ-ACK on PUSCH different symbol (TS 38.213)"
  },
  {
    "major": "PHY",
    "middle": "Common",
    "leaf": "mux-HARQ-ACK-withoutPUCCH-onPUSCH-r16",
    "path": "phy-Parameters.phy-ParametersCommon.mux-HARQ-ACK-withoutPUCCH-onPUSCH-r16",
    "kind": "enum",
    "description": "Multiplexing HARQ-ACK without PUCCH on PUSCH (TS 38.213, Rel-16)"
  },
  {
    "major": "PHY",
    "middle": "Common",
    "leaf": "mux-SR-HARQ-ACK-CSI-PUCCH-MultiPerSlot",
    "path": "phy-Parameters.phy-ParametersFRX-Diff.mux-SR-HARQ-ACK-CSI-PUCCH-MultiPerSlot",
    "kind": "enum",
    "description": "Mux SR/HARQ-ACK/CSI on PUCCH multiple per slot (TS 38.213)"
  },
  {
    "major": "PHY",
    "middle": "Common",
    "leaf": "mux-SR-HARQ-ACK-PUCCH",
    "path": "phy-Parameters.phy-ParametersFRX-Diff.mux-SR-HARQ-ACK-PUCCH",
    "kind": "bool",
    "description": "Mux SR/HARQ-ACK on PUCCH (TS 38.213)"
  },
  {
    "major": "PHY",
    "middle": "Common",
    "leaf": "non-SharedSpectrumChAccess-r16",
    "path": "phy-Parameters.phy-ParametersCommon.pusch-RepetitionTypeA-r16.non-SharedSpectrumChAccess-r16",
    "kind": "enum",
    "description": "PUSCH repetition Type A in non-shared spectrum channel access (TS 38.213, Rel-16)"
  },
  {
    "major": "PHY",
    "middle": "Common",
    "leaf": "nzp-CSI-RS-IntefMgmt",
    "path": "phy-Parameters.phy-ParametersCommon.nzp-CSI-RS-IntefMgmt",
    "kind": "enum",
    "description": "NZP CSI-RS interference management (TS 38.214 §5.2)"
  },
  {
    "major": "PHY",
    "middle": "Common",
    "leaf": "oneFL-DMRS-ThreeAdditionalDMRS-UL",
    "path": "phy-Parameters.phy-ParametersFRX-Diff.oneFL-DMRS-ThreeAdditionalDMRS-UL",
    "kind": "enum",
    "description": "One FL-DMRS with three additional DMRS UL (TS 38.214)"
  },
  {
    "major": "PHY",
    "middle": "Common",
    "leaf": "oneFL-DMRS-TwoAdditionalDMRS-UL",
    "path": "phy-Parameters.phy-ParametersFRX-Diff.oneFL-DMRS-TwoAdditionalDMRS-UL",
    "kind": "bool",
    "description": "One FL-DMRS with two additional DMRS UL (TS 38.214)"
  },
  {
    "major": "PHY",
    "middle": "Common",
    "leaf": "onePortsPTRS",
    "path": "phy-Parameters.phy-ParametersFRX-Diff.onePortsPTRS",
    "kind": "enum",
    "description": "One port PTRS support (TS 38.214)"
  },
  {
    "major": "PHY",
    "middle": "Common",
    "leaf": "onePUCCH-LongAndShortFormat",
    "path": "phy-Parameters.phy-ParametersCommon.onePUCCH-LongAndShortFormat",
    "pathAlternatives": [
      "phy-Parameters.phy-ParametersFRX-Diff.onePUCCH-LongAndShortFormat"
    ],
    "kind": "bool",
    "description": "One long and one short PUCCH format support (TS 38.306)"
  },
  {
    "major": "PHY",
    "middle": "Common",
    "leaf": "pdcch-BlindDetectionCA",
    "path": "phy-Parameters.phy-ParametersFRX-Diff.pdcch-BlindDetectionCA",
    "kind": "number",
    "description": "PDCCH blind detection for CA (TS 38.213)"
  },
  {
    "major": "PHY",
    "middle": "Common",
    "leaf": "pdcch-BlindDetectionMCG-UE",
    "path": "phy-Parameters.phy-ParametersFRX-Diff.pdcch-BlindDetectionNRDC.pdcch-BlindDetectionMCG-UE",
    "kind": "number",
    "description": "Max number of monitored PDCCH candidates for MCG (TS 38.213)"
  },
  {
    "major": "PHY",
    "middle": "Common",
    "leaf": "pdcch-BlindDetectionSCG-UE",
    "path": "phy-Parameters.phy-ParametersFRX-Diff.pdcch-BlindDetectionNRDC.pdcch-BlindDetectionSCG-UE",
    "kind": "number",
    "description": "Max number of monitored PDCCH candidates for SCG (TS 38.213)"
  },
  {
    "major": "PHY",
    "middle": "Common",
    "leaf": "pdcch-MonitoringSingleOccasion",
    "path": "phy-Parameters.phy-ParametersFR1.pdcch-MonitoringSingleOccasion",
    "kind": "enum",
    "description": "PDCCH monitoring single occasion support for FR1 (TS 38.213)"
  },
  {
    "major": "PHY",
    "middle": "Common",
    "leaf": "pdsch-256QAM-FR1",
    "path": "phy-Parameters.phy-ParametersFR1.pdsch-256QAM-FR1",
    "kind": "bool",
    "description": "PDSCH 256QAM for FR1"
  },
  {
    "major": "PHY",
    "middle": "Common",
    "leaf": "pdsch-MappingTypeA",
    "path": "phy-Parameters.phy-ParametersCommon.pdsch-MappingTypeA",
    "kind": "bool",
    "description": "PDSCH mapping type A support (TS 38.214)"
  },
  {
    "major": "PHY",
    "middle": "Common",
    "leaf": "pdsch-MappingTypeB",
    "path": "phy-Parameters.phy-ParametersCommon.pdsch-MappingTypeB",
    "kind": "enum",
    "description": "PDSCH mapping type B support (TS 38.214)"
  },
  {
    "major": "PHY",
    "middle": "Common",
    "leaf": "pdsch-RE-MappingFR1-PerSlot",
    "path": "phy-Parameters.phy-ParametersFR1.pdsch-RE-MappingFR1-PerSlot",
    "kind": "enum",
    "description": "PDSCH RE mapping FR1 per slot (TS 38.214)"
  },
  {
    "major": "PHY",
    "middle": "Common",
    "leaf": "pdsch-RE-MappingFR1-PerSymbol",
    "path": "phy-Parameters.phy-ParametersFR1.pdsch-RE-MappingFR1-PerSymbol",
    "kind": "enum",
    "description": "PDSCH RE mapping FR1 per symbol (TS 38.214)"
  },
  {
    "major": "PHY",
    "middle": "Common",
    "leaf": "pdsch-RE-MappingFR2-PerSlot",
    "path": "phy-Parameters.phy-ParametersFR2.pdsch-RE-MappingFR2-PerSlot",
    "kind": "enum",
    "description": "PDSCH RE mapping per slot for FR2 (TS 38.214 §5.1)"
  },
  {
    "major": "PHY",
    "middle": "Common",
    "leaf": "pdsch-RE-MappingFR2-PerSymbol",
    "path": "phy-Parameters.phy-ParametersFR2.pdsch-RE-MappingFR2-PerSymbol",
    "kind": "enum",
    "description": "PDSCH RE mapping per symbol for FR2 (TS 38.214 §5.1)"
  },
  {
    "major": "PHY",
    "middle": "Common",
    "leaf": "pdsch-RepetitionMultiSlots",
    "path": "phy-Parameters.phy-ParametersCommon.pdsch-RepetitionMultiSlots",
    "kind": "enum",
    "description": "PDSCH repetition across multiple slots (TS 38.214)"
  },
  {
    "major": "PHY",
    "middle": "Common",
    "leaf": "precoderGranularityCORESET",
    "path": "phy-Parameters.phy-ParametersCommon.precoderGranularityCORESET",
    "kind": "enum",
    "description": "Precoder granularity per CORESET (TS 38.211)"
  },
  {
    "major": "PHY",
    "middle": "Common",
    "leaf": "pucch-F0-2WithoutFH",
    "path": "phy-Parameters.phy-ParametersCommon.pucch-F0-2WithoutFH",
    "pathAlternatives": [
      "phy-Parameters.phy-ParametersFRX-Diff.pucch-F0-2WithoutFH"
    ],
    "kind": "bool",
    "description": "PUCCH format 0/2 without frequency hopping support (TS 38.306)"
  },
  {
    "major": "PHY",
    "middle": "Common",
    "leaf": "pucch-F1-3-4WithoutFH",
    "path": "phy-Parameters.phy-ParametersCommon.pucch-F1-3-4WithoutFH",
    "pathAlternatives": [
      "phy-Parameters.phy-ParametersFRX-Diff.pucch-F1-3-4WithoutFH"
    ],
    "kind": "bool",
    "description": "PUCCH format 1/3/4 without frequency hopping support (TS 38.306)"
  },
  {
    "major": "PHY",
    "middle": "Common",
    "leaf": "pucch-F2-WithFH",
    "path": "phy-Parameters.phy-ParametersFRX-Diff.pucch-F2-WithFH",
    "kind": "bool",
    "description": "PUCCH format 2 with frequency hopping"
  },
  {
    "major": "PHY",
    "middle": "Common",
    "leaf": "pucch-F3-4-HalfPi-BPSK",
    "path": "phy-Parameters.phy-ParametersFRX-Diff.pucch-F3-4-HalfPi-BPSK",
    "kind": "bool",
    "description": "PUCCH format 3/4 half-pi BPSK support (TS 38.211)"
  },
  {
    "major": "PHY",
    "middle": "Common",
    "leaf": "pucch-F3-WithFH",
    "path": "phy-Parameters.phy-ParametersFRX-Diff.pucch-F3-WithFH",
    "kind": "bool",
    "description": "PUCCH format 3 with frequency hopping"
  },
  {
    "major": "PHY",
    "middle": "Common",
    "leaf": "pucch-F4-WithFH",
    "path": "phy-Parameters.phy-ParametersFRX-Diff.pucch-F4-WithFH",
    "kind": "bool",
    "description": "PUCCH format 4 with frequency hopping"
  },
  {
    "major": "PHY",
    "middle": "Common",
    "leaf": "pucch-Repetition-F1-3-4",
    "path": "phy-Parameters.phy-ParametersCommon.pucch-Repetition-F1-3-4",
    "kind": "enum",
    "description": "PUCCH repetition for formats 1, 3, and 4 (TS 38.306)"
  },
  {
    "major": "PHY",
    "middle": "Common",
    "leaf": "pusch-HalfPi-BPSK",
    "path": "phy-Parameters.phy-ParametersFRX-Diff.pusch-HalfPi-BPSK",
    "kind": "bool",
    "description": "PUSCH half-pi BPSK support"
  },
  {
    "major": "PHY",
    "middle": "Common",
    "leaf": "pusch-LBRM",
    "path": "phy-Parameters.phy-ParametersCommon.pusch-LBRM",
    "pathAlternatives": [
      "phy-Parameters.phy-ParametersFRX-Diff.pusch-LBRM"
    ],
    "kind": "bool",
    "description": "Limited Buffer Rate Matching (LBRM) for PUSCH (TS 38.306)"
  },
  {
    "major": "PHY",
    "middle": "Common",
    "leaf": "pusch-RepetitionMultiSlots",
    "path": "phy-Parameters.phy-ParametersCommon.pusch-RepetitionMultiSlots",
    "kind": "enum",
    "description": "PUSCH repetition across multiple slots (TS 38.214)"
  },
  {
    "major": "PHY",
    "middle": "Common",
    "leaf": "ra-Type0-PUSCH",
    "path": "phy-Parameters.phy-ParametersCommon.ra-Type0-PUSCH",
    "kind": "bool",
    "description": "RA Type 0 PUSCH support (TS 38.214)"
  },
  {
    "major": "PHY",
    "middle": "Common",
    "leaf": "rateMatchingCtrlResrcSetDynamic",
    "path": "phy-Parameters.phy-ParametersCommon.rateMatchingCtrlResrcSetDynamic",
    "kind": "bool",
    "description": "Rate matching control resource set dynamic (TS 38.214)"
  },
  {
    "major": "PHY",
    "middle": "Common",
    "leaf": "rateMatchingResrcSetDynamic",
    "path": "phy-Parameters.phy-ParametersCommon.rateMatchingResrcSetDynamic",
    "kind": "bool",
    "description": "Rate matching resource set dynamic (TS 38.214)"
  },
  {
    "major": "PHY",
    "middle": "Common",
    "leaf": "rateMatchingResrcSetSemi-Static",
    "path": "phy-Parameters.phy-ParametersCommon.rateMatchingResrcSetSemi-Static",
    "kind": "bool",
    "description": "Rate matching resource set semi-static (TS 38.214)"
  },
  {
    "major": "PHY",
    "middle": "Common",
    "leaf": "sameSymbol",
    "path": "phy-Parameters.phy-ParametersFRX-Diff.mux-SR-HARQ-ACK-CSI-PUCCH-OncePerSlot.sameSymbol",
    "kind": "bool",
    "description": "Mux SR/HARQ-ACK/CSI on PUCCH once per slot (TS 38.213)"
  },
  {
    "major": "PHY",
    "middle": "Common",
    "leaf": "semiOpenLoopCSI",
    "path": "phy-Parameters.phy-ParametersFRX-Diff.semiOpenLoopCSI",
    "kind": "enum",
    "description": "Semi-open loop CSI support (TS 38.214)"
  },
  {
    "major": "PHY",
    "middle": "Common",
    "leaf": "semiStaticHARQ-ACK-Codebook",
    "path": "phy-Parameters.phy-ParametersCommon.semiStaticHARQ-ACK-Codebook",
    "kind": "bool",
    "description": "Semi-static HARQ-ACK codebook support (TS 38.213 §9.1)"
  },
  {
    "major": "PHY",
    "middle": "Common",
    "leaf": "sp-CSI-IM",
    "path": "phy-Parameters.phy-ParametersFRX-Diff.sp-CSI-IM",
    "kind": "enum",
    "description": "Semi-persistent CSI-IM support (TS 38.214)"
  },
  {
    "major": "PHY",
    "middle": "Common",
    "leaf": "sp-CSI-ReportPUCCH",
    "path": "phy-Parameters.phy-ParametersCommon.sp-CSI-ReportPUCCH",
    "kind": "enum",
    "description": "Semi-persistent CSI reporting on PUCCH (TS 38.306)"
  },
  {
    "major": "PHY",
    "middle": "Common",
    "leaf": "sp-CSI-ReportPUSCH",
    "path": "phy-Parameters.phy-ParametersCommon.sp-CSI-ReportPUSCH",
    "kind": "enum",
    "description": "Semi-persistent CSI reporting on PUSCH (TS 38.306)"
  },
  {
    "major": "PHY",
    "middle": "Common",
    "leaf": "sp-CSI-RS",
    "path": "phy-Parameters.phy-ParametersFRX-Diff.sp-CSI-RS",
    "kind": "enum",
    "description": "Semi-persistent CSI-RS support (TS 38.214)"
  },
  {
    "major": "PHY",
    "middle": "Common",
    "leaf": "spatialBundlingHARQ-ACK",
    "path": "phy-Parameters.phy-ParametersCommon.spatialBundlingHARQ-ACK",
    "kind": "enum",
    "description": "Spatial bundling for HARQ-ACK support (TS 38.306)"
  },
  {
    "major": "PHY",
    "middle": "Common",
    "leaf": "supportedDMRS-TypeDL",
    "path": "phy-Parameters.phy-ParametersFRX-Diff.supportedDMRS-TypeDL",
    "kind": "enum",
    "description": "Supported DMRS type for DL (TS 38.214)"
  },
  {
    "major": "PHY",
    "middle": "Common",
    "leaf": "supportedDMRS-TypeUL",
    "path": "phy-Parameters.phy-ParametersFRX-Diff.supportedDMRS-TypeUL",
    "kind": "enum",
    "description": "Supported DMRS type for UL (TS 38.214)"
  },
  {
    "major": "PHY",
    "middle": "Common",
    "leaf": "tdd-MultiDL-UL-SwitchPerSlot",
    "path": "phy-Parameters.phy-ParametersCommon.tdd-MultiDL-UL-SwitchPerSlot",
    "pathAlternatives": [
      "phy-Parameters.phy-ParametersFRX-Diff.tdd-MultiDL-UL-SwitchPerSlot"
    ],
    "kind": "bool",
    "description": "Multiple DL-UL switching patterns per slot in TDD (TS 38.306)"
  },
  {
    "major": "PHY",
    "middle": "Common",
    "leaf": "totalNumberTxPortsPerBand",
    "path": "phy-Parameters.phy-ParametersCommon.codebookVariantsList-r16.totalNumberTxPortsPerBand",
    "pathAlternatives": [
      "phy-Parameters.phy-ParametersFRX-Diff.codebookVariantsList-r16.totalNumberTxPortsPerBand"
    ],
    "kind": "number",
    "description": "Total number of TX ports per band (TS 38.214, Rel-16)"
  },
  {
    "major": "PHY",
    "middle": "Common",
    "leaf": "tpc-PUCCH-RNTI",
    "path": "phy-Parameters.phy-ParametersCommon.tpc-PUCCH-RNTI",
    "pathAlternatives": [
      "phy-Parameters.phy-ParametersFRX-Diff.tpc-PUCCH-RNTI"
    ],
    "kind": "bool",
    "description": "Transmit Power Control for PUCCH using TPC-PUCCH-RNTI (TS 38.306)"
  },
  {
    "major": "PHY",
    "middle": "Common",
    "leaf": "tpc-PUSCH-RNTI",
    "path": "phy-Parameters.phy-ParametersCommon.tpc-PUSCH-RNTI",
    "pathAlternatives": [
      "phy-Parameters.phy-ParametersFRX-Diff.tpc-PUSCH-RNTI"
    ],
    "kind": "bool",
    "description": "Transmit Power Control for PUSCH using TPC-PUSCH-RNTI (TS 38.306)"
  },
  {
    "major": "PHY",
    "middle": "Common",
    "leaf": "tpc-SRS-RNTI",
    "path": "phy-Parameters.phy-ParametersFRX-Diff.tpc-SRS-RNTI",
    "kind": "bool",
    "description": "TPC-SRS-RNTI support (TS 38.213)"
  },
  {
    "major": "PHY",
    "middle": "Common",
    "leaf": "twoDifferentTPC-Loop-PUCCH",
    "path": "phy-Parameters.phy-ParametersCommon.twoDifferentTPC-Loop-PUCCH",
    "pathAlternatives": [
      "phy-Parameters.phy-ParametersFRX-Diff.twoDifferentTPC-Loop-PUCCH"
    ],
    "kind": "bool",
    "description": "Two different TPC loops for PUCCH (TS 38.306)"
  },
  {
    "major": "PHY",
    "middle": "Common",
    "leaf": "twoDifferentTPC-Loop-PUSCH",
    "path": "phy-Parameters.phy-ParametersXDD-Diff.twoDifferentTPC-Loop-PUSCH",
    "kind": "enum",
    "description": "Two different TPC loops for PUSCH (TS 38.213)"
  },
  {
    "major": "PHY",
    "middle": "Common",
    "leaf": "twoFL-DMRS",
    "path": "phy-Parameters.phy-ParametersFRX-Diff.twoFL-DMRS",
    "kind": "enum",
    "description": "Two front-loaded DMRS support (TS 38.214)"
  },
  {
    "major": "PHY",
    "middle": "Common",
    "leaf": "twoFL-DMRS-TwoAdditionalDMRS-UL",
    "path": "phy-Parameters.phy-ParametersFRX-Diff.twoFL-DMRS-TwoAdditionalDMRS-UL",
    "kind": "bool",
    "description": "Two FL-DMRS with two additional DMRS UL (TS 38.214)"
  },
  {
    "major": "PHY",
    "middle": "Common",
    "leaf": "twoPUCCH-AnyOthersInSlot",
    "path": "phy-Parameters.phy-ParametersFRX-Diff.twoPUCCH-AnyOthersInSlot",
    "kind": "enum",
    "description": "Two PUCCH with any others in slot (TS 38.213)"
  },
  {
    "major": "PHY",
    "middle": "Common",
    "leaf": "twoPUCCH-F0-2-ConsecSymbols",
    "path": "phy-Parameters.phy-ParametersFRX-Diff.twoPUCCH-F0-2-ConsecSymbols",
    "kind": "enum",
    "description": "Two PUCCH F0-2 consecutive symbols (TS 38.213)"
  },
  {
    "major": "PHY",
    "middle": "Common",
    "leaf": "twoPUCCH-F0-2-ConsecSymbols-XDD",
    "path": "phy-Parameters.phy-ParametersXDD-Diff.twoPUCCH-F0-2-ConsecSymbols",
    "kind": "enum",
    "description": "Two PUCCH F0-2 consecutive symbols (XDD-Diff, TS 38.213)"
  },
  {
    "major": "PHY",
    "middle": "Common",
    "leaf": "type1-PUSCH-RepetitionMultiSlots",
    "path": "phy-Parameters.phy-ParametersCommon.type1-PUSCH-RepetitionMultiSlots",
    "kind": "enum",
    "description": "Type 1 PUSCH repetition across multiple slots (TS 38.306)"
  },
  {
    "major": "PHY",
    "middle": "Common",
    "leaf": "type2-CG-ReleaseDCI-0-1-r16",
    "path": "phy-Parameters.phy-ParametersCommon.type2-CG-ReleaseDCI-0-1-r16",
    "kind": "enum",
    "description": "Type 2 CG release by DCI format 0_1 (TS 38.213, Rel-16)"
  },
  {
    "major": "PHY",
    "middle": "Common",
    "leaf": "type2-PUSCH-RepetitionMultiSlots",
    "path": "phy-Parameters.phy-ParametersCommon.type2-PUSCH-RepetitionMultiSlots",
    "kind": "enum",
    "description": "Type 2 PUSCH repetition across multiple slots (TS 38.306)"
  },
  {
    "major": "PHY",
    "middle": "Common",
    "leaf": "type2-SP-CSI-Feedback-LongPUCCH",
    "path": "phy-Parameters.phy-ParametersCommon.type2-SP-CSI-Feedback-LongPUCCH",
    "kind": "enum",
    "description": "Type 2 SP-CSI feedback on long PUCCH (TS 38.306)"
  },
  {
    "major": "PHY",
    "middle": "Common",
    "leaf": "uci-CodeBlockSegmentation",
    "path": "phy-Parameters.phy-ParametersFRX-Diff.uci-CodeBlockSegmentation",
    "kind": "bool",
    "description": "UCI code block segmentation"
  },
  {
    "major": "PHY",
    "middle": "Common",
    "leaf": "ul-SchedulingOffset",
    "path": "phy-Parameters.phy-ParametersXDD-Diff.ul-SchedulingOffset",
    "kind": "enum",
    "description": "UL scheduling offset support (TS 38.214)"
  },
  {
    "major": "PHY",
    "middle": "Demodulation Enhancement R16",
    "leaf": "demodulationEnhancement-r16",
    "path": "highSpeedParameters-r16.demodulationEnhancement-r16",
    "kind": "bool",
    "description": "High speed demodulation enhancement (TS 38.306, Rel-16)"
  },
  {
    "major": "PHY",
    "middle": "Measurement Enhancement R16",
    "leaf": "measurementEnhancement-r16",
    "path": "highSpeedParameters-r16.measurementEnhancement-r16",
    "kind": "bool",
    "description": "High speed measurement enhancement (TS 38.306, Rel-16)"
  },
  {
    "major": "PHY",
    "middle": "FRX-Diff",
    "leaf": "maxConfigNumberCSI-IM-PerCC",
    "path": "fr1-fr2-Add-UE-NR-Capabilities.phy-ParametersFRX-Diff.csi-RS-IM-ReceptionForFeedback.maxConfigNumberCSI-IM-PerCC",
    "kind": "enum",
    "description": "Max configured CSI-IM resources per CC (TS 38.214 §5.2)"
  },
  {
    "major": "PHY",
    "middle": "FRX-Diff",
    "leaf": "maxConfigNumberNZP-CSI-RS-PerCC",
    "path": "fr1-fr2-Add-UE-NR-Capabilities.phy-ParametersFRX-Diff.csi-RS-IM-ReceptionForFeedback.maxConfigNumberNZP-CSI-RS-PerCC",
    "kind": "number",
    "description": "Max configured NZP CSI-RS resources per CC (TS 38.214 §5.2)"
  },
  {
    "major": "PHY",
    "middle": "FRX-Diff",
    "leaf": "maxConfigNumberPortsAcrossNZP-CSI-RS-PerCC",
    "path": "fr1-fr2-Add-UE-NR-Capabilities.phy-ParametersFRX-Diff.csi-RS-IM-ReceptionForFeedback.maxConfigNumberPortsAcrossNZP-CSI-RS-PerCC",
    "kind": "number",
    "description": "Max total ports across NZP CSI-RS per CC (TS 38.214 §5.2)"
  },
  {
    "major": "PHY",
    "middle": "FRX-Diff",
    "leaf": "maxNumberAperiodicCSI-PerBWP-ForBeamReport",
    "path": "fr1-fr2-Add-UE-NR-Capabilities.phy-ParametersFRX-Diff.csi-ReportFramework.maxNumberAperiodicCSI-PerBWP-ForBeamReport",
    "kind": "number",
    "description": "Max aperiodic CSI reports per BWP for beam reporting (TS 38.214 §5.2)"
  },
  {
    "major": "PHY",
    "middle": "FRX-Diff",
    "leaf": "maxNumberAperiodicCSI-PerBWP-ForCSI-Report",
    "path": "fr1-fr2-Add-UE-NR-Capabilities.phy-ParametersFRX-Diff.csi-ReportFramework.maxNumberAperiodicCSI-PerBWP-ForCSI-Report",
    "kind": "number",
    "description": "Max aperiodic CSI reports per BWP for CSI reporting (TS 38.214 §5.2)"
  },
  {
    "major": "PHY",
    "middle": "FRX-Diff",
    "leaf": "maxNumberAperiodicCSI-triggeringStatePerCC",
    "path": "fr1-fr2-Add-UE-NR-Capabilities.phy-ParametersFRX-Diff.csi-ReportFramework.maxNumberAperiodicCSI-triggeringStatePerCC",
    "kind": "enum",
    "description": "Max aperiodic CSI triggering states per CC (TS 38.214 §5.2)"
  },
  {
    "major": "PHY",
    "middle": "FRX-Diff",
    "leaf": "maxNumberPeriodicCSI-PerBWP-ForBeamReport",
    "path": "fr1-fr2-Add-UE-NR-Capabilities.phy-ParametersFRX-Diff.csi-ReportFramework.maxNumberPeriodicCSI-PerBWP-ForBeamReport",
    "kind": "number",
    "description": "Max periodic CSI reports per BWP for beam reporting (TS 38.214 §5.2)"
  },
  {
    "major": "PHY",
    "middle": "FRX-Diff",
    "leaf": "maxNumberPeriodicCSI-PerBWP-ForCSI-Report",
    "path": "fr1-fr2-Add-UE-NR-Capabilities.phy-ParametersFRX-Diff.csi-ReportFramework.maxNumberPeriodicCSI-PerBWP-ForCSI-Report",
    "kind": "number",
    "description": "Max periodic CSI reports per BWP for CSI reporting (TS 38.214 §5.2)"
  },
  {
    "major": "PHY",
    "middle": "FRX-Diff",
    "leaf": "maxNumberSemiPersistentCSI-PerBWP-ForBeamReport",
    "path": "fr1-fr2-Add-UE-NR-Capabilities.phy-ParametersFRX-Diff.csi-ReportFramework.maxNumberSemiPersistentCSI-PerBWP-ForBeamReport",
    "kind": "number",
    "description": "Max semi-persistent CSI reports per BWP for beam reporting (TS 38.214 §5.2)"
  },
  {
    "major": "PHY",
    "middle": "FRX-Diff",
    "leaf": "maxNumberSemiPersistentCSI-PerBWP-ForCSI-Report",
    "path": "fr1-fr2-Add-UE-NR-Capabilities.phy-ParametersFRX-Diff.csi-ReportFramework.maxNumberSemiPersistentCSI-PerBWP-ForCSI-Report",
    "kind": "number",
    "description": "Max semi-persistent CSI reports per BWP for CSI reporting (TS 38.214 §5.2)"
  },
  {
    "major": "PHY",
    "middle": "FRX-Diff",
    "leaf": "maxNumberSimultaneousNZP-CSI-RS-PerCC",
    "path": "fr1-fr2-Add-UE-NR-Capabilities.phy-ParametersFRX-Diff.csi-RS-IM-ReceptionForFeedback.maxNumberSimultaneousNZP-CSI-RS-PerCC",
    "kind": "number",
    "description": "Max simultaneous NZP CSI-RS resources per CC (TS 38.214 §5.2)"
  },
  {
    "major": "PHY",
    "middle": "FRX-Diff",
    "leaf": "totalNumberPortsSimultaneousNZP-CSI-RS-PerCC",
    "path": "fr1-fr2-Add-UE-NR-Capabilities.phy-ParametersFRX-Diff.csi-RS-IM-ReceptionForFeedback.totalNumberPortsSimultaneousNZP-CSI-RS-PerCC",
    "kind": "number",
    "description": "Total ports for simultaneous NZP CSI-RS per CC (TS 38.214 §5.2)"
  },
  {
    "major": "PHY",
    "middle": "FRX-Diff",
    "leaf": "ul-64QAM-MCS-TableAlt",
    "path": "fr2-Add-UE-NR-Capabilities.phy-ParametersFRX-Diff.ul-64QAM-MCS-TableAlt",
    "kind": "enum",
    "description": "Alternative MCS table for 64QAM in UL (TS 38.214)"
  },
  {
    "major": "PHY",
    "middle": "Power Saving (Rel-16)",
    "leaf": "maxMIMO-LayerPreference-r16",
    "path": "fr1-Add-UE-NR-Capabilities-v1610.powSav-ParametersFRX-Diff-r16.maxMIMO-LayerPreference-r16",
    "kind": "enum",
    "description": "Max MIMO layer preference reporting (TS 38.331, Rel-16)"
  },
  {
    "major": "PHY",
    "middle": "ReportFramework",
    "leaf": "maxAperiodicCSI-PerBWP-BeamReport",
    "path": "rf-Parameters.supportedBandListNR.mimo-ParametersPerBand.csi-ReportFramework.maxNumberAperiodicCSI-PerBWP-ForBeamReport",
    "kind": "number",
    "description": "Max aperiodic CSI reports per BWP for beam (TS 38.214 §5.2)"
  },
  {
    "major": "PHY",
    "middle": "ReportFramework",
    "leaf": "maxAperiodicCSI-PerBWP-CSIReport",
    "path": "rf-Parameters.supportedBandListNR.mimo-ParametersPerBand.csi-ReportFramework.maxNumberAperiodicCSI-PerBWP-ForCSI-Report",
    "kind": "number",
    "description": "Max aperiodic CSI reports per BWP for CSI (TS 38.214 §5.2)"
  },
  {
    "major": "PHY",
    "middle": "ReportFramework",
    "leaf": "maxAperiodicCSI-TriggeringStatePerCC",
    "path": "rf-Parameters.supportedBandListNR.mimo-ParametersPerBand.csi-ReportFramework.maxNumberAperiodicCSI-triggeringStatePerCC",
    "kind": "enum",
    "description": "Max aperiodic CSI triggering states per CC (TS 38.214 §5.2)"
  },
  {
    "major": "PHY",
    "middle": "ReportFramework",
    "leaf": "maxPeriodicCSI-PerBWP-BeamReport",
    "path": "rf-Parameters.supportedBandListNR.mimo-ParametersPerBand.csi-ReportFramework.maxNumberPeriodicCSI-PerBWP-ForBeamReport",
    "kind": "number",
    "description": "Max periodic CSI reports per BWP for beam (TS 38.214 §5.2)"
  },
  {
    "major": "PHY",
    "middle": "ReportFramework",
    "leaf": "maxPeriodicCSI-PerBWP-CSIReport",
    "path": "rf-Parameters.supportedBandListNR.mimo-ParametersPerBand.csi-ReportFramework.maxNumberPeriodicCSI-PerBWP-ForCSI-Report",
    "kind": "number",
    "description": "Max periodic CSI reports per BWP for CSI (TS 38.214 §5.2)"
  },
  {
    "major": "PHY",
    "middle": "ReportFramework",
    "leaf": "maxSemiPersistentCSI-PerBWP-BeamReport",
    "path": "rf-Parameters.supportedBandListNR.mimo-ParametersPerBand.csi-ReportFramework.maxNumberSemiPersistentCSI-PerBWP-ForBeamReport",
    "kind": "number",
    "description": "Max semi-persistent CSI reports per BWP for beam (TS 38.214 §5.2)"
  },
  {
    "major": "PHY",
    "middle": "ReportFramework",
    "leaf": "maxSemiPersistentCSI-PerBWP-CSIReport",
    "path": "rf-Parameters.supportedBandListNR.mimo-ParametersPerBand.csi-ReportFramework.maxNumberSemiPersistentCSI-PerBWP-ForCSI-Report",
    "kind": "number",
    "description": "Max semi-persistent CSI reports per BWP for CSI (TS 38.214 §5.2)"
  },
  {
    "major": "PHY",
    "middle": "ReportFramework",
    "leaf": "simultaneousCSI-ReportsPerCC",
    "path": "rf-Parameters.supportedBandListNR.mimo-ParametersPerBand.csi-ReportFramework.simultaneousCSI-ReportsPerCC",
    "kind": "number",
    "description": "Max simultaneous CSI reports per CC (TS 38.214 §5.2)"
  },
  {
    "major": "PHY",
    "middle": "RS-IM-Feedback",
    "leaf": "maxConfigCSI-IM-PerCC",
    "path": "rf-Parameters.supportedBandListNR.mimo-ParametersPerBand.csi-RS-IM-ReceptionForFeedback.maxConfigNumberCSI-IM-PerCC",
    "kind": "enum",
    "description": "Max configured CSI-IM resources per CC (TS 38.214 §5.2)"
  },
  {
    "major": "PHY",
    "middle": "RS-IM-Feedback",
    "leaf": "maxConfigNZP-CSI-RS-PerCC",
    "path": "rf-Parameters.supportedBandListNR.mimo-ParametersPerBand.csi-RS-IM-ReceptionForFeedback.maxConfigNumberNZP-CSI-RS-PerCC",
    "kind": "number",
    "description": "Max configured NZP CSI-RS resources per CC (TS 38.214 §5.2)"
  },
  {
    "major": "PHY",
    "middle": "RS-IM-Feedback",
    "leaf": "maxConfigPortsNZP-CSI-RS-PerCC",
    "path": "rf-Parameters.supportedBandListNR.mimo-ParametersPerBand.csi-RS-IM-ReceptionForFeedback.maxConfigNumberPortsAcrossNZP-CSI-RS-PerCC",
    "kind": "number",
    "description": "Max total ports across NZP CSI-RS per CC (TS 38.214 §5.2)"
  },
  {
    "major": "PHY",
    "middle": "RS-IM-Feedback",
    "leaf": "maxSimultaneousNZP-CSI-RS-PerCC",
    "path": "rf-Parameters.supportedBandListNR.mimo-ParametersPerBand.csi-RS-IM-ReceptionForFeedback.maxNumberSimultaneousNZP-CSI-RS-PerCC",
    "kind": "number",
    "description": "Max simultaneous NZP CSI-RS per CC (TS 38.214 §5.2)"
  },
  {
    "major": "PHY",
    "middle": "RS-IM-Feedback",
    "leaf": "totalPortsSimultaneousNZP-CSI-RS-PerCC",
    "path": "rf-Parameters.supportedBandListNR.mimo-ParametersPerBand.csi-RS-IM-ReceptionForFeedback.totalNumberPortsSimultaneousNZP-CSI-RS-PerCC",
    "kind": "number",
    "description": "Total ports for simultaneous NZP CSI-RS per CC (TS 38.214 §5.2)"
  },
  {
    "major": "PHY",
    "middle": "RS-Tracking",
    "leaf": "maxBurstLength",
    "path": "rf-Parameters.supportedBandListNR.mimo-ParametersPerBand.csi-RS-ForTracking.maxBurstLength",
    "kind": "number",
    "description": "Max burst length for CSI-RS tracking (TS 38.214 §5.1.6.1)"
  },
  {
    "major": "PHY",
    "middle": "RS-Tracking",
    "leaf": "maxConfiguredResourceSetsAllCC",
    "path": "rf-Parameters.supportedBandListNR.mimo-ParametersPerBand.csi-RS-ForTracking.maxConfiguredResourceSetsAllCC",
    "kind": "number",
    "description": "Max configured resource sets across all CCs for tracking (TS 38.214 §5.1.6.1)"
  },
  {
    "major": "PHY",
    "middle": "RS-Tracking",
    "leaf": "maxConfiguredResourceSetsPerCC",
    "path": "rf-Parameters.supportedBandListNR.mimo-ParametersPerBand.csi-RS-ForTracking.maxConfiguredResourceSetsPerCC",
    "kind": "number",
    "description": "Max configured resource sets per CC for tracking (TS 38.214 §5.1.6.1)"
  },
  {
    "major": "PHY",
    "middle": "RS-Tracking",
    "leaf": "maxSimultaneousResourceSetsPerCC",
    "path": "rf-Parameters.supportedBandListNR.mimo-ParametersPerBand.csi-RS-ForTracking.maxSimultaneousResourceSetsPerCC",
    "kind": "number",
    "description": "Max simultaneous resource sets per CC for tracking (TS 38.214 §5.1.6.1)"
  },
  {
    "major": "PHY",
    "middle": "TCI",
    "leaf": "maxNumberActiveTCI-PerBWP",
    "path": "rf-Parameters.supportedBandListNR.mimo-ParametersPerBand.tci-StatePDSCH.maxNumberActiveTCI-PerBWP",
    "kind": "enum",
    "description": "Max active TCI per BWP (TS 38.214)"
  },
  {
    "major": "PHY",
    "middle": "TCI",
    "leaf": "maxNumberConfiguredTCI-StatesPerCC",
    "path": "rf-Parameters.supportedBandListNR.mimo-ParametersPerBand.tci-StatePDSCH.maxNumberConfiguredTCI-StatesPerCC",
    "kind": "enum",
    "description": "Max configured TCI states per CC (TS 38.214)"
  },
  {
    "major": "RF",
    "middle": "Extended Band N77 R16",
    "leaf": "extendedBand-n77-r16",
    "path": "rf-Parameters.extendedBand-n77-r16",
    "kind": "enum",
    "description": "Extended band n77 support for wider frequency range (TS 38.101, Rel-16)"
  },
  {
    "major": "RLC",
    "middle": "Mode",
    "leaf": "am-WithShortSN",
    "path": "rlc-Parameters.am-WithShortSN",
    "kind": "bool",
    "description": "AM RLC short SN (12-bit) support (TS 38.322)"
  },
  {
    "major": "RLC",
    "middle": "Mode",
    "leaf": "um-WithLongSN",
    "path": "rlc-Parameters.um-WithLongSN",
    "kind": "bool",
    "description": "UM RLC long SN (12-bit) support (TS 38.322)"
  },
  {
    "major": "RLC",
    "middle": "Mode",
    "leaf": "um-WithShortSN",
    "path": "rlc-Parameters.um-WithShortSN",
    "kind": "bool",
    "description": "UM RLC short SN (6-bit) support (TS 38.322)"
  },
  {
    "major": "SDAP",
    "middle": "Reflective QoS",
    "leaf": "as-ReflectiveQoS",
    "path": "sdap-Parameters.as-ReflectiveQoS",
    "kind": "bool",
    "description": "AS reflective QoS support (TS 37.324 §5.2)"
  }
];
