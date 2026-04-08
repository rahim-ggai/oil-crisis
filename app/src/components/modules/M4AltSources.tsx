'use client';

import { useMemo } from 'react';
import { useAppStore } from '@/lib/store';
import { ModulePanel, Card } from '@/components/ui/ModulePanel';
import type { AlternateSource } from '@/types';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts';

// ── Helpers ──────────────────────────────────────────────────
const fmt = (n: number, d = 0) => n.toLocaleString('en-US', { maximumFractionDigits: d });

function freightColor(pct: number): string {
  if (pct < 25) return 'text-green-700';
  if (pct <= 75) return 'text-amber-600';
  return 'text-red-600';
}

function freightBg(pct: number): string {
  if (pct < 25) return 'bg-green-50';
  if (pct <= 75) return 'bg-amber-50';
  return 'bg-red-50';
}

// ── Source Table Row ─────────────────────────────────────────

function SourceRow({ source }: { source: AlternateSource }) {
  const updateSource = useAppStore((s) => s.updateSource);
  const toggleSource = useAppStore((s) => s.toggleSource);

  const hasWarning = source.notes.toLowerCase().includes('feasibility') ||
    source.notes.toLowerCase().includes('bad refinery');

  return (
    <tr className={`border-b border-border/50 ${source.activated ? '' : 'opacity-60'}`}>
      {/* Activated toggle */}
      <td className="py-2 px-2 text-center">
        <input
          type="checkbox"
          checked={source.activated}
          onChange={() => toggleSource(source.id)}
          className="accent-navy"
        />
      </td>

      {/* Country */}
      <td className="py-2 px-2 text-xs text-navy">{source.country}</td>

      {/* Supplier */}
      <td className="py-2 px-2 text-xs text-navy max-w-[140px]">
        <div className="truncate" title={source.supplier}>{source.supplier}</div>
      </td>

      {/* Product */}
      <td className="py-2 px-2 text-xs font-medium text-navy">{source.product}</td>

      {/* Max liftable */}
      <td className="py-2 px-2 text-right">
        <input
          type="number"
          value={source.maxLiftableKbblMonth}
          onChange={(e) => updateSource(source.id, { maxLiftableKbblMonth: parseFloat(e.target.value) || 0 })}
          className="w-16 font-mono text-xs bg-input-bg border border-border rounded px-1 py-0.5 text-right focus:outline-none focus:ring-1 focus:ring-navy"
        />
      </td>

      {/* Transit: normal / crisis */}
      <td className="py-2 px-2 text-center">
        <div className="flex items-center justify-center gap-1">
          <span className="font-mono text-xs text-navy">{source.normalTransitDays}</span>
          <span className="text-[10px] text-slate">/</span>
          <span className={`font-mono text-xs ${source.crisisTransitDays > source.normalTransitDays * 1.3 ? 'text-red-600 font-semibold' : 'text-navy'}`}>
            {source.crisisTransitDays}
          </span>
        </div>
      </td>

      {/* Freight premium */}
      <td className="py-2 px-2 text-center">
        <span className={`font-mono text-xs px-1.5 py-0.5 rounded ${freightColor(source.freightPremiumPct)} ${freightBg(source.freightPremiumPct)}`}>
          {source.freightPremiumPct}%
        </span>
      </td>

      {/* Payment terms */}
      <td className="py-2 px-2 text-[10px] text-slate max-w-[100px]">
        <div className="truncate" title={source.paymentTerms}>{source.paymentTerms}</div>
      </td>

      {/* Notes / warnings */}
      <td className="py-2 px-2 text-[10px] max-w-[160px]">
        <div className={`truncate ${hasWarning ? 'text-red-600 font-medium' : 'text-slate'}`} title={source.notes}>
          {source.notes}
        </div>
      </td>
    </tr>
  );
}

// ── Liftable Bar Chart ───────────────────────────────────────

function LiftableChart({ sources }: { sources: AlternateSource[] }) {
  const data = useMemo(() => {
    return sources.map((s) => ({
      name: `${s.country} (${s.product})`,
      liftable: s.maxLiftableKbblMonth,
      activated: s.activated,
      fill: s.activated ? '#1e3a5f' : '#cbd5e1',
    }));
  }, [sources]);

  return (
    <Card title="Max Liftable by Source (kbbl/month)">
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
            <XAxis
              type="number"
              tick={{ fontSize: 10, fill: '#64748b' }}
              label={{ value: 'kbbl/month', position: 'insideBottomRight', style: { fontSize: 10, fill: '#64748b' }, offset: -5 }}
            />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fontSize: 9, fill: '#64748b' }}
              width={150}
            />
            <Tooltip
              contentStyle={{ fontSize: 11, background: '#fafaf8', border: '1px solid #e2e8f0' }}
              formatter={(value: unknown) => [`${fmt(Number(value))} kbbl/mo`, 'Max Liftable']}
            />
            <Bar
              dataKey="liftable"
              radius={[0, 3, 3, 0]}
              isAnimationActive={false}
            >
              {data.map((entry, index) => (
                <Cell key={`bar-${index}`} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="flex items-center gap-4 mt-2">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm" style={{ background: '#1e3a5f' }} />
          <span className="text-[10px] text-slate">Activated</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm" style={{ background: '#cbd5e1' }} />
          <span className="text-[10px] text-slate">Not activated</span>
        </div>
      </div>
    </Card>
  );
}

// ── Summary Cards ────────────────────────────────────────────

function SummaryCards({ sources }: { sources: AlternateSource[] }) {
  const activeSources = useMemo(() => sources.filter((s) => s.activated), [sources]);

  const totalLiftable = useMemo(
    () => activeSources.reduce((sum, s) => sum + s.maxLiftableKbblMonth, 0),
    [activeSources]
  );

  const timeToFirstCargo = useMemo(() => {
    if (activeSources.length === 0) return null;
    return Math.min(...activeSources.map((s) => s.crisisTransitDays));
  }, [activeSources]);

  return (
    <div className="grid grid-cols-3 gap-4 mb-6">
      <Card>
        <div className="text-center">
          <div className="text-[10px] text-slate mb-1">Activated Sources</div>
          <div className="font-mono text-lg font-semibold text-navy">
            {activeSources.length} / {sources.length}
          </div>
        </div>
      </Card>
      <Card>
        <div className="text-center">
          <div className="text-[10px] text-slate mb-1">Total Liftable (activated)</div>
          <div className="font-mono text-lg font-semibold text-navy">
            {fmt(totalLiftable)} <span className="text-xs font-normal text-slate">kbbl/mo</span>
          </div>
        </div>
      </Card>
      <Card>
        <div className="text-center">
          <div className="text-[10px] text-slate mb-1">Time to First Cargo</div>
          <div className="font-mono text-lg font-semibold text-navy">
            {timeToFirstCargo !== null ? `${timeToFirstCargo} days` : '--'}
          </div>
        </div>
      </Card>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────

export default function M4AltSources() {
  const sources = useAppStore((s) => s.scenario.m4.sources);

  return (
    <ModulePanel
      title="M4 — Alternate Sourcing & Logistics"
      subtitle="Non-Gulf crude and product sources, transit analysis, and freight premiums"
    >
      {/* Summary */}
      <SummaryCards sources={sources} />

      {/* Source table */}
      <Card className="mb-6">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border">
                <th className="py-2 px-2 text-center text-slate font-medium w-10">On</th>
                <th className="py-2 px-2 text-left text-slate font-medium">Country</th>
                <th className="py-2 px-2 text-left text-slate font-medium">Supplier</th>
                <th className="py-2 px-2 text-left text-slate font-medium">Product</th>
                <th className="py-2 px-2 text-right text-slate font-medium">Max kbbl/mo</th>
                <th className="py-2 px-2 text-center text-slate font-medium">
                  <div>Transit (d)</div>
                  <div className="text-[9px] font-normal">norm / crisis</div>
                </th>
                <th className="py-2 px-2 text-center text-slate font-medium">Freight +%</th>
                <th className="py-2 px-2 text-left text-slate font-medium">Payment</th>
                <th className="py-2 px-2 text-left text-slate font-medium">Notes</th>
              </tr>
            </thead>
            <tbody>
              {sources.map((source) => (
                <SourceRow key={source.id} source={source} />
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Liftable chart */}
      <LiftableChart sources={sources} />
    </ModulePanel>
  );
}
