import type { M1State, DemandReduction, ConservationLevel } from '@/types';
import type { FormulaTrace } from './formula-trace';
import { fmt, v } from './formula-trace';

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

// ============================================================
// Formula Traces — Days of Cover
// ============================================================

export function traceDaysOfCover(
  stock: number,
  consumption: number,
  reduction: number,
  productName: string
): FormulaTrace {
  const adjustedConsumption = consumption * (1 - reduction);
  const days = adjustedConsumption > 0 ? stock / adjustedConsumption : Infinity;

  const hasReduction = reduction > 0;
  const formula = hasReduction
    ? `stock / (consumption \u00d7 (1 - reduction))`
    : `stock / consumption`;
  const substituted = hasReduction
    ? `${fmt(stock, 0)} / (${fmt(consumption, 0)} \u00d7 (1 - ${fmt(reduction, 2)}))`
    : `${fmt(stock, 0)} / ${fmt(consumption, 0)}`;

  const variables = [
    v('stock', `${productName} Stock`, stock, 'user-input', 'tonnes'),
    v('consumption', `${productName} Daily Consumption`, consumption, 'user-input', 'tonnes/day'),
  ];
  if (hasReduction) {
    variables.push(v('reduction', `${productName} Demand Reduction`, reduction, 'computed', '%', 'm7'));
  }

  return {
    id: `m1-${productName.toLowerCase()}-days`,
    title: `${productName} Days of Cover`,
    finalResult: days,
    unit: 'days',
    steps: [
      {
        label: `${productName} Days of Cover`,
        formula,
        substituted,
        result: days,
        unit: 'days',
        variables,
      },
    ],
  };
}

export function traceWeightedDaysOfCover(
  m1: M1State,
  reductions: DemandReduction = { hsd: 0, ms: 0, fo: 0, jp1: 0 }
): FormulaTrace {
  const hsdDays = getDaysOfCover(m1.hsdStock, m1.hsdDailyConsumption, reductions.hsd);
  const msDays = getDaysOfCover(m1.msStock, m1.msDailyConsumption, reductions.ms);
  const foDays = getDaysOfCover(m1.foStock, m1.foDailyConsumption, reductions.fo);
  const weighted = 0.5 * hsdDays + 0.35 * msDays + 0.15 * foDays;

  const hsdTrace = traceDaysOfCover(m1.hsdStock, m1.hsdDailyConsumption, reductions.hsd, 'HSD');
  const msTrace = traceDaysOfCover(m1.msStock, m1.msDailyConsumption, reductions.ms, 'MS');
  const foTrace = traceDaysOfCover(m1.foStock, m1.foDailyConsumption, reductions.fo, 'FO');

  return {
    id: 'm1-weighted-days',
    title: 'Weighted Days of Cover',
    finalResult: weighted,
    unit: 'days',
    steps: [
      {
        label: 'Weighted Days of Cover',
        formula: '0.5 \u00d7 HSD_days + 0.35 \u00d7 MS_days + 0.15 \u00d7 FO_days',
        substituted: `0.5 \u00d7 ${fmt(hsdDays)} + 0.35 \u00d7 ${fmt(msDays)} + 0.15 \u00d7 ${fmt(foDays)}`,
        result: weighted,
        unit: 'days',
        variables: [
          v('0.5', 'HSD weight', 0.5, 'constant'),
          v('0.35', 'MS weight', 0.35, 'constant'),
          v('0.15', 'FO weight', 0.15, 'constant'),
          v('HSD_days', 'HSD Days of Cover', hsdDays, 'computed', 'days'),
          v('MS_days', 'MS Days of Cover', msDays, 'computed', 'days'),
          v('FO_days', 'FO Days of Cover', foDays, 'computed', 'days'),
        ],
      },
      {
        label: 'HSD Days of Cover',
        formula: hsdTrace.steps[0].formula,
        substituted: hsdTrace.steps[0].substituted,
        result: hsdDays,
        unit: 'days',
        variables: hsdTrace.steps[0].variables,
        children: hsdTrace,
      },
      {
        label: 'MS Days of Cover',
        formula: msTrace.steps[0].formula,
        substituted: msTrace.steps[0].substituted,
        result: msDays,
        unit: 'days',
        variables: msTrace.steps[0].variables,
        children: msTrace,
      },
      {
        label: 'FO Days of Cover',
        formula: foTrace.steps[0].formula,
        substituted: foTrace.steps[0].substituted,
        result: foDays,
        unit: 'days',
        variables: foTrace.steps[0].variables,
        children: foTrace,
      },
    ],
  };
}
