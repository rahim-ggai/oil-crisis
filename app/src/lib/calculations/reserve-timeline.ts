import type { DemandReduction } from '@/types';

// ============================================================
// Reserve Depletion Timeline — 12-month projection
// ============================================================

export interface ReserveTimelineParams {
  sbpReserves: number;        // $B starting
  reservesFloor: number;      // $B floor
  brentSpot: number;          // $/bbl
  productPremium: number;
  freightPremium: number;
  normalDemandBpd: number;    // bbl/day
  // Inflows
  imfAvailable: number;       // $B total over period
  saudiFacilityMonthly: number; // $B/month
  barterMonthly: number;      // $B/month
}

export interface ReserveTimelinePoint {
  month: number;
  none: number;
  alert: number;
  austerity: number;
  emergency: number;
}

export interface ReserveTimelineResult {
  points: ReserveTimelinePoint[];
  monthsToFloor: { none: number; alert: number; austerity: number; emergency: number };
}

const LEVEL_REDUCTIONS: Record<string, DemandReduction> = {
  none: { hsd: 0, ms: 0, fo: 0, jp1: 0 },
  alert: { hsd: 0.08, ms: 0.12, fo: 0.05, jp1: 0.05 },
  austerity: { hsd: 0.22, ms: 0.35, fo: 0.15, jp1: 0.30 },
  emergency: { hsd: 0.40, ms: 0.60, fo: 0.25, jp1: 0.60 },
};

/**
 * Project SBP reserves over 12 months under each conservation level.
 * Accounts for oil import costs (outflows) and bilateral inflows.
 */
export function computeReserveTimeline(
  p: ReserveTimelineParams,
  reductions?: { alert: DemandReduction; austerity: DemandReduction; emergency: DemandReduction }
): ReserveTimelineResult {
  const red = reductions ?? LEVEL_REDUCTIONS;
  const perBarrelCost = p.brentSpot * p.productPremium * p.freightPremium;
  const monthlyInflows = p.saudiFacilityMonthly + p.barterMonthly + (p.imfAvailable / 12);

  const levels = ['none', 'alert', 'austerity', 'emergency'] as const;

  // Weighted average demand reduction per level (approximate: HSD 50% of demand, MS 35%, FO 15%)
  function avgReduction(r: DemandReduction): number {
    return 0.50 * r.hsd + 0.35 * r.ms + 0.15 * r.fo;
  }

  const points: ReserveTimelinePoint[] = [];
  const reserves: Record<string, number> = {};
  const monthsToFloor: Record<string, number> = {};

  for (const level of levels) {
    reserves[level] = p.sbpReserves;
    monthsToFloor[level] = 12; // default: survives full period
  }

  for (let m = 0; m <= 12; m++) {
    const point: ReserveTimelinePoint = {
      month: m,
      none: reserves.none,
      alert: reserves.alert,
      austerity: reserves.austerity,
      emergency: reserves.emergency,
    };
    points.push(point);

    if (m < 12) {
      for (const level of levels) {
        const r = level === 'none' ? LEVEL_REDUCTIONS.none : red[level as keyof typeof red] ?? LEVEL_REDUCTIONS[level];
        const reduction = avgReduction(r);
        const monthlyDemandBbl = p.normalDemandBpd * 30 * (1 - reduction);
        const monthlyImportCost = (monthlyDemandBbl * perBarrelCost) / 1_000_000_000;
        const netOutflow = monthlyImportCost - monthlyInflows;

        reserves[level] = Math.max(0, reserves[level] - netOutflow);

        if (reserves[level] <= p.reservesFloor && monthsToFloor[level] === 12) {
          monthsToFloor[level] = m + 1;
        }
      }
    }
  }

  return {
    points,
    monthsToFloor: monthsToFloor as ReserveTimelineResult['monthsToFloor'],
  };
}
