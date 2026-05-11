export type InspectionLevel = 'S1' | 'S2' | 'S3' | 'S4' | 'GI' | 'GII' | 'GIII';
export type AQLValue = 0.65 | 1.0 | 1.5 | 2.5 | 4.0 | 6.5;

export interface AQLResult {
  lotSize: number;
  inspectionLevel: InspectionLevel;
  aql: AQLValue;
  codeLetter: string;
  sampleSize: number;
  acceptNumber: number;
  rejectNumber: number;
  decision: (defectsFound: number) => 'ACCEPT' | 'REJECT';
}

export interface GarmentInspectionResult {
  critical: AQLResult;
  major: AQLResult;
  minor: AQLResult;
}

export function calculateAQL(params: {
  lotSize: number;
  inspectionLevel?: InspectionLevel;
  aql?: AQLValue;
}): AQLResult;

export function calculateGarmentInspection(params: {
  lotSize: number;
  inspectionLevel?: InspectionLevel;
  criticalAQL?: AQLValue;
  majorAQL?: AQLValue;
  minorAQL?: AQLValue;
}): GarmentInspectionResult;

export function getCodeLetter(lotSize: number, inspectionLevel: InspectionLevel): string;

export const VALID_LEVELS: InspectionLevel[];
export const VALID_AQLS: AQLValue[];
