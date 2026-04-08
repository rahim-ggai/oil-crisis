import type { Cargo, BaselineMode } from '@/types';
import type { FormulaTrace } from './formula-trace';
import { fmt, fmtInt, v } from './formula-trace';

export function adjustLossProbability(cargo: Cargo, mode: BaselineMode): number {
  if (mode === 'full_corridor_compromised' && cargo.status === 'in_war_zone') {
    return Math.max(cargo.lossProbability, 0.40);
  }
  if (mode === 'iran_permitted_transit' && cargo.status === 'in_war_zone') {
    if (cargo.flagState === 'China' || cargo.insurer.toLowerCase().includes('picc')) {
      return Math.min(cargo.lossProbability, 0.15);
    }
    if (cargo.flagState === 'Pakistan') {
      return Math.min(cargo.lossProbability, 0.15);
    }
  }
  return cargo.lossProbability;
}

export function getRiskWeightedBarrels(cargoes: Cargo[], mode: BaselineMode): number {
  return cargoes.reduce((sum, c) => {
    const lp = adjustLossProbability(c, mode);
    return sum + c.quantityBarrels * (1 - lp);
  }, 0);
}

export function getCargoesArrivingInDays(cargoes: Cargo[], days: number): Cargo[] {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + days);
  return cargoes.filter((c) => new Date(c.eta) <= cutoff);
}

export function getPipelineStatusScore(cargoes: Cargo[], mode: BaselineMode): number {
  if (cargoes.length === 0) return 0;
  const next30 = getCargoesArrivingInDays(cargoes, 30);
  const rwBarrels = getRiskWeightedBarrels(next30, mode);
  // Normalize: 3M barrels expected = 100 (normal ~13 days of consumption at 423kbpd ≈ 5.5M, so 3M is baseline decent)
  return Math.min(100, (rwBarrels / 3_000_000) * 100);
}

// ============================================================
// Formula Trace — Risk-Weighted Supply Pipeline
// ============================================================

export function traceRiskWeightedBarrels(cargoes: Cargo[], mode: BaselineMode): FormulaTrace {
  const cargoSteps = cargoes.map((c) => {
    const adjustedLP = adjustLossProbability(c, mode);
    const rwBbl = c.quantityBarrels * (1 - adjustedLP);

    let lpNote = '';
    if (mode === 'full_corridor_compromised' && c.status === 'in_war_zone') {
      lpNote = ' (war zone floor: 40%)';
    } else if (mode === 'iran_permitted_transit' && c.status === 'in_war_zone' &&
      (c.flagState === 'China' || c.flagState === 'Pakistan' || c.insurer.toLowerCase().includes('picc'))) {
      lpNote = ' (permitted transit cap: 15%)';
    }

    return {
      label: c.vesselName,
      formula: `barrels × (1 - lossProbability)`,
      substituted: `${fmtInt(c.quantityBarrels)} × (1 - ${fmt(adjustedLP, 2)})${lpNote}`,
      result: rwBbl,
      unit: 'bbl',
      variables: [
        v('bbl', `${c.product} cargo`, c.quantityBarrels, 'user-input', 'bbl'),
        v('LP', `Loss prob (${c.status})`, adjustedLP, c.status === 'in_war_zone' ? 'computed' : 'user-input'),
      ],
    };
  });

  const totalRW = getRiskWeightedBarrels(cargoes, mode);

  return {
    id: 'm2-risk-weighted',
    title: 'Risk-Weighted Supply Pipeline',
    finalResult: totalRW,
    unit: 'bbl',
    steps: [
      ...cargoSteps,
      {
        label: 'Total Risk-Weighted',
        formula: 'Σ (cargo_barrels × (1 - LP))',
        substituted: `Σ = ${fmtInt(totalRW)}`,
        result: totalRW,
        unit: 'bbl',
        variables: [
          v('n', 'Number of cargoes', cargoes.length, 'user-input'),
          v('3M', 'Baseline for pipeline score', 3_000_000, 'constant', 'bbl'),
        ],
      },
    ],
  };
}
