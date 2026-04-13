"use client";

import { useMemo, useCallback } from "react";
import { useAppStore } from "@/lib/store";
import { ModulePanel, Card } from "@/components/ui/ModulePanel";
import { InputField } from "@/components/ui/InputField";
import { computeTrigger, traceTrigger } from "@/lib/calculations/m8-trigger";
import { InlineFormula } from "@/components/ui/FormulaBreakdown";
import type { TriggerLevel, TriggerWeights } from "@/types";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from "recharts";

// ────────────────────────────────────────────────────────────
// Constants
// ────────────────────────────────────────────────────────────
const LEVEL_COLORS: Record<TriggerLevel, string> = {
  NORMAL: "#27ae60",
  ALERT: "#d4a017",
  AUSTERITY: "#e67e22",
  EMERGENCY: "#c0392b",
};

const LEVEL_LABELS: Record<TriggerLevel, string> = {
  NORMAL: "NORMAL",
  ALERT: "ALERT",
  AUSTERITY: "AUSTERITY",
  EMERGENCY: "EMERGENCY",
};

const WEIGHT_FIELDS: {
  key: keyof TriggerWeights;
  label: string;
  description: string;
}[] = [
  { key: "wD", label: "wD", description: "Days of cover stress" },
  { key: "wP", label: "wP", description: "Price stress" },
  { key: "wS", label: "wS", description: "Pipeline reliability" },
  { key: "wA", label: "wA", description: "Alternate sources buffer" },
  { key: "wI", label: "wI", description: "Iran corridor buffer" },
];

const HARD_OVERRIDE_DESCRIPTIONS = [
  {
    id: "critical-stock",
    label: "Critical stock override",
    condition: "HSD or MS days of cover < 7 days",
    level: "EMERGENCY" as TriggerLevel,
  },
  {
    id: "no-cargoes",
    label: "No incoming cargoes",
    condition: "Days of cover < 14 and no cargoes arriving within 7 days",
    level: "EMERGENCY" as TriggerLevel,
  },
  {
    id: "price-reserves",
    label: "Price + reserves squeeze",
    condition: "Brent > 4x baseline and reserves < $12B",
    level: "AUSTERITY" as TriggerLevel,
  },
  {
    id: "iran-closed",
    label: "Iran corridor closed",
    condition: "Iran corridor score = 0 and alternates < 30%",
    level: "AUSTERITY" as TriggerLevel,
  },
];

const OVERRIDE_OPTIONS: (TriggerLevel | "none")[] = [
  "none",
  "NORMAL",
  "ALERT",
  "AUSTERITY",
  "EMERGENCY",
];

// ────────────────────────────────────────────────────────────
// Stress Dial SVG
// ────────────────────────────────────────────────────────────
function StressDial({
  stress,
  level,
}: {
  stress: number;
  level: TriggerLevel;
}) {
  const width = 320;
  const height = 190;
  const cx = width / 2;
  const cy = 165;
  const outerR = 140;
  const innerR = 105;

  // Angle: 0 stress = PI (left), 100 stress = 0 (right)
  const stressToAngle = (s: number) => Math.PI * (1 - s / 100);

  // Arc path helper: draws arc from startAngle to endAngle (radians, 0=right)
  const arcPath = (
    r1: number,
    r2: number,
    startAngle: number,
    endAngle: number,
  ) => {
    const x1o = cx + r2 * Math.cos(startAngle);
    const y1o = cy - r2 * Math.sin(startAngle);
    const x2o = cx + r2 * Math.cos(endAngle);
    const y2o = cy - r2 * Math.sin(endAngle);
    const x1i = cx + r1 * Math.cos(endAngle);
    const y1i = cy - r1 * Math.sin(endAngle);
    const x2i = cx + r1 * Math.cos(startAngle);
    const y2i = cy - r1 * Math.sin(startAngle);
    const largeArc = Math.abs(endAngle - startAngle) > Math.PI ? 1 : 0;
    return `M ${x1o} ${y1o} A ${r2} ${r2} 0 ${largeArc} 0 ${x2o} ${y2o} L ${x1i} ${y1i} A ${r1} ${r1} 0 ${largeArc} 1 ${x2i} ${y2i} Z`;
  };

  // Four bands: NORMAL 0-25, ALERT 25-50, AUSTERITY 50-75, EMERGENCY 75-100
  const bands: { start: number; end: number; color: string }[] = [
    { start: 0, end: 25, color: LEVEL_COLORS.NORMAL },
    { start: 25, end: 50, color: LEVEL_COLORS.ALERT },
    { start: 50, end: 75, color: LEVEL_COLORS.AUSTERITY },
    { start: 75, end: 100, color: LEVEL_COLORS.EMERGENCY },
  ];

  // Needle
  const needleAngle = stressToAngle(Math.max(0, Math.min(100, stress)));
  const needleLen = outerR - 8;
  const needleX = cx + needleLen * Math.cos(needleAngle);
  const needleY = cy - needleLen * Math.sin(needleAngle);

  return (
    <div className="flex flex-col items-center">
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        {/* Bands */}
        {bands.map((band) => {
          const startA = stressToAngle(band.end); // higher stress = smaller angle (rightward)
          const endA = stressToAngle(band.start);
          return (
            <path
              key={band.start}
              d={arcPath(innerR, outerR, startA, endA)}
              fill={band.color}
              opacity={0.18}
              stroke={band.color}
              strokeWidth={0.5}
            />
          );
        })}

        {/* Active band highlight */}
        {bands.map((band) => {
          if (stress < band.start || stress > band.end) return null;
          const startA = stressToAngle(band.end);
          const endA = stressToAngle(band.start);
          return (
            <path
              key={`active-${band.start}`}
              d={arcPath(innerR, outerR, startA, endA)}
              fill={band.color}
              opacity={0.4}
              stroke={band.color}
              strokeWidth={1}
            />
          );
        })}

        {/* Tick marks at 0, 25, 50, 75, 100 */}
        {[0, 25, 50, 75, 100].map((tick) => {
          const a = stressToAngle(tick);
          const x1 = cx + (outerR + 2) * Math.cos(a);
          const y1 = cy - (outerR + 2) * Math.sin(a);
          const x2 = cx + (outerR + 10) * Math.cos(a);
          const y2 = cy - (outerR + 10) * Math.sin(a);
          const lx = cx + (outerR + 18) * Math.cos(a);
          const ly = cy - (outerR + 18) * Math.sin(a);
          return (
            <g key={tick}>
              <line
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="#64748b"
                strokeWidth={1}
              />
              <text
                x={lx}
                y={ly}
                textAnchor="middle"
                dominantBaseline="middle"
                className="text-[9px] fill-slate"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                {tick}
              </text>
            </g>
          );
        })}

        {/* Needle */}
        <line
          x1={cx}
          y1={cy}
          x2={needleX}
          y2={needleY}
          stroke="#1a1a2e"
          strokeWidth={2.5}
          strokeLinecap="round"
        />
        <circle cx={cx} cy={cy} r={5} fill="#1a1a2e" />

        {/* Center text */}
        <text
          x={cx}
          y={cy - 40}
          textAnchor="middle"
          className="text-2xl font-semibold"
          style={{ fontFamily: "var(--font-mono)", fill: LEVEL_COLORS[level] }}
        >
          {stress.toFixed(1)}
        </text>
      </svg>

      {/* Level label below */}
      <div
        className="mt-1 px-4 py-1.5 rounded text-sm font-semibold tracking-wide"
        style={{
          color: LEVEL_COLORS[level],
          backgroundColor: `${LEVEL_COLORS[level]}14`,
        }}
      >
        {LEVEL_LABELS[level]}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Component Breakdown Bar Chart
// ────────────────────────────────────────────────────────────
interface BreakdownEntry {
  name: string;
  value: number;
  fill: string;
}

function ComponentBreakdown({ data }: { data: BreakdownEntry[] }) {
  return (
    <div className="h-50">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#e2e0dc"
            horizontal={false}
          />
          <XAxis
            type="number"
            tick={{ fontSize: 10, fill: "#64748b" }}
            domain={[-15, 50]}
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fontSize: 11, fill: "#64748b" }}
            width={95}
          />
          <Tooltip
            contentStyle={{
              fontSize: 11,
              background: "#ffffff",
              border: "1px solid #e2e0dc",
            }}
            formatter={(value: unknown) => [
              Number(value).toFixed(2),
              "Weighted contribution",
            ]}
          />
          <ReferenceLine x={0} stroke="#1a1a2e" strokeWidth={1} />
          <Bar dataKey="value" radius={[0, 3, 3, 0]} barSize={22}>
            {data.map((entry, idx) => (
              <Cell key={idx} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Main Component
// ────────────────────────────────────────────────────────────
export function M8Trigger() {
  const scenario = useAppStore((s) => s.scenario);
  const updateM8 = useAppStore((s) => s.updateM8);
  const m8 = scenario.m8;

  const triggerOutput = useMemo(() => computeTrigger(scenario), [scenario]);
  const trace = useMemo(() => traceTrigger(scenario), [scenario]);

  const weightSum = useMemo(
    () => Object.values(m8.weights).reduce((a, b) => a + b, 0),
    [m8.weights],
  );

  const handleWeightChange = useCallback(
    (key: keyof TriggerWeights, val: number) => {
      updateM8({ weights: { ...m8.weights, [key]: val } });
    },
    [m8.weights, updateM8],
  );

  const handleOverrideChange = useCallback(
    (val: string) => {
      updateM8({
        manualOverride: val === "none" ? null : (val as TriggerLevel),
      });
    },
    [updateM8],
  );

  // Build breakdown chart data
  const breakdownData: BreakdownEntry[] = useMemo(() => {
    const { stressD, stressP, stressS, bufferA, bufferI } =
      triggerOutput.components;
    const w = m8.weights;
    return [
      { name: "Days of cover (D)", value: w.wD * stressD, fill: "#c0392b" },
      { name: "Price stress (P)", value: w.wP * stressP, fill: "#e67e22" },
      { name: "Pipeline risk (S)", value: w.wS * stressS, fill: "#d4a017" },
      {
        name: "Alternates buf. (A)",
        value: -(w.wA * bufferA * 0.5),
        fill: "#27ae60",
      },
      {
        name: "Iran corridor (I)",
        value: -(w.wI * bufferI * 0.5),
        fill: "#2563eb",
      },
    ];
  }, [triggerOutput, m8.weights]);

  // Determine which hard overrides are active
  const activeOverrides = useMemo(() => {
    // Re-derive the conditions manually to show individual status
    const { m1, m2, m6, m5, m4 } = scenario;
    const hsdDays =
      m1.hsdDailyConsumption > 0
        ? m1.hsdStock / m1.hsdDailyConsumption
        : Infinity;
    const msDays =
      m1.msDailyConsumption > 0 ? m1.msStock / m1.msDailyConsumption : Infinity;
    const P = m6.currentBrentSpot / m6.preCrisisBrent;

    // weighted days of cover (simplified: use HSD as proxy)
    const D = hsdDays; // close enough for display
    const next7 = m2.cargoes.filter((c) => {
      const diff =
        (new Date(c.eta).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
      return diff >= 0 && diff <= 7;
    });

    const activeSources = m4.sources.filter((s) => s.activated);
    const totalLiftable = activeSources.reduce(
      (s, a) => s + a.maxLiftableKbblMonth,
      0,
    );
    const A = Math.min(100, (totalLiftable / 10_000) * 100);

    // Iran corridor score = 0 check (simplified)
    const iranBlocked =
      scenario.baselineMode === "full_corridor_compromised" &&
      m5.truckingCapacity * (1 - m5.borderDegradation) < 100;

    return {
      "critical-stock": hsdDays < 7 || msDays < 7,
      "no-cargoes": D < 14 && next7.length === 0,
      "price-reserves": P > 4 && m6.sbpReserves < 12,
      "iran-closed": iranBlocked && A < 30,
    } as Record<string, boolean>;
  }, [scenario]);

  return (
    <ModulePanel
      title="M8 -- Dynamic Trigger Logic"
      subtitle="Composite stress index and recommended escalation level for the National Energy Security Committee"
    >
      <div className="flex gap-6">
        {/* LEFT COLUMN: Inputs */}
        <div className="w-70 shrink-0 space-y-4">
          {/* Weights */}
          <Card title="Stress Weights">
            {WEIGHT_FIELDS.map((f) => (
              <InputField
                key={f.key}
                label={`${f.label} -- ${f.description}`}
                value={m8.weights[f.key]}
                onChange={(v) => handleWeightChange(f.key, v)}
                step={0.05}
                min={0}
                max={1}
              />
            ))}
            <div className="flex items-center justify-between pt-2 border-t border-border mt-2">
              <span className="text-xs text-slate">Sum of weights</span>
              <span
                className={`font-mono text-xs font-semibold ${
                  Math.abs(weightSum - 1) < 0.02
                    ? "text-green-muted"
                    : "text-red-muted"
                }`}
              >
                {weightSum.toFixed(2)}
              </span>
            </div>
            {Math.abs(weightSum - 1) >= 0.02 && (
              <p className="text-[10px] text-red-muted mt-1">
                Weights should sum to 1.00
              </p>
            )}
          </Card>

          {/* Manual Override */}
          <Card title="Manual Override">
            <p className="text-xs text-slate mb-2">
              Committee can force a specific level regardless of computed
              stress.
            </p>
            <select
              value={m8.manualOverride ?? "none"}
              onChange={(e) => handleOverrideChange(e.target.value)}
              className="w-full text-sm bg-input-bg border border-border rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-navy"
            >
              {OVERRIDE_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt === "none" ? "None (use computed)" : opt}
                </option>
              ))}
            </select>
            {m8.manualOverride && (
              <p className="text-[10px] text-ochre mt-2">
                Manual override active: computed level is bypassed.
              </p>
            )}
          </Card>

          {/* De-escalation */}
          <Card title="De-escalation Rule">
            <p className="text-xs text-slate leading-relaxed">
              A level may only be de-escalated after the composite stress
              remains below the lower threshold for{" "}
              <span className="font-mono font-semibold text-navy">
                3 consecutive days
              </span>
              .
            </p>
            <div className="flex items-center justify-between mt-3 pt-2 border-t border-border">
              <span className="text-xs text-slate">Consecutive days met</span>
              <span className="font-mono text-xs font-semibold text-navy">
                {m8.deEscalationDays}
              </span>
            </div>
          </Card>
        </div>

        {/* RIGHT COLUMN: Visualizations */}
        <div className="flex-1 space-y-5">
          {/* Stress Dial */}
          <Card title="Composite Stress Index">
            <StressDial
              stress={triggerOutput.compositeStress}
              level={triggerOutput.recommendedLevel}
            />
            <div className="mt-2">
              <InlineFormula trace={trace}>
                <span className="text-xs text-slate">Composite stress: </span>
                <span className="font-mono text-sm font-semibold text-navy">
                  {triggerOutput.compositeStress.toFixed(1)}
                </span>
              </InlineFormula>
            </div>
          </Card>

          {/* Component Breakdown */}
          <Card title="Component Contributions (Weighted)">
            <p className="text-xs text-slate mb-2">
              Positive values increase stress; negative values (buffers)
              decrease it.
            </p>
            <ComponentBreakdown data={breakdownData} />
            {/* Raw component values */}
            <div className="mt-3 pt-3 border-t border-border">
              <div className="grid grid-cols-5 gap-2 text-center">
                {[
                  {
                    label: "stress_D",
                    value: triggerOutput.components.stressD,
                  },
                  {
                    label: "stress_P",
                    value: triggerOutput.components.stressP,
                  },
                  {
                    label: "stress_S",
                    value: triggerOutput.components.stressS,
                  },
                  {
                    label: "buffer_A",
                    value: triggerOutput.components.bufferA,
                  },
                  {
                    label: "buffer_I",
                    value: triggerOutput.components.bufferI,
                  },
                ].map((c) => (
                  <div key={c.label}>
                    <div className="text-[10px] text-slate">{c.label}</div>
                    <div className="font-mono text-xs font-semibold text-navy">
                      {c.value.toFixed(1)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {/* Hard Overrides */}
          <Card title="Hard Override Conditions">
            <p className="text-xs text-slate mb-3">
              These conditions bypass the composite score and force a minimum
              escalation level.
            </p>
            <div className="space-y-2.5">
              {HARD_OVERRIDE_DESCRIPTIONS.map((ho) => {
                const isActive = activeOverrides[ho.id] ?? false;
                return (
                  <div key={ho.id} className="flex items-start gap-3">
                    <span
                      className="inline-block w-2.5 h-2.5 rounded-full mt-0.5 shrink-0 border"
                      style={{
                        backgroundColor: isActive
                          ? LEVEL_COLORS[ho.level]
                          : "transparent",
                        borderColor: isActive
                          ? LEVEL_COLORS[ho.level]
                          : "#e2e0dc",
                      }}
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-navy">
                          {ho.label}
                        </span>
                        <span
                          className="text-[10px] font-mono px-1.5 py-0.5 rounded"
                          style={{
                            color: LEVEL_COLORS[ho.level],
                            backgroundColor: `${LEVEL_COLORS[ho.level]}10`,
                          }}
                        >
                          {ho.level}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate mt-0.5">
                        {ho.condition}
                      </p>
                    </div>
                    <span
                      className={`text-[10px] font-mono font-semibold shrink-0 ${
                        isActive ? "text-red-muted" : "text-green-muted"
                      }`}
                    >
                      {isActive ? "ACTIVE" : "CLEAR"}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Active override message */}
            {triggerOutput.hardOverrideActive && (
              <div className="mt-3 pt-3 border-t border-border">
                <p className="text-xs text-red-muted font-medium">
                  Active override: {triggerOutput.hardOverrideActive}
                </p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </ModulePanel>
  );
}
