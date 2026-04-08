import type { Refinery, YieldProfile, M3State } from '@/types';
import type { FormulaTrace } from './formula-trace';
import { fmt, v } from './formula-trace';

export interface RefineryOutput {
  refineryId: string;
  refineryName: string;
  dailyBpd: number;
  lpg: number;
  naphthaPetrol: number;
  hsd: number;
  jp1Kero: number;
  fo: number;
  loss: number;
  foStorageDaysUntilFull: number;
  feasibilityScore: number;
}

export function getBlendedYield(refinery: Refinery, yieldMatrix: Record<string, YieldProfile>, parcoHsdBonus: number = 5, parcoFoReduction: number = 5): YieldProfile {
  const blended: YieldProfile = { lpg: 0, naphthaPetrol: 0, hsd: 0, jp1Kero: 0, fo: 0, loss: 0 };
  let totalWeight = 0;

  for (const [grade, pct] of Object.entries(refinery.crudeDiet)) {
    if (pct <= 0) continue;
    const y = yieldMatrix[grade];
    if (!y) continue;
    const w = pct / 100;
    totalWeight += w;
    blended.lpg += y.lpg * w;
    blended.naphthaPetrol += y.naphthaPetrol * w;
    blended.hsd += y.hsd * w;
    blended.jp1Kero += y.jp1Kero * w;
    blended.fo += y.fo * w;
    blended.loss += y.loss * w;
  }

  // PARCO gets bonus diesel, reduced FO due to mild conversion
  if (refinery.id === 'parco') {
    blended.hsd += parcoHsdBonus;
    blended.fo -= parcoFoReduction;
  }

  return blended;
}

export function computeRefineryOutput(
  refinery: Refinery,
  yieldMatrix: Record<string, YieldProfile>,
  foStorageDays: number,
  foDailyConsumption: number,
  fp?: { m3_foInfeasibleThreshold: number; m3_barrelToTonneConversion: number; m3_parcoHsdBonus: number; m3_parcoFoReduction: number }
): RefineryOutput {
  const foInfeasible = fp?.m3_foInfeasibleThreshold ?? 55;
  const bblToTonne = fp?.m3_barrelToTonneConversion ?? 0.136;
  const blend = getBlendedYield(refinery, yieldMatrix, fp?.m3_parcoHsdBonus, fp?.m3_parcoFoReduction);
  const dailyBpd = refinery.capacityBpd * refinery.utilization;
  const dailyTonnes = dailyBpd * bblToTonne;

  const foOutputTonnesDay = dailyTonnes * (blend.fo / 100);
  const foExcessDaily = foOutputTonnesDay - (foDailyConsumption * (refinery.capacityBpd / 443_400)); // proportional share
  const foStorageCapacity = foStorageDays * foDailyConsumption * (refinery.capacityBpd / 443_400);
  const foStorageDaysUntilFull = foExcessDaily > 0 ? foStorageCapacity / foExcessDaily : Infinity;

  // Feasibility: 100 if FO <= threshold-25, drops linearly to 0 if FO >= threshold
  const feasibilityScore = Math.max(0, Math.min(100, 100 * (foInfeasible - blend.fo) / 25));

  return {
    refineryId: refinery.id,
    refineryName: refinery.shortName,
    dailyBpd,
    lpg: dailyTonnes * blend.lpg / 100,
    naphthaPetrol: dailyTonnes * blend.naphthaPetrol / 100,
    hsd: dailyTonnes * blend.hsd / 100,
    jp1Kero: dailyTonnes * blend.jp1Kero / 100,
    fo: dailyTonnes * blend.fo / 100,
    loss: dailyTonnes * blend.loss / 100,
    foStorageDaysUntilFull: Math.max(0, foStorageDaysUntilFull),
    feasibilityScore,
  };
}

export function computeAllRefineryOutputs(
  m3: M3State,
  foDailyConsumption: number,
  fp?: { m3_foInfeasibleThreshold: number; m3_barrelToTonneConversion: number; m3_parcoHsdBonus: number; m3_parcoFoReduction: number }
): RefineryOutput[] {
  return m3.refineries.map((r) =>
    computeRefineryOutput(r, m3.yieldMatrix, m3.foStorageDays, foDailyConsumption, fp)
  );
}

// ============================================================
// Formula Trace — Refinery Feasibility
// ============================================================

export function traceFeasibility(
  refinery: Refinery,
  yieldMatrix: Record<string, YieldProfile>
): FormulaTrace {
  const blend = getBlendedYield(refinery, yieldMatrix);
  const foYield = blend.fo;
  const feasibility = Math.max(0, Math.min(100, 100 * (55 - foYield) / 25));

  const dietEntries = Object.entries(refinery.crudeDiet).filter(([, pct]) => pct > 0);
  const dietDesc = dietEntries.map(([grade, pct]) => {
    const y = yieldMatrix[grade];
    return `${grade} ${pct}% (FO: ${y ? fmt(y.fo, 0) : '?'}%)`;
  }).join(' + ');

  return {
    id: `m3-feasibility-${refinery.id}`,
    title: `Feasibility Score: ${refinery.shortName}`,
    finalResult: feasibility,
    unit: 'pts (0-100)',
    steps: [
      {
        label: 'Blended FO Yield',
        formula: 'Σ(crudeGrade_pct × FO_yield) / 100' + (refinery.id === 'parco' ? ' - 5% (PARCO mild conversion)' : ''),
        substituted: dietDesc + (refinery.id === 'parco' ? ' → FO adjusted -5%' : ''),
        result: foYield,
        unit: '%',
        variables: dietEntries.map(([grade, pct]) =>
          v(grade, `${grade} allocation`, pct, 'user-input', '%')
        ),
      },
      {
        label: 'Feasibility Score',
        formula: 'max(0, min(100, 100 × (55 - FO%) / 25))',
        substituted: `max(0, min(100, 100 × (55 - ${fmt(foYield)}) / 25))`,
        result: feasibility,
        unit: 'pts',
        variables: [
          v('FO%', 'Blended FO yield', foYield, 'computed', '%'),
          v('55', 'FO threshold (infeasible)', 55, 'constant', '%'),
          v('25', 'Score range denominator', 25, 'constant'),
        ],
      },
    ],
  };
}

export function getTotalDailyOutput(outputs: RefineryOutput[]) {
  return {
    hsd: outputs.reduce((s, o) => s + o.hsd, 0),
    naphthaPetrol: outputs.reduce((s, o) => s + o.naphthaPetrol, 0),
    fo: outputs.reduce((s, o) => s + o.fo, 0),
    jp1Kero: outputs.reduce((s, o) => s + o.jp1Kero, 0),
    lpg: outputs.reduce((s, o) => s + o.lpg, 0),
  };
}
