# garment-aql-calculator

AQL (Acceptable Quality Limit) sampling calculator for garment industry quality control. Implements ISO 2859-1 — the universal standard for inspection by attributes used by every garment QC team globally.

Built and used in production by [Scan ERP](https://scanerp.pro) — a garment manufacturing ERP running on a 100+ machine CMT factory in Nepal.

## Install

```bash
npm install garment-aql-calculator
```

## Why this exists

Every garment factory QC team runs AQL sampling on every shipment. Existing tools (QIMA, HQTS, Tetra Inspection) are web-only — no programmatic library. This package fills that gap so ERP systems, QC apps, and custom dashboards can run AQL calculations natively.

## Quick start

```js
const { calculateAQL } = require('garment-aql-calculator');

const result = calculateAQL({
  lotSize: 2400,
  inspectionLevel: 'GII',
  aql: 2.5,
});

console.log(result);
// {
//   lotSize: 2400,
//   inspectionLevel: 'GII',
//   aql: 2.5,
//   codeLetter: 'K',
//   sampleSize: 125,
//   acceptNumber: 7,
//   rejectNumber: 8,
//   decision: [Function]
// }

// Use the decision function with actual defects found
console.log(result.decision(5));   // 'ACCEPT' (5 ≤ 7)
console.log(result.decision(8));   // 'REJECT' (8 ≥ 8)
```

## Full garment inspection (critical + major + minor)

Standard garment QC runs three AQL sampling plans simultaneously. Use the convenience function:

```js
const { calculateGarmentInspection } = require('garment-aql-calculator');

const inspection = calculateGarmentInspection({
  lotSize: 2400,
  inspectionLevel: 'GII',
  // Defaults — standard garment industry values
  criticalAQL: 0.65,
  majorAQL: 2.5,
  minorAQL: 4.0,
});

console.log('Critical:', inspection.critical.sampleSize, 'accept', inspection.critical.acceptNumber);
console.log('Major:',    inspection.major.sampleSize,    'accept', inspection.major.acceptNumber);
console.log('Minor:',    inspection.minor.sampleSize,    'accept', inspection.minor.acceptNumber);
```

## API

### `calculateAQL({ lotSize, inspectionLevel, aql })`

| Param | Type | Default | Notes |
|-------|------|---------|-------|
| `lotSize` | number | required | Total units in the production lot (≥ 2) |
| `inspectionLevel` | string | `'GII'` | One of S1, S2, S3, S4, GI, GII, GIII |
| `aql` | number | `2.5` | One of 0.65, 1.0, 1.5, 2.5, 4.0, 6.5 |

Returns `{ codeLetter, sampleSize, acceptNumber, rejectNumber, decision }`.

### `calculateGarmentInspection({ lotSize, inspectionLevel, criticalAQL, majorAQL, minorAQL })`

Returns three AQL results — one for each defect tier.

### `getCodeLetter(lotSize, inspectionLevel)`

Lower-level utility: returns just the ISO 2859 code letter.

## ISO 2859 reference

| Inspection level | Use case |
|------------------|----------|
| **GI** | Lower-risk products, smaller sample |
| **GII** | **Default** — most garment inspections |
| **GIII** | Higher-risk products, larger sample |
| **S1, S2, S3, S4** | Special inspection levels for destructive or expensive testing |

| Garment defect tier | Standard AQL |
|---------------------|--------------|
| **Critical** (safety, regulatory) | 0.65 |
| **Major** (workmanship affecting function) | 2.5 |
| **Minor** (cosmetic only) | 4.0 |

## License

MIT — © 2026 Santosh Rijal / Scan ERP — https://scanerp.pro

## Related packages

- [`garment-smv-calculator`](https://www.npmjs.com/package/garment-smv-calculator) — SMV/SAM time-study
- [`garment-piece-rate`](https://www.npmjs.com/package/garment-piece-rate) — Piece-rate payment calculation
- [`garment-bundle-id`](https://www.npmjs.com/package/garment-bundle-id) — Bundle ID generation
- [`garment-dhu-calculator`](https://www.npmjs.com/package/garment-dhu-calculator) — Defects Per Hundred Units
- [`garment-line-efficiency`](https://www.npmjs.com/package/garment-line-efficiency) — Sewing line efficiency
- [`garment-fabric-consumption`](https://www.npmjs.com/package/garment-fabric-consumption) — Fabric consumption
- [`garment-cmt-cost`](https://www.npmjs.com/package/garment-cmt-cost) — CMT cost calculation
