'use client';

import { useMemo, useState, useEffect, useCallback } from 'react';
import { useAppStore } from '@/lib/store';
import { Card } from '@/components/ui/ModulePanel';
import { SupplyFlowDiagram } from '@/components/dashboard/SupplyFlowDiagram';
import { DieselAllocationFlow } from '@/components/dashboard/DieselAllocationFlow';
import { RadarTradeoff } from '@/components/dashboard/RadarTradeoff';
import { FuelGauge } from '@/components/dashboard/FuelGauge';
import { computeTrigger } from '@/lib/calculations/m8-trigger';
import { computeIranCorridor } from '@/lib/calculations/m5-iran';
import type { TriggerOutput } from '@/lib/calculations/m8-trigger';
import type { ConservationMatrix } from '@/types';
import {
  getDaysOfCover,
  computeDepletionCurve,
  getReductionForLevel,
} from '@/lib/calculations/m1-inventory';
import {
  getAllocationForLevel,
  SECTORS,
} from '@/lib/calculations/sector-allocation';
import { computeReserveTimeline } from '@/lib/calculations/reserve-timeline';
import type { ReserveTimelineResult } from '@/lib/calculations/reserve-timeline';
import { computeEconomicImpact } from '@/lib/calculations/economic-impact';
import type { LevelImpact } from '@/lib/calculations/economic-impact';
import type { ConservationLevel, ScenarioState, TriggerLevel } from '@/types';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
  Legend,
} from 'recharts';

// ────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────

function fmt(n: number, decimals = 1): string {
  if (!isFinite(n)) return '--';
  return n.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

const BADGE_COLORS: Record<string, string> = {
  emergency: 'bg-red-muted/15 text-red-muted border border-red-muted/30',
  alert: 'bg-ochre/15 text-ochre border border-ochre/30',
  austerity: 'bg-[#e67e22]/15 text-[#e67e22] border border-[#e67e22]/30',
  normal: 'bg-green-muted/15 text-green-muted border border-green-muted/30',
  feasible: 'bg-green-muted/15 text-green-muted border border-green-muted/30',
  deficit: 'bg-red-muted/15 text-red-muted border border-red-muted/30',
};

function RecommendationBadge({ label }: { label: string }) {
  const key = label.toLowerCase();
  const colorClass =
    BADGE_COLORS[key] ??
    (key.includes('emergency') || key.includes('deficit') || key.includes('critical')
      ? BADGE_COLORS.emergency
      : key.includes('alert') || key.includes('austerity')
        ? BADGE_COLORS.alert
        : BADGE_COLORS.normal);
  return (
    <span
      className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${colorClass}`}
    >
      {label}
    </span>
  );
}

// ────────────────────────────────────────────────────────────
// AI analysis fetcher
// ────────────────────────────────────────────────────────────

async function fetchAnalysis(
  question: string,
  context: object,
): Promise<string> {
  try {
    const res = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, scenarioContext: context }),
    });
    const data = await res.json();
    if (data.error) return `AI analysis unavailable: ${data.error}`;
    return data.reasoning;
  } catch {
    return 'AI analysis unavailable -- check ANTHROPIC_API_KEY configuration';
  }
}

// ────────────────────────────────────────────────────────────
// Loading skeleton
// ────────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      <div className="h-3 w-full bg-slate-light/20 rounded animate-pulse" />
      <div className="h-3 w-5/6 bg-slate-light/20 rounded animate-pulse" />
      <div className="h-3 w-4/6 bg-slate-light/20 rounded animate-pulse" />
      <div className="h-3 w-3/4 bg-slate-light/20 rounded animate-pulse" />
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// AI Reasoning Panel (shared by all 6 sections)
// ────────────────────────────────────────────────────────────

interface AIReasoningPanelProps {
  reasoning: string | null;
  loading: boolean;
  badge: string | null;
  onReanalyze: () => void;
}

/** Parse Claude's markdown-style text into structured blocks for rich rendering */
function parseAIResponse(text: string): { type: 'heading' | 'bullet' | 'text'; content: string }[] {
  const blocks: { type: 'heading' | 'bullet' | 'text'; content: string }[] = [];
  const lines = text.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    // **Heading:** or **Heading**
    if (/^\*\*[^*]+\*\*:?\s*$/.test(trimmed)) {
      blocks.push({ type: 'heading', content: trimmed.replace(/\*\*/g, '').replace(/:$/, '') });
    }
    // - bullet point (may contain **bold** inline)
    else if (/^[-•]\s+/.test(trimmed)) {
      blocks.push({ type: 'bullet', content: trimmed.replace(/^[-•]\s+/, '') });
    }
    // Regular text (may start with **Label:** content)
    else {
      blocks.push({ type: 'text', content: trimmed });
    }
  }
  return blocks;
}

/** Render inline bold markers */
function renderInlineBold(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-semibold text-navy">{part.slice(2, -2)}</strong>;
    }
    return <span key={i}>{part}</span>;
  });
}

/** Color-coded heading based on content */
function getHeadingStyle(heading: string): string {
  const h = heading.toLowerCase();
  if (h.includes('recommendation')) return 'bg-navy/10 text-navy border-l-4 border-navy';
  if (h.includes('risk')) return 'bg-red-muted/8 text-red-muted border-l-4 border-red-muted';
  if (h.includes('monitor')) return 'bg-accent-blue/8 text-accent-blue border-l-4 border-accent-blue';
  if (h.includes('reasoning')) return 'bg-ochre/8 text-ochre border-l-4 border-ochre';
  return 'bg-slate-light/10 text-navy border-l-4 border-slate-light';
}

function AIReasoningPanel({
  reasoning,
  loading,
  badge,
  onReanalyze,
}: AIReasoningPanelProps) {
  const blocks = reasoning ? parseAIResponse(reasoning) : [];

  return (
    <div className="flex flex-col gap-3">
      {loading ? (
        <LoadingSkeleton />
      ) : reasoning && !reasoning.startsWith('AI analysis unavailable') ? (
        <div className="space-y-2">
          {blocks.map((block, i) => {
            if (block.type === 'heading') {
              return (
                <div key={i} className={`px-3 py-2 rounded-r text-xs font-bold uppercase tracking-wider mt-3 first:mt-0 ${getHeadingStyle(block.content)}`}>
                  {block.content}
                </div>
              );
            }
            if (block.type === 'bullet') {
              return (
                <div key={i} className="flex items-start gap-2 text-sm leading-relaxed pl-2">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-navy/40 flex-shrink-0" />
                  <span>{renderInlineBold(block.content)}</span>
                </div>
              );
            }
            return (
              <p key={i} className="text-sm leading-relaxed">{renderInlineBold(block.content)}</p>
            );
          })}
        </div>
      ) : reasoning ? (
        <div className="bg-red-muted/5 border border-red-muted/20 rounded p-3 text-xs text-red-muted">
          {reasoning}
        </div>
      ) : (
        <div className="bg-input-bg border border-border rounded p-4 text-center">
          <p className="text-sm text-slate">Awaiting AI analysis...</p>
          <p className="text-[10px] text-slate/60 mt-1">Click Re-analyze or set ANTHROPIC_API_KEY</p>
        </div>
      )}
      <div className="flex items-center gap-3 mt-2">
        {badge && !loading && <RecommendationBadge label={badge} />}
        <button
          onClick={onReanalyze}
          disabled={loading}
          className="text-xs font-medium text-navy hover:text-accent-blue border border-border rounded px-3 py-1.5 transition-colors disabled:opacity-40"
        >
          {loading ? 'Analyzing...' : 'Re-analyze'}
        </button>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Section wrapper
// ────────────────────────────────────────────────────────────

interface SectionProps {
  number: string;
  question: string;
  chart: React.ReactNode;
  reasoning: string | null;
  loading: boolean;
  badge: string | null;
  onReanalyze: () => void;
  isLast?: boolean;
}

function Section({
  number,
  question,
  chart,
  reasoning,
  loading,
  badge,
  onReanalyze,
}: SectionProps) {
  return (
    <div className="min-h-0 flex flex-col">
      <h2 className="text-xl font-semibold text-navy border-l-4 border-navy pl-4 mb-4 flex-shrink-0">
        {number} &mdash; {question}
      </h2>
      {/* Chart fills most of the space */}
      <div className="flex-shrink-0 mb-4 min-h-[320px]">{chart}</div>
      {/* AI reasoning below */}
      <div className="flex-1 overflow-y-auto">
        <AIReasoningPanel
          reasoning={reasoning}
          loading={loading}
          badge={badge}
          onReanalyze={onReanalyze}
        />
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Chart components for each question
// ────────────────────────────────────────────────────────────

const STRESS_COLORS: Record<string, string> = {
  stressD: '#c0392b',
  stressP: '#e67e22',
  stressS: '#d4a017',
  bufferA: '#27ae60',
  bufferI: '#2563eb',
};

const STRESS_LABELS: Record<string, string> = {
  stressD: 'Days of Cover',
  stressP: 'Price Stress',
  stressS: 'Pipeline Risk',
  bufferA: 'Alternate Sources',
  bufferI: 'Iran Corridor',
};

// ── Visual icon representations for conservation parameters ──

const PARAM_ICONS: Record<string, { icon: string; unit: string }> = {
  privateVehicles: { icon: '\u{1F697}', unit: 'Private vehicles' },    // won't use emoji — use SVG text below
  goodsTransport: { icon: 'T', unit: 'Goods transport' },
  industryAllocation: { icon: 'I', unit: 'Industry' },
  publicTransport: { icon: 'B', unit: 'Public transit' },
  powerGeneration: { icon: 'P', unit: 'Power generation' },
  lockdownDays: { icon: 'L', unit: 'Lockdown' },
  agriculture: { icon: 'A', unit: 'Agriculture' },
  aviation: { icon: 'F', unit: 'Aviation' },
};

// Visual bar for a conservation parameter — shows filled vs unfilled units
function ConservationParamVisual({ paramKey, alert, austerity, emergency }: {
  paramKey: string;
  alert: string;
  austerity: string;
  emergency: string;
}) {
  // Extract percentage from policy text (e.g., "90% operational" → 90, "Complete ban" → 0)
  function extractPct(text: string): number {
    if (text.toLowerCase().includes('complete ban') || text.toLowerCase().includes('none')) return 0;
    if (text.toLowerCase().includes('normal') || text.toLowerCase().includes('full')) return 100;
    const match = text.match(/(\d+)%/);
    if (match) return parseInt(match[1]);
    if (text.toLowerCase().includes('odd/even')) return 50;
    if (text.toLowerCase().includes('weekend driving ban')) return 30;
    if (text.toLowerCase().includes('1 day/week')) return 85;
    if (text.toLowerCase().includes('2 days/week')) return 71;
    if (text.toLowerCase().includes('expanded')) return 110;
    if (text.toLowerCase().includes('24/7')) return 120;
    if (text.toLowerCase().includes('cut 40%')) return 60;
    if (text.toLowerCase().includes('cut 80%')) return 20;
    return 50;
  }

  const info = PARAM_ICONS[paramKey] || { icon: '?', unit: paramKey };
  const alertPct = extractPct(alert);
  const austerityPct = extractPct(austerity);
  const emergencyPct = extractPct(emergency);

  // Show 10 units, fill proportionally
  const totalUnits = 10;

  function renderUnits(pct: number, color: string) {
    const filled = Math.round((pct / 100) * totalUnits);
    return (
      <div className="flex gap-0.5">
        {Array.from({ length: totalUnits }, (_, i) => (
          <div
            key={i}
            className="w-3 h-5 rounded-sm transition-all"
            style={{
              backgroundColor: i < filled ? color : '#e2e0dc',
              opacity: i < filled ? 0.9 : 0.3,
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 py-1.5 border-b border-border/30 last:border-0">
      <div className="w-24 flex-shrink-0">
        <span className="text-[10px] font-medium text-navy">{info.unit}</span>
      </div>
      <div className="flex-1 grid grid-cols-3 gap-2">
        <div>
          <div className="text-[8px] text-slate mb-0.5">Alert</div>
          {renderUnits(alertPct, '#d4a017')}
        </div>
        <div>
          <div className="text-[8px] text-slate mb-0.5">Austerity</div>
          {renderUnits(austerityPct, '#e67e22')}
        </div>
        <div>
          <div className="text-[8px] text-slate mb-0.5">Emergency</div>
          {renderUnits(emergencyPct, '#c0392b')}
        </div>
      </div>
    </div>
  );
}

function Q1Chart({ trigger, daysOfCover, priceRatio, currentBrent, preCrisisBrent, m7Alert, m7Austerity, m7Emergency }: {
  trigger: TriggerOutput;
  daysOfCover: number;
  priceRatio: number;
  currentBrent: number;
  preCrisisBrent: number;
  m7Alert: ConservationMatrix;
  m7Austerity: ConservationMatrix;
  m7Emergency: ConservationMatrix;
}) {
  const daysColor = daysOfCover > 18 ? '#27ae60' : daysOfCover > 12 ? '#d4a017' : '#c0392b';
  const priceColor = priceRatio < 1.5 ? '#27ae60' : priceRatio < 2.5 ? '#d4a017' : '#c0392b';

  const daysData = [{ name: 'Days of Cover', value: daysOfCover }];
  const priceData = [{ name: 'Price Ratio', value: priceRatio }];

  return (
    <Card title={`Composite Stress: ${fmt(trigger.compositeStress, 1)} / 100 — ${trigger.recommendedLevel}`}>
      <div className="grid grid-cols-2 gap-4">
        {/* Days of Cover */}
        <div>
          <p className="text-[10px] text-slate uppercase tracking-wide mb-1 text-center">Days of Fuel Cover</p>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={daysData} margin={{ top: 10, right: 10, bottom: 5, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e0dc" horizontal={true} vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} />
              <YAxis domain={[0, 40]} tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={(v: number) => `${v}d`} />
              <ReferenceLine y={18} stroke="#d4a017" strokeDasharray="6 3" strokeWidth={1.5} label={{ value: 'Alert (18d)', position: 'right', fontSize: 9, fill: '#d4a017' }} />
              <ReferenceLine y={12} stroke="#e67e22" strokeDasharray="6 3" strokeWidth={1.5} label={{ value: 'Austerity (12d)', position: 'right', fontSize: 9, fill: '#e67e22' }} />
              <ReferenceLine y={7} stroke="#c0392b" strokeDasharray="6 3" strokeWidth={1.5} label={{ value: 'Emergency (7d)', position: 'right', fontSize: 9, fill: '#c0392b' }} />
              <Tooltip formatter={(value: unknown) => [`${fmt(Number(value), 1)} days`, 'Days of Cover']} contentStyle={{ fontSize: 11, background: '#fff', border: '1px solid #e2e0dc' }} />
              <Bar dataKey="value" fill={daysColor} radius={[4, 4, 0, 0]} barSize={60}>
                <Cell fill={daysColor} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <p className="text-center font-mono text-lg font-semibold" style={{ color: daysColor }}>
            {fmt(daysOfCover, 1)} days
          </p>
        </div>

        {/* Price Stress */}
        <div>
          <p className="text-[10px] text-slate uppercase tracking-wide mb-1 text-center">Brent Price Ratio (vs Pre-Crisis)</p>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={priceData} margin={{ top: 10, right: 10, bottom: 5, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e0dc" horizontal={true} vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} />
              <YAxis domain={[0, 5]} tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={(v: number) => `${v}x`} />
              <ReferenceLine y={1.5} stroke="#d4a017" strokeDasharray="6 3" strokeWidth={1.5} label={{ value: 'Alert (1.5x)', position: 'right', fontSize: 9, fill: '#d4a017' }} />
              <ReferenceLine y={2.5} stroke="#e67e22" strokeDasharray="6 3" strokeWidth={1.5} label={{ value: 'Austerity (2.5x)', position: 'right', fontSize: 9, fill: '#e67e22' }} />
              <ReferenceLine y={4.0} stroke="#c0392b" strokeDasharray="6 3" strokeWidth={1.5} label={{ value: 'Emergency (4x)', position: 'right', fontSize: 9, fill: '#c0392b' }} />
              <Tooltip formatter={(value: unknown) => [`${fmt(Number(value), 2)}x ($${fmt(Number(value) * preCrisisBrent, 0)}/bbl)`, 'Price Ratio']} contentStyle={{ fontSize: 11, background: '#fff', border: '1px solid #e2e0dc' }} />
              <Bar dataKey="value" fill={priceColor} radius={[4, 4, 0, 0]} barSize={60}>
                <Cell fill={priceColor} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <p className="text-center font-mono text-lg font-semibold" style={{ color: priceColor }}>
            {fmt(priceRatio, 2)}x (${fmt(currentBrent, 0)}/bbl)
          </p>
        </div>
      </div>

      {/* Conservation Strategy Visual */}
      <div className="mt-4 pt-4 border-t border-border">
        <h4 className="text-xs font-semibold text-navy uppercase tracking-wide mb-3">
          Conservation Strategy by Parameter
        </h4>
        <p className="text-[10px] text-slate mb-3">
          Each row shows capacity remaining (filled blocks out of 10) at each conservation level. Fewer blocks = more restriction.
        </p>

        {/* Visual bars */}
        <div className="mb-4">
          {(['privateVehicles', 'goodsTransport', 'industryAllocation', 'publicTransport', 'powerGeneration', 'lockdownDays', 'agriculture', 'aviation'] as const).map((key) => (
            <ConservationParamVisual
              key={key}
              paramKey={key}
              alert={m7Alert[key]}
              austerity={m7Austerity[key]}
              emergency={m7Emergency[key]}
            />
          ))}
        </div>

        {/* Summary table */}
        <div className="overflow-x-auto">
          <table className="w-full text-[10px]">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-1 pr-2 font-medium text-slate">Parameter</th>
                <th className="text-left py-1 px-2 font-medium text-ochre">Alert</th>
                <th className="text-left py-1 px-2 font-medium text-[#e67e22]">Austerity</th>
                <th className="text-left py-1 px-2 font-medium text-red-muted">Emergency</th>
              </tr>
            </thead>
            <tbody>
              {([
                ['Private Vehicles', 'privateVehicles'],
                ['Goods Transport', 'goodsTransport'],
                ['Industry', 'industryAllocation'],
                ['Public Transport', 'publicTransport'],
                ['Power Generation', 'powerGeneration'],
                ['Lockdown Days', 'lockdownDays'],
                ['Agriculture', 'agriculture'],
                ['Aviation', 'aviation'],
              ] as const).map(([label, key]) => (
                <tr key={key} className="border-b border-border/30">
                  <td className="py-1 pr-2 font-medium text-navy">{label}</td>
                  <td className="py-1 px-2 text-slate">{m7Alert[key]}</td>
                  <td className="py-1 px-2 text-slate">{m7Austerity[key]}</td>
                  <td className="py-1 px-2 text-slate">{m7Emergency[key]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Card>
  );
}

const FUEL_BAR_THRESHOLDS: Record<string, number> = {
  HSD: 15,
  MS: 18,
  FO: 30,
  'JP-1': 10,
};

function Q2Chart({ daysOfCover }: { daysOfCover: { fuel: string; days: number; threshold: number }[] }) {
  return (
    <Card title="Days of Cover by Fuel Type">
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={daysOfCover} margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e0dc" />
          <XAxis dataKey="fuel" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip
            formatter={(value: unknown) => [fmt(Number(value), 1) + ' days', '']}
            contentStyle={{ fontSize: 11, background: '#fff', border: '1px solid #e2e0dc' }}
          />
          <Bar dataKey="days" name="Days of Cover" radius={[3, 3, 0, 0]}>
            {daysOfCover.map((entry, i) => (
              <Cell
                key={entry.fuel}
                fill={entry.days < entry.threshold ? '#c0392b' : '#27ae60'}
              />
            ))}
          </Bar>
          {/* Threshold reference lines */}
          {daysOfCover.map((entry) => (
            <ReferenceLine
              key={`th-${entry.fuel}`}
              y={entry.threshold}
              stroke="#d4a017"
              strokeDasharray="4 4"
              strokeWidth={1}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
      <div className="flex items-center gap-4 mt-2 text-[10px] text-slate">
        <span className="flex items-center gap-1">
          <span className="inline-block w-2 h-2 rounded-full bg-green-muted" /> Above threshold
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-2 h-2 rounded-full bg-red-muted" /> Below threshold
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 border-t border-dashed border-ochre" /> Rationing trigger
        </span>
      </div>
    </Card>
  );
}

const DEPLETION_COLORS: Record<string, string> = {
  none: '#64748b',
  alert: '#d4a017',
  austerity: '#e67e22',
  emergency: '#c0392b',
};

function Q3Chart({ scenario }: { scenario: ScenarioState }) {
  const levels: ConservationLevel[] = ['none', 'alert', 'austerity', 'emergency'];
  const m7Reductions = {
    alert: scenario.m7.alertReductions,
    austerity: scenario.m7.austerityReductions,
    emergency: scenario.m7.emergencyReductions,
  };

  const curves = useMemo(() => {
    const dataMap: Record<number, Record<string, number>> = {};
    for (const level of levels) {
      const reduction = getReductionForLevel(level, m7Reductions);
      const curve = computeDepletionCurve(scenario.m1, reduction, 90);
      for (const point of curve) {
        if (!dataMap[point.day]) dataMap[point.day] = { day: point.day };
        dataMap[point.day][level] = point.hsdDays;
      }
    }
    // Sample every 3 days for readability
    return Object.values(dataMap).filter((p) => p.day % 3 === 0 || p.day === 0);
  }, [scenario.m1, scenario.m7]);

  return (
    <Card title="HSD Depletion Curves (90-day)">
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={curves} margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e0dc" />
          <XAxis dataKey="day" tick={{ fontSize: 11 }} label={{ value: 'Day', position: 'insideBottomRight', offset: -5, fontSize: 10 }} />
          <YAxis tick={{ fontSize: 11 }} label={{ value: 'HSD Days Left', angle: -90, position: 'insideLeft', offset: 10, fontSize: 10 }} />
          <Tooltip
            formatter={(value: unknown, name: unknown) => [fmt(Number(value), 1) + ' days', String(name).charAt(0).toUpperCase() + String(name).slice(1)]}
            contentStyle={{ fontSize: 11, background: '#fff', border: '1px solid #e2e0dc' }}
          />
          <ReferenceLine y={7} stroke="#c0392b" strokeDasharray="6 3" label={{ value: '7-day critical', position: 'right', fontSize: 10, fill: '#c0392b' }} />
          {levels.map((level) => (
            <Line
              key={level}
              type="monotone"
              dataKey={level}
              stroke={DEPLETION_COLORS[level]}
              strokeWidth={level === 'none' ? 2 : 1.5}
              dot={false}
              name={level === 'none' ? 'No Conservation' : level.charAt(0).toUpperCase() + level.slice(1)}
            />
          ))}
          <Legend wrapperStyle={{ fontSize: 10 }} />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
}

const RESERVE_COLORS: Record<string, string> = {
  none: '#64748b',
  alert: '#d4a017',
  austerity: '#e67e22',
  emergency: '#c0392b',
};

function Q4Chart({ timeline, reservesFloor }: { timeline: ReserveTimelineResult; reservesFloor: number }) {
  return (
    <Card title="SBP Reserves Projection (12 months)">
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={timeline.points} margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e0dc" />
          <XAxis dataKey="month" tick={{ fontSize: 11 }} label={{ value: 'Month', position: 'insideBottomRight', offset: -5, fontSize: 10 }} />
          <YAxis tick={{ fontSize: 11 }} label={{ value: '$B', angle: -90, position: 'insideLeft', offset: 10, fontSize: 10 }} />
          <Tooltip
            formatter={(value: unknown, name: unknown) => ['$' + fmt(Number(value), 2) + 'B', String(name).charAt(0).toUpperCase() + String(name).slice(1)]}
            contentStyle={{ fontSize: 11, background: '#fff', border: '1px solid #e2e0dc' }}
          />
          <ReferenceLine y={reservesFloor} stroke="#c0392b" strokeDasharray="6 3" label={{ value: `$${reservesFloor}B floor`, position: 'right', fontSize: 10, fill: '#c0392b' }} />
          {(['none', 'alert', 'austerity', 'emergency'] as const).map((level) => (
            <Line
              key={level}
              type="monotone"
              dataKey={level}
              stroke={RESERVE_COLORS[level]}
              strokeWidth={level === 'none' ? 2 : 1.5}
              dot={false}
              name={level === 'none' ? 'No Conservation' : level.charAt(0).toUpperCase() + level.slice(1)}
            />
          ))}
          <Legend wrapperStyle={{ fontSize: 10 }} />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
}

function Q5Chart({ scenario }: { scenario: ScenarioState }) {
  const levels: ConservationLevel[] = ['none', 'alert', 'austerity', 'emergency'];
  const levelLabels: Record<ConservationLevel, string> = {
    none: 'Normal',
    alert: 'Alert',
    austerity: 'Austerity',
    emergency: 'Emergency',
  };

  // Filter sectors that have nonzero HSD allocation in at least one level
  const relevantSectors = SECTORS.filter((sector) =>
    levels.some((level) => getAllocationForLevel(level).HSD[sector] > 0),
  );

  const data = relevantSectors.map((sector) => {
    const row: Record<string, string | number> = { sector };
    for (const level of levels) {
      row[level] = getAllocationForLevel(level).HSD[sector];
    }
    return row;
  });

  function cellColor(val: number): string {
    if (val === 0) return '';
    if (val >= 30) return 'bg-red-muted/20 font-semibold';
    if (val >= 20) return 'bg-ochre/20';
    if (val >= 10) return 'bg-ochre/10';
    return 'bg-green-muted/10';
  }

  return (
    <Card title="HSD Sector Allocation (%)">
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-1.5 pr-3 font-semibold text-navy">Sector</th>
              {levels.map((level) => (
                <th key={level} className="text-right py-1.5 px-2 font-semibold text-navy">
                  {levelLabels[level]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr key={row.sector as string} className="border-b border-border/50">
                <td className="py-1.5 pr-3 text-foreground">{row.sector}</td>
                {levels.map((level) => {
                  const val = row[level] as number;
                  return (
                    <td key={level} className={`text-right py-1.5 px-2 font-mono ${cellColor(val)}`}>
                      {val}%
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function Q6Chart({ impacts }: { impacts: LevelImpact[] }) {
  return (
    <Card title="Economic Trade-off Matrix">
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-1.5 pr-3 font-semibold text-navy">Level</th>
              <th className="text-right py-1.5 px-2 font-semibold text-navy">Days of Cover</th>
              <th className="text-right py-1.5 px-2 font-semibold text-navy">Months to Floor</th>
              <th className="text-right py-1.5 px-2 font-semibold text-navy">Lockdown d/wk</th>
              <th className="text-right py-1.5 px-2 font-semibold text-navy">GDP Impact</th>
              <th className="text-right py-1.5 px-2 font-semibold text-navy">Cost $M/day</th>
            </tr>
          </thead>
          <tbody>
            {impacts.map((impact) => (
              <tr key={impact.level} className="border-b border-border/50">
                <td className="py-1.5 pr-3 font-semibold text-foreground">{impact.label}</td>
                <td className="text-right py-1.5 px-2 font-mono">{fmt(impact.daysOfCover, 1)}</td>
                <td className="text-right py-1.5 px-2 font-mono">{fmt(impact.monthsToFloor, 1)}</td>
                <td className="text-right py-1.5 px-2 font-mono">{impact.lockdownDays}</td>
                <td className="text-right py-1.5 px-2 font-mono text-red-muted">{fmt(impact.gdpImpactPct, 2)}%</td>
                <td className="text-right py-1.5 px-2 font-mono">${fmt(impact.dailyEconomicCost, 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

// ────────────────────────────────────────────────────────────
// Questions
// ────────────────────────────────────────────────────────────

const QUESTIONS = [
  {
    number: '01',
    question: 'At what stage should Pakistan shift to emergency conservation?',
  },
  {
    number: '02',
    question: 'When should the government begin rationing fuel for each of these fuel types?',
  },
  {
    number: '03',
    question: 'When should a transport lockdown be imposed?',
  },
  {
    number: '04',
    question: 'How long can Pakistan sustain each conservation level?',
  },
  {
    number: '05',
    question: 'How should diesel be allocated across sectors under each level?',
  },
  {
    number: '06',
    question: 'What are the economic trade-offs of each conservation level?',
  },
];

// ────────────────────────────────────────────────────────────
// Context builders (one per question, sending only relevant slices)
// ────────────────────────────────────────────────────────────

function buildQ1Context(scenario: ScenarioState, trigger: TriggerOutput) {
  return {
    weights: scenario.m8.weights,
    components: trigger.components,
    compositeStress: trigger.compositeStress,
    recommendedLevel: trigger.recommendedLevel,
    hardOverrideActive: trigger.hardOverrideActive,
    thresholds: {
      alert: scenario.formulaParams.m8_thresholdAlert,
      austerity: scenario.formulaParams.m8_thresholdAusterity,
      emergency: scenario.formulaParams.m8_thresholdEmergency,
    },
  };
}

function buildQ2Context(scenario: ScenarioState) {
  const { m1 } = scenario;
  const hsdDays = getDaysOfCover(m1.hsdStock, m1.hsdDailyConsumption);
  const msDays = getDaysOfCover(m1.msStock, m1.msDailyConsumption);
  const foDays = getDaysOfCover(m1.foStock, m1.foDailyConsumption);
  const jp1Days = m1.jp1Stock / (m1.jp1Stock / 15.16); // approximate from defaults
  return {
    stocks: {
      hsd: m1.hsdStock,
      ms: m1.msStock,
      fo: m1.foStock,
      jp1: m1.jp1Stock,
    },
    dailyConsumption: {
      hsd: m1.hsdDailyConsumption,
      ms: m1.msDailyConsumption,
      fo: m1.foDailyConsumption,
    },
    daysOfCover: { hsd: hsdDays, ms: msDays, fo: foDays, jp1: jp1Days },
    rationingThresholds: { hsd: 15, ms: 18, fo: 30, jp1: 10 },
  };
}

function buildQ3Context(scenario: ScenarioState) {
  const { m1, m7 } = scenario;
  const levels: ConservationLevel[] = ['none', 'alert', 'austerity', 'emergency'];
  const m7Reductions = {
    alert: m7.alertReductions,
    austerity: m7.austerityReductions,
    emergency: m7.emergencyReductions,
  };
  const hsdDepletionDays: Record<string, number> = {};
  for (const level of levels) {
    const reduction = getReductionForLevel(level, m7Reductions);
    const adjustedRate = m1.hsdDailyConsumption * (1 - reduction.hsd);
    hsdDepletionDays[level] = adjustedRate > 0 ? m1.hsdStock / adjustedRate : Infinity;
  }
  return {
    hsdStock: m1.hsdStock,
    hsdDailyConsumption: m1.hsdDailyConsumption,
    reductions: {
      none: 0,
      alert: m7.alertReductions.hsd,
      austerity: m7.austerityReductions.hsd,
      emergency: m7.emergencyReductions.hsd,
    },
    hsdDaysOfCoverByLevel: hsdDepletionDays,
    criticalThreshold: 7,
  };
}

function buildQ4Context(scenario: ScenarioState, timeline: ReserveTimelineResult) {
  return {
    sbpReserves: scenario.m6.sbpReserves,
    reservesFloor: scenario.m6.reservesFloor,
    brentSpot: scenario.m6.currentBrentSpot,
    imfAvailable: scenario.m6.imfAvailable,
    saudiFacility: scenario.m6.saudiDeferredFacility,
    chinaSwap: scenario.m6.chinaSwapLine,
    monthsToFloor: timeline.monthsToFloor,
    reserveProjection: {
      month0: timeline.points[0],
      month6: timeline.points[6],
      month12: timeline.points[12],
    },
  };
}

function buildQ5Context(scenario: ScenarioState) {
  const levels: ConservationLevel[] = ['none', 'alert', 'austerity', 'emergency'];
  const allocations: Record<string, Record<string, number>> = {};
  for (const level of levels) {
    allocations[level] = getAllocationForLevel(level).HSD;
  }
  return {
    hsdDailyConsumption: scenario.m1.hsdDailyConsumption,
    allocations,
    reductions: {
      alert: scenario.m7.alertReductions.hsd,
      austerity: scenario.m7.austerityReductions.hsd,
      emergency: scenario.m7.emergencyReductions.hsd,
    },
  };
}

function buildQ6Context(impacts: LevelImpact[]) {
  return {
    impacts: impacts.map((i) => ({
      level: i.label,
      daysOfCover: i.daysOfCover,
      monthsToFloor: i.monthsToFloor,
      lockdownDays: i.lockdownDays,
      demandReductionPct: i.demandReductionPct,
      gdpImpactPct: i.gdpImpactPct,
      dailyEconomicCostM: i.dailyEconomicCost,
      monthlyEconomicCostB: i.monthlyEconomicCost,
      reasoning: i.reasoning,
    })),
  };
}

// ────────────────────────────────────────────────────────────
// Badge derivation per question
// ────────────────────────────────────────────────────────────

function getBadgeQ1(trigger: TriggerOutput): string {
  return trigger.recommendedLevel;
}

function getBadgeQ2(scenario: ScenarioState): string {
  const { m1 } = scenario;
  const hsdDays = getDaysOfCover(m1.hsdStock, m1.hsdDailyConsumption);
  const msDays = getDaysOfCover(m1.msStock, m1.msDailyConsumption);
  if (hsdDays < 15 || msDays < 18) return 'Emergency';
  if (hsdDays < 20 || msDays < 25) return 'Alert';
  return 'Normal';
}

function getBadgeQ3(scenario: ScenarioState): string {
  const hsdDays = getDaysOfCover(scenario.m1.hsdStock, scenario.m1.hsdDailyConsumption);
  if (hsdDays < 12) return 'Emergency';
  if (hsdDays < 20) return 'Alert';
  return 'Normal';
}

function getBadgeQ4(timeline: ReserveTimelineResult): string {
  const noConserve = timeline.monthsToFloor.none;
  if (noConserve <= 3) return 'Emergency';
  if (noConserve <= 6) return 'Alert';
  return 'Normal';
}

function getBadgeQ5(trigger: TriggerOutput): string {
  const level = trigger.recommendedLevel;
  if (level === 'EMERGENCY') return 'Emergency';
  if (level === 'AUSTERITY') return 'Austerity';
  if (level === 'ALERT') return 'Alert';
  return 'Normal';
}

function getBadgeQ6(impacts: LevelImpact[]): string {
  const emergency = impacts.find((i) => i.level === 'emergency');
  if (emergency && Math.abs(emergency.gdpImpactPct) > 10) return 'Critical';
  return 'Alert';
}

// ────────────────────────────────────────────────────────────
// Main component
// ────────────────────────────────────────────────────────────

export function CrisisDecisionHome() {
  const scenario = useAppStore((s) => s.scenario);
  const { m1, m6, m7, formulaParams: fp } = scenario;

  // ── Computed data ──

  const trigger = useMemo(() => computeTrigger(scenario), [scenario]);

  const daysOfCoverData = useMemo(() => {
    const hsd = getDaysOfCover(m1.hsdStock, m1.hsdDailyConsumption);
    const ms = getDaysOfCover(m1.msStock, m1.msDailyConsumption);
    const fo = getDaysOfCover(m1.foStock, m1.foDailyConsumption);
    // JP-1: use approximate daily consumption from stock / known days
    const jp1Daily = m1.jp1Stock > 0 ? m1.jp1Stock / 15.16 : 1;
    const jp1 = m1.jp1Stock / jp1Daily;
    return [
      { fuel: 'HSD', days: hsd, threshold: 15 },
      { fuel: 'MS', days: ms, threshold: 18 },
      { fuel: 'FO', days: fo, threshold: 30 },
      { fuel: 'JP-1', days: jp1, threshold: 10 },
    ];
  }, [m1]);

  const reserveTimeline = useMemo(() => {
    return computeReserveTimeline({
      sbpReserves: m6.sbpReserves,
      reservesFloor: m6.reservesFloor,
      brentSpot: m6.currentBrentSpot,
      productPremium: fp.m6_productPremium,
      freightPremium: fp.m6_freightPremium,
      normalDemandBpd: fp.m6_normalDemandBpd,
      imfAvailable: m6.imfAvailable,
      saudiFacilityMonthly: m6.saudiDeferredFacility / 12,
      barterMonthly: m6.barterCapacity / 12 / 1000,
    }, {
      alert: m7.alertReductions,
      austerity: m7.austerityReductions,
      emergency: m7.emergencyReductions,
    });
  }, [m6, m7, fp]);

  const economicImpacts = useMemo(() => {
    const levels: ConservationLevel[] = ['none', 'alert', 'austerity', 'emergency'];
    const reductions: Record<ConservationLevel, { hsd: number; ms: number; fo: number; jp1: number }> = {
      none: { hsd: 0, ms: 0, fo: 0, jp1: 0 },
      alert: m7.alertReductions,
      austerity: m7.austerityReductions,
      emergency: m7.emergencyReductions,
    };

    const m7Reductions = {
      alert: m7.alertReductions,
      austerity: m7.austerityReductions,
      emergency: m7.emergencyReductions,
    };

    const daysOfCover: Record<ConservationLevel, number> = {} as Record<ConservationLevel, number>;
    for (const level of levels) {
      const reduction = getReductionForLevel(level, m7Reductions);
      const adjustedRate = m1.hsdDailyConsumption * (1 - reduction.hsd);
      daysOfCover[level] = adjustedRate > 0 ? m1.hsdStock / adjustedRate : Infinity;
    }

    return computeEconomicImpact(
      reductions,
      daysOfCover,
      reserveTimeline.monthsToFloor,
      { annualGDP: 375, lockdownDaysPerLevel: { none: 0, alert: 0, austerity: 1, emergency: 2 } },
    );
  }, [m1, m7, reserveTimeline]);

  // ── AI analysis state ──

  const [analyses, setAnalyses] = useState<(string | null)[]>([null, null, null, null, null, null]);
  const [loading, setLoading] = useState<boolean[]>([false, false, false, false, false, false]);

  const fetchOne = useCallback(
    async (index: number) => {
      setLoading((prev) => {
        const next = [...prev];
        next[index] = true;
        return next;
      });

      const contexts = [
        buildQ1Context(scenario, trigger),
        buildQ2Context(scenario),
        buildQ3Context(scenario),
        buildQ4Context(scenario, reserveTimeline),
        buildQ5Context(scenario),
        buildQ6Context(economicImpacts),
      ];

      const result = await fetchAnalysis(QUESTIONS[index].question, contexts[index]);

      setAnalyses((prev) => {
        const next = [...prev];
        next[index] = result;
        return next;
      });
      setLoading((prev) => {
        const next = [...prev];
        next[index] = false;
        return next;
      });
    },
    [scenario, trigger, reserveTimeline, economicImpacts],
  );

  const fetchAll = useCallback(() => {
    for (let i = 0; i < 6; i++) {
      fetchOne(i);
    }
  }, [fetchOne]);

  // Fetch all on mount
  useEffect(() => {
    fetchAll();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Badges ──

  const badges = useMemo(
    () => [
      getBadgeQ1(trigger),
      getBadgeQ2(scenario),
      getBadgeQ3(scenario),
      getBadgeQ4(reserveTimeline),
      getBadgeQ5(trigger),
      getBadgeQ6(economicImpacts),
    ],
    [trigger, scenario, reserveTimeline, economicImpacts],
  );

  // ── Charts ──

  const iranOutput = useMemo(() =>
    computeIranCorridor(scenario.m5, scenario.baselineMode, scenario.formulaParams),
  [scenario]);

  const weightedDays = useMemo(() => {
    const hsd = getDaysOfCover(m1.hsdStock, m1.hsdDailyConsumption);
    const ms = getDaysOfCover(m1.msStock, m1.msDailyConsumption);
    const fo = getDaysOfCover(m1.foStock, m1.foDailyConsumption);
    return 0.5 * hsd + 0.35 * ms + 0.15 * fo;
  }, [m1]);

  const charts = [
    <Q1Chart key="q1" trigger={trigger}
      daysOfCover={weightedDays}
      priceRatio={m6.currentBrentSpot / m6.preCrisisBrent}
      currentBrent={m6.currentBrentSpot}
      preCrisisBrent={m6.preCrisisBrent}
      m7Alert={m7.alertMatrix}
      m7Austerity={m7.austerityMatrix}
      m7Emergency={m7.emergencyMatrix}
    />,
    /* Q2: Fuel gauges + M1 data context */
    <Card key="q2" title="Days of Cover by Fuel Type (from M1 Inventory)">
      <p className="text-[10px] text-slate mb-3">
        Stock: HSD {Math.round(m1.hsdStock).toLocaleString()} MT | MS {Math.round(m1.msStock).toLocaleString()} MT | FO {Math.round(m1.foStock).toLocaleString()} MT | JP-1 {Math.round(m1.jp1Stock).toLocaleString()} MT.
        Daily: HSD {Math.round(m1.hsdDailyConsumption).toLocaleString()} | MS {Math.round(m1.msDailyConsumption).toLocaleString()} | FO {Math.round(m1.foDailyConsumption).toLocaleString()} MT/d
      </p>
      <div className="flex items-end justify-center gap-8 py-2">
        {daysOfCoverData.map((d) => (
          <FuelGauge key={d.fuel} label={d.fuel} fullLabel={d.fuel === 'HSD' ? 'High Speed Diesel' : d.fuel === 'MS' ? 'Motor Spirit' : d.fuel === 'FO' ? 'Furnace Oil' : 'Jet Fuel'} days={d.days} threshold={d.threshold} maxDays={100} />
        ))}
      </div>
      <div className="mt-3 pt-2 border-t border-border text-[10px] text-slate">
        Rationing triggers when days of cover falls below the fuel-specific threshold. HSD ({'\u2264'}15d) and MS ({'\u2264'}18d) are the most critical.
      </div>
    </Card>,
    <Q3Chart key="q3" scenario={scenario} />,
    <Q4Chart key="q4" timeline={reserveTimeline} reservesFloor={m6.reservesFloor} />,
    /* Q5: Diesel allocation flow — how HSD is distributed to sectors */
    (() => {
      const currentLevelForAlloc = trigger.recommendedLevel === 'NORMAL' ? 'none' : trigger.recommendedLevel.toLowerCase() as ConservationLevel;
      const alloc = getAllocationForLevel(currentLevelForAlloc);
      const hsdReduction = currentLevelForAlloc === 'alert' ? m7.alertReductions.hsd
        : currentLevelForAlloc === 'austerity' ? m7.austerityReductions.hsd
        : currentLevelForAlloc === 'emergency' ? m7.emergencyReductions.hsd : 0;
      const totalHsdBblDay = m1.hsdDailyConsumption * 7.46 * (1 - hsdReduction);
      const sectors = SECTORS.filter(s => alloc.HSD[s] > 0).map(s => ({
        name: s,
        pct: alloc.HSD[s],
        bblDay: totalHsdBblDay * alloc.HSD[s] / 100,
      }));
      return <DieselAllocationFlow key="q5" totalHsdBblDay={totalHsdBblDay} sectors={sectors} level={trigger.recommendedLevel} />;
    })(),
    /* Q6: Radar chart */
    <RadarTradeoff key="q6" impacts={economicImpacts} currentLevel={trigger.recommendedLevel === 'NORMAL' ? 'none' : trigger.recommendedLevel.toLowerCase()} />,
  ];

  // ── Render ──

  const baselineLabel =
    scenario.baselineMode === 'full_corridor_compromised'
      ? 'Full Corridor Compromised'
      : 'Iran Permitted Transit';

  // ── Carousel state ──
  const [activeQ, setActiveQ] = useState(0);

  const goNext = () => setActiveQ((prev) => Math.min(prev + 1, QUESTIONS.length - 1));
  const goPrev = () => setActiveQ((prev) => Math.max(prev - 1, 0));

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header bar */}
      <div className="flex-shrink-0 px-6 pt-4 pb-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-navy tracking-tight">
              Crisis Decision Briefing
            </h1>
            <div className="flex items-center gap-3 mt-1 text-xs text-slate">
              <span>{scenario.scenarioName}</span>
              <span className="text-border">|</span>
              <span>{baselineLabel}</span>
            </div>
          </div>
          <button
            onClick={fetchAll}
            disabled={loading.some(Boolean)}
            className="text-xs font-medium text-card bg-navy hover:bg-navy-light rounded px-3 py-1.5 transition-colors disabled:opacity-50"
          >
            {loading.some(Boolean) ? 'Analyzing...' : 'Refresh All'}
          </button>
        </div>

        {/* Question navigation dots + prev/next */}
        <div className="flex items-center justify-between mt-3">
          <button
            onClick={goPrev}
            disabled={activeQ === 0}
            className="text-xs font-medium text-navy border border-border rounded px-3 py-1.5 hover:bg-card-hover transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Previous
          </button>

          <div className="flex items-center gap-1.5">
            {QUESTIONS.map((q, i) => (
              <button
                key={q.number}
                onClick={() => setActiveQ(i)}
                className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium transition-all ${
                  activeQ === i
                    ? 'bg-navy text-white'
                    : 'bg-input-bg text-slate hover:bg-card-hover'
                }`}
              >
                {q.number}
              </button>
            ))}
          </div>

          <button
            onClick={goNext}
            disabled={activeQ === QUESTIONS.length - 1}
            className="text-xs font-medium text-navy border border-border rounded px-3 py-1.5 hover:bg-card-hover transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      </div>

      {/* Carousel viewport */}
      <div className="flex-1 overflow-hidden relative">
        <div
          className="flex h-full transition-transform duration-500 ease-in-out"
          style={{ transform: `translateX(-${activeQ * 100}%)` }}
        >
          {QUESTIONS.map((q, i) => (
            <div key={q.number} className="w-full flex-shrink-0 px-6 pb-4 overflow-y-auto">
              <Section
                number={q.number}
                question={q.question}
                chart={charts[i]}
                reasoning={analyses[i]}
                loading={loading[i]}
                badge={badges[i]}
                onReanalyze={() => fetchOne(i)}
                isLast={i === QUESTIONS.length - 1}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
