import type { Cargo, BaselineMode } from '@/types';

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
