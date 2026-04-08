import type { ScenarioState } from '@/types';
import { DEFAULT_SCENARIO } from './defaults';

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

export const SCENARIO_A: ScenarioState = (() => {
  const s = deepClone(DEFAULT_SCENARIO);
  s.scenarioName = 'Scenario A: Partial Hormuz Closure';
  s.baselineMode = 'iran_permitted_transit';
  s.m6.currentBrentSpot = 107;
  s.m6.brentMultiplier = 1.5;
  s.m5.iranianProductionPct = 0.5;
  // 50% pipeline throughput — increase loss probabilities moderately
  s.m2.cargoes = s.m2.cargoes.map((c) => ({
    ...c,
    lossProbability: c.status === 'in_war_zone' ? 0.25 : c.lossProbability,
  }));
  return s;
})();

export const SCENARIO_B: ScenarioState = (() => {
  const s = deepClone(DEFAULT_SCENARIO);
  s.scenarioName = 'Scenario B: Complete Hormuz Closure (ToR Baseline)';
  s.baselineMode = 'full_corridor_compromised';
  s.m6.currentBrentSpot = 142;
  s.m6.brentMultiplier = 2.0;
  s.m5.iranianProductionPct = 0.75;
  s.m5.bandarAbbasCapacity = 0;
  s.m5.khargIslandCapacity = 0;
  s.m2.cargoes = s.m2.cargoes.map((c) => ({
    ...c,
    lossProbability: c.status === 'in_war_zone' ? 0.40 : c.lossProbability,
  }));
  return s;
})();

export const SCENARIO_C: ScenarioState = (() => {
  const s = deepClone(SCENARIO_B);
  s.scenarioName = 'Scenario C: Wider Gulf Conflict + Infrastructure Damage';
  s.m5.iranianProductionPct = 0.25;
  s.m6.currentBrentSpot = 213;
  s.m6.brentMultiplier = 3.0;
  // Reduce Saudi/UAE alternate sources by 50%
  s.m4.sources = s.m4.sources.map((src) => {
    if (src.country === 'Saudi Arabia' || src.country === 'UAE') {
      return { ...src, maxLiftableKbblMonth: Math.round(src.maxLiftableKbblMonth * 0.5) };
    }
    return { ...src, freightPremiumPct: src.freightPremiumPct * 2 };
  });
  return s;
})();

export const SCENARIO_D: ScenarioState = (() => {
  const s = deepClone(SCENARIO_C);
  s.scenarioName = 'Scenario D: Combined Supply-and-Price Shock';
  s.m6.currentBrentSpot = 284;
  s.m6.brentMultiplier = 4.0;
  s.m6.sbpReserves = 12;
  s.m6.imfAvailable = 0;
  return s;
})();

export const PRESETS = {
  'scenario_a': SCENARIO_A,
  'scenario_b': SCENARIO_B,
  'scenario_c': SCENARIO_C,
  'scenario_d': SCENARIO_D,
} as const;
