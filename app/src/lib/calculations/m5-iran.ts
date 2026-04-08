import type { M5State, BaselineMode } from '@/types';

export interface IranCorridorOutput {
  maritimeBblDay: number;
  overlandBblDay: number;
  totalBblDay: number;
  totalBblMonth: number;
  corridorScore: number; // 0-100
}

export function computeIranCorridor(m5: M5State, mode: BaselineMode): IranCorridorOutput {
  if (mode === 'full_corridor_compromised') {
    return { maritimeBblDay: 0, overlandBblDay: 0, totalBblDay: 0, totalBblMonth: 0, corridorScore: 0 };
  }

  // 5a: Maritime
  const totalPortCapacity = (m5.bandarAbbasCapacity + m5.khargIslandCapacity) * m5.iranianProductionPct;
  // Vessel-constrained: each vessel does one round trip in turnaround days
  const vesselCapacity = (m5.chineseFlaggedVessels / m5.vesselTurnaroundDays) * 500_000; // ~500k bbl per VLCC load / turnaround
  const maritimeBblDay = Math.min(totalPortCapacity, vesselCapacity);

  // 5b: Overland
  const securityMultiplier = m5.securitySituation === 'hostile' ? 0.25 : m5.securitySituation === 'tense' ? 0.6 : 1.0;
  const overlandBblDay = m5.truckingCapacity * (1 - m5.borderDegradation) * securityMultiplier * m5.iranianProductionPct;

  const totalBblDay = maritimeBblDay + overlandBblDay;
  const totalBblMonth = totalBblDay * 30;

  // Score: 100 = fully open at 700kbpd base capacity, 0 = closed
  const maxCapacity = 700_000;
  const corridorScore = Math.min(100, (totalBblDay / maxCapacity) * 100);

  return { maritimeBblDay, overlandBblDay, totalBblDay, totalBblMonth, corridorScore };
}
