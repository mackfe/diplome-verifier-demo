// src/lib/scoreEngine.ts

export type Verdict = 'PASS' | 'REVIEW' | 'FAIL';

export type TextualCheckId =
  | 'nameMatch'
  | 'institutionMatch'
  | 'yearMatch'
  | 'disciplineMatch'
  | 'idFormat'
  | 'gpaCoherence'
  | 'subjectCount'
  | 'dateCoherence'
  | 'ageConsistency';

export type TextualCheck = {
  check: TextualCheckId | string;
  isValid: boolean;
  reason: string;
};

export type VisualAnomaly = {
  feature: string;
  isValid: boolean;
  confidence: number;
  comment: string;
};

export type Alert = {level: 'error' | 'warn'; code: string; message: string};

export type ConfidenceDetail = {
  finalScore: number;
  textualContrib: number;
  visualContrib: number;
  featureMeans: {
    visualMean: number;
    presentFeatures: number;
    absentFeatures: number;
  };
  weightsUsed: Record<TextualCheckId, number>;
  topReasons: string[];
};

export type ScoreResult = {
  score: number;
  verdict: Verdict;
  visualMean: number;
  textualScore: number;
  confidenceDetail: ConfidenceDetail;
  presentFeatures: number;
  absentFeatures: number;
};

export const DEFAULT_TEXTUAL_WEIGHTS: Record<TextualCheckId, number> = {
  nameMatch: 0.18,
  institutionMatch: 0.16,
  yearMatch: 0.1,
  disciplineMatch: 0.08,
  idFormat: 0.1,
  gpaCoherence: 0.1,
  subjectCount: 0.08,
  dateCoherence: 0.08,
  ageConsistency: 0.06,
};

export const DEFAULT_ALPHA = 0.5;
export const PASS_THRESHOLD = 0.8;
export const REVIEW_THRESHOLD = 0.55;

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

function mean(nums: number[]): number {
  return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
}

export function computeVisualMean(anomalies: VisualAnomaly[]) {
  const observed = anomalies.filter((a) => a.confidence > 0);
  const visualMean = mean(observed.map((a) => clamp01(a.confidence)));
  return {
    visualMean,
    presentFeatures: observed.length,
    absentFeatures: anomalies.length - observed.length,
  };
}

export function computeTextualScore(
  textualChecks: TextualCheck[],
  weights: Record<TextualCheckId, number> = DEFAULT_TEXTUAL_WEIGHTS
) {
  const map = new Map<TextualCheckId | string, boolean>(textualChecks.map((c) => [c.check, !!c.isValid]));
  const sum = (Object.keys(weights) as TextualCheckId[]).reduce((acc, k) => {
    const v = map.get(k) ? 1 : 0;
    return acc + weights[k] * v;
  }, 0);
  return clamp01(sum);
}

export type HardRuleOptions = {
  alerts?: Alert[];
  forceFailCodes?: string[];
  criticalFindings?: string[];
  forceFailCritical?: boolean;
  minWhenForcedFail?: number;
};

export function applyHardRules(
  verdict: Verdict,
  score: number,
  {
    alerts = [],
    forceFailCodes = ['DOC_TYPE_MISMATCH', 'MISSING_DIPLOMA'],
    criticalFindings = [],
    forceFailCritical = true,
    minWhenForcedFail = 0.49,
  }: HardRuleOptions
) {
  let forced = verdict;
  let final = score;

  const hasCriticalAlert = alerts.some((a) => a.level === 'error' && forceFailCodes.includes(a.code));
  const hasCriticalFinding = forceFailCritical && criticalFindings.length > 0;

  if (hasCriticalAlert || hasCriticalFinding) {
    forced = 'FAIL';
    final = Math.min(final, minWhenForcedFail);
  }
  return {verdict: forced, score: final};
}

export function verdictFromScore(score: number): Verdict {
  if (score >= PASS_THRESHOLD) return 'PASS';
  if (score >= REVIEW_THRESHOLD) return 'REVIEW';
  return 'FAIL';
}

export function computeFinalScore({
  anomalies,
  textualChecks,
  alpha = DEFAULT_ALPHA,
  weights = DEFAULT_TEXTUAL_WEIGHTS,
}: {
  anomalies: VisualAnomaly[];
  textualChecks: TextualCheck[];
  alpha?: number;
  weights?: Record<TextualCheckId, number>;
}): Omit<ScoreResult, 'verdict' | 'score'> & {baseScore: number} {
  const {visualMean, presentFeatures, absentFeatures} = computeVisualMean(anomalies);
  const textualScore = computeTextualScore(textualChecks, weights);

  const baseScore = clamp01(alpha * visualMean + (1 - alpha) * textualScore);

  const confidenceDetail: ConfidenceDetail = {
    finalScore: baseScore,
    textualContrib: textualScore,
    visualContrib: visualMean,
    featureMeans: {visualMean, presentFeatures, absentFeatures},
    weightsUsed: weights,
    topReasons: buildTopReasons({anomalies, textualChecks}),
  };

  return {
    baseScore,
    visualMean,
    textualScore,
    confidenceDetail,
    presentFeatures,
    absentFeatures,
  };
}

function buildTopReasons({
  anomalies,
  textualChecks,
  maxReasons = 5,
}: {
  anomalies: VisualAnomaly[];
  textualChecks: TextualCheck[];
  maxReasons?: number;
}): string[] {
  const reasons: string[] = [];

  textualChecks.filter((c) => !c.isValid).forEach((c) => reasons.push(`[text] ${c.check}: ${c.reason}`));

  anomalies
    .filter((a) => a.confidence > 0 && !a.isValid && a.confidence < 0.6)
    .sort((a, b) => a.confidence - b.confidence)
    .slice(0, 3)
    .forEach((a) =>
      reasons.push(`[visual] ${a.feature}: low confidence ${Math.round(a.confidence * 100)}% — ${a.comment}`)
    );

  if (reasons.length === 0) {
    const topVisual = [...anomalies]
      .filter((a) => a.confidence > 0)
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 2)
      .map((a) => `[visual+] ${a.feature}: ${Math.round(a.confidence * 100)}%`);
    reasons.push(...topVisual);
  }

  return reasons.slice(0, maxReasons);
}

export function assessDiploma({
  anomalies,
  textualChecks,
  alerts = [],
  criticalFindings = [],
  alpha = DEFAULT_ALPHA,
  weights = DEFAULT_TEXTUAL_WEIGHTS,
  hardRuleOptions = {},
}: {
  anomalies: VisualAnomaly[];
  textualChecks: TextualCheck[];
  alerts?: Alert[];
  criticalFindings?: string[];
  alpha?: number;
  weights?: Record<TextualCheckId, number>;
  hardRuleOptions?: HardRuleOptions;
}): ScoreResult {
  const base = computeFinalScore({anomalies, textualChecks, alpha, weights});
  let verdict = verdictFromScore(base.baseScore);
  let score = base.baseScore;

  const forced = applyHardRules(verdict, score, {
    alerts,
    criticalFindings,
    ...hardRuleOptions,
  });
  verdict = forced.verdict;
  score = clamp01(forced.score);

  const confidenceDetail: ConfidenceDetail = {
    ...base.confidenceDetail,
    finalScore: score,
  };

  return {
    score,
    verdict,
    visualMean: base.visualMean,
    textualScore: base.textualScore,
    confidenceDetail,
    presentFeatures: base.presentFeatures,
    absentFeatures: base.absentFeatures,
  };
}
