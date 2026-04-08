'use client';

import { useMemo } from 'react';
import { useAppStore } from '@/lib/store';
import { ModulePanel, Card } from '@/components/ui/ModulePanel';
import { InputField } from '@/components/ui/InputField';
import { computeAffordability, traceAffordability } from '@/lib/calculations/m6-price';
import { InlineFormula } from '@/components/ui/FormulaBreakdown';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';

const MULTIPLIER_OPTIONS = [1.0, 1.25, 1.5, 1.75, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0];

/** Normal daily demand from defaults */
const NORMAL_DAILY_DEMAND = 423_000;

function fmtB(n: number): string {
  return n.toFixed(2) + 'B';
}

function fmtBbl(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'k';
  return n.toFixed(0);
}

function fmtPKR(usdBillions: number, rate: number): string {
  const pkrBillions = usdBillions * rate;
  if (pkrBillions >= 1000) return (pkrBillions / 1000).toFixed(1) + 'T PKR';
  return pkrBillions.toFixed(0) + 'B PKR';
}

export function M6Price() {
  const m6 = useAppStore((s) => s.scenario.m6);
  const m7 = useAppStore((s) => s.scenario.m7);
  const fp = useAppStore((s) => s.scenario.formulaParams);
  const updateM6 = useAppStore((s) => s.updateM6);

  const output = useMemo(() => computeAffordability(m6, fp), [m6, fp]);
  const affordabilityTrace = useMemo(() => traceAffordability(m6), [m6]);

  // Demand thresholds for reference lines (barrels/month)
  const demandThresholds = useMemo(() => {
    const normalMonthly = NORMAL_DAILY_DEMAND * 30;
    const alertReduction = (m7.alertReductions.hsd + m7.alertReductions.ms + m7.alertReductions.fo + m7.alertReductions.jp1) / 4;
    const austerityReduction = (m7.austerityReductions.hsd + m7.austerityReductions.ms + m7.austerityReductions.fo + m7.austerityReductions.jp1) / 4;
    const emergencyReduction = (m7.emergencyReductions.hsd + m7.emergencyReductions.ms + m7.emergencyReductions.fo + m7.emergencyReductions.jp1) / 4;

    return {
      normal: normalMonthly,
      alert: normalMonthly * (1 - alertReduction),
      austerity: normalMonthly * (1 - austerityReduction),
      emergency: normalMonthly * (1 - emergencyReduction),
    };
  }, [m7]);

  // Chart data from affordability curve
  const chartData = useMemo(() => {
    return output.affordabilityCurve.map((pt) => ({
      multiplier: pt.multiplier + 'x',
      multiplierNum: pt.multiplier,
      affordableBarrels: Math.round(pt.affordableBarrels),
    }));
  }, [output]);

  return (
    <ModulePanel
      title="M6 -- Price-Linked Procurement"
      subtitle="Financial capacity to sustain petroleum imports under crisis pricing"
    >
      <div className="flex gap-6">
        {/* LEFT: Inputs */}
        <div className="w-[30%] shrink-0 space-y-1">
          <Card title="Oil Price">
            <InputField
              label="Pre-Crisis Brent"
              value={m6.preCrisisBrent}
              onChange={(v) => updateM6({ preCrisisBrent: v })}
              unit="USD/bbl"
              tooltipKey="preCrisisBrent"
              step={1}
              min={0}
            />
            <InputField
              label="Current Brent Spot"
              value={m6.currentBrentSpot}
              onChange={(v) => updateM6({ currentBrentSpot: v })}
              unit="USD/bbl"
              tooltipKey="currentBrentSpot"
              step={1}
              min={0}
            />
            <div className="mb-3">
              <label className="text-xs font-medium text-foreground mb-1 block">Brent Multiplier</label>
              <select
                value={m6.brentMultiplier}
                onChange={(e) => updateM6({ brentMultiplier: parseFloat(e.target.value) })}
                className="w-full font-mono text-sm bg-input-bg border border-border rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-navy"
              >
                {MULTIPLIER_OPTIONS.map((m) => (
                  <option key={m} value={m}>{m.toFixed(2)}x</option>
                ))}
              </select>
            </div>
          </Card>

          <Card title="Financial Resources">
            <InputField
              label="SBP Reserves"
              value={m6.sbpReserves}
              onChange={(v) => updateM6({ sbpReserves: v })}
              unit="USD bn"
              tooltipKey="sbpReserves"
              step={0.1}
              min={0}
            />
            <InputField
              label="Reserves Floor"
              value={m6.reservesFloor}
              onChange={(v) => updateM6({ reservesFloor: v })}
              unit="USD bn"
              tooltipKey="reservesFloor"
              step={0.5}
              min={0}
            />
            <InputField
              label="IMF Available"
              value={m6.imfAvailable}
              onChange={(v) => updateM6({ imfAvailable: v })}
              unit="USD bn"
              tooltipKey="imfAvailable"
              step={0.1}
              min={0}
            />
            <div className="mb-3">
              <InputField
                label="Saudi Deferred Facility"
                value={m6.saudiDeferredFacility}
                onChange={(v) => updateM6({ saudiDeferredFacility: v })}
                unit="USD bn/yr"
                tooltipKey="saudiDeferredFacility"
                step={0.1}
                min={0}
              />
              <label className="flex items-center gap-2 mt-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={m6.saudiDoubled}
                  onChange={(e) => updateM6({ saudiDoubled: e.target.checked })}
                  className="rounded border-border accent-navy"
                />
                <span className="text-xs text-slate">Double facility (crisis escalation)</span>
              </label>
            </div>
            <InputField
              label="UAE Deposits"
              value={m6.uaeDeposits}
              onChange={(v) => updateM6({ uaeDeposits: v })}
              unit="USD bn"
              step={0.1}
              min={0}
            />
            <InputField
              label="China Swap Line"
              value={m6.chinaSwapLine}
              onChange={(v) => updateM6({ chinaSwapLine: v })}
              unit="USD bn"
              tooltipKey="chinaSwapLine"
              step={0.5}
              min={0}
            />
            <InputField
              label="Barter Capacity"
              value={m6.barterCapacity}
              onChange={(v) => updateM6({ barterCapacity: v })}
              unit="USD mn/yr"
              step={50}
              min={0}
            />
          </Card>

          <Card title="Baseline Demand">
            <InputField
              label="Normal Monthly Import Bill"
              value={m6.normalMonthlyImportBill}
              onChange={(v) => updateM6({ normalMonthlyImportBill: v })}
              unit="USD bn"
              step={0.1}
              min={0}
            />
            <InputField
              label="Exchange Rate"
              value={m6.exchangeRate}
              onChange={(v) => updateM6({ exchangeRate: v })}
              unit="PKR/USD"
              tooltipKey="exchangeRate"
              step={1}
              min={1}
            />
          </Card>
        </div>

        {/* RIGHT: Outputs + Chart */}
        <div className="flex-1 space-y-6">
          {/* Summary outputs */}
          <Card title="Computed Outputs">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-[10px] text-slate uppercase tracking-wide mb-1">Max Monthly Spend</p>
                <InlineFormula trace={affordabilityTrace}>
                  <p className="font-mono text-lg text-navy font-semibold">${fmtB(output.maxMonthlyExpenditure)}</p>
                </InlineFormula>
                <p className="text-[10px] text-slate">{fmtPKR(output.maxMonthlyExpenditure, m6.exchangeRate)}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate uppercase tracking-wide mb-1">Affordable Barrels</p>
                <InlineFormula trace={affordabilityTrace}>
                  <p className="font-mono text-lg text-navy font-semibold">{fmtBbl(output.affordableBarrels)}</p>
                </InlineFormula>
                <p className="text-[10px] text-slate">per month</p>
              </div>
              <div>
                <p className="text-[10px] text-slate uppercase tracking-wide mb-1">War Funding</p>
                <p className="font-mono text-lg text-navy font-semibold">{output.monthsOfWarFunding}</p>
                <p className="text-[10px] text-slate">months</p>
              </div>
            </div>

            {/* Demand coverage indicator */}
            <div className="mt-4 pt-4 border-t border-border">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate">Demand Coverage</span>
                <span className="font-mono text-navy font-semibold">
                  {((output.affordableBarrels / output.normalDemandBarrels) * 100).toFixed(1)}%
                </span>
              </div>
              <div className="mt-1.5 w-full h-2 bg-border rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    output.affordableBarrels >= output.normalDemandBarrels
                      ? 'bg-navy'
                      : output.affordableBarrels >= output.normalDemandBarrels * 0.6
                        ? 'bg-ochre'
                        : 'bg-red-muted'
                  }`}
                  style={{ width: `${Math.min(100, (output.affordableBarrels / output.normalDemandBarrels) * 100)}%` }}
                />
              </div>
            </div>
          </Card>

          {/* Price detail */}
          <Card title="Effective Pricing">
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <p className="text-slate mb-1">Effective Brent</p>
                <p className="font-mono text-navy font-semibold">
                  ${(m6.currentBrentSpot * m6.brentMultiplier).toFixed(2)}/bbl
                </p>
                <p className="text-[10px] text-slate">
                  {(m6.currentBrentSpot * m6.brentMultiplier * m6.exchangeRate).toFixed(0)} PKR/bbl
                </p>
              </div>
              <div>
                <p className="text-slate mb-1">Landed Cost (incl. premiums)</p>
                <p className="font-mono text-navy font-semibold">
                  ${(m6.currentBrentSpot * m6.brentMultiplier * 1.10 * 1.15).toFixed(2)}/bbl
                </p>
                <p className="text-[10px] text-slate">
                  {(m6.currentBrentSpot * m6.brentMultiplier * 1.10 * 1.15 * m6.exchangeRate).toFixed(0)} PKR/bbl
                </p>
              </div>
            </div>
          </Card>

          {/* Affordability Curve */}
          <Card title="Affordability Curve -- Affordable Barrels vs. Brent Multiplier">
            <div className="h-[380px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e0dc" />
                  <XAxis
                    dataKey="multiplier"
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    label={{ value: 'Brent Multiplier', position: 'insideBottom', offset: -2, fontSize: 11, fill: '#64748b' }}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    tickFormatter={(v: number) => fmtBbl(v)}
                    label={{ value: 'bbl/month', angle: -90, position: 'insideLeft', offset: 5, fontSize: 11, fill: '#64748b' }}
                  />
                  <Tooltip
                    contentStyle={{ fontSize: 11, background: '#ffffff', border: '1px solid #e2e0dc' }}
                    formatter={(value: unknown) => [fmtBbl(Number(value)) + ' bbl/mo', 'Affordable']}
                    labelFormatter={(v) => `Brent ${v}`}
                  />
                  <Legend wrapperStyle={{ fontSize: 10 }} />

                  {/* Demand reference lines */}
                  <ReferenceLine
                    y={demandThresholds.normal}
                    stroke="#1a1a2e"
                    strokeDasharray="8 4"
                    strokeWidth={1.5}
                    label={{ value: `Normal (${fmtBbl(demandThresholds.normal)})`, position: 'right', fontSize: 9, fill: '#1a1a2e' }}
                  />
                  <ReferenceLine
                    y={demandThresholds.alert}
                    stroke="#d4a017"
                    strokeDasharray="6 3"
                    strokeWidth={1.5}
                    label={{ value: `Alert (${fmtBbl(demandThresholds.alert)})`, position: 'right', fontSize: 9, fill: '#d4a017' }}
                  />
                  <ReferenceLine
                    y={demandThresholds.austerity}
                    stroke="#c0392b"
                    strokeDasharray="4 3"
                    strokeWidth={1.5}
                    label={{ value: `Austerity (${fmtBbl(demandThresholds.austerity)})`, position: 'right', fontSize: 9, fill: '#c0392b' }}
                  />
                  <ReferenceLine
                    y={demandThresholds.emergency}
                    stroke="#0f0f1e"
                    strokeDasharray="2 2"
                    strokeWidth={1.5}
                    label={{ value: `Emergency (${fmtBbl(demandThresholds.emergency)})`, position: 'right', fontSize: 9, fill: '#0f0f1e' }}
                  />

                  <Line
                    type="monotone"
                    dataKey="affordableBarrels"
                    name="Affordable Barrels"
                    stroke="#1a1a2e"
                    strokeWidth={2}
                    dot={{ r: 3, fill: '#1a1a2e' }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p className="text-[10px] text-slate mt-2">
              Horizontal lines mark demand thresholds at each conservation level. Where the affordability curve crosses below a threshold, that conservation level becomes price-triggered.
            </p>
          </Card>
        </div>
      </div>
    </ModulePanel>
  );
}
