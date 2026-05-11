/**
 * Verification tests for garment-aql-calculator
 *
 * Cross-verified against:
 *   - QIMA published reference (L+AQL2.5 = Accept 10)
 *   - ISO 2859-1:1999 Table II-A standard
 *   - Common garment QC scenarios
 *
 * Run: npm test  OR  node test.js
 */

const { calculateAQL, calculateGarmentInspection, getCodeLetter } = require('./index');

let passed = 0;
let failed = 0;

function assertEqual(actual, expected, label) {
  if (JSON.stringify(actual) === JSON.stringify(expected)) {
    console.log(`  ✓ ${label}`);
    passed++;
  } else {
    console.log(`  ✗ ${label}`);
    console.log(`    expected: ${JSON.stringify(expected)}`);
    console.log(`    actual:   ${JSON.stringify(actual)}`);
    failed++;
  }
}

function assertThrows(fn, label) {
  try {
    fn();
    console.log(`  ✗ ${label} (expected throw, did not)`);
    failed++;
  } catch (_) {
    console.log(`  ✓ ${label}`);
    passed++;
  }
}

console.log('\n=== getCodeLetter (ISO 2859 Table A) ===');
// Verified from QIMA documentation
assertEqual(getCodeLetter(2400, 'GII'), 'K', 'Lot 2400, GII → K');
assertEqual(getCodeLetter(500, 'GII'), 'H', 'Lot 500, GII → H');
assertEqual(getCodeLetter(1200, 'GII'), 'J', 'Lot 1200, GII → J');
assertEqual(getCodeLetter(150, 'GII'), 'F', 'Lot 150, GII → F');
assertEqual(getCodeLetter(50, 'GI'), 'C', 'Lot 50, GI → C');
assertEqual(getCodeLetter(10000, 'GIII'), 'M', 'Lot 10000, GIII → M');

console.log('\n=== Sample size + Accept/Reject (verified against QIMA) ===');
// QIMA confirmed: L (sample 200) + AQL 2.5 = Accept 10, Reject 11
let r = calculateAQL({ lotSize: 4000, inspectionLevel: 'GII', aql: 2.5 });
assertEqual(r.codeLetter, 'L', 'Lot 4000 GII → L');
assertEqual(r.sampleSize, 200, 'L → sample size 200');
assertEqual(r.acceptNumber, 10, 'L + AQL 2.5 → accept 10 (QIMA verified)');
assertEqual(r.rejectNumber, 11, 'L + AQL 2.5 → reject 11');

// Common case: K (sample 125) + AQL 2.5
r = calculateAQL({ lotSize: 2400, inspectionLevel: 'GII', aql: 2.5 });
assertEqual(r.codeLetter, 'K', 'Lot 2400 GII → K');
assertEqual(r.sampleSize, 125, 'K → sample size 125');
assertEqual(r.acceptNumber, 7, 'K + AQL 2.5 → accept 7');
assertEqual(r.rejectNumber, 8, 'K + AQL 2.5 → reject 8');

// J (sample 80) + AQL 2.5
r = calculateAQL({ lotSize: 800, inspectionLevel: 'GII', aql: 2.5 });
assertEqual(r.codeLetter, 'J', 'Lot 800 GII → J');
assertEqual(r.sampleSize, 80, 'J → sample size 80');
assertEqual(r.acceptNumber, 5, 'J + AQL 2.5 → accept 5');

// H (sample 50) + AQL 4.0
r = calculateAQL({ lotSize: 400, inspectionLevel: 'GII', aql: 4.0 });
assertEqual(r.codeLetter, 'H', 'Lot 400 GII → H');
assertEqual(r.sampleSize, 50, 'H → sample size 50');
assertEqual(r.acceptNumber, 5, 'H + AQL 4.0 → accept 5');

console.log('\n=== Decision function ===');
r = calculateAQL({ lotSize: 2400, inspectionLevel: 'GII', aql: 2.5 });
assertEqual(r.decision(5), 'ACCEPT', '5 defects with accept=7 → ACCEPT');
assertEqual(r.decision(7), 'ACCEPT', '7 defects with accept=7 → ACCEPT (boundary)');
assertEqual(r.decision(8), 'REJECT', '8 defects with reject=8 → REJECT');
assertEqual(r.decision(0), 'ACCEPT', '0 defects → ACCEPT');
assertEqual(r.decision(15), 'REJECT', '15 defects → REJECT');

console.log('\n=== Full garment inspection (3-tier) ===');
const inspection = calculateGarmentInspection({ lotSize: 2400, inspectionLevel: 'GII' });
assertEqual(inspection.critical.sampleSize, 125, 'Critical sample size 125');
assertEqual(inspection.critical.acceptNumber, 2, 'Critical AQL 0.65 → accept 2');
assertEqual(inspection.major.sampleSize, 125, 'Major sample size 125');
assertEqual(inspection.major.acceptNumber, 7, 'Major AQL 2.5 → accept 7');
assertEqual(inspection.minor.sampleSize, 125, 'Minor sample size 125');
assertEqual(inspection.minor.acceptNumber, 10, 'Minor AQL 4.0 → accept 10');

console.log('\n=== Input validation ===');
assertThrows(() => calculateAQL({ lotSize: 0 }), 'Throws on lotSize < 2');
assertThrows(() => calculateAQL({ lotSize: 100, inspectionLevel: 'GIV' }), 'Throws on invalid level');
assertThrows(() => calculateAQL({ lotSize: 100, aql: 5.0 }), 'Throws on unsupported AQL');

console.log(`\n${passed}/${passed + failed} tests passed.${failed > 0 ? ' ' + failed + ' FAILED.' : ''}`);
process.exit(failed > 0 ? 1 : 0);
