

'use server';

export type PassportData = {
  fullName?: string;
  givenNames?: string;
  familyName?: string;
  passportNumber?: string;
  nationality?: string;
  birthDate?: string; // ISO YYYY-MM-DD if available
  sex?: string;
  placeOfBirth?: string;
  issueDate?: string;
  expiryDate?: string;
  mrz?: {line1?: string; line2?: string; line3?: string} | null;
};

export type VisualEvidenceSignal = {
  name: string;
  present: boolean;
  confidence?: number;
  reason?: string;
};

export type VisualExplain = {
  observations?: string[];
  signals?: VisualEvidenceSignal[];
  confidenceReason?: string;
  limitations?: string[];
};

export type VisualAnomaly = {
  feature: string;
  isValid: boolean;
  confidence?: number;
  comment?: string;
  explain?: VisualExplain;
  region?: {x: number; y: number; w: number; h: number} | null;
};

export type OverallSummary = {
    imageQuality: {
        blur: 'low'|'medium'|'high';
        glare: 'none'|'mild'|'strong';
        compressionArtifacts: 'none'|'mild'|'visible';
        croppingOrSkew: 'none'|'minor'|'severe';
        legibilityScore: number;
        notes: string[];
    };
    tampering: {
        suspicionLevel: 'none'|'low'|'medium'|'high';
        cues: string[];
        verdict: 'NO_EVIDENCE'|'SUSPECT'|'LIKELY';
    };
    criticalFindings: string[];
    recommendations: string[];
};

export type WeightPretty = {
  key: string;
  label: string;
  group: 'Textual' | 'Visual';
  weight: number;     // 0..1
  weightPct: number;  // 0..100
};

export type ScoreDetails = {
  finalScorePct: number;
  textualContributionPct: number;
  visualContributionPct: number; // negativo si resta
  visualMeanPct: number;
  weights: Record<string, number>;
  weightsPretty: WeightPretty[];
  featuresWithEvidence?: number;
};

export type ConfidenceDetail = {
    finalScore: number;
    textualContrib: number;
    visualContrib: number;
    featureMeans: {
        visualMean: number;
        presentFeatures: number;
        absentFeatures: number;
    };
    weightsUsed: Record<string, number>;
    topReasons: string[];
};


export type VerificationResult = {
  visual: {anomalies: VisualAnomaly[]} | null;
  textual: { overallIsValid: boolean, checks: { check: string, isValid: boolean, reason: string }[], textualMismatchCount?: number } | null;
  diplomaData: Record<string, unknown> | null;
  transcriptData: Record<string, unknown> | null;
  passportData?: PassportData | null;
  score: number;
  verdict: 'PASS' | 'REVIEW' | 'FAIL';
  alerts?: Alert[] | null;
  docType?: {index: number; predicted: string; confidence: number; reason: string}[];
  overall?: OverallSummary | null;
  confidenceDetail?: ConfidenceDetail | null;
  scoreDetails?: ScoreDetails;
  jobId?: string;
};

export type Alert = {
  level: 'error' | 'warn';
  code: string;
  message: string;
};

export type FieldKey =
  | 'degreeTitle' | 'studentName' | 'parentsNames' | 'institutionName'
  | 'rollNumber' | 'registrationNumber'
  | 'discipline' | 'gpa' | 'examYear' | 'publicationDate'
  | 'numberOfSubjects' | 'letterGrades' | 'gradePoints';
