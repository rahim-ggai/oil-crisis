import type { TriggerLevel, ScenarioState } from '@/types';
import { getWeightedDaysOfCover, getDaysOfCover } from './m1-inventory';
import { getPipelineStatusScore } from './m2-pipeline';
import { computeIranCorridor } from './m5-iran';
import type { FormulaTrace } from './formula-trace';
import { fmt, v } from './formula-trace';

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

// ============================================================
// Formula Trace — Composite Stress Index
// ============================================================

export function traceTrigger(scenario: ScenarioState): FormulaTrace {
  const result = computeTrigger(scenario);
  const { m1, m6, m8 } = scenario;
  const w = m8.weights;

  // Re-derive intermediate values for the trace
  const D = getWeightedDaysOfCover(m1);
  const P = m6.currentBrentSpot / m6.preCrisisBrent;
  const S = getPipelineStatusScore(scenario.m2.cargoes, scenario.baselineMode);
  const activeSources = scenario.m4.sources.filter((s) => s.activated);
  const totalLiftable = activeSources.reduce((s, a) => s + a.maxLiftableKbblMonth, 0);
  const A = Math.min(100, (totalLiftable / 10_000) * 100);
  const iranOutput = computeIranCorridor(scenario.m5, scenario.baselineMode);
  const I = iranOutput.corridorScore;

  const { stressD, stressP, stressS, bufferA, bufferI } = result.components;

  // Sub-step: stress_D normalization
  const stepStressD = {
    label: 'stress_D',
    formula: 'max(0, min(100, 100 \u00d7 (30 - D) / 30))',
    substituted: `max(0, min(100, 100 \u00d7 (30 - ${fmt(D)}) / 30))`,
    result: stressD,
    unit: 'pts',
    variables: [
      v('D', 'Weighted Days of Cover', D, 'computed', 'days', 'm1'),
    ],
  };

  // Sub-step: stress_P normalization
  const stepStressP = {
    label: 'stress_P',
    formula: 'max(0, min(100, 100 \u00d7 (P - 1) / 4))',
    substituted: `max(0, min(100, 100 \u00d7 (${fmt(P, 2)} - 1) / 4))`,
    result: stressP,
    unit: 'pts',
    variables: [
      v('P', 'Brent Price Ratio (spot / baseline)', P, 'computed', '\u00d7', 'm6'),
    ],
  };

  // Sub-step: stress_S normalization
  const stepStressS = {
    label: 'stress_S',
    formula: '100 - S',
    substituted: `100 - ${fmt(S)}`,
    result: stressS,
    unit: 'pts',
    variables: [
      v('S', 'Pipeline Status Score', S, 'computed', 'pts', 'm2'),
    ],
  };

  // Sub-step: buffer_A
  const stepBufferA = {
    label: 'buffer_A',
    formula: 'Alternate Activation Score',
    substituted: fmt(bufferA),
    result: bufferA,
    unit: 'pts',
    variables: [
      v('A', 'Alternate Activation Score', A, 'computed', 'pts', 'm4'),
    ],
  };

  // Sub-step: buffer_I
  const stepBufferI = {
    label: 'buffer_I',
    formula: 'Iran Corridor Score',
    substituted: fmt(bufferI),
    result: bufferI,
    unit: 'pts',
    variables: [
      v('I', 'Iran Corridor Score', I, 'computed', 'pts', 'm5'),
    ],
  };

  // Main composite stress step
  const compositeStep = {
    label: 'Composite Stress',
    formula: 'wD\u00d7stress_D + wP\u00d7stress_P + wS\u00d7stress_S - wA\u00d7buffer_A\u00d70.5 - wI\u00d7buffer_I\u00d70.5',
    substituted: `${fmt(w.wD, 2)}\u00d7${fmt(stressD)} + ${fmt(w.wP, 2)}\u00d7${fmt(stressP)} + ${fmt(w.wS, 2)}\u00d7${fmt(stressS)} - ${fmt(w.wA, 2)}\u00d7${fmt(bufferA)}\u00d70.5 - ${fmt(w.wI, 2)}\u00d7${fmt(bufferI)}\u00d70.5`,
    result: result.compositeStress,
    unit: 'pts',
    variables: [
      v('wD', 'Weight: Days of Cover', w.wD, 'user-input'),
      v('wP', 'Weight: Price Stress', w.wP, 'user-input'),
      v('wS', 'Weight: Pipeline Risk', w.wS, 'user-input'),
      v('wA', 'Weight: Alternates Buffer', w.wA, 'user-input'),
      v('wI', 'Weight: Iran Corridor Buffer', w.wI, 'user-input'),
      v('stress_D', 'Days of Cover Stress', stressD, 'computed', 'pts', 'm1'),
      v('stress_P', 'Price Stress', stressP, 'computed', 'pts', 'm6'),
      v('stress_S', 'Pipeline Risk Stress', stressS, 'computed', 'pts', 'm2'),
      v('buffer_A', 'Alternate Sources Buffer', bufferA, 'computed', 'pts', 'm4'),
      v('buffer_I', 'Iran Corridor Buffer', bufferI, 'computed', 'pts', 'm5'),
      v('0.5', 'Buffer discount factor', 0.5, 'constant'),
    ],
  };

  return {
    id: 'm8-composite-stress',
    title: 'Composite Stress Index',
    finalResult: result.compositeStress,
    unit: 'pts',
    steps: [
      compositeStep,
      stepStressD,
      stepStressP,
      stepStressS,
      stepBufferA,
      stepBufferI,
    ],
  };
}
