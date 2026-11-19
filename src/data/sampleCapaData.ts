import type { CommonCapaJson } from '@ohmycapa/capa-core';

export const SAMPLE_DEVICE_A: CommonCapaJson = {
  schemaVersion: '2.0',
  meta: {
    deviceName: 'SM-S928N_QCOM',
    fileName: 'SM-S928N_QCOM_Sample.json',
    vendor: 'QUALCOMM',
    detectedRats: ['eutra-nr', 'eutra', 'nr'],
  },
  rats: {
    'eutra-nr': {
      bands: [
        { band: 1, displayName: 'B1', halfDuplex: false, dlMimo: 4, ulMimo: 1, dlQam: '256QAM', ulQam: '256QAM' },
        { band: 3, displayName: 'B3', halfDuplex: false, dlMimo: 4, ulMimo: 1, dlQam: '256QAM', ulQam: '256QAM' },
        { band: 7, displayName: 'B7', halfDuplex: false, dlMimo: 4, ulMimo: 1, dlQam: '256QAM', ulQam: '256QAM' },
        { band: 78, displayName: 'n78', powerClass: 'pc3', dlMimo: 4, ulMimo: 2, dlQam: '256QAM', ulQam: '256QAM' },
        { band: 41, displayName: 'n41', powerClass: 'pc2', dlMimo: 4, ulMimo: 2, dlQam: '256QAM', ulQam: '256QAM' },
      ],
      bandCombinations: [
        // A-only unique (3LTE + 1NR)
        {
          dlCc: 4,
          ulCc: 2,
          bands: [
            { ratType: 'eutra', band: 1, bandwidthClassDL: 'a', dlMimo: 4, dlQam: '256QAM' },
            { ratType: 'eutra', band: 3, bandwidthClassDL: 'a', bandwidthClassUL: 'a', dlMimo: 4, ulMimo: 1, dlQam: '256QAM', ulQam: '256QAM' },
            { ratType: 'eutra', band: 7, bandwidthClassDL: 'a', dlMimo: 4, dlQam: '256QAM' },
            { ratType: 'nr', band: 78, bandwidthClassDL: 'a', bandwidthClassUL: 'a', dlMimo: 4, ulMimo: 2, dlQam: '256QAM', ulQam: '256QAM' },
          ],
        },
        // Exact-changed (same combo key, different BCS + mrdcParameters)
        {
          dlCc: 3,
          ulCc: 2,
          supportedBandwidthCombinationSet: [0, 1],
          mrdcParameters: { dynamicPowerSharingENDC: true, simultaneousRxTxInterBandENDC: true },
          bands: [
            { ratType: 'eutra', band: 3, bandwidthClassDL: 'a', bandwidthClassUL: 'a', dlMimo: 4, ulMimo: 1, dlQam: '256QAM', ulQam: '256QAM' },
            { ratType: 'eutra', band: 7, bandwidthClassDL: 'a', dlMimo: 4, dlQam: '256QAM' },
            { ratType: 'nr', band: 78, bandwidthClassDL: 'a', bandwidthClassUL: 'a', dlMimo: 4, ulMimo: 2, dlQam: '256QAM', ulQam: '256QAM' },
          ],
        },
        // A-only covered by B's 4CA superset (B1(4)-B3(4)-B7(4)-n78(4))
        {
          dlCc: 3,
          ulCc: 2,
          bands: [
            { ratType: 'eutra', band: 1, bandwidthClassDL: 'a', dlMimo: 2, dlQam: '256QAM' },
            { ratType: 'eutra', band: 3, bandwidthClassDL: 'a', bandwidthClassUL: 'a', dlMimo: 4, ulMimo: 1, dlQam: '256QAM', ulQam: '256QAM' },
            { ratType: 'nr', band: 78, bandwidthClassDL: 'a', bandwidthClassUL: 'a', dlMimo: 4, ulMimo: 1, dlQam: '256QAM', ulQam: '256QAM' },
          ],
        },
        // Exact match
        {
          dlCc: 3,
          ulCc: 2,
          bands: [
            { ratType: 'eutra', band: 1, bandwidthClassDL: 'a', bandwidthClassUL: 'a', dlMimo: 4, ulMimo: 1, dlQam: '256QAM', ulQam: '256QAM' },
            { ratType: 'eutra', band: 3, bandwidthClassDL: 'a', dlMimo: 4, dlQam: '256QAM' },
            { ratType: 'nr', band: 41, bandwidthClassDL: 'a', bandwidthClassUL: 'a', dlMimo: 4, ulMimo: 2, dlQam: '256QAM', ulQam: '256QAM' },
          ],
        },
      ],
    },
    eutra: {
      bands: [
        { band: 1, displayName: 'B1', halfDuplex: false, dlMimo: 4, ulMimo: 1, dlQam: '256QAM', ulQam: '256QAM', nonContiguousULRA: true },
        { band: 3, displayName: 'B3', halfDuplex: false, dlMimo: 4, ulMimo: 1, dlQam: '256QAM', ulQam: '256QAM', nonContiguousULRA: true },
        { band: 7, displayName: 'B7', halfDuplex: false, dlMimo: 4, ulMimo: 1, dlQam: '256QAM', ulQam: '256QAM', nonContiguousULRA: true },
        { band: 32, displayName: 'B32', halfDuplex: false, dlMimo: 2, dlQam: '256QAM' },
      ],
      bandCombinations: [
        {
          dlCc: 4,
          ulCc: 1,
          bands: [
            { ratType: 'eutra', band: 1, bandwidthClassDL: 'a', dlMimo: 4, dlQam: '256QAM' },
            { ratType: 'eutra', band: 3, bandwidthClassDL: 'c', bandwidthClassUL: 'a', dlMimo: 4, ulMimo: 1, dlQam: '256QAM', ulQam: '256QAM' },
            { ratType: 'eutra', band: 7, bandwidthClassDL: 'a', dlMimo: 4, dlQam: '256QAM' },
          ],
        },
        {
          dlCc: 3,
          ulCc: 1,
          supportedBandwidthCombinationSet: [0, 1],
          bands: [
            { ratType: 'eutra', band: 1, bandwidthClassDL: 'a', bandwidthClassUL: 'a', dlMimo: 4, ulMimo: 1, dlQam: '256QAM', ulQam: '256QAM' },
            { ratType: 'eutra', band: 3, bandwidthClassDL: 'a', dlMimo: 4, dlQam: '256QAM' },
            { ratType: 'eutra', band: 7, bandwidthClassDL: 'a', dlMimo: 4, dlQam: '256QAM' },
          ],
        },
        {
          dlCc: 2,
          ulCc: 1,
          bands: [
            { ratType: 'eutra', band: 1, bandwidthClassDL: 'a', bandwidthClassUL: 'a', dlMimo: 4, ulMimo: 1, dlQam: '256QAM', ulQam: '256QAM' },
            { ratType: 'eutra', band: 3, bandwidthClassDL: 'a', dlMimo: 4, dlQam: '256QAM' },
          ],
        },
      ],
    },
    nr: {
      bands: [
        {
          band: 78,
          displayName: 'n78',
          powerClass: 'pc3',
          dlMimo: 4,
          ulMimo: 2,
          dlQam: '256QAM',
          ulQam: '256QAM',
          channelBWsDL: { 'scs-30kHz': ['20', '40', '50', '60', '80', '100'] },
          channelBWsUL: { 'scs-30kHz': ['20', '40', '50', '60', '80', '100'] },
          multipleTCI: true,
          bwpWithoutRestriction: true,
        },
        {
          band: 41,
          displayName: 'n41',
          powerClass: 'pc2',
          dlMimo: 4,
          ulMimo: 2,
          dlQam: '256QAM',
          ulQam: '256QAM',
          channelBWsDL: { 'scs-30kHz': ['20', '40', '50', '80', '100'] },
          channelBWsUL: { 'scs-30kHz': ['20', '40', '50', '80', '100'] },
        },
      ],
      bandCombinations: [
        {
          dlCc: 2,
          ulCc: 1,
          bands: [
            { ratType: 'nr', band: 78, bandwidthClassDL: 'c', bandwidthClassUL: 'a', dlMimo: 4, ulMimo: 2, dlQam: '256QAM', ulQam: '256QAM' },
          ],
        },
      ],
    },
  },
  features: {
    'eutra-nr': {
      leaves: [
        { major: 'MRDC-Parameters', middle: 'General', leaf: 'dynamicPowerSharingENDC', kind: 'bool', value: true, description: 'Dynamic power sharing between LTE and NR in EN-DC' },
        { major: 'MRDC-Parameters', middle: 'General', leaf: 'simultaneousRxTxInterBandENDC', kind: 'bool', value: true, description: 'Simultaneous Rx/Tx for inter-band EN-DC' },
      ],
    },
    eutra: {
      leaves: [
        { major: 'UE-Category', middle: 'Rel-12', leaf: 'ue-CategoryDL', kind: 'number', value: 18, description: 'LTE DL UE Category' },
        { major: 'PhyLayerParameters', middle: 'Rel-14', leaf: 'ul-256QAM-r14', kind: 'bool', value: true, description: 'LTE Uplink 256QAM support' },
      ],
    },
  },
  diagnostics: { warnings: [], errors: [] },
};

export const SAMPLE_DEVICE_B: CommonCapaJson = {
  schemaVersion: '2.0',
  meta: {
    deviceName: 'SM-S926N_SLSI',
    fileName: 'SM-S926N_SLSI_Sample.json',
    vendor: 'SLSI',
    detectedRats: ['eutra-nr', 'eutra', 'nr'],
  },
  rats: {
    'eutra-nr': {
      bands: [
        { band: 1, displayName: 'B1', halfDuplex: false, dlMimo: 4, ulMimo: 1, dlQam: '256QAM', ulQam: '256QAM' },
        { band: 3, displayName: 'B3', halfDuplex: false, dlMimo: 2, ulMimo: 1, dlQam: '256QAM', ulQam: '256QAM' },
        { band: 7, displayName: 'B7', halfDuplex: false, dlMimo: 4, ulMimo: 1, dlQam: '256QAM', ulQam: '256QAM' },
        { band: 78, displayName: 'n78', powerClass: 'pc3', dlMimo: 4, ulMimo: 1, dlQam: '256QAM', ulQam: '256QAM' },
        { band: 41, displayName: 'n41', powerClass: 'pc2', dlMimo: 4, ulMimo: 2, dlQam: '256QAM', ulQam: '256QAM' },
      ],
      bandCombinations: [
        // B's 4CA superset covering A's B1(2)-B3(4)-n78(4)
        {
          dlCc: 4,
          ulCc: 2,
          bands: [
            { ratType: 'eutra', band: 1, bandwidthClassDL: 'a', dlMimo: 4, dlQam: '256QAM' },
            { ratType: 'eutra', band: 3, bandwidthClassDL: 'a', bandwidthClassUL: 'a', dlMimo: 4, ulMimo: 1, dlQam: '256QAM', ulQam: '256QAM' },
            { ratType: 'eutra', band: 7, bandwidthClassDL: 'a', dlMimo: 4, dlQam: '256QAM' },
            { ratType: 'nr', band: 78, bandwidthClassDL: 'a', bandwidthClassUL: 'a', dlMimo: 4, ulMimo: 1, dlQam: '256QAM', ulQam: '256QAM' },
          ],
        },
        // Exact-changed pair (BCS [0] instead of [0,1], dynamicPowerSharingENDC false)
        {
          dlCc: 3,
          ulCc: 2,
          supportedBandwidthCombinationSet: [0],
          mrdcParameters: { dynamicPowerSharingENDC: false, simultaneousRxTxInterBandENDC: true },
          bands: [
            { ratType: 'eutra', band: 3, bandwidthClassDL: 'a', bandwidthClassUL: 'a', dlMimo: 4, ulMimo: 1, dlQam: '256QAM', ulQam: '256QAM' },
            { ratType: 'eutra', band: 7, bandwidthClassDL: 'a', dlMimo: 4, dlQam: '256QAM' },
            { ratType: 'nr', band: 78, bandwidthClassDL: 'a', bandwidthClassUL: 'a', dlMimo: 4, ulMimo: 2, dlQam: '256QAM', ulQam: '256QAM' },
          ],
        },
        // Exact match
        {
          dlCc: 3,
          ulCc: 2,
          bands: [
            { ratType: 'eutra', band: 1, bandwidthClassDL: 'a', bandwidthClassUL: 'a', dlMimo: 4, ulMimo: 1, dlQam: '256QAM', ulQam: '256QAM' },
            { ratType: 'eutra', band: 3, bandwidthClassDL: 'a', dlMimo: 4, dlQam: '256QAM' },
            { ratType: 'nr', band: 41, bandwidthClassDL: 'a', bandwidthClassUL: 'a', dlMimo: 4, ulMimo: 2, dlQam: '256QAM', ulQam: '256QAM' },
          ],
        },
      ],
    },
    eutra: {
      bands: [
        { band: 1, displayName: 'B1', halfDuplex: false, dlMimo: 4, ulMimo: 1, dlQam: '256QAM', ulQam: '256QAM', nonContiguousULRA: true },
        { band: 3, displayName: 'B3', halfDuplex: false, dlMimo: 2, ulMimo: 1, dlQam: '256QAM', ulQam: '256QAM', nonContiguousULRA: true },
        { band: 7, displayName: 'B7', halfDuplex: false, dlMimo: 4, ulMimo: 1, dlQam: '256QAM', ulQam: '256QAM', nonContiguousULRA: true },
      ],
      bandCombinations: [
        {
          dlCc: 3,
          ulCc: 1,
          supportedBandwidthCombinationSet: [0],
          bands: [
            { ratType: 'eutra', band: 1, bandwidthClassDL: 'a', bandwidthClassUL: 'a', dlMimo: 4, ulMimo: 1, dlQam: '256QAM', ulQam: '256QAM' },
            { ratType: 'eutra', band: 3, bandwidthClassDL: 'a', dlMimo: 4, dlQam: '256QAM' },
            { ratType: 'eutra', band: 7, bandwidthClassDL: 'a', dlMimo: 4, dlQam: '256QAM' },
          ],
        },
        {
          dlCc: 2,
          ulCc: 1,
          bands: [
            { ratType: 'eutra', band: 1, bandwidthClassDL: 'a', bandwidthClassUL: 'a', dlMimo: 4, ulMimo: 1, dlQam: '256QAM', ulQam: '256QAM' },
            { ratType: 'eutra', band: 3, bandwidthClassDL: 'a', dlMimo: 4, dlQam: '256QAM' },
          ],
        },
      ],
    },
    nr: {
      bands: [
        {
          band: 78,
          displayName: 'n78',
          powerClass: 'pc3',
          dlMimo: 4,
          ulMimo: 1,
          dlQam: '256QAM',
          ulQam: '256QAM',
          channelBWsDL: { 'scs-30kHz': ['20', '40', '50', '60', '80', '100'] },
          channelBWsUL: { 'scs-30kHz': ['20', '40', '50', '60', '80', '100'] },
          multipleTCI: true,
          bwpWithoutRestriction: true,
        },
        {
          band: 41,
          displayName: 'n41',
          powerClass: 'pc2',
          dlMimo: 4,
          ulMimo: 2,
          dlQam: '256QAM',
          ulQam: '256QAM',
          channelBWsDL: { 'scs-30kHz': ['20', '40', '50', '80', '100'] },
          channelBWsUL: { 'scs-30kHz': ['20', '40', '50', '80', '100'] },
        },
      ],
      bandCombinations: [
        {
          dlCc: 2,
          ulCc: 1,
          bands: [
            { ratType: 'nr', band: 78, bandwidthClassDL: 'c', bandwidthClassUL: 'a', dlMimo: 4, ulMimo: 2, dlQam: '256QAM', ulQam: '256QAM' },
          ],
        },
        {
          dlCc: 2,
          ulCc: 1,
          bands: [
            { ratType: 'nr', band: 41, bandwidthClassDL: 'a', bandwidthClassUL: 'a', dlMimo: 4, ulMimo: 2, dlQam: '256QAM', ulQam: '256QAM' },
            { ratType: 'nr', band: 78, bandwidthClassDL: 'a', dlMimo: 4, dlQam: '256QAM' },
          ],
        },
      ],
    },
  },
  features: {
    'eutra-nr': {
      leaves: [
        { major: 'MRDC-Parameters', middle: 'General', leaf: 'dynamicPowerSharingENDC', kind: 'bool', value: false, description: 'Dynamic power sharing between LTE and NR in EN-DC' },
        { major: 'MRDC-Parameters', middle: 'General', leaf: 'simultaneousRxTxInterBandENDC', kind: 'bool', value: true, description: 'Simultaneous Rx/Tx for inter-band EN-DC' },
      ],
    },
    eutra: {
      leaves: [
        { major: 'UE-Category', middle: 'Rel-12', leaf: 'ue-CategoryDL', kind: 'number', value: 16, description: 'LTE DL UE Category' },
        { major: 'PhyLayerParameters', middle: 'Rel-14', leaf: 'ul-256QAM-r14', kind: 'bool', value: true, description: 'LTE Uplink 256QAM support' },
      ],
    },
  },
  diagnostics: { warnings: [], errors: [] },
};
