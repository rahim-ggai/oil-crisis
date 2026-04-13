import type { TriggerLevel } from '@/types';

export interface DashboardData {
  weightedDaysOfCover: number;
  hsdDays: number;
  msDays: number;
  foDays: number;

  currentBrentSpot: number;
  preCrisisBrent: number;

  sbpReserves: number;
  reservesFloor: number;
  monthsOfImports: number;

  recommendedLevel: TriggerLevel;
  compositeStress: number;
  hardOverrideActive: string | null;
  stressComponents: {
    stressD: number;
    stressP: number;
    stressS: number;
    bufferA: number;
    bufferI: number;
  };

  totalCargoes: number;
  cargoStatusBuckets: {
    docked: number;
    in_war_zone: number;
    outside_war_zone: number;
    contracted_not_dispatched: number;
  };
  rwBarrels: number;

  iranStatus: 'Open' | 'Degraded' | 'Closed';
  corridorScore: number;
  maritimeBblDay: number;
  overlandBblDay: number;
  totalBblDay: number;

  irSbp: number;
  irFloor: number;
  irLockdown: number;
  irWarMonths: number;
  irBrent: number;
}

export const DASHBOARD_DUMMY_DATA: DashboardData = {
  weightedDaysOfCover: 18,
  hsdDays: 14,
  msDays: 22,
  foDays: 19,

  currentBrentSpot: 127,
  preCrisisBrent: 85,

  sbpReserves: 4.2,
  reservesFloor: 3.0,
  monthsOfImports: 1.4,

  recommendedLevel: 'ALERT',
  compositeStress: 61.3,
  hardOverrideActive: null,
  stressComponents: {
    stressD: 45.2,
    stressP: 38.1,
    stressS: 22.4,
    bufferA: 8.5,
    bufferI: 12.0,
  },

  totalCargoes: 8,
  cargoStatusBuckets: {
    docked: 2,
    in_war_zone: 1,
    outside_war_zone: 3,
    contracted_not_dispatched: 2,
  },
  rwBarrels: 1_850_000,

  iranStatus: 'Degraded',
  corridorScore: 42,
  maritimeBblDay: 45_000,
  overlandBblDay: 18_000,
  totalBblDay: 63_000,

  irSbp: 4.2,
  irFloor: 3.0,
  irLockdown: 2,
  irWarMonths: 6,
  irBrent: 127,
};
