import type { FormulaTrace } from './formula-trace';
import { fmt, fmtInt, v } from './formula-trace';

// ============================================================
// Import Recommendation — Constrained Optimization
// ============================================================

export interface ImportRecommendationParams {
  // Financial constraint (upper bound)
  sbpReserves: number;       // $B
  reservesFloor: number;     // $B
  imfAvailable: number;      // $B
  saudiFacility: number;     // $B/year
  chinaSwap: number;         // $B
  barter: number;            // $M/year
  brentSpot: number;         // $/bbl (physical)
  productPremium: number;    // multiplier
  freightPremium: number;    // multiplier
  warDurationMonths: number;

  // Operational constraint (lower bound)
  normalDemandBpd: number;   // bbl/day
  maxLockdownDays: number;   // per week (0-7), commercial vehicles
  currentStockBarrels: number; // total existing stock in barrels
}

export interface ImportRecommendation {
  // Upper bound — financial ceiling
  totalFunding: number;          // $B available
  monthlyBudget: number;         // $B/month
  perBarrelCost: number;         // $/bbl landed
  upperBound: number;            // max affordable bbl/month
  upperBoundCost: number;        // $B/month at max import

  // Lower bound — operational floor
  operatingFraction: number;     // (7 - lockdownDays) / 7
  reducedDailyDemand: number;    // bbl/day after lockdown reduction
  monthlyDemand: number;         // bbl/month after lockdown
  stockCoverPerMonth: number;    // bbl/month from existing stocks
  lowerBound: number;            // min required import bbl/month

  // Recommendation
  recommended: number;           // clamped bbl/month
  feasible: boolean;             // can we afford the minimum?
  deficit: number;               // shortfall bbl/month if infeasible
  surplusOrDeficitPct: number;   // % above/below minimum

  // Reasoning
  reasoning: string;
}

export function computeImportRecommendation(p: ImportRecommendationParams): ImportRecommendation {
  // ── Upper Bound (Financial) ──
  const usableReserves = Math.max(0, p.sbpReserves - p.reservesFloor);
  const totalFunding = usableReserves + p.imfAvailable + p.saudiFacility + p.chinaSwap + (p.barter / 1000);
  const monthlyBudget = totalFunding / p.warDurationMonths;
  const perBarrelCost = p.brentSpot * p.productPremium * p.freightPremium;
  const upperBound = (monthlyBudget * 1_000_000_000) / perBarrelCost;
  const upperBoundCost = monthlyBudget;

  // ── Lower Bound (Operational) ──
  const operatingFraction = (7 - p.maxLockdownDays) / 7;
  const reducedDailyDemand = p.normalDemandBpd * operatingFraction;
  const monthlyDemand = reducedDailyDemand * 30;
  const stockCoverPerMonth = p.currentStockBarrels / p.warDurationMonths;
  const lowerBound = Math.max(0, monthlyDemand - stockCoverPerMonth);

  // ── Recommendation ──
  const recommended = Math.max(0, Math.min(lowerBound, upperBound));
  const feasible = upperBound >= lowerBound;
  const deficit = feasible ? 0 : lowerBound - upperBound;
  const surplusOrDeficitPct = lowerBound > 0 ? ((upperBound - lowerBound) / lowerBound) * 100 : 100;

  // ── Reasoning ──
  let reasoning: string;
  if (feasible) {
    const headroom = ((upperBound - lowerBound) / lowerBound * 100).toFixed(0);
    reasoning = `Pakistan can afford to import ${fmtInt(Math.round(recommended))} bbl/month, meeting minimum operational demand with ${headroom}% financial headroom. `
      + `At ${p.maxLockdownDays} lockdown day(s)/week, daily demand drops from ${fmtInt(p.normalDemandBpd)} to ${fmtInt(Math.round(reducedDailyDemand))} bbl/day. `
      + `Existing stocks contribute ${fmtInt(Math.round(stockCoverPerMonth))} bbl/month over ${p.warDurationMonths} months, `
      + `reducing the import requirement from ${fmtInt(Math.round(monthlyDemand))} to ${fmtInt(Math.round(lowerBound))} bbl/month.`;
  } else {
    reasoning = `DEFICIT: Pakistan cannot afford minimum operational demand. `
      + `Financial ceiling is ${fmtInt(Math.round(upperBound))} bbl/month but minimum demand (with ${p.maxLockdownDays} lockdown day(s)/week) requires ${fmtInt(Math.round(lowerBound))} bbl/month. `
      + `Shortfall of ${fmtInt(Math.round(deficit))} bbl/month (${Math.abs(surplusOrDeficitPct).toFixed(0)}% gap). `
      + `Options: increase lockdown days, draw down reserves below floor, or secure additional bilateral credit.`;
  }

  return {
    totalFunding, monthlyBudget, perBarrelCost, upperBound, upperBoundCost,
    operatingFraction, reducedDailyDemand, monthlyDemand, stockCoverPerMonth, lowerBound,
    recommended, feasible, deficit, surplusOrDeficitPct,
    reasoning,
  };
}

// ============================================================
// Formula Trace
// ============================================================

export function traceImportRecommendation(p: ImportRecommendationParams): FormulaTrace {
  const r = computeImportRecommendation(p);

  return {
    id: 'import-recommendation',
    title: 'Oil Import Recommendation',
    finalResult: r.recommended,
    unit: 'bbl/month',
    steps: [
      {
        label: 'Upper Bound (Financial Ceiling)',
        formula: 'totalFunding / warMonths × $1B / (Brent × productPremium × freightPremium)',
        substituted: `${fmt(r.totalFunding, 2)}B / ${p.warDurationMonths} × $1B / ($${fmt(p.brentSpot)} × ${fmt(p.productPremium, 2)} × ${fmt(p.freightPremium, 2)})`,
        result: r.upperBound,
        unit: 'bbl/month',
        variables: [
          v('funding', 'Total funding available', r.totalFunding, 'computed', '$B'),
          v('months', 'War duration', p.warDurationMonths, 'user-input', 'months'),
          v('Brent', 'Physical Brent spot', p.brentSpot, 'user-input', '$/bbl'),
          v('prodPrem', 'Product premium', p.productPremium, 'user-input', 'x'),
          v('freightPrem', 'Freight premium', p.freightPremium, 'user-input', 'x'),
          v('cost/bbl', 'Landed cost per barrel', r.perBarrelCost, 'computed', '$/bbl'),
        ],
      },
      {
        label: 'Lower Bound (Operational Floor)',
        formula: 'normalDemand × (7 - lockdownDays)/7 × 30 - existingStock / warMonths',
        substituted: `${fmtInt(p.normalDemandBpd)} × (7 - ${p.maxLockdownDays})/7 × 30 - ${fmtInt(Math.round(p.currentStockBarrels))} / ${p.warDurationMonths}`,
        result: r.lowerBound,
        unit: 'bbl/month',
        variables: [
          v('demand', 'Normal daily demand', p.normalDemandBpd, 'user-input', 'bbl/day'),
          v('lockdown', 'Max lockdown days/week', p.maxLockdownDays, 'user-input', 'days'),
          v('opFrac', 'Operating fraction', r.operatingFraction, 'computed'),
          v('reduced', 'Reduced daily demand', r.reducedDailyDemand, 'computed', 'bbl/day'),
          v('stock', 'Current stock (barrels)', p.currentStockBarrels, 'computed', 'bbl'),
          v('stockCover', 'Stock cover/month', r.stockCoverPerMonth, 'computed', 'bbl/month'),
        ],
      },
      {
        label: 'Recommendation',
        formula: 'clamp(lowerBound, 0, upperBound)',
        substituted: `clamp(${fmtInt(Math.round(r.lowerBound))}, 0, ${fmtInt(Math.round(r.upperBound))})`,
        result: r.recommended,
        unit: 'bbl/month',
        variables: [
          v('upper', 'Financial ceiling', r.upperBound, 'computed', 'bbl/month'),
          v('lower', 'Operational floor', r.lowerBound, 'computed', 'bbl/month'),
          v('status', r.feasible ? 'FEASIBLE' : 'DEFICIT', r.feasible ? 1 : 0, 'computed'),
        ],
      },
    ],
  };
}
