import type { Refinery, YieldProfile, M3State } from '@/types';

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

export function getBlendedYield(refinery: Refinery, yieldMatrix: Record<string, YieldProfile>): YieldProfile {
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

  // PARCO gets +5% diesel, -5% FO due to mild conversion
  if (refinery.id === 'parco') {
    blended.hsd += 5;
    blended.fo -= 5;
  }

  return blended;
}

export function computeRefineryOutput(
  refinery: Refinery,
  yieldMatrix: Record<string, YieldProfile>,
  foStorageDays: number,
  foDailyConsumption: number
): RefineryOutput {
  const blend = getBlendedYield(refinery, yieldMatrix);
  const dailyBpd = refinery.capacityBpd * refinery.utilization;
  // Convert bpd to tonnes/day (approximate: 1 barrel ≈ 0.136 tonnes for crude)
  const dailyTonnes = dailyBpd * 0.136;

  const foOutputTonnesDay = dailyTonnes * (blend.fo / 100);
  const foExcessDaily = foOutputTonnesDay - (foDailyConsumption * (refinery.capacityBpd / 443_400)); // proportional share
  const foStorageCapacity = foStorageDays * foDailyConsumption * (refinery.capacityBpd / 443_400);
  const foStorageDaysUntilFull = foExcessDaily > 0 ? foStorageCapacity / foExcessDaily : Infinity;

  // Feasibility: 100 if FO <= 30% of output, drops linearly to 0 if FO >= 55%
  const feasibilityScore = Math.max(0, Math.min(100, 100 * (55 - blend.fo) / 25));

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

export function computeAllRefineryOutputs(m3: M3State, foDailyConsumption: number): RefineryOutput[] {
  return m3.refineries.map((r) =>
    computeRefineryOutput(r, m3.yieldMatrix, m3.foStorageDays, foDailyConsumption)
  );
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
