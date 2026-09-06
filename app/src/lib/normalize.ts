
// src/lib/normalize.ts
export type UiStatus = 'Valid' | 'Anomaly';

/**
 * Normaliza un valor de confianza (0..1) a un estado y valor bucketizado.
 * - `Valid`: Si la confianza es > 0.5.
 * - `Anomaly`: Si la confianza es <= 0.5.
 */
export function applyBucket(
  conf01: number,
  comment?: string | null
): {
  uiStatus: UiStatus;
  isValidFromBucket: boolean;
  notObserved: boolean;
  confidence: number;
} {
  const confidence = Number.isFinite(conf01) ? Math.max(0, Math.min(1, conf01)) : 0;
  
  // La nueva lógica simplificada:
  const uiStatus: UiStatus = confidence > 0.5 ? 'Valid' : 'Anomaly';
  const isValidFromBucket = uiStatus === 'Valid';
  
  // "notObserved" se mantiene en false, ya que no se usa para el estado.
  const notObserved = confidence === 0;

  return {uiStatus, isValidFromBucket, notObserved, confidence};
}
