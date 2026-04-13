'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';

// ────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────

interface FundingWaterfallProps {
  reserves: number;      // usable reserves $B
  imf: number;           // $B
  saudi: number;         // $B
  china: number;         // $B
  barter: number;        // $B
  total: number;         // $B
  monthlyBudget: number; // $B/month
  perBarrelCost: number; // $/bbl
  affordableBarrels: number; // bbl/month
}

// ────────────────────────────────────────────────────────────
// Constants
// ────────────────────────────────────────────────────────────

const SOURCES: { key: keyof Pick<FundingWaterfallProps, 'reserves' | 'imf' | 'saudi' | 'china' | 'barter'>; label: string; color: string }[] = [
  { key: 'reserves', label: 'Reserves', color: '#1a1a2e' },
  { key: 'imf',      label: 'IMF',      color: '#2563eb' },
  { key: 'saudi',    label: 'Saudi',    color: '#27ae60' },
  { key: 'china',    label: 'China',    color: '#c0392b' },
  { key: 'barter',   label: 'Barter',   color: '#d4a017' },
];

function fmt(n: number, decimals = 1): string {
  if (!isFinite(n)) return '--';
  return n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function fmtInt(n: number): string {
  if (!isFinite(n)) return '--';
  return Math.round(n).toLocaleString('en-US');
}

// ────────────────────────────────────────────────────────────
// Custom Tooltip
// ────────────────────────────────────────────────────────────

interface TooltipPayloadEntry {
  name: string;
  value: number;
  color: string;
  dataKey: string;
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  label?: string;
}) {
  if (!active || !payload) return null;
  return (
    <div className="bg-white border border-border rounded px-3 py-2 shadow-sm">
      {payload
        .filter((p) => p.value > 0)
        .map((p) => (
          <div key={p.dataKey} className="flex items-center gap-2 text-xs">
            <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: p.color }} />
            <span className="text-slate">{p.name}:</span>
            <span className="font-mono font-semibold text-navy">${fmt(p.value, 2)}B</span>
          </div>
        ))}
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Custom Legend
// ────────────────────────────────────────────────────────────

interface LegendPayloadEntry {
  value: string;
  color: string;
}

function CustomLegend({ payload }: { payload?: LegendPayloadEntry[] }) {
  if (!payload) return null;
  return (
    <div className="flex flex-wrap gap-3 justify-center mt-2">
      {payload.map((entry) => (
        <div key={entry.value} className="flex items-center gap-1.5 text-[10px] text-slate">
          <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: entry.color }} />
          {entry.value}
        </div>
      ))}
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Main Component
// ────────────────────────────────────────────────────────────

export function FundingWaterfall(props: FundingWaterfallProps) {
  const { reserves, imf, saudi, china, barter, total, monthlyBudget, perBarrelCost, affordableBarrels } = props;

  // Recharts needs array data; we build a single-row stacked bar
  const data = [
    {
      name: 'Funding',
      reserves,
      imf,
      saudi,
      china,
      barter,
    },
  ];

  const affordableMBbl = affordableBarrels / 1_000_000;

  return (
    <div>
      {/* Chart */}
      <div className="h-[72px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 4, right: 16, left: 16, bottom: 4 }}
          >
            <XAxis
              type="number"
              tick={{ fontSize: 9, fill: '#64748b', fontFamily: 'var(--font-mono)' }}
              tickFormatter={(v: number) => `$${v}B`}
              domain={[0, 'dataMax']}
            />
            <YAxis type="category" dataKey="name" hide />
            <Tooltip content={<CustomTooltip />} />
            <Legend content={<CustomLegend />} />

            {SOURCES.map((src) => (
              <Bar
                key={src.key}
                dataKey={src.key}
                name={src.label}
                stackId="funding"
                fill={src.color}
                radius={0}
                barSize={28}
              >
                <Cell fill={src.color} />
              </Bar>
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Segment labels (inline below bar) */}
      <div className="flex gap-0 mt-1 px-4">
        {SOURCES.map((src) => {
          const val = props[src.key];
          if (val <= 0) return null;
          const pct = (val / total) * 100;
          return (
            <div
              key={src.key}
              className="text-center overflow-hidden"
              style={{ width: `${pct}%`, minWidth: '28px' }}
            >
              <span className="font-mono text-[9px] font-semibold" style={{ color: src.color }}>
                ${fmt(val, 2)}B
              </span>
            </div>
          );
        })}
      </div>

      {/* Summary line */}
      <div className="mt-3 pt-2 border-t border-border flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate">
        <span>
          Total: <span className="font-mono font-semibold text-navy">${fmt(total, 2)}B</span>
        </span>
        <span className="text-border">|</span>
        <span>
          <span className="font-mono font-semibold text-navy">${fmt(monthlyBudget, 2)}B</span>/month
        </span>
        <span className="text-border">|</span>
        <span>
          @ <span className="font-mono font-semibold text-navy">${fmt(perBarrelCost, 0)}</span>/bbl
        </span>
        <span className="text-border">|</span>
        <span>
          <span className="font-mono font-semibold text-navy">{fmt(affordableMBbl)}M</span> bbl/month
        </span>
      </div>
    </div>
  );
}
