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

// ============================================================
// Formula Trace — Affordability
// ============================================================
import type { FormulaTrace } from '@/lib/calculations/formula-trace';
import { fmt, fmtInt, fmtUSD, v } from '@/lib/calculations/formula-trace';

export function traceAffordability(m6: M6State): FormulaTrace {
  const usableReserves = Math.max(0, m6.sbpReserves - m6.reservesFloor);
  const saudiFacility = m6.saudiDoubled ? m6.saudiDeferredFacility * 2 : m6.saudiDeferredFacility;
  const totalFunding = usableReserves + m6.imfAvailable + saudiFacility + m6.uaeDeposits + m6.chinaSwapLine + (m6.barterCapacity / 1000);

  const warMonths = 6;
  const monthlyBudget = totalFunding / warMonths;

  const effectiveBrent = m6.currentBrentSpot * m6.brentMultiplier;
  const productPremium = 1.10;
  const freightPremium = 1.15;
  const perBarrelCost = effectiveBrent * productPremium * freightPremium;
  const affordableBarrels = (monthlyBudget * 1_000_000_000) / perBarrelCost;

  return {
    id: 'm6-affordability',
    title: 'Affordable Barrels Calculation',
    finalResult: affordableBarrels,
    unit: 'bbl/month',
    steps: [
      {
        label: 'Total Funding',
        formula: 'UsableReserves + IMF + Saudi + UAE + China + Barter',
        substituted: `max(0, ${fmtUSD(m6.sbpReserves)} - ${fmtUSD(m6.reservesFloor)}) + ${fmtUSD(m6.imfAvailable)} + ${fmtUSD(m6.saudiDeferredFacility)}${m6.saudiDoubled ? ' x 2' : ''} + ${fmtUSD(m6.uaeDeposits)} + ${fmtUSD(m6.chinaSwapLine)} + ${fmtUSD(m6.barterCapacity / 1000)}`,
        result: totalFunding,
        unit: 'USD bn',
        variables: [
          v('SBP', 'SBP Reserves', m6.sbpReserves, 'user-input', 'USD bn'),
          v('Floor', 'Reserves Floor', m6.reservesFloor, 'user-input', 'USD bn'),
          v('UsableRes', 'max(0, SBP - Floor)', usableReserves, 'computed', 'USD bn'),
          v('IMF', 'IMF Available', m6.imfAvailable, 'user-input', 'USD bn'),
          v('Saudi', `Saudi Facility${m6.saudiDoubled ? ' (doubled)' : ''}`, saudiFacility, 'user-input', 'USD bn'),
          v('UAE', 'UAE Deposits', m6.uaeDeposits, 'user-input', 'USD bn'),
          v('China', 'China Swap Line', m6.chinaSwapLine, 'user-input', 'USD bn'),
          v('Barter', 'Barter Capacity (converted)', m6.barterCapacity / 1000, 'user-input', 'USD bn'),
        ],
      },
      {
        label: 'Monthly Budget',
        formula: 'TotalFunding / WarMonths',
        substituted: `${fmtUSD(totalFunding)} / ${warMonths}`,
        result: monthlyBudget,
        unit: 'USD bn/month',
        variables: [
          v('TotalFunding', 'Total Funding', totalFunding, 'computed', 'USD bn'),
          v('WarMonths', 'Assumed war duration', warMonths, 'constant', 'months'),
        ],
      },
      {
        label: 'Per-Barrel Cost',
        formula: 'EffectiveBrent x ProductPremium x FreightPremium',
        substituted: `${fmtUSD(effectiveBrent)} x ${fmt(productPremium, 2)} x ${fmt(freightPremium, 2)}`,
        result: perBarrelCost,
        unit: 'USD/bbl',
        variables: [
          v('EffBrent', 'Effective Brent (spot x multiplier)', effectiveBrent, 'computed', 'USD/bbl'),
          v('ProdPrem', 'Finished product premium (+10%)', productPremium, 'constant'),
          v('FrtPrem', 'Freight & insurance premium (+15%)', freightPremium, 'constant'),
        ],
      },
      {
        label: 'Affordable Barrels',
        formula: '(MonthlyBudget x $1B) / PerBarrelCost',
        substituted: `(${fmtUSD(monthlyBudget)} x 1,000,000,000) / ${fmtUSD(perBarrelCost)}`,
        result: affordableBarrels,
        unit: 'bbl/month',
        variables: [
          v('MonthlyBudget', 'Monthly Budget', monthlyBudget, 'computed', 'USD bn'),
          v('PerBblCost', 'Per-Barrel Cost', perBarrelCost, 'computed', 'USD/bbl'),
        ],
      },
    ],
  };
}
