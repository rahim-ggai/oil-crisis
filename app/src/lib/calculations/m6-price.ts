import type { M6State } from '@/types';

export interface AffordabilityOutput {
  maxMonthlyExpenditure: number; // USD billions
  affordableBarrels: number; // barrels/month
  normalDemandBarrels: number; // barrels/month
  monthsOfWarFunding: number;
  affordabilityCurve: { multiplier: number; affordableBarrels: number; }[];
}

export function computeAffordability(m6: M6State, warDurationMonths: number = 6): AffordabilityOutput {
  const usableReserves = Math.max(0, m6.sbpReserves - m6.reservesFloor);
  const saudiFacility = m6.saudiDoubled ? m6.saudiDeferredFacility * 2 : m6.saudiDeferredFacility;
  const totalFunding = usableReserves + m6.imfAvailable + saudiFacility + m6.uaeDeposits + m6.chinaSwapLine + (m6.barterCapacity / 1000);

  const monthsOfWarFunding = warDurationMonths;
  const maxMonthlyExpenditure = totalFunding / monthsOfWarFunding;

  const effectiveBrent = m6.currentBrentSpot * m6.brentMultiplier;
  const perBarrelCost = effectiveBrent * 1.10 * 1.15; // 10% finished product premium + 15% freight
  const affordableBarrels = (maxMonthlyExpenditure * 1_000_000_000) / perBarrelCost;

  const normalDemandBarrels = 423_000 * 30; // 12.69M barrels/month

  // Affordability curve at different multipliers
  const affordabilityCurve = [1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0].map((mult) => {
    const brent = m6.preCrisisBrent * mult;
    const cost = brent * 1.10 * 1.15;
    return {
      multiplier: mult,
      affordableBarrels: (maxMonthlyExpenditure * 1_000_000_000) / cost,
    };
  });

  return { maxMonthlyExpenditure, affordableBarrels, normalDemandBarrels, monthsOfWarFunding, affordabilityCurve };
}
