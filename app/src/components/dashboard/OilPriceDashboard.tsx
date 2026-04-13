'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/ModulePanel';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PricePoint {
  date: string;
  price: number;
}

interface Commodity {
  code: string;
  name: string;
  price: number;
  formatted: string;
  change24h: { amount: number; percent: number } | null;
  updatedAt: string;
}

type Period = 'past_day' | 'past_week' | 'past_month';

// Codes that form Pakistan's core refinery crude diet
const PAKISTAN_DIET_CODES = new Set([
  'DUBAI_CRUDE_USD',
  'URALS_CRUDE_USD',
  'AZERI_LIGHT_USD',
]);

const COMMODITY_LABELS: Record<string, string> = {
  BRENT_CRUDE_USD: 'Brent Crude',
  WTI_USD: 'WTI',
  DUBAI_CRUDE_USD: 'Dubai Crude',
  URALS_CRUDE_USD: 'Urals Crude',
  AZERI_LIGHT_USD: 'Azeri Light',
  NATURAL_GAS_USD: 'Natural Gas',
  JKM_LNG_USD: 'JKM LNG',
  JET_FUEL_USD: 'Jet Fuel',
  NAPHTHA_USD: 'Naphtha',
  OPEC_BASKET_USD: 'OPEC Basket',
};

const COMMODITY_UNITS: Record<string, string> = {
  NATURAL_GAS_USD: '$/MMBtu',
  JKM_LNG_USD: '$/MMBtu',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmt(n: number, decimals = 2): string {
  if (!isFinite(n)) return '--';
  return n.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function fmtChange(change: { amount: number; percent: number } | null): {
  text: string;
  color: string;
  arrow: string;
} {
  if (!change) return { text: '--', color: 'text-slate', arrow: '' };
  const positive = change.percent >= 0;
  return {
    text: `${positive ? '+' : ''}${fmt(change.percent)}%`,
    color: positive ? 'text-green-muted' : 'text-red-muted',
    arrow: positive ? '\u25B2' : '\u25BC',
  };
}

function formatDateShort(dateStr: string): string {
  // Intraday format: "HH:MM" — return as-is
  if (/^\d{2}:\d{2}$/.test(dateStr)) return dateStr;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ---------------------------------------------------------------------------
// Skeleton Components
// ---------------------------------------------------------------------------

function SkeletonBlock({ className = '', style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div className={`animate-pulse bg-border/50 rounded ${className}`} style={style} />
  );
}

function ChartSkeleton() {
  return (
    <div className="h-80 flex flex-col gap-3 p-4">
      <SkeletonBlock className="h-8 w-48" />
      <SkeletonBlock className="h-4 w-32" />
      <div className="flex-1 flex items-end gap-1">
        {Array.from({ length: 30 }).map((_, i) => (
          <SkeletonBlock
            key={i}
            className="flex-1"
            style={{ height: `${30 + Math.sin(i * 0.3) * 25 + Math.random() * 20}%` } as React.CSSProperties}
          />
        ))}
      </div>
    </div>
  );
}

function CommodityCardSkeleton() {
  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <SkeletonBlock className="h-4 w-24 mb-3" />
      <SkeletonBlock className="h-7 w-20 mb-2" />
      <SkeletonBlock className="h-3 w-16" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Custom Tooltip
// ---------------------------------------------------------------------------

function ChartTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded px-3 py-2 shadow-sm">
      <p className="text-xs text-slate mb-1">
        {label && /^\d{2}:\d{2}$/.test(label)
          ? `Today ${label} UTC`
          : label ? new Date(label).toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            }) : ''}
      </p>
      <p className="font-mono text-sm font-semibold text-navy">
        ${fmt(payload[0].value)}/bbl
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function OilPriceDashboard() {
  const [history, setHistory] = useState<PricePoint[]>([]);
  const [isIntraday, setIsIntraday] = useState(false);
  const [commodities, setCommodities] = useState<Commodity[]>([]);
  const [period, setPeriod] = useState<Period>('past_month');
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [loadingCommodities, setLoadingCommodities] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = useCallback(() => {
    setLoadingHistory(true);
    fetch('/api/oil-price?type=history&code=BRENT_CRUDE_USD')
      .then((r) => r.json())
      .then((d) => {
        if (d.error) {
          setError(d.error);
        } else {
          setHistory(d.history || []);
          setIsIntraday(d.intraday ?? false);
          setError(null);
        }
      })
      .catch(() => setError('Failed to fetch price history'))
      .finally(() => setLoadingHistory(false));
  }, []);

  const fetchCommodities = useCallback(() => {
    setLoadingCommodities(true);
    fetch('/api/oil-price?type=dashboard')
      .then((r) => r.json())
      .then((d) => {
        if (d.error) {
          setError(d.error);
        } else {
          setCommodities(d.commodities || []);
        }
      })
      .catch(() => setError('Failed to fetch commodity prices'))
      .finally(() => setLoadingCommodities(false));
  }, []);

  useEffect(() => {
    fetchHistory();
    fetchCommodities();
  }, [fetchHistory, fetchCommodities]);

  // Derive current price and 24h change from history/commodities
  const brent = commodities.find((c) => c.code === 'BRENT_CRUDE_USD');
  const currentPrice = brent?.price ?? (history.length > 0 ? history[history.length - 1].price : null);
  const change24h = brent?.change24h ?? null;
  const changeDisplay = fmtChange(change24h);

  // Price domain for chart
  const prices = history.map((h) => h.price);
  const minPrice = prices.length ? Math.floor(Math.min(...prices) - 1) : 60;
  const maxPrice = prices.length ? Math.ceil(Math.max(...prices) + 1) : 90;

  // Compute spreads from commodities
  const getPrice = (code: string) => commodities.find((c) => c.code === code)?.price ?? null;
  const brentPrice = getPrice('BRENT_CRUDE_USD');
  const dubaiPrice = getPrice('DUBAI_CRUDE_USD');
  const uralsPrice = getPrice('URALS_CRUDE_USD');
  const azeriPrice = getPrice('AZERI_LIGHT_USD');

  const spreads = [
    {
      label: 'Brent - Dubai',
      note: 'Pakistan benchmark premium',
      value: brentPrice && dubaiPrice ? brentPrice - dubaiPrice : null,
    },
    {
      label: 'Brent - Urals',
      note: 'Sanctions discount',
      value: brentPrice && uralsPrice ? brentPrice - uralsPrice : null,
    },
    {
      label: 'Brent - Azeri Light',
      note: 'Caspian grade spread',
      value: brentPrice && azeriPrice ? brentPrice - azeriPrice : null,
    },
  ];

  // Period labels
  const periodOptions: { key: Period; label: string; enabled: boolean }[] = [
    { key: 'past_day', label: '1D', enabled: false },
    { key: 'past_week', label: '1W', enabled: false },
    { key: 'past_month', label: '1M', enabled: true },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-navy">Oil Price Market Dashboard</h2>
        <p className="text-sm text-slate mt-1">
          Live commodity prices and spreads relevant to Pakistan's energy imports
        </p>
      </div>

      {/* Error banner */}
      {error && (
        <div className="bg-red-muted/10 border border-red-muted/30 rounded-lg px-4 py-3 text-sm text-red-muted">
          {error}
        </div>
      )}

      {/* ================================================================= */}
      {/* 1. Price History Chart                                            */}
      {/* ================================================================= */}
      <Card>
        {loadingHistory ? (
          <ChartSkeleton />
        ) : (
          <>
            {/* Price header */}
            <div className="flex items-baseline justify-between mb-4">
              <div>
                <p className="text-xs text-slate uppercase tracking-wide font-medium mb-1">
                  Brent Crude Oil
                </p>
                <div className="flex items-baseline gap-3">
                  <span className="font-mono text-3xl font-semibold text-navy">
                    {currentPrice !== null ? `$${fmt(currentPrice)}` : '--'}
                  </span>
                  <span className="text-xs text-slate">/bbl</span>
                  {change24h && (
                    <span className={`font-mono text-sm font-medium ${changeDisplay.color}`}>
                      {changeDisplay.arrow} {changeDisplay.text}
                      <span className="text-slate ml-1 text-xs">24h</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Period selector */}
              <div className="flex gap-1">
                {periodOptions.map((opt) => (
                  <button
                    key={opt.key}
                    onClick={() => opt.enabled && setPeriod(opt.key)}
                    disabled={!opt.enabled}
                    className={`px-3 py-1 text-xs font-mono rounded transition-colors ${
                      period === opt.key
                        ? 'bg-navy text-white'
                        : opt.enabled
                        ? 'bg-input-bg text-navy hover:bg-border'
                        : 'bg-input-bg text-slate-light cursor-not-allowed'
                    }`}
                    title={!opt.enabled ? 'Coming soon' : undefined}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Chart */}
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={history}
                  margin={{ top: 5, right: 20, bottom: 5, left: 10 }}
                >
                  <defs>
                    <linearGradient id="brentGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#1a1a2e" stopOpacity={0.10} />
                      <stop offset="100%" stopColor="#1a1a2e" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#e2e0dc"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatDateShort}
                    tick={{ fontSize: 11, fill: '#64748b', fontFamily: 'IBM Plex Mono, monospace' }}
                    axisLine={{ stroke: '#e2e0dc' }}
                    tickLine={false}
                    minTickGap={40}
                  />
                  <YAxis
                    domain={[minPrice, maxPrice]}
                    tick={{ fontSize: 11, fill: '#64748b', fontFamily: 'IBM Plex Mono, monospace' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v: number) => `$${v}`}
                    width={55}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="price"
                    stroke="#1a1a2e"
                    strokeWidth={2}
                    fill="url(#brentGradient)"
                    dot={false}
                    activeDot={{
                      r: 4,
                      fill: '#1a1a2e',
                      stroke: '#fff',
                      strokeWidth: 2,
                    }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Chart footer */}
            <div className="mt-2 flex items-center justify-between text-[10px] text-slate">
              <span>Source: Oil Price API {isIntraday ? '(intraday)' : ''}</span>
              <span>
                {history.length > 0 && (isIntraday
                  ? `Today ${history[0].date} -- ${history[history.length - 1].date} UTC`
                  : `${formatDateShort(history[0].date)} -- ${formatDateShort(history[history.length - 1].date)}`
                )}
              </span>
            </div>
          </>
        )}
      </Card>

      {/* ================================================================= */}
      {/* 2. Commodity Price Grid                                           */}
      {/* ================================================================= */}
      <div>
        <h3 className="text-sm font-semibold text-navy mb-3">
          Commodity Prices
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {loadingCommodities
            ? Array.from({ length: 10 }).map((_, i) => (
                <CommodityCardSkeleton key={i} />
              ))
            : commodities.map((c) => {
                const ch = fmtChange(c.change24h);
                const isPakDiet = PAKISTAN_DIET_CODES.has(c.code);
                const unit = COMMODITY_UNITS[c.code] || '$/bbl';
                const label = COMMODITY_LABELS[c.code] || c.code;

                return (
                  <div
                    key={c.code}
                    className={`bg-card border rounded-lg p-4 transition-colors ${
                      isPakDiet
                        ? 'border-navy/30 ring-1 ring-navy/10'
                        : 'border-border'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="text-xs font-medium text-navy leading-tight">
                          {label}
                        </p>
                        {isPakDiet && (
                          <span className="inline-block mt-0.5 text-[9px] font-mono uppercase tracking-wider text-navy/60 bg-navy/5 px-1.5 py-0.5 rounded">
                            PAK crude diet
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate font-mono">{unit}</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="font-mono text-lg font-semibold text-navy">
                        ${fmt(c.price)}
                      </span>
                      {c.change24h && (
                        <span className={`font-mono text-xs font-medium ${ch.color}`}>
                          {ch.arrow} {ch.text}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
        </div>
      </div>

      {/* ================================================================= */}
      {/* 3. Crude Spread Analysis                                          */}
      {/* ================================================================= */}
      <Card title="Crude Grade Spread Analysis">
        <p className="text-xs text-slate mb-3">
          Pakistan buys mostly Dubai-linked crude. These spreads indicate relative pricing advantages.
        </p>
        {loadingCommodities ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <SkeletonBlock key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 text-xs font-medium text-slate uppercase tracking-wide">
                  Spread
                </th>
                <th className="text-left py-2 text-xs font-medium text-slate uppercase tracking-wide">
                  Significance
                </th>
                <th className="text-right py-2 text-xs font-medium text-slate uppercase tracking-wide">
                  $/bbl
                </th>
              </tr>
            </thead>
            <tbody>
              {spreads.map((s) => (
                <tr key={s.label} className="border-b border-border/50">
                  <td className="py-2.5 font-medium text-navy">{s.label}</td>
                  <td className="py-2.5 text-xs text-slate">{s.note}</td>
                  <td className="py-2.5 text-right">
                    {s.value !== null ? (
                      <span
                        className={`font-mono font-semibold ${
                          s.value >= 0 ? 'text-green-muted' : 'text-red-muted'
                        }`}
                      >
                        {s.value >= 0 ? '+' : ''}
                        {fmt(s.value)}
                      </span>
                    ) : (
                      <span className="font-mono text-slate">--</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div className="mt-3 text-[10px] text-slate">
          A wider Brent-Urals spread signals deeper sanctions discount -- potential savings for Pakistan if procurement is feasible.
        </div>
      </Card>
    </div>
  );
}
