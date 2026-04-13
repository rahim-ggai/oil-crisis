import type { ConservationLevel, DemandReduction } from '@/types';

// ============================================================
// Sector Fuel Allocation Matrix
// ============================================================

export const SECTORS = ['Transport', 'Agriculture', 'Industry', 'Power', 'Aviation', 'Private Vehicles', 'Public Transport', 'Other'] as const;
export type Sector = typeof SECTORS[number];

export const FUEL_TYPES = ['HSD', 'MS', 'FO', 'JP1'] as const;
export type FuelType = typeof FUEL_TYPES[number];

/** Allocation percentages per sector for each fuel type (must sum to 100 per fuel) */
export type AllocationMatrix = Record<FuelType, Record<Sector, number>>;

/** Minimum viable allocation (bbl/day) below which a sector is in crisis */
export type MinimumViable = Record<FuelType, Record<Sector, number>>;

export const DEFAULT_ALLOCATION_NORMAL: AllocationMatrix = {
  HSD: { Transport: 45, Agriculture: 20, Industry: 20, Power: 10, Aviation: 0, 'Private Vehicles': 0, 'Public Transport': 0, Other: 5 },
  MS:  { Transport: 0, Agriculture: 0, Industry: 10, Power: 0, Aviation: 0, 'Private Vehicles': 55, 'Public Transport': 25, Other: 10 },
  FO:  { Transport: 0, Agriculture: 0, Industry: 20, Power: 75, Aviation: 0, 'Private Vehicles': 0, 'Public Transport': 0, Other: 5 },
  JP1: { Transport: 0, Agriculture: 0, Industry: 0, Power: 0, Aviation: 100, 'Private Vehicles': 0, 'Public Transport': 0, Other: 0 },
};

export const DEFAULT_ALLOCATION_ALERT: AllocationMatrix = {
  HSD: { Transport: 42, Agriculture: 22, Industry: 18, Power: 10, Aviation: 0, 'Private Vehicles': 0, 'Public Transport': 3, Other: 5 },
  MS:  { Transport: 0, Agriculture: 0, Industry: 8, Power: 0, Aviation: 0, 'Private Vehicles': 48, 'Public Transport': 32, Other: 12 },
  FO:  { Transport: 0, Agriculture: 0, Industry: 18, Power: 77, Aviation: 0, 'Private Vehicles': 0, 'Public Transport': 0, Other: 5 },
  JP1: { Transport: 0, Agriculture: 0, Industry: 0, Power: 0, Aviation: 100, 'Private Vehicles': 0, 'Public Transport': 0, Other: 0 },
};

export const DEFAULT_ALLOCATION_AUSTERITY: AllocationMatrix = {
  HSD: { Transport: 30, Agriculture: 25, Industry: 10, Power: 10, Aviation: 0, 'Private Vehicles': 0, 'Public Transport': 20, Other: 5 },
  MS:  { Transport: 0, Agriculture: 0, Industry: 5, Power: 0, Aviation: 0, 'Private Vehicles': 30, 'Public Transport': 50, Other: 15 },
  FO:  { Transport: 0, Agriculture: 0, Industry: 12, Power: 83, Aviation: 0, 'Private Vehicles': 0, 'Public Transport': 0, Other: 5 },
  JP1: { Transport: 0, Agriculture: 0, Industry: 0, Power: 0, Aviation: 100, 'Private Vehicles': 0, 'Public Transport': 0, Other: 0 },
};

export const DEFAULT_ALLOCATION_EMERGENCY: AllocationMatrix = {
  HSD: { Transport: 20, Agriculture: 30, Industry: 5, Power: 10, Aviation: 0, 'Private Vehicles': 0, 'Public Transport': 30, Other: 5 },
  MS:  { Transport: 0, Agriculture: 0, Industry: 0, Power: 0, Aviation: 0, 'Private Vehicles': 10, 'Public Transport': 70, Other: 20 },
  FO:  { Transport: 0, Agriculture: 0, Industry: 5, Power: 90, Aviation: 0, 'Private Vehicles': 0, 'Public Transport': 0, Other: 5 },
  JP1: { Transport: 0, Agriculture: 0, Industry: 0, Power: 0, Aviation: 100, 'Private Vehicles': 0, 'Public Transport': 0, Other: 0 },
};

export function getAllocationForLevel(level: ConservationLevel): AllocationMatrix {
  switch (level) {
    case 'none': return DEFAULT_ALLOCATION_NORMAL;
    case 'alert': return DEFAULT_ALLOCATION_ALERT;
    case 'austerity': return DEFAULT_ALLOCATION_AUSTERITY;
    case 'emergency': return DEFAULT_ALLOCATION_EMERGENCY;
  }
}

export interface SectorAllocationResult {
  /** bbl/day allocated to each sector for each fuel */
  allocated: Record<FuelType, Record<Sector, number>>;
  /** total bbl/day available per fuel after demand reduction */
  availablePerFuel: Record<FuelType, number>;
}

/**
 * Compute sector allocations given available daily supply and allocation percentages.
 * @param dailyDemandBpd - total daily demand in bbl/day per fuel type (before reduction)
 * @param reductions - demand reductions from conservation level
 * @param allocation - sector allocation percentages
 */
export function computeSectorAllocation(
  dailyDemandBpd: { hsd: number; ms: number; fo: number; jp1: number },
  reductions: DemandReduction,
  allocation: AllocationMatrix,
): SectorAllocationResult {
  const available: Record<FuelType, number> = {
    HSD: dailyDemandBpd.hsd * (1 - reductions.hsd),
    MS: dailyDemandBpd.ms * (1 - reductions.ms),
    FO: dailyDemandBpd.fo * (1 - reductions.fo),
    JP1: dailyDemandBpd.jp1 * (1 - reductions.jp1),
  };

  const allocated = {} as Record<FuelType, Record<Sector, number>>;
  for (const fuel of FUEL_TYPES) {
    allocated[fuel] = {} as Record<Sector, number>;
    for (const sector of SECTORS) {
      allocated[fuel][sector] = Math.round(available[fuel] * (allocation[fuel][sector] / 100));
    }
  }

  return { allocated, availablePerFuel: available };
}

// ── Rationing triggers ──

export interface RationingStatus {
  hsdRationing: boolean;
  msRationing: boolean;
  foRationing: boolean;
  jp1Rationing: boolean;
  anyRationing: boolean;
  message: string;
}

export function checkRationingTrigger(
  daysOfCover: { hsd: number; ms: number; fo: number; jp1: number },
  thresholds: { hsd: number; ms: number; fo: number; jp1: number } = { hsd: 15, ms: 18, fo: 30, jp1: 10 },
): RationingStatus {
  const hsdRationing = daysOfCover.hsd < thresholds.hsd;
  const msRationing = daysOfCover.ms < thresholds.ms;
  const foRationing = daysOfCover.fo < thresholds.fo;
  const jp1Rationing = daysOfCover.jp1 < thresholds.jp1;
  const anyRationing = hsdRationing || msRationing || foRationing || jp1Rationing;

  const triggers: string[] = [];
  if (hsdRationing) triggers.push(`HSD ${daysOfCover.hsd.toFixed(1)}d < ${thresholds.hsd}d threshold`);
  if (msRationing) triggers.push(`MS ${daysOfCover.ms.toFixed(1)}d < ${thresholds.ms}d threshold`);
  if (foRationing) triggers.push(`FO ${daysOfCover.fo.toFixed(1)}d < ${thresholds.fo}d threshold`);
  if (jp1Rationing) triggers.push(`JP-1 ${daysOfCover.jp1.toFixed(1)}d < ${thresholds.jp1}d threshold`);

  const message = anyRationing
    ? `Rationing required: ${triggers.join('; ')}`
    : 'No rationing required — all fuel types above threshold';

  return { hsdRationing, msRationing, foRationing, jp1Rationing, anyRationing, message };
}
