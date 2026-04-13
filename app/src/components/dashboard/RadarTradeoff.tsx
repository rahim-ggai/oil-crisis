'use client';

import { useMemo } from 'react';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import type { LevelImpact } from '@/lib/calculations/economic-impact';

interface RadarTradeoffProps {
  impacts: LevelImpact[]; // array of 4 (none, alert, austerity, emergency)
  currentLevel: string;
}

const LEVEL_CONFIG: Record<
  string,
  { color: string; label: string; dash: string }
> = {
  none: { color: '#1a1a2e', label: 'Normal', dash: '' },
  alert: { color: '#d4a017', label: 'Alert', dash: '6 3' },
  austerity: { color: '#e67e22', label: 'Austerity', dash: '6 3' },
  emergency: { color: '#c0392b', label: 'Emergency', dash: '6 3' },
};

const AXES = [
  'Days of Cover',
  'Reserve Months',
  'Demand Reduction %',
  'GDP Impact %',
  'Lockdown Days',
] as const;

type AxisKey = (typeof AXES)[number];

/** Normalize a raw value to 0-100 scale per axis */
function normalize(axis: AxisKey, raw: number): number {
  switch (axis) {
    case 'Days of Cover':
      return Math.min(100, Math.max(0, raw));
    case 'Reserve Months':
      return Math.min(100, Math.max(0, raw * (100 / 12)));
    case 'Demand Reduction %':
      return Math.min(100, Math.max(0, raw));
    case 'GDP Impact %':
      return Math.min(100, Math.max(0, Math.abs(raw) * 5));
    case 'Lockdown Days':
      return Math.min(100, Math.max(0, raw * (100 / 7)));
  }
}

function getRawValue(impact: LevelImpact, axis: AxisKey): number {
  switch (axis) {
    case 'Days of Cover':
      return impact.daysOfCover;
    case 'Reserve Months':
      return impact.monthsToFloor;
    case 'Demand Reduction %':
      return impact.demandReductionPct;
    case 'GDP Impact %':
      return impact.gdpImpactPct;
    case 'Lockdown Days':
      return impact.lockdownDays;
  }
}

/** Custom tooltip with monospace numbers */
function CustomTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string; dataKey: string }>;
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="bg-card border border-border rounded px-3 py-2 shadow-sm">
      <p className="text-xs font-medium text-foreground mb-1">{label}</p>
      {payload.map((entry) => (
        <p
          key={entry.dataKey}
          className="text-xs"
          style={{ color: entry.color }}
        >
          <span>{entry.name}: </span>
          <span className="font-mono">{entry.value.toFixed(1)}</span>
        </p>
      ))}
    </div>
  );
}

export function RadarTradeoff({ impacts, currentLevel }: RadarTradeoffProps) {
  // Build radar chart data: one entry per axis, with normalized values per level
  const chartData = useMemo(() => {
    return AXES.map((axis) => {
      const entry: Record<string, string | number> = { axis };
      for (const impact of impacts) {
        const raw = getRawValue(impact, axis);
        entry[impact.level] = Math.round(normalize(axis, raw) * 10) / 10;
        // Store raw values for tooltip
        entry[`${impact.level}_raw`] = Math.round(raw * 100) / 100;
      }
      return entry;
    });
  }, [impacts]);

  const levels = useMemo(
    () => impacts.map((i) => i.level),
    [impacts],
  );

  return (
    <div className="w-full" style={{ height: 400 }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart
          cx="50%"
          cy="46%"
          outerRadius="72%"
          data={chartData}
        >
          <PolarGrid
            stroke="#e2e0dc"
            strokeWidth={0.5}
          />
          <PolarAngleAxis
            dataKey="axis"
            tick={{
              fontSize: 11,
              fill: '#64748b',
              fontFamily: "'IBM Plex Sans', sans-serif",
            }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 100]}
            tick={{
              fontSize: 9,
              fill: '#94a3b8',
              fontFamily: "'IBM Plex Mono', monospace",
            }}
            tickCount={5}
            axisLine={false}
          />

          {levels.map((level) => {
            const config = LEVEL_CONFIG[level] || LEVEL_CONFIG.none;
            const isCurrent = level === currentLevel;

            return (
              <Radar
                key={level}
                name={config.label}
                dataKey={level}
                stroke={config.color}
                strokeWidth={2}
                strokeDasharray={config.dash}
                fill={isCurrent ? config.color : 'none'}
                fillOpacity={isCurrent ? 0.15 : 0}
                dot={false}
              />
            );
          })}

          <Tooltip
            content={
              <CustomTooltip />
            }
          />

          <Legend
            wrapperStyle={{
              fontSize: 11,
              fontFamily: "'IBM Plex Sans', sans-serif",
              paddingTop: 8,
            }}
            iconType="line"
            iconSize={16}
            formatter={(value: string) => (
              <span className="text-slate text-xs ml-1">{value}</span>
            )}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
