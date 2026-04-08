import type { M1State, DemandReduction, ConservationLevel } from '@/types';

export interface DepletionPoint {
  day: number;
  hsdDays: number;
  msDays: number;
  foDays: number;
}

export function getDaysOfCover(stock: number, dailyConsumption: number, reduction: number = 0): number {
  const adjustedConsumption = dailyConsumption * (1 - reduction);
  if (adjustedConsumption <= 0) return Infinity;
  return stock / adjustedConsumption;
}

export function getWeightedDaysOfCover(
  m1: M1State,
  reductions: DemandReduction = { hsd: 0, ms: 0, fo: 0, jp1: 0 }
): number {
  const hsdDays = getDaysOfCover(m1.hsdStock, m1.hsdDailyConsumption, reductions.hsd);
  const msDays = getDaysOfCover(m1.msStock, m1.msDailyConsumption, reductions.ms);
  const foDays = getDaysOfCover(m1.foStock, m1.foDailyConsumption, reductions.fo);
  // Weighted: 0.5*HSD + 0.35*MS + 0.15*FO
  return 0.5 * hsdDays + 0.35 * msDays + 0.15 * foDays;
}

export function computeDepletionCurve(
  m1: M1State,
  reductions: DemandReduction = { hsd: 0, ms: 0, fo: 0, jp1: 0 },
  days: number = 90
): DepletionPoint[] {
  const points: DepletionPoint[] = [];
  const hsdRate = m1.hsdDailyConsumption * (1 - reductions.hsd);
  const msRate = m1.msDailyConsumption * (1 - reductions.ms);
  const foRate = m1.foDailyConsumption * (1 - reductions.fo);

  for (let d = 0; d <= days; d++) {
    const hsdRemaining = Math.max(0, m1.hsdStock - hsdRate * d);
    const msRemaining = Math.max(0, m1.msStock - msRate * d);
    const foRemaining = Math.max(0, m1.foStock - foRate * d);

    points.push({
      day: d,
      hsdDays: hsdRate > 0 ? hsdRemaining / hsdRate : Infinity,
      msDays: msRate > 0 ? msRemaining / msRate : Infinity,
      foDays: foRate > 0 ? foRemaining / foRate : Infinity,
    });
  }
  return points;
}

export function getReductionForLevel(
  level: ConservationLevel,
  m7Reductions: { alert: DemandReduction; austerity: DemandReduction; emergency: DemandReduction }
): DemandReduction {
  switch (level) {
    case 'none': return { hsd: 0, ms: 0, fo: 0, jp1: 0 };
    case 'alert': return m7Reductions.alert;
    case 'austerity': return m7Reductions.austerity;
    case 'emergency': return m7Reductions.emergency;
  }
}
