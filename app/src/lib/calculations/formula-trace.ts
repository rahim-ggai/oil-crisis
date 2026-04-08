// ============================================================
// Formula Transparency — Types and Helpers
// ============================================================

/** Classification of a variable in a formula */
export type ValueKind = 'computed' | 'constant' | 'user-input';

/** A single variable used in a formula step */
export interface FormulaVariable {
  symbol: string;       // e.g., "D"
  label: string;        // e.g., "Weighted Days of Cover"
  value: number;
  kind: ValueKind;
  unit?: string;        // e.g., "days", "%", "bbl"
  sourceModule?: string; // e.g., "m1" for cross-module linking
}

/** One step in a formula derivation */
export interface FormulaStep {
  label: string;           // e.g., "stress_D"
  formula: string;         // abstract: "max(0, min(100, 100 × (30 - D) / 30))"
  substituted: string;     // with values: "max(0, min(100, 100 × (30 - 18.4) / 30))"
  result: number;
  unit?: string;
  variables: FormulaVariable[];
  children?: FormulaTrace; // nested sub-formula for drill-down
}

/** A complete formula trace for a computed output */
export interface FormulaTrace {
  id: string;              // e.g., "m8-composite-stress"
  title: string;           // e.g., "Composite Stress Index"
  finalResult: number;
  unit?: string;
  steps: FormulaStep[];
}

// ============================================================
// Formatting helpers
// ============================================================

/** Format number with specified decimal places */
export function fmt(n: number, decimals: number = 1): string {
  if (!isFinite(n)) return '∞';
  return n.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/** Format integer with commas */
export function fmtInt(n: number): string {
  if (!isFinite(n)) return '∞';
  return Math.round(n).toLocaleString('en-US');
}

/** Format as USD */
export function fmtUSD(n: number, decimals: number = 1): string {
  return `$${fmt(n, decimals)}`;
}

/** Format barrels */
export function fmtBbl(n: number): string {
  if (n >= 1_000_000) return `${fmt(n / 1_000_000, 2)}M`;
  if (n >= 1_000) return `${fmt(n / 1_000, 1)}k`;
  return fmtInt(n);
}

/** Create a variable descriptor */
export function v(
  symbol: string,
  label: string,
  value: number,
  kind: ValueKind,
  unit?: string,
  sourceModule?: string
): FormulaVariable {
  return { symbol, label, value, kind, unit, sourceModule };
}
