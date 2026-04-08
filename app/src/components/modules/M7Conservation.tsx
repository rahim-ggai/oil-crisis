'use client';

import { useCallback } from 'react';
import { useAppStore } from '@/lib/store';
import { ModulePanel, Card } from '@/components/ui/ModulePanel';
import type { ConservationMatrix, DemandReduction, M7State } from '@/types';

// ────────────────────────────────────────────────────────────
// Row / column config
// ────────────────────────────────────────────────────────────
const MATRIX_ROWS: { key: keyof ConservationMatrix; label: string; reasoning: string }[] = [
  { key: 'privateVehicles', label: 'Private Vehicles', reasoning: 'Largest MS consumer (~45% of petrol demand). Restrictions yield fastest demand reduction.' },
  { key: 'goodsTransport', label: 'Goods Transport', reasoning: 'Primary HSD consumer. Must balance supply-chain continuity against conservation.' },
  { key: 'industryAllocation', label: 'Industry Allocation', reasoning: 'Industrial demand spans HSD, FO, and gas. Cuts risk GDP but preserve fuel.' },
  { key: 'publicTransport', label: 'Public Transport', reasoning: 'Counter-cyclical: expanded PT absorbs demand displaced by private vehicle bans.' },
  { key: 'powerGeneration', label: 'Power Generation', reasoning: 'FO/gas shifting to coal/hydro/nuclear frees liquid fuel for transport.' },
  { key: 'lockdownDays', label: 'Lockdown Days', reasoning: 'Full economic pause days yield the deepest single-day savings across all fuels.' },
  { key: 'agriculture', label: 'Agriculture', reasoning: 'Diesel-dependent. Cuts during harvest risk food security; must be seasonal.' },
  { key: 'aviation', label: 'Aviation', reasoning: 'JP-1 consumer. Domestic cuts are fast; international cuts have diplomatic cost.' },
  { key: 'cng', label: 'CNG', reasoning: 'Cross-fuel substitution: CNG expansion offsets MS/HSD demand.' },
];

const LEVEL_COLUMNS: { key: 'alertMatrix' | 'austerityMatrix' | 'emergencyMatrix'; label: string; color: string }[] = [
  { key: 'alertMatrix', label: 'Alert (Level 1)', color: '#d4a017' },
  { key: 'austerityMatrix', label: 'Austerity (Level 2)', color: '#e67e22' },
  { key: 'emergencyMatrix', label: 'Emergency (Level 3)', color: '#c0392b' },
];

const FUEL_LABELS = ['HSD', 'MS', 'FO', 'JP-1'] as const;
const FUEL_KEYS: (keyof DemandReduction)[] = ['hsd', 'ms', 'fo', 'jp1'];

const TRIGGER_THRESHOLDS = [
  { level: 'Alert', color: '#d4a017', conditions: 'Stock < 18 days OR Brent > 1.5x baseline' },
  { level: 'Austerity', color: '#e67e22', conditions: 'Stock < 14 days OR Brent > 2.5x baseline OR composite stress >= 50' },
  { level: 'Emergency', color: '#c0392b', conditions: 'Stock < 7 days (any critical fuel) OR no cargoes in 7 days + cover < 14d' },
];

// ────────────────────────────────────────────────────────────
// Component
// ────────────────────────────────────────────────────────────
export function M7Conservation() {
  const m7 = useAppStore((s) => s.scenario.m7);
  const updateM7 = useAppStore((s) => s.updateM7);

  // Matrix cell edit
  const handleMatrixEdit = useCallback(
    (matrixKey: 'alertMatrix' | 'austerityMatrix' | 'emergencyMatrix', rowKey: keyof ConservationMatrix, value: string) => {
      updateM7({
        [matrixKey]: { ...m7[matrixKey], [rowKey]: value },
      } as Partial<M7State>);
    },
    [m7, updateM7],
  );

  // Reduction edit
  const handleReductionEdit = useCallback(
    (reductionKey: 'alertReductions' | 'austerityReductions' | 'emergencyReductions', fuelKey: keyof DemandReduction, rawValue: string) => {
      const parsed = parseFloat(rawValue);
      if (isNaN(parsed)) return;
      const clamped = Math.max(0, Math.min(100, parsed)) / 100;
      updateM7({
        [reductionKey]: { ...m7[reductionKey], [fuelKey]: clamped },
      } as Partial<M7State>);
    },
    [m7, updateM7],
  );

  return (
    <ModulePanel
      title="M7 -- Fuel Conservation Levels"
      subtitle="Policy matrix defining demand-side measures at each escalation level"
    >
      {/* ── Conservation Policy Matrix ────────────────────── */}
      <Card title="Conservation Policy Matrix" className="mb-6">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 pr-3 text-xs font-medium text-slate w-[160px]">Parameter</th>
                {LEVEL_COLUMNS.map((col) => (
                  <th
                    key={col.key}
                    className="text-left py-2 px-3 text-xs font-medium"
                    style={{ color: col.color }}
                  >
                    {col.label}
                  </th>
                ))}
                <th className="text-left py-2 pl-3 text-xs font-medium text-slate w-[40px]">
                  <span className="sr-only">Info</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {MATRIX_ROWS.map((row) => (
                <tr key={row.key} className="border-b border-border/40 group">
                  <td className="py-2 pr-3 text-xs font-medium text-navy align-top whitespace-nowrap">
                    {row.label}
                  </td>
                  {LEVEL_COLUMNS.map((col) => (
                    <td key={col.key} className="py-1.5 px-2 align-top">
                      <textarea
                        value={m7[col.key][row.key]}
                        onChange={(e) => handleMatrixEdit(col.key, row.key, e.target.value)}
                        rows={2}
                        className="w-full text-xs bg-input-bg border border-border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-navy resize-none leading-relaxed"
                      />
                    </td>
                  ))}
                  <td className="py-2 pl-3 align-top">
                    <span
                      className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-slate-light/20 text-[9px] text-slate cursor-help shrink-0"
                      title={row.reasoning}
                    >
                      ?
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ── Computed Demand Reductions ────────────────────── */}
      <Card title="Computed Demand Reductions" className="mb-6">
        <p className="text-xs text-slate mb-3">
          Percentage reduction in daily consumption at each level. Derived from the policy matrix above; editable for override.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 pr-4 text-xs font-medium text-slate">Level</th>
                {FUEL_LABELS.map((f) => (
                  <th key={f} className="text-center py-2 px-3 text-xs font-medium text-slate">
                    {f} reduction %
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {([
                { key: 'alertReductions' as const, label: 'Alert', color: '#d4a017' },
                { key: 'austerityReductions' as const, label: 'Austerity', color: '#e67e22' },
                { key: 'emergencyReductions' as const, label: 'Emergency', color: '#c0392b' },
              ]).map((row) => (
                <tr key={row.key} className="border-b border-border/40">
                  <td className="py-2 pr-4 text-xs font-medium" style={{ color: row.color }}>
                    {row.label}
                  </td>
                  {FUEL_KEYS.map((fk, idx) => (
                    <td key={fk} className="py-1.5 px-3 text-center">
                      <input
                        type="number"
                        value={Math.round(m7[row.key][fk] * 100)}
                        onChange={(e) => handleReductionEdit(row.key, fk, e.target.value)}
                        min={0}
                        max={100}
                        step={1}
                        className="w-16 font-mono text-xs text-center bg-input-bg border border-border rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-navy"
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ── Trigger Thresholds Reference ─────────────────── */}
      <Card title="Trigger Activation Thresholds">
        <p className="text-xs text-slate mb-3">
          Indicative conditions that activate each conservation level (governed by M8 composite stress logic).
        </p>
        <div className="space-y-2">
          {TRIGGER_THRESHOLDS.map((t) => (
            <div key={t.level} className="flex items-start gap-3">
              <span
                className="inline-block w-2 h-2 rounded-full mt-1 shrink-0"
                style={{ backgroundColor: t.color }}
              />
              <div>
                <span className="text-xs font-semibold" style={{ color: t.color }}>
                  {t.level}
                </span>
                <span className="text-xs text-slate ml-2">{t.conditions}</span>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </ModulePanel>
  );
}
