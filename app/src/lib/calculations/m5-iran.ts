import type { M5State, BaselineMode } from '@/types';
import type { FormulaTrace } from './formula-trace';
import { fmt, fmtInt, v } from './formula-trace';

export interface IranCorridorOutput {
  maritimeBblDay: number;
  overlandBblDay: number;
  totalBblDay: number;
  totalBblMonth: number;
  corridorScore: number; // 0-100
}

export function computeIranCorridor(
  m5: M5State,
  mode: BaselineMode,
  fp?: { m5_vlccLoadSize: number; m5_maxCapacityBaseline: number; m5_securityMultiplier_hostile: number; m5_securityMultiplier_tense: number; m5_securityMultiplier_normal: number }
): IranCorridorOutput {
  if (mode === 'full_corridor_compromised') {
    return { maritimeBblDay: 0, overlandBblDay: 0, totalBblDay: 0, totalBblMonth: 0, corridorScore: 0 };
  }

  const vlccLoad = fp?.m5_vlccLoadSize ?? 500_000;
  const maxCap = fp?.m5_maxCapacityBaseline ?? 700_000;
  const secHostile = fp?.m5_securityMultiplier_hostile ?? 0.25;
  const secTense = fp?.m5_securityMultiplier_tense ?? 0.6;
  const secNormal = fp?.m5_securityMultiplier_normal ?? 1.0;

  // 5a: Maritime
  const totalPortCapacity = (m5.bandarAbbasCapacity + m5.khargIslandCapacity) * m5.iranianProductionPct;
  const vesselCapacity = (m5.chineseFlaggedVessels / m5.vesselTurnaroundDays) * vlccLoad;
  const maritimeBblDay = Math.min(totalPortCapacity, vesselCapacity);

  // 5b: Overland
  const securityMultiplier = m5.securitySituation === 'hostile' ? secHostile : m5.securitySituation === 'tense' ? secTense : secNormal;
  const overlandBblDay = m5.truckingCapacity * (1 - m5.borderDegradation) * securityMultiplier * m5.iranianProductionPct;

  const totalBblDay = maritimeBblDay + overlandBblDay;
  const totalBblMonth = totalBblDay * 30;

  const corridorScore = Math.min(100, (totalBblDay / maxCap) * 100);

  return { maritimeBblDay, overlandBblDay, totalBblDay, totalBblMonth, corridorScore };
}

// ============================================================
// Formula Trace — Iran Corridor Throughput
// ============================================================

export function traceIranCorridor(m5: M5State, mode: BaselineMode): FormulaTrace {
  if (mode === 'full_corridor_compromised') {
    return {
      id: 'm5-iran-corridor',
      title: 'Iran Corridor Throughput',
      finalResult: 0,
      unit: 'bbl/day',
      steps: [{
        label: 'Corridor Disabled',
        formula: 'Full Corridor Compromised mode — all Iran routes zeroed',
        substituted: '0',
        result: 0,
        unit: 'bbl/day',
        variables: [v('mode', 'Baseline Mode', 0, 'user-input')],
      }],
    };
  }

  const totalPortCapacity = (m5.bandarAbbasCapacity + m5.khargIslandCapacity) * m5.iranianProductionPct;
  const vesselCapacity = (m5.chineseFlaggedVessels / m5.vesselTurnaroundDays) * 500_000;
  const maritimeBblDay = Math.min(totalPortCapacity, vesselCapacity);

  const securityMultiplier = m5.securitySituation === 'hostile' ? 0.25 : m5.securitySituation === 'tense' ? 0.6 : 1.0;
  const overlandBblDay = m5.truckingCapacity * (1 - m5.borderDegradation) * securityMultiplier * m5.iranianProductionPct;

  const totalBblDay = maritimeBblDay + overlandBblDay;
  const maxCapacity = 700_000;
  const corridorScore = Math.min(100, (totalBblDay / maxCapacity) * 100);

  return {
    id: 'm5-iran-corridor',
    title: 'Iran Corridor Throughput',
    finalResult: corridorScore,
    unit: 'pts (0-100)',
    steps: [
      {
        label: '5a Maritime',
        formula: 'min(portCapacity, vesselCapacity)',
        substituted: `min(${fmtInt(totalPortCapacity)}, ${fmtInt(vesselCapacity)})`,
        result: maritimeBblDay,
        unit: 'bbl/day',
        variables: [
          v('BA', 'Bandar Abbas capacity', m5.bandarAbbasCapacity, 'user-input', 'bbl/day'),
          v('KI', 'Kharg Island capacity', m5.khargIslandCapacity, 'user-input', 'bbl/day'),
          v('IranProd', 'Iranian production %', m5.iranianProductionPct * 100, 'user-input', '%'),
          v('Vessels', 'Chinese-flagged vessels', m5.chineseFlaggedVessels, 'user-input'),
          v('Turnaround', 'Vessel turnaround', m5.vesselTurnaroundDays, 'user-input', 'days'),
          v('500k', 'Barrels per VLCC load', 500_000, 'constant', 'bbl'),
        ],
      },
      {
        label: '5b Overland',
        formula: 'trucking × (1 - degradation) × securityMult × iranProd',
        substituted: `${fmtInt(m5.truckingCapacity)} × (1 - ${fmt(m5.borderDegradation, 2)}) × ${fmt(securityMultiplier, 2)} × ${fmt(m5.iranianProductionPct, 2)}`,
        result: overlandBblDay,
        unit: 'bbl/day',
        variables: [
          v('Trucking', 'Trucking capacity', m5.truckingCapacity, 'user-input', 'bbl/day'),
          v('Degradation', 'Border degradation', m5.borderDegradation * 100, 'user-input', '%'),
          v('SecMult', `Security multiplier (${m5.securitySituation})`, securityMultiplier, 'constant'),
        ],
      },
      {
        label: 'Corridor Score',
        formula: 'min(100, totalBblDay / 700,000 × 100)',
        substituted: `min(100, ${fmtInt(totalBblDay)} / 700,000 × 100)`,
        result: corridorScore,
        unit: 'pts',
        variables: [
          v('total', 'Total throughput', totalBblDay, 'computed', 'bbl/day'),
          v('700k', 'Max capacity baseline', 700_000, 'constant', 'bbl/day'),
        ],
      },
    ],
  };
}
