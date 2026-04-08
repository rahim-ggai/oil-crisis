'use client';

import { useMemo, useCallback } from 'react';
import { useAppStore } from '@/lib/store';
import { ModulePanel, Card } from '@/components/ui/ModulePanel';
import { InputField } from '@/components/ui/InputField';
import { computeAllRefineryOutputs, getTotalDailyOutput, traceFeasibility } from '@/lib/calculations/m3-refining';
import { InlineFormula } from '@/components/ui/FormulaBreakdown';
import type { Refinery, YieldProfile } from '@/types';
import {
  Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine, ComposedChart, Cell,
} from 'recharts';

// ── Helpers ──────────────────────────────────────────────────
const fmt = (n: number, d = 0) => n.toLocaleString('en-US', { maximumFractionDigits: d });

const YIELD_KEYS: { key: keyof YieldProfile; label: string }[] = [
  { key: 'lpg', label: 'LPG' },
  { key: 'naphthaPetrol', label: 'Naphtha/Petrol' },
  { key: 'hsd', label: 'HSD' },
  { key: 'jp1Kero', label: 'JP1/Kero' },
  { key: 'fo', label: 'FO' },
  { key: 'loss', label: 'Loss' },
];

// ── Sub-components ───────────────────────────────────────────

function CrudeDietEditor({
  refinery,
  allGrades,
  onUpdate,
}: {
  refinery: Refinery;
  allGrades: string[];
  onUpdate: (grade: string, val: number) => void;
}) {
  const total = Object.values(refinery.crudeDiet).reduce((s, v) => s + v, 0);
  const isValid = Math.abs(total - 100) < 0.5;

  return (
    <div className="mt-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-navy">Crude Diet</span>
        <span className={`text-[10px] font-mono ${isValid ? 'text-slate' : 'text-red-600 font-semibold'}`}>
          Total: {total.toFixed(1)}%
        </span>
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1">
        {allGrades.map((grade) => {
          const val = refinery.crudeDiet[grade] ?? 0;
          if (val === 0 && !Object.hasOwn(refinery.crudeDiet, grade)) return null;
          return (
            <div key={grade} className="flex items-center gap-1.5">
              <span className="text-[10px] text-slate w-20 truncate" title={grade}>{grade}</span>
              <input
                type="number"
                min={0}
                max={100}
                step={5}
                value={val}
                onChange={(e) => onUpdate(grade, parseFloat(e.target.value) || 0)}
                className="w-14 font-mono text-xs bg-input-bg border border-border rounded px-1 py-0.5 text-right focus:outline-none focus:ring-1 focus:ring-navy"
              />
              <span className="text-[10px] text-slate">%</span>
            </div>
          );
        })}
      </div>
      {/* Add new grade */}
      <AddGradeRow refinery={refinery} allGrades={allGrades} onUpdate={onUpdate} />
    </div>
  );
}

function AddGradeRow({
  refinery,
  allGrades,
  onUpdate,
}: {
  refinery: Refinery;
  allGrades: string[];
  onUpdate: (grade: string, val: number) => void;
}) {
  const available = allGrades.filter((g) => !Object.hasOwn(refinery.crudeDiet, g));
  if (available.length === 0) return null;

  return (
    <div className="mt-1">
      <select
        className="text-[10px] text-slate bg-input-bg border border-border rounded px-1 py-0.5"
        defaultValue=""
        onChange={(e) => {
          if (e.target.value) onUpdate(e.target.value, 0);
          e.target.value = '';
        }}
      >
        <option value="" disabled>+ Add grade...</option>
        {available.map((g) => (
          <option key={g} value={g}>{g}</option>
        ))}
      </select>
    </div>
  );
}

function RefineryCard({
  refinery,
  allGrades,
  output,
  yieldMatrix,
}: {
  refinery: Refinery;
  allGrades: string[];
  output: ReturnType<typeof computeAllRefineryOutputs>[number];
  yieldMatrix: Record<string, YieldProfile>;
}) {
  const updateM3 = useAppStore((s) => s.updateM3);
  const refineries = useAppStore((s) => s.scenario.m3.refineries);

  const setUtilization = useCallback(
    (val: number) => {
      updateM3({
        refineries: refineries.map((r) =>
          r.id === refinery.id ? { ...r, utilization: Math.max(0, Math.min(1, val / 100)) } : r
        ),
      });
    },
    [updateM3, refineries, refinery.id]
  );

  const updateDiet = useCallback(
    (grade: string, val: number) => {
      updateM3({
        refineries: refineries.map((r) =>
          r.id === refinery.id
            ? { ...r, crudeDiet: { ...r.crudeDiet, [grade]: val } }
            : r
        ),
      });
    },
    [updateM3, refineries, refinery.id]
  );

  const feasTrace = useMemo(
    () => traceFeasibility(refinery, yieldMatrix),
    [refinery, yieldMatrix]
  );

  const feasColor =
    output.feasibilityScore >= 70 ? 'text-green-700' :
    output.feasibilityScore >= 40 ? 'text-amber-600' :
    'text-red-600';

  return (
    <Card>
      <div className="flex items-start justify-between mb-2">
        <div>
          <h3 className="text-sm font-semibold text-navy">{refinery.name}</h3>
          <p className="text-[10px] text-slate">{refinery.technology} | Nelson {refinery.nelsonIndex}</p>
        </div>
        <div className="text-right">
          <span className="font-mono text-xs text-navy">{fmt(refinery.capacityBpd)} bpd</span>
          <InlineFormula trace={feasTrace}>
            <span className={`text-[10px] font-semibold ${feasColor}`}>
              Feasibility: {output.feasibilityScore.toFixed(0)}
            </span>
          </InlineFormula>
        </div>
      </div>

      {/* Utilization slider */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-0.5">
          <span className="text-xs text-slate">Utilization</span>
          <span className="font-mono text-xs text-navy">{(refinery.utilization * 100).toFixed(0)}%</span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={refinery.utilization * 100}
          onChange={(e) => setUtilization(parseFloat(e.target.value))}
          className="w-full h-1.5 accent-navy"
        />
        <div className="flex justify-between text-[9px] text-slate">
          <span>0%</span>
          <span>Effective: {fmt(output.dailyBpd)} bpd</span>
          <span>100%</span>
        </div>
      </div>

      {/* Crude diet */}
      <CrudeDietEditor refinery={refinery} allGrades={allGrades} onUpdate={updateDiet} />

      {/* Daily output */}
      <div className="mt-3 pt-3 border-t border-border">
        <span className="text-xs font-medium text-navy">Daily Output (tonnes)</span>
        <div className="grid grid-cols-3 gap-x-3 gap-y-0.5 mt-1">
          {[
            { label: 'HSD', val: output.hsd },
            { label: 'Naphtha/MS', val: output.naphthaPetrol },
            { label: 'FO', val: output.fo },
            { label: 'JP1/Kero', val: output.jp1Kero },
            { label: 'LPG', val: output.lpg },
            { label: 'Loss', val: output.loss },
          ].map(({ label, val }) => (
            <div key={label} className="flex justify-between">
              <span className="text-[10px] text-slate">{label}</span>
              <span className="font-mono text-[10px] text-navy">{fmt(val)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* FO storage warning */}
      <div className="mt-2 pt-2 border-t border-border">
        <div className="flex justify-between">
          <span className="text-[10px] text-slate">FO storage full in</span>
          <span className={`font-mono text-[10px] ${output.foStorageDaysUntilFull < 10 ? 'text-red-600 font-semibold' : 'text-navy'}`}>
            {output.foStorageDaysUntilFull === Infinity ? 'N/A' : `${output.foStorageDaysUntilFull.toFixed(1)} days`}
          </span>
        </div>
      </div>
    </Card>
  );
}

// ── Yield Matrix Table ───────────────────────────────────────

function YieldMatrixTable({ yieldMatrix }: { yieldMatrix: Record<string, YieldProfile> }) {
  const grades = Object.keys(yieldMatrix);
  return (
    <Card title="Crude Grade Yield Matrix (%)">
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-1.5 pr-2 text-slate font-medium">Grade</th>
              {YIELD_KEYS.map(({ label }) => (
                <th key={label} className="text-right py-1.5 px-1.5 text-slate font-medium">{label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {grades.map((grade) => {
              const y = yieldMatrix[grade];
              return (
                <tr key={grade} className="border-b border-border/50">
                  <td className="py-1 pr-2 text-navy font-medium">{grade}</td>
                  {YIELD_KEYS.map(({ key }) => (
                    <td
                      key={key}
                      className={`py-1 px-1.5 text-right font-mono ${
                        key === 'fo' && y[key] > 40 ? 'text-red-600 font-semibold' : 'text-navy'
                      }`}
                    >
                      {y[key]}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

// ── Feasibility Cliff Chart ──────────────────────────────────

function FeasibilityCliffChart({ yieldMatrix }: { yieldMatrix: Record<string, YieldProfile> }) {
  const data = useMemo(() => {
    return Object.entries(yieldMatrix).map(([grade, y]) => ({
      grade: grade.length > 10 ? grade.slice(0, 9) + '.' : grade,
      fullGrade: grade,
      HSD: y.hsd,
      FO: y.fo,
      foHigh: y.fo > 40,
    }));
  }, [yieldMatrix]);

  return (
    <Card title="Feasibility Cliff: HSD vs FO Yield by Crude Grade">
      <p className="text-[10px] text-slate mb-3">
        Crude grades with FO yield above 30% create storage and refinery feasibility problems.
        Grades above 40% FO are highlighted in red.
      </p>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              dataKey="grade"
              tick={{ fontSize: 9, fill: '#64748b' }}
              angle={-35}
              textAnchor="end"
              height={60}
            />
            <YAxis
              tick={{ fontSize: 10, fill: '#64748b' }}
              domain={[0, 60]}
              label={{ value: 'Yield %', angle: -90, position: 'insideLeft', style: { fontSize: 10, fill: '#64748b' } }}
            />
            <Tooltip
              contentStyle={{ fontSize: 11, background: '#fafaf8', border: '1px solid #e2e8f0' }}
              formatter={(value: unknown, name: unknown) => [`${value}%`, String(name)]}
              labelFormatter={(label: unknown) => String(label)}
            />
            <Legend wrapperStyle={{ fontSize: 10 }} />
            <ReferenceLine
              y={30}
              stroke="#991b1b"
              strokeDasharray="6 3"
              strokeWidth={1.5}
              label={{ value: 'FO Feasibility Threshold (30%)', position: 'right', style: { fontSize: 9, fill: '#991b1b' } }}
            />
            <Bar dataKey="HSD" fill="#1e3a5f" radius={[2, 2, 0, 0]} />
            <Bar
              dataKey="FO"
              radius={[2, 2, 0, 0]}
              fill="#d97706"
            >
              {data.map((entry, index) => (
                <Cell
                  key={`fo-${index}`}
                  fill={entry.foHigh ? '#991b1b' : '#d97706'}
                />
              ))}
            </Bar>
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

// ── Total Output Summary ─────────────────────────────────────

function TotalOutputSummary({ outputs }: { outputs: ReturnType<typeof computeAllRefineryOutputs> }) {
  const totals = useMemo(() => getTotalDailyOutput(outputs), [outputs]);

  return (
    <Card title="Total Daily Refinery Output (tonnes)">
      <div className="grid grid-cols-5 gap-3">
        {[
          { label: 'HSD', val: totals.hsd },
          { label: 'Naphtha/MS', val: totals.naphthaPetrol },
          { label: 'FO', val: totals.fo },
          { label: 'JP1/Kero', val: totals.jp1Kero },
          { label: 'LPG', val: totals.lpg },
        ].map(({ label, val }) => (
          <div key={label} className="text-center">
            <div className="font-mono text-sm font-semibold text-navy">{fmt(val)}</div>
            <div className="text-[10px] text-slate">{label}</div>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ── Main Component ───────────────────────────────────────────

export default function M3Refining() {
  const m3 = useAppStore((s) => s.scenario.m3);
  const foDailyConsumption = useAppStore((s) => s.scenario.m1.foDailyConsumption);
  const updateM3 = useAppStore((s) => s.updateM3);

  const allGrades = useMemo(() => Object.keys(m3.yieldMatrix), [m3.yieldMatrix]);
  const outputs = useMemo(() => computeAllRefineryOutputs(m3, foDailyConsumption), [m3, foDailyConsumption]);

  return (
    <ModulePanel
      title="M3 — Crude Oil Conversion Matrix"
      subtitle="Refinery throughput, crude diet allocation, yield profiles, and FO feasibility analysis"
    >
      {/* Controls row */}
      <div className="flex items-center gap-6 mb-6">
        <label className="flex items-center gap-2 text-xs text-navy cursor-pointer">
          <input
            type="checkbox"
            checked={m3.refineryShutdownLogic}
            onChange={(e) => updateM3({ refineryShutdownLogic: e.target.checked })}
            className="accent-navy"
          />
          Refinery shutdown logic enabled
        </label>
        <div className="w-40">
          <InputField
            label="FO Storage Days"
            value={m3.foStorageDays}
            onChange={(val) => updateM3({ foStorageDays: val })}
            unit="days"
            tooltipKey="foStorageDays"
            min={1}
            max={90}
          />
        </div>
      </div>

      {/* Total output summary */}
      <div className="mb-6">
        <TotalOutputSummary outputs={outputs} />
      </div>

      {/* Refinery cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
        {m3.refineries.map((refinery, idx) => (
          <RefineryCard
            key={refinery.id}
            refinery={refinery}
            allGrades={allGrades}
            output={outputs[idx]}
            yieldMatrix={m3.yieldMatrix}
          />
        ))}
      </div>

      {/* Feasibility cliff chart */}
      <div className="mb-6">
        <FeasibilityCliffChart yieldMatrix={m3.yieldMatrix} />
      </div>

      {/* Yield matrix table */}
      <YieldMatrixTable yieldMatrix={m3.yieldMatrix} />
    </ModulePanel>
  );
}
