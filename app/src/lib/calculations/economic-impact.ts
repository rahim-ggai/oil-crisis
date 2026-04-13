import type { DemandReduction, ConservationLevel } from '@/types';

// ============================================================
// Economic Impact Model — GDP cost per conservation level
// ============================================================

export interface EconomicImpactParams {
  annualGDP: number;          // $B (default ~375 for Pakistan)
  lockdownDaysPerLevel: Record<ConservationLevel, number>; // lockdown days/week
}

export interface LevelImpact {
  level: ConservationLevel;
  label: string;
  daysOfCover: number;
  monthsToFloor: number;
  lockdownDays: number;
  demandReductionPct: number; // weighted average
  gdpImpactPct: number;      // negative = contraction
  dailyEconomicCost: number;  // $M/day
  monthlyEconomicCost: number; // $B/month
  reasoning: string;
}

const LEVEL_LABELS: Record<ConservationLevel, string> = {
  none: 'Normal',
  alert: 'Alert',
  austerity: 'Austerity',
  emergency: 'Emergency',
};

/**
 * Economic multipliers — how much of GDP is lost per unit of demand reduction.
 * Higher for Emergency because cascading effects (supply chains, closures).
 * These are editable via the Formulas tab.
 */
const DEFAULT_MULTIPLIERS: Record<ConservationLevel, number> = {
  none: 0,
  alert: 0.015,
  austerity: 0.045,
  emergency: 0.12,
};

export function computeEconomicImpact(
  reductions: Record<ConservationLevel, DemandReduction>,
  daysOfCover: Record<ConservationLevel, number>,
  monthsToFloor: Record<ConservationLevel, number>,
  params: EconomicImpactParams,
  multipliers: Record<ConservationLevel, number> = DEFAULT_MULTIPLIERS,
): LevelImpact[] {
  const levels: ConservationLevel[] = ['none', 'alert', 'austerity', 'emergency'];
  const dailyGDP = params.annualGDP / 365; // $B/day

  return levels.map((level) => {
    const r = reductions[level];
    // Weighted avg reduction: HSD 50%, MS 35%, FO 15% of demand
    const demandReductionPct = (0.50 * r.hsd + 0.35 * r.ms + 0.15 * r.fo) * 100;

    const lockdownDays = params.lockdownDaysPerLevel[level];
    const lockdownCostFraction = lockdownDays / 7; // fraction of week lost

    // GDP impact = direct demand reduction effect + lockdown effect
    const gdpImpactPct = -(multipliers[level] * 100 + lockdownCostFraction * 3); // 3% GDP per full lockdown day/week
    const dailyEconomicCost = Math.abs(gdpImpactPct / 100) * dailyGDP * 1000; // $M/day
    const monthlyEconomicCost = dailyEconomicCost * 30 / 1000; // $B/month

    let reasoning: string;
    if (level === 'none') {
      reasoning = 'Normal operations. No demand restrictions, no GDP impact from conservation. Full exposure to price shock.';
    } else if (level === 'alert') {
      reasoning = `Mild restrictions (odd/even plates, 95% industry). Demand cut ~${demandReductionPct.toFixed(0)}%. Extends fuel cover by ${(daysOfCover[level] - daysOfCover.none).toFixed(0)} days. Minimal economic disruption.`;
    } else if (level === 'austerity') {
      reasoning = `Significant restrictions: ${lockdownDays} lockdown day/week, 70% industry, 65% transport. Demand cut ~${demandReductionPct.toFixed(0)}%. Major impact on freight, employment, and SMEs. Wheat harvest (Apr-May) requires diesel allocation protection.`;
    } else {
      reasoning = `Severe restrictions: ${lockdownDays} lockdown days/week, 40% industry, 35% transport. Demand cut ~${demandReductionPct.toFixed(0)}%. Supply chain breakdown risk. Food distribution requires military coordination. Sustainable for weeks, not months.`;
    }

    return {
      level,
      label: LEVEL_LABELS[level],
      daysOfCover: daysOfCover[level],
      monthsToFloor: monthsToFloor[level],
      lockdownDays,
      demandReductionPct,
      gdpImpactPct,
      dailyEconomicCost,
      monthlyEconomicCost,
      reasoning,
    };
  });
}

/**
 * Generate the advisory recommendation text based on current state.
 */
export function generateAdvisory(
  recommendedLevel: string,
  rationingMessage: string,
  daysOfCover: { hsd: number; ms: number; fo: number },
  monthsToFloor: number,
  topPriority: string,
): string[] {
  const advisories: string[] = [];

  // Rationing
  advisories.push(rationingMessage);

  // Lockdown
  if (recommendedLevel === 'EMERGENCY') {
    advisories.push(`Lockdown: Impose 2 days/week — HSD at ${daysOfCover.hsd.toFixed(1)} days requires maximum demand suppression`);
  } else if (recommendedLevel === 'AUSTERITY') {
    advisories.push(`Lockdown: Impose 1 day/week (Sunday) — if HSD drops below 12 days, escalate to 2 days/week`);
  } else if (recommendedLevel === 'ALERT') {
    advisories.push(`Lockdown: Not yet required — monitor HSD days of cover (currently ${daysOfCover.hsd.toFixed(1)})`);
  } else {
    advisories.push('Lockdown: Not required under current conditions');
  }

  // Duration
  if (monthsToFloor < 12) {
    advisories.push(`Duration: Current conservation level can be sustained for ~${monthsToFloor.toFixed(1)} months before reserves hit floor`);
  } else {
    advisories.push('Duration: Reserves sufficient for 12+ months at current conservation level');
  }

  // Priority
  advisories.push(`Priority: ${topPriority}`);

  return advisories;
}
