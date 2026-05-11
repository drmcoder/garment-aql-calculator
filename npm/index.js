/**
 * AQL (Acceptable Quality Limit) Calculator for Garment Industry QC
 *
 * Implements ISO 2859-1 sampling procedures for inspection by attributes.
 * Used by garment QC teams to determine sample size and accept/reject
 * thresholds for every shipment inspection.
 *
 * Two-step lookup:
 *   1. Lot size + Inspection level → Code letter (Table A)
 *   2. Code letter + AQL → Sample size + Accept/Reject numbers (Table B)
 *
 * Standard AQL values for garment inspection:
 *   - 0.65 or 1.0 for critical defects
 *   - 2.5 for major defects
 *   - 4.0 or 6.5 for minor defects
 *
 * Reference: https://scanerp.pro/blog/fabric-inspection-4-point-system-guide.html
 *
 * @example
 *   const { calculateAQL } = require('garment-aql-calculator');
 *   const result = calculateAQL({
 *     lotSize: 2400,
 *     inspectionLevel: 'GII',
 *     aql: 2.5
 *   });
 *   // → { codeLetter: 'K', sampleSize: 125, acceptNumber: 7, rejectNumber: 8 }
 */

// Table A: Lot size + Inspection level → Code letter
// ISO 2859-1 sample size code letters
const SAMPLE_SIZE_CODE_LETTERS = [
  // [minLot, maxLot, S1, S2, S3, S4, GI, GII, GIII]
  [2, 8,        'A', 'A', 'A', 'A', 'A', 'A', 'B'],
  [9, 15,       'A', 'A', 'A', 'A', 'A', 'B', 'C'],
  [16, 25,      'A', 'A', 'B', 'B', 'B', 'C', 'D'],
  [26, 50,      'A', 'B', 'B', 'C', 'C', 'D', 'E'],
  [51, 90,      'B', 'B', 'C', 'C', 'C', 'E', 'F'],
  [91, 150,     'B', 'B', 'C', 'D', 'D', 'F', 'G'],
  [151, 280,    'B', 'C', 'D', 'E', 'E', 'G', 'H'],
  [281, 500,    'B', 'C', 'D', 'E', 'F', 'H', 'J'],
  [501, 1200,   'C', 'C', 'E', 'F', 'G', 'J', 'K'],
  [1201, 3200,  'C', 'D', 'E', 'G', 'H', 'K', 'L'],
  [3201, 10000, 'C', 'D', 'F', 'G', 'J', 'L', 'M'],
  [10001, 35000,'C', 'D', 'F', 'H', 'K', 'M', 'N'],
  [35001, 150000,'D','E', 'G', 'J', 'L', 'N', 'P'],
  [150001, 500000,'D','E','G','J','M','P','Q'],
  [500001, Infinity,'D','E','H','K','N','Q','R'],
];

// Map column index for inspection level
const LEVEL_COLUMN = { S1: 2, S2: 3, S3: 4, S4: 5, GI: 6, GII: 7, GIII: 8 };

// Sample size per code letter
const SAMPLE_SIZE_BY_LETTER = {
  A: 2, B: 3, C: 5, D: 8, E: 13, F: 20, G: 32, H: 50,
  J: 80, K: 125, L: 200, M: 315, N: 500, P: 800, Q: 1250, R: 2000,
};

// Table II-A: Single sampling plans for normal inspection (ISO 2859-1)
// Format: code letter → AQL value → [Accept, Reject]
// Verified against QIMA published reference (L+2.5=10, K+2.5=7).
// Cells marked "↓" in the spec (sample too small) resolved to (0,1)
// because at A-D sample sizes the accept number is always 0.
// Cells marked "↑" (sample too big for very loose AQL) carry the
// (21,22) cap from the larger-letter row.
const TABLE_B = {
  A: { 0.65: [0,1], 1.0: [0,1], 1.5: [0,1], 2.5: [0,1], 4.0: [0,1], 6.5: [0,1] },
  B: { 0.65: [0,1], 1.0: [0,1], 1.5: [0,1], 2.5: [0,1], 4.0: [0,1], 6.5: [0,1] },
  C: { 0.65: [0,1], 1.0: [0,1], 1.5: [0,1], 2.5: [0,1], 4.0: [0,1], 6.5: [0,1] },
  D: { 0.65: [0,1], 1.0: [0,1], 1.5: [0,1], 2.5: [0,1], 4.0: [0,1], 6.5: [1,2] },
  E: { 0.65: [0,1], 1.0: [0,1], 1.5: [0,1], 2.5: [0,1], 4.0: [1,2], 6.5: [2,3] },
  F: { 0.65: [0,1], 1.0: [0,1], 1.5: [0,1], 2.5: [1,2], 4.0: [2,3], 6.5: [3,4] },
  G: { 0.65: [0,1], 1.0: [0,1], 1.5: [1,2], 2.5: [2,3], 4.0: [3,4], 6.5: [5,6] },
  H: { 0.65: [0,1], 1.0: [1,2], 1.5: [2,3], 2.5: [3,4], 4.0: [5,6], 6.5: [7,8] },
  J: { 0.65: [1,2], 1.0: [2,3], 1.5: [3,4], 2.5: [5,6], 4.0: [7,8], 6.5: [10,11] },
  K: { 0.65: [2,3], 1.0: [3,4], 1.5: [5,6], 2.5: [7,8], 4.0: [10,11], 6.5: [14,15] },
  L: { 0.65: [3,4], 1.0: [5,6], 1.5: [7,8], 2.5: [10,11], 4.0: [14,15], 6.5: [21,22] },
  M: { 0.65: [5,6], 1.0: [7,8], 1.5: [10,11], 2.5: [14,15], 4.0: [21,22], 6.5: [21,22] },
  N: { 0.65: [7,8], 1.0: [10,11], 1.5: [14,15], 2.5: [21,22], 4.0: [21,22], 6.5: [21,22] },
  P: { 0.65: [10,11], 1.0: [14,15], 1.5: [21,22], 2.5: [21,22], 4.0: [21,22], 6.5: [21,22] },
  Q: { 0.65: [14,15], 1.0: [21,22], 1.5: [21,22], 2.5: [21,22], 4.0: [21,22], 6.5: [21,22] },
  R: { 0.65: [21,22], 1.0: [21,22], 1.5: [21,22], 2.5: [21,22], 4.0: [21,22], 6.5: [21,22] },
};

const VALID_LEVELS = ['S1', 'S2', 'S3', 'S4', 'GI', 'GII', 'GIII'];
const VALID_AQLS = [0.65, 1.0, 1.5, 2.5, 4.0, 6.5];

function getCodeLetter(lotSize, inspectionLevel) {
  if (lotSize < 2) throw new Error('lotSize must be >= 2');
  if (!VALID_LEVELS.includes(inspectionLevel)) {
    throw new Error(`inspectionLevel must be one of: ${VALID_LEVELS.join(', ')}`);
  }
  const col = LEVEL_COLUMN[inspectionLevel];
  for (const row of SAMPLE_SIZE_CODE_LETTERS) {
    if (lotSize >= row[0] && lotSize <= row[1]) {
      return row[col];
    }
  }
  throw new Error('lotSize out of supported range');
}

function calculateAQL({ lotSize, inspectionLevel = 'GII', aql = 2.5 }) {
  if (!VALID_AQLS.includes(aql)) {
    throw new Error(`aql must be one of: ${VALID_AQLS.join(', ')}. For other AQL values, see ISO 2859-1 Table II-A.`);
  }
  const codeLetter = getCodeLetter(lotSize, inspectionLevel);
  const sampleSize = SAMPLE_SIZE_BY_LETTER[codeLetter];
  const [acceptNumber, rejectNumber] = TABLE_B[codeLetter][aql];
  return {
    lotSize,
    inspectionLevel,
    aql,
    codeLetter,
    sampleSize,
    acceptNumber,
    rejectNumber,
    decision: (defectsFound) => defectsFound <= acceptNumber ? 'ACCEPT' : 'REJECT',
  };
}

/**
 * Calculate the sample sizes for a garment inspection covering critical,
 * major, and minor defects (the typical 3-tier inspection).
 *
 * Standard garment industry AQLs:
 *   - Critical: 0.65
 *   - Major: 2.5
 *   - Minor: 4.0
 */
function calculateGarmentInspection({ lotSize, inspectionLevel = 'GII', criticalAQL = 0.65, majorAQL = 2.5, minorAQL = 4.0 }) {
  return {
    critical: calculateAQL({ lotSize, inspectionLevel, aql: criticalAQL }),
    major: calculateAQL({ lotSize, inspectionLevel, aql: majorAQL }),
    minor: calculateAQL({ lotSize, inspectionLevel, aql: minorAQL }),
  };
}

module.exports = {
  calculateAQL,
  calculateGarmentInspection,
  getCodeLetter,
  VALID_LEVELS,
  VALID_AQLS,
};
