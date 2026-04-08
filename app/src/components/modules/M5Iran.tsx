'use client';

import { useMemo } from 'react';
import { useAppStore } from '@/lib/store';
import { ModulePanel, Card } from '@/components/ui/ModulePanel';
import { InputField } from '@/components/ui/InputField';
import { computeIranCorridor, traceIranCorridor } from '@/lib/calculations/m5-iran';
import { InlineFormula } from '@/components/ui/FormulaBreakdown';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const PRODUCTION_PRESETS = [
  { label: '100%', value: 1.0 },
  { label: '75%', value: 0.75 },
  { label: '50%', value: 0.5 },
  { label: '25%', value: 0.25 },
  { label: '0%', value: 0 },
];

const SECURITY_OPTIONS: { label: string; value: 'normal' | 'tense' | 'hostile' }[] = [
  { label: 'Normal', value: 'normal' },
  { label: 'Tense', value: 'tense' },
  { label: 'Hostile', value: 'hostile' },
];

const PAYMENT_OPTIONS = [
  'CNY through central holding entity',
  'Bilateral barter (oil-for-goods)',
  'Rupee settlement via SCO framework',
  'Crypto / digital settlement',
  'Deferred payment facility',
];

function fmt(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'k';
  return n.toFixed(0);
}

export function M5Iran() {
  const m5 = useAppStore((s) => s.scenario.m5);
  const baselineMode = useAppStore((s) => s.scenario.baselineMode);
  const fp = useAppStore((s) => s.scenario.formulaParams);
  const updateM5 = useAppStore((s) => s.updateM5);

  const output = useMemo(
    () => computeIranCorridor(m5, baselineMode, fp),
    [m5, baselineMode, fp]
  );
  const corridorTrace = useMemo(
    () => traceIranCorridor(m5, baselineMode),
    [m5, baselineMode]
  );

  const isDisabled = baselineMode === 'full_corridor_compromised';

  const chartData = useMemo(() => {
    return [
      {
        name: 'Throughput',
        maritime: Math.round(output.maritimeBblDay),
        overland: Math.round(output.overlandBblDay),
      },
    ];
  }, [output]);

  // Breakdown for stacked bar with sub-labels
  const breakdownData = useMemo(() => {
    return [
      { corridor: 'Maritime (5a)', bblDay: Math.round(output.maritimeBblDay) },
      { corridor: 'Overland (5b)', bblDay: Math.round(output.overlandBblDay) },
      { corridor: 'Total', bblDay: Math.round(output.totalBblDay) },
    ];
  }, [output]);

  return (
    <ModulePanel
      title="M5 -- Iran-Specific Corridors"
      subtitle="Maritime and overland supply corridor capacity from Iranian origin"
    >
      {isDisabled && (
        <div className="mb-6 px-4 py-3 bg-red-muted/10 border border-red-muted/30 rounded text-sm text-red-muted">
          Iran corridor disabled under Full Corridor Compromised mode. All outputs zeroed.
        </div>
      )}

      <div className="flex gap-6">
        {/* LEFT: Inputs */}
        <div className="w-[30%] shrink-0 space-y-1">
          {/* 5a: Maritime */}
          <Card title="5a. Maritime under Chinese Flag">
            <InputField
              label="Bandar Abbas Capacity"
              value={m5.bandarAbbasCapacity}
              onChange={(v) => updateM5({ bandarAbbasCapacity: v })}
              unit="bbl/day"
              step={10000}
              min={0}
            />
            <InputField
              label="Kharg Island Capacity"
              value={m5.khargIslandCapacity}
              onChange={(v) => updateM5({ khargIslandCapacity: v })}
              unit="bbl/day"
              step={10000}
              min={0}
            />
            <InputField
              label="Chinese-Flagged Vessels"
              value={m5.chineseFlaggedVessels}
              onChange={(v) => updateM5({ chineseFlaggedVessels: v })}
              unit="count"
              step={1}
              min={0}
              max={50}
            />
            <InputField
              label="Vessel Turnaround"
              value={m5.vesselTurnaroundDays}
              onChange={(v) => updateM5({ vesselTurnaroundDays: v })}
              unit="days"
              step={1}
              min={1}
              max={30}
            />
            <InputField
              label="Discount to Brent"
              value={m5.discountToBrent * 100}
              onChange={(v) => updateM5({ discountToBrent: v / 100 })}
              unit="%"
              step={1}
              min={0}
              max={100}
            />
            <div className="mb-3">
              <label className="text-xs font-medium text-foreground mb-1 block">Payment Mechanism</label>
              <select
                value={m5.paymentMechanism}
                onChange={(e) => updateM5({ paymentMechanism: e.target.value })}
                className="w-full text-sm bg-input-bg border border-border rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-navy"
              >
                {PAYMENT_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
          </Card>

          {/* 5b: Overland */}
          <Card title="5b. Overland via Taftan">
            <InputField
              label="Trucking Capacity"
              value={m5.truckingCapacity}
              onChange={(v) => updateM5({ truckingCapacity: v })}
              unit="bbl/day"
              step={500}
              min={0}
            />
            <div className="mb-3">
              <div className="flex items-center gap-1 mb-1">
                <label className="text-xs font-medium text-foreground">Border Degradation</label>
                <span className="text-[10px] text-slate ml-auto font-mono">{Math.round(m5.borderDegradation * 100)}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={m5.borderDegradation * 100}
                onChange={(e) => updateM5({ borderDegradation: parseInt(e.target.value) / 100 })}
                className="w-full h-1.5 bg-border rounded-lg appearance-none cursor-pointer accent-navy"
              />
              <div className="flex justify-between text-[9px] text-slate mt-0.5">
                <span>0%</span>
                <span>100%</span>
              </div>
            </div>
            <div className="mb-3">
              <label className="text-xs font-medium text-foreground mb-1 block">Security Situation</label>
              <select
                value={m5.securitySituation}
                onChange={(e) => updateM5({ securitySituation: e.target.value as 'normal' | 'tense' | 'hostile' })}
                className="w-full text-sm bg-input-bg border border-border rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-navy"
              >
                {SECURITY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </Card>

          {/* 5c: Iranian Production */}
          <Card title="5c. Iranian Production Level">
            <div className="mb-3">
              <div className="flex items-center gap-1 mb-1">
                <label className="text-xs font-medium text-foreground">Production Level</label>
                <span className="text-[10px] text-slate ml-auto font-mono">{Math.round(m5.iranianProductionPct * 100)}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={m5.iranianProductionPct * 100}
                onChange={(e) => updateM5({ iranianProductionPct: parseInt(e.target.value) / 100 })}
                className="w-full h-1.5 bg-border rounded-lg appearance-none cursor-pointer accent-navy"
              />
              <div className="flex justify-between mt-2 gap-1">
                {PRODUCTION_PRESETS.map((p) => (
                  <button
                    key={p.value}
                    onClick={() => updateM5({ iranianProductionPct: p.value })}
                    className={`flex-1 text-[10px] py-1 rounded border transition-colors ${
                      m5.iranianProductionPct === p.value
                        ? 'bg-navy text-white border-navy'
                        : 'bg-input-bg border-border text-slate hover:border-navy/50'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </Card>
        </div>

        {/* RIGHT: Outputs + Chart */}
        <div className="flex-1 space-y-6">
          {/* Output summary */}
          <Card title="Combined Output">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-[10px] text-slate uppercase tracking-wide mb-1">Total Supply</p>
                <InlineFormula trace={corridorTrace}>
                  <p className="font-mono text-lg text-navy font-semibold">{fmt(output.totalBblDay)}</p>
                </InlineFormula>
                <p className="text-[10px] text-slate">bbl/day</p>
              </div>
              <div>
                <p className="text-[10px] text-slate uppercase tracking-wide mb-1">Monthly Volume</p>
                <p className="font-mono text-lg text-navy font-semibold">{fmt(output.totalBblMonth)}</p>
                <p className="text-[10px] text-slate">bbl/month</p>
              </div>
              <div>
                <p className="text-[10px] text-slate uppercase tracking-wide mb-1">Corridor Score</p>
                <InlineFormula trace={corridorTrace}>
                  <p className={`font-mono text-lg font-semibold ${
                    output.corridorScore > 60 ? 'text-navy' : output.corridorScore > 30 ? 'text-ochre' : 'text-red-muted'
                  }`}>
                    {output.corridorScore.toFixed(1)}
                  </p>
                </InlineFormula>
                <p className="text-[10px] text-slate">/ 100</p>
              </div>
            </div>
          </Card>

          {/* Breakdown table */}
          <Card title="Corridor Breakdown">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 pr-4 text-xs font-medium text-slate">Corridor</th>
                    <th className="text-right py-2 px-3 text-xs font-medium text-slate">bbl/day</th>
                    <th className="text-right py-2 px-3 text-xs font-medium text-slate">Share</th>
                  </tr>
                </thead>
                <tbody>
                  {breakdownData.map((row) => (
                    <tr key={row.corridor} className={`border-b border-border/50 ${row.corridor === 'Total' ? 'font-semibold' : ''}`}>
                      <td className="py-2 pr-4 text-xs text-navy">{row.corridor}</td>
                      <td className="py-2 px-3 text-right font-mono text-xs">{fmt(row.bblDay)}</td>
                      <td className="py-2 px-3 text-right font-mono text-xs text-slate">
                        {output.totalBblDay > 0 && row.corridor !== 'Total'
                          ? ((row.bblDay / output.totalBblDay) * 100).toFixed(1) + '%'
                          : row.corridor === 'Total' ? '100%' : '--'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Stacked bar chart */}
          <Card title="Corridor Throughput Composition">
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e0dc" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: '#64748b' }}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    label={{ value: 'bbl/day', angle: -90, position: 'insideLeft', offset: 5, fontSize: 11, fill: '#64748b' }}
                    tickFormatter={(v: number) => fmt(v)}
                  />
                  <Tooltip
                    contentStyle={{ fontSize: 11, background: '#ffffff', border: '1px solid #e2e0dc' }}
                    formatter={(value: unknown, name: unknown) => [fmt(Number(value)) + ' bbl/day', String(name) === 'maritime' ? 'Maritime (5a)' : 'Overland (5b)']}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: 10 }}
                    formatter={(value: string) => value === 'maritime' ? 'Maritime (5a)' : 'Overland (5b)'}
                  />
                  <Bar dataKey="maritime" stackId="a" fill="#1a1a2e" name="maritime" />
                  <Bar dataKey="overland" stackId="a" fill="#64748b" name="overland" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      </div>
    </ModulePanel>
  );
}
