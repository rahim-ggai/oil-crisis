'use client';

import { useMemo } from 'react';
import { useAppStore } from '@/lib/store';
import { ModulePanel, Card } from '@/components/ui/ModulePanel';
import { InputField } from '@/components/ui/InputField';
import {
  getDaysOfCover,
  getWeightedDaysOfCover,
  computeDepletionCurve,
  getReductionForLevel,
  traceWeightedDaysOfCover,
} from '@/lib/calculations/m1-inventory';
import { InlineFormula } from '@/components/ui/FormulaBreakdown';
import type { ConservationLevel, DemandReduction } from '@/types';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const CONSERVATION_LEVELS: ConservationLevel[] = ['none', 'alert', 'austerity', 'emergency'];

const LEVEL_LABELS: Record<ConservationLevel, string> = {
  none: 'None',
  alert: 'Alert',
  austerity: 'Austerity',
  emergency: 'Emergency',
};

const LEVEL_COLORS: Record<ConservationLevel, string> = {
  none: '#1a1a2e',
  alert: '#d4a017',
  austerity: '#c0392b',
  emergency: '#0f0f1e',
};

const LEVEL_DASHES: Record<ConservationLevel, string> = {
  none: '0',
  alert: '8 4',
  austerity: '4 4',
  emergency: '2 2',
};

export function M1Inventory() {
  const m1 = useAppStore((s) => s.scenario.m1);
  const m7 = useAppStore((s) => s.scenario.m7);
  const fp = useAppStore((s) => s.scenario.formulaParams);
  const updateM1 = useAppStore((s) => s.updateM1);
  const m1Weights = useMemo(() => ({ hsd: fp.m1_hsdWeight, ms: fp.m1_msWeight, fo: fp.m1_foWeight }), [fp]);

  const m7Reductions = useMemo(
    () => ({
      alert: m7.alertReductions,
      austerity: m7.austerityReductions,
      emergency: m7.emergencyReductions,
    }),
    [m7.alertReductions, m7.austerityReductions, m7.emergencyReductions]
  );

  // Days-of-cover table data
  const coverTable = useMemo(() => {
    return CONSERVATION_LEVELS.map((level) => {
      const r = getReductionForLevel(level, m7Reductions);
      return {
        level,
        label: LEVEL_LABELS[level],
        hsd: getDaysOfCover(m1.hsdStock, m1.hsdDailyConsumption, r.hsd),
        ms: getDaysOfCover(m1.msStock, m1.msDailyConsumption, r.ms),
        fo: getDaysOfCover(m1.foStock, m1.foDailyConsumption, r.fo),
      };
    });
  }, [m1, m7Reductions]);

  // Depletion chart data: merge all 4 conservation scenarios into one dataset
  const chartData = useMemo(() => {
    const curves = CONSERVATION_LEVELS.map((level) => {
      const r = getReductionForLevel(level, m7Reductions);
      return { level, points: computeDepletionCurve(m1, r, 90) };
    });

    // Build merged array keyed by day
    const merged: Record<string, number>[] = [];
    for (let d = 0; d <= 90; d++) {
      const row: Record<string, number> = { day: d };
      for (const { level, points } of curves) {
        const pt = points[d];
        row[`hsd_${level}`] = Math.round(pt.hsdDays * 10) / 10;
        row[`ms_${level}`] = Math.round(pt.msDays * 10) / 10;
        row[`fo_${level}`] = Math.round(pt.foDays * 10) / 10;
      }
      merged.push(row);
    }
    return merged;
  }, [m1, m7Reductions]);

  return (
    <ModulePanel
      title="M1 -- Domestic Fuel Inventory"
      subtitle="Current stocks, daily burn rates, and depletion projections by conservation level"
    >
      <div className="flex gap-6">
        {/* LEFT: Inputs */}
        <div className="w-[30%] shrink-0 space-y-1">
          <Card title="Stocks">
            <InputField
              label="Crude Oil Stock"
              value={m1.crudeOilStock}
              onChange={(v) => updateM1({ crudeOilStock: v })}
              unit="bbl"
              tooltipKey="crudeOilStock"
              step={10000}
              min={0}
            />
            <InputField
              label="HSD Stock"
              value={m1.hsdStock}
              onChange={(v) => updateM1({ hsdStock: v })}
              unit="tonnes"
              tooltipKey="hsdStock"
              step={1000}
              min={0}
            />
            <InputField
              label="MS (Petrol) Stock"
              value={m1.msStock}
              onChange={(v) => updateM1({ msStock: v })}
              unit="tonnes"
              tooltipKey="msStock"
              step={1000}
              min={0}
            />
            <InputField
              label="FO Stock"
              value={m1.foStock}
              onChange={(v) => updateM1({ foStock: v })}
              unit="tonnes"
              tooltipKey="foStock"
              step={1000}
              min={0}
            />
            <InputField
              label="LPG Stock"
              value={m1.lpgStock}
              onChange={(v) => updateM1({ lpgStock: v })}
              unit="tonnes"
              tooltipKey="lpgStock"
              step={1000}
              min={0}
            />
            <InputField
              label="JP-1 Stock"
              value={m1.jp1Stock}
              onChange={(v) => updateM1({ jp1Stock: v })}
              unit="tonnes"
              tooltipKey="jp1Stock"
              step={1000}
              min={0}
            />
          </Card>

          <Card title="Daily Consumption">
            <InputField
              label="HSD Daily Consumption"
              value={m1.hsdDailyConsumption}
              onChange={(v) => updateM1({ hsdDailyConsumption: v })}
              unit="tonnes/day"
              tooltipKey="hsdDailyConsumption"
              step={100}
              min={0}
            />
            <InputField
              label="MS Daily Consumption"
              value={m1.msDailyConsumption}
              onChange={(v) => updateM1({ msDailyConsumption: v })}
              unit="tonnes/day"
              tooltipKey="msDailyConsumption"
              step={100}
              min={0}
            />
            <InputField
              label="FO Daily Consumption"
              value={m1.foDailyConsumption}
              onChange={(v) => updateM1({ foDailyConsumption: v })}
              unit="tonnes/day"
              tooltipKey="foDailyConsumption"
              step={100}
              min={0}
            />
            <InputField
              label="Total Petroleum Consumption"
              value={m1.totalPetroleumConsumption}
              onChange={(v) => updateM1({ totalPetroleumConsumption: v })}
              unit="bbl/day"
              tooltipKey="totalPetroleumConsumption"
              step={1000}
              min={0}
            />
          </Card>
        </div>

        {/* RIGHT: Outputs */}
        <div className="flex-1 space-y-6">
          {/* Days-of-cover table */}
          <Card title="Days of Cover by Conservation Level">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 pr-4 text-xs font-medium text-slate">Level</th>
                    <th className="text-right py-2 px-3 text-xs font-medium text-slate">HSD</th>
                    <th className="text-right py-2 px-3 text-xs font-medium text-slate">MS</th>
                    <th className="text-right py-2 px-3 text-xs font-medium text-slate">FO</th>
                  </tr>
                </thead>
                <tbody>
                  {coverTable.map((row) => (
                    <tr key={row.level} className="border-b border-border/50">
                      <td className="py-2 pr-4 text-xs font-medium text-navy">{row.label}</td>
                      <td className="py-2 px-3 text-right font-mono text-xs">
                        <CoverCell days={row.hsd} />
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-xs">
                        <CoverCell days={row.ms} />
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-xs">
                        <CoverCell days={row.fo} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-3 pt-2 border-t border-border/50">
              <InlineFormula trace={traceWeightedDaysOfCover(m1, undefined, m1Weights)}>
                <span className="text-xs text-slate">Weighted Days of Cover: </span>
                <span className="font-mono text-sm font-semibold text-navy">
                  {getWeightedDaysOfCover(m1, undefined, m1Weights).toFixed(1)} days
                </span>
              </InlineFormula>
            </div>
          </Card>

          {/* Depletion chart */}
          <Card title="Depletion Curves -- Days of Cover Remaining (90-day horizon)">
            <div className="h-[380px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e0dc" />
                  <XAxis
                    dataKey="day"
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    label={{ value: 'Days from today', position: 'insideBottom', offset: -2, fontSize: 11, fill: '#64748b' }}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    label={{ value: 'Days of cover', angle: -90, position: 'insideLeft', offset: 5, fontSize: 11, fill: '#64748b' }}
                  />
                  <Tooltip
                    contentStyle={{ fontSize: 11, background: '#ffffff', border: '1px solid #e2e0dc' }}
                    labelFormatter={(v) => `Day ${v}`}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: 10 }}
                  />

                  {/* HSD lines for each conservation level */}
                  {CONSERVATION_LEVELS.map((level) => (
                    <Line
                      key={`hsd_${level}`}
                      dataKey={`hsd_${level}`}
                      name={`HSD (${LEVEL_LABELS[level]})`}
                      stroke="#c0392b"
                      strokeDasharray={LEVEL_DASHES[level]}
                      strokeWidth={level === 'none' ? 2 : 1.5}
                      dot={false}
                    />
                  ))}

                  {/* MS lines */}
                  {CONSERVATION_LEVELS.map((level) => (
                    <Line
                      key={`ms_${level}`}
                      dataKey={`ms_${level}`}
                      name={`MS (${LEVEL_LABELS[level]})`}
                      stroke="#2563eb"
                      strokeDasharray={LEVEL_DASHES[level]}
                      strokeWidth={level === 'none' ? 2 : 1.5}
                      dot={false}
                    />
                  ))}

                  {/* FO lines */}
                  {CONSERVATION_LEVELS.map((level) => (
                    <Line
                      key={`fo_${level}`}
                      dataKey={`fo_${level}`}
                      name={`FO (${LEVEL_LABELS[level]})`}
                      stroke="#64748b"
                      strokeDasharray={LEVEL_DASHES[level]}
                      strokeWidth={level === 'none' ? 2 : 1.5}
                      dot={false}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      </div>
    </ModulePanel>
  );
}

function CoverCell({ days }: { days: number }) {
  const formatted = days === Infinity ? '--' : days.toFixed(1);
  const color =
    days === Infinity
      ? 'text-slate'
      : days < 10
        ? 'text-red-muted font-semibold'
        : days < 20
          ? 'text-ochre'
          : 'text-navy';
  return <span className={color}>{formatted}</span>;
}
