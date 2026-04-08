import type { TriggerLevel, ScenarioState } from '@/types';
import { getWeightedDaysOfCover, getDaysOfCover } from './m1-inventory';
import { getPipelineStatusScore } from './m2-pipeline';
import { computeIranCorridor } from './m5-iran';

export interface TriggerOutput {
  compositeStress: number;
  recommendedLevel: TriggerLevel;
  components: {
    stressD: number;
    stressP: number;
    stressS: number;
    bufferA: number;
    bufferI: number;
  };
  hardOverrideActive: string | null;
}

function getAlternateActivationScore(scenario: ScenarioState): number {
  const activeSources = scenario.m4.sources.filter((s) => s.activated);
  if (activeSources.length === 0) return 0;
  const totalLiftable = activeSources.reduce((s, a) => s + a.maxLiftableKbblMonth, 0);
  // 10,000 kbbl/month = 100 score
  return Math.min(100, (totalLiftable / 10_000) * 100);
}

export function computeTrigger(scenario: ScenarioState): TriggerOutput {
  const { m1, m6, m8 } = scenario;

  // D: weighted days of cover
  const D = getWeightedDaysOfCover(m1);

  // P: price ratio
  const P = m6.currentBrentSpot / m6.preCrisisBrent;

  // S: pipeline status score
  const S = getPipelineStatusScore(scenario.m2.cargoes, scenario.baselineMode);

  // A: alternate activation score
  const A = getAlternateActivationScore(scenario);

  // I: Iran corridor score
  const iranOutput = computeIranCorridor(scenario.m5, scenario.baselineMode);
  const I = iranOutput.corridorScore;

  // Normalized stress scores
  const stressD = Math.max(0, Math.min(100, 100 * (30 - D) / 30));
  const stressP = Math.max(0, Math.min(100, 100 * (P - 1) / 4));
  const stressS = 100 - S;
  const bufferA = A;
  const bufferI = I;

  const w = m8.weights;
  const compositeStress = Math.max(0, Math.min(100,
    (w.wD * stressD) + (w.wP * stressP) + (w.wS * stressS)
    - (w.wA * bufferA * 0.5) - (w.wI * bufferI * 0.5)
  ));

  // Determine level from composite
  let recommendedLevel: TriggerLevel = 'NORMAL';
  if (compositeStress >= 75) recommendedLevel = 'EMERGENCY';
  else if (compositeStress >= 50) recommendedLevel = 'AUSTERITY';
  else if (compositeStress >= 25) recommendedLevel = 'ALERT';

  // Hard overrides
  let hardOverrideActive: string | null = null;
  const hsdDays = getDaysOfCover(m1.hsdStock, m1.hsdDailyConsumption);
  const msDays = getDaysOfCover(m1.msStock, m1.msDailyConsumption);

  if (hsdDays < 7 || msDays < 7) {
    recommendedLevel = 'EMERGENCY';
    hardOverrideActive = `Critical stock: HSD ${hsdDays.toFixed(1)}d, MS ${msDays.toFixed(1)}d — below 7-day threshold`;
  }

  const next7Cargoes = scenario.m2.cargoes.filter((c) => {
    const eta = new Date(c.eta);
    const now = new Date();
    const diff = (eta.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    return diff <= 7 && diff >= 0;
  });
  if (D < 14 && next7Cargoes.length === 0) {
    recommendedLevel = 'EMERGENCY';
    hardOverrideActive = `Days of cover ${D.toFixed(1)} < 14 and no cargoes arriving in 7 days`;
  }

  if (P > 4 && m6.sbpReserves < 12 && (recommendedLevel === 'NORMAL' || recommendedLevel === 'ALERT')) {
    recommendedLevel = 'AUSTERITY';
    hardOverrideActive = `Price ${P.toFixed(1)}x baseline + reserves $${m6.sbpReserves}B < $12B`;
  }

  if (I === 0 && A < 30 && (recommendedLevel === 'NORMAL' || recommendedLevel === 'ALERT')) {
    recommendedLevel = 'AUSTERITY';
    hardOverrideActive = `Iran corridor closed + alternate activation ${A.toFixed(0)}% < 30%`;
  }

  // Manual override
  if (m8.manualOverride) {
    recommendedLevel = m8.manualOverride;
    hardOverrideActive = 'Manual override by National Energy Security Committee';
  }

  return {
    compositeStress,
    recommendedLevel,
    components: { stressD, stressP, stressS, bufferA, bufferI },
    hardOverrideActive,
  };
}
