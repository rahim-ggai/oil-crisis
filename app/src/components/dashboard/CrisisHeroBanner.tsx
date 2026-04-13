'use client';

import { useMemo } from 'react';
import { useAppStore } from '@/lib/store';
import { computeTrigger } from '@/lib/calculations/m8-trigger';
import { getDaysOfCover } from '@/lib/calculations/m1-inventory';
import { computeReserveTimeline } from '@/lib/calculations/reserve-timeline';
import { computeImportRecommendation } from '@/lib/calculations/import-recommendation';
import type { ImportRecommendationParams } from '@/lib/calculations/import-recommendation';
import { getPipelineStatusScore } from '@/lib/calculations/m2-pipeline';
import { computeIranCorridor } from '@/lib/calculations/m5-iran';
import type { TriggerLevel } from '@/types';

// ────────────────────────────────────────────────────────────
// Constants
// ────────────────────────────────────────────────────────────

const LEVEL_HEX: Record<TriggerLevel, string> = {
  NORMAL: '#27ae60',
  ALERT: '#d4a017',
  AUSTERITY: '#e67e22',
  EMERGENCY: '#c0392b',
};

const LEVEL_BG: Record<TriggerLevel, string> = {
  NORMAL: 'bg-green-muted/5',
  ALERT: 'bg-ochre/5',
  AUSTERITY: 'bg-[#e67e22]/5',
  EMERGENCY: 'bg-red-muted/5',
};

function fmt(n: number, decimals = 1): string {
  if (!isFinite(n)) return '--';
  return n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function fmtInt(n: number): string {
  if (!isFinite(n)) return '--';
  return Math.round(n).toLocaleString('en-US');
}

function barColor(days: number): string {
  if (days > 20) return '#27ae60';
  if (days >= 10) return '#d4a017';
  return '#c0392b';
}

function reserveColor(months: number): string {
  if (months > 6) return '#27ae60';
  if (months >= 3) return '#d4a017';
  return '#c0392b';
}

// ────────────────────────────────────────────────────────────
// Mini Stress Gauge (SVG semi-circle)
// ────────────────────────────────────────────────────────────

function MiniStressGauge({ stress, level }: { stress: number; level: TriggerLevel }) {
  const width = 120;
  const height = 72;
  const cx = width / 2;
  const cy = 62;
  const outerR = 52;
  const innerR = 38;

  const stressToAngle = (s: number) => Math.PI * (1 - s / 100);

  const arcPath = (r1: number, r2: number, startAngle: number, endAngle: number) => {
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

  const bands = [
    { start: 0, end: 25, color: '#27ae60' },
    { start: 25, end: 50, color: '#d4a017' },
    { start: 50, end: 75, color: '#e67e22' },
    { start: 75, end: 100, color: '#c0392b' },
  ];

  const clamped = Math.max(0, Math.min(100, stress));
  const needleAngle = stressToAngle(clamped);
  const needleLen = outerR - 4;
  const needleX = cx + needleLen * Math.cos(needleAngle);
  const needleY = cy - needleLen * Math.sin(needleAngle);

  return (
    <div className="flex flex-col items-center">
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        {bands.map((band) => {
          const startA = stressToAngle(band.end);
          const endA = stressToAngle(band.start);
          return (
            <path
              key={band.start}
              d={arcPath(innerR, outerR, startA, endA)}
              fill={band.color}
              opacity={stress >= band.start && stress <= band.end ? 0.45 : 0.15}
              stroke={band.color}
              strokeWidth={0.5}
            />
          );
        })}
        <line
          x1={cx}
          y1={cy}
          x2={needleX}
          y2={needleY}
          stroke="#1a1a2e"
          strokeWidth={2}
          strokeLinecap="round"
        />
        <circle cx={cx} cy={cy} r={3} fill="#1a1a2e" />
        <text
          x={cx}
          y={cy - 18}
          textAnchor="middle"
          style={{ fontFamily: 'var(--font-mono)', fill: LEVEL_HEX[level], fontSize: 14, fontWeight: 600 }}
        >
          {clamped.toFixed(1)}
        </text>
      </svg>
      <span
        className="text-[10px] font-semibold tracking-wide font-mono mt-0.5"
        style={{ color: LEVEL_HEX[level] }}
      >
        {level}
      </span>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Days to Critical — horizontal progress bars
// ────────────────────────────────────────────────────────────

function DaysToCritical({ fuels }: { fuels: { label: string; days: number }[] }) {
  const maxDays = 30;

  return (
    <div className="space-y-1.5">
      <div className="text-[10px] text-slate font-medium uppercase tracking-wide mb-1">Days to Critical</div>
      {fuels.map((fuel) => {
        const pct = Math.min(100, (fuel.days / maxDays) * 100);
        const color = barColor(fuel.days);
        const warn = fuel.days < 20;
        return (
          <div key={fuel.label} className="flex items-center gap-2">
            <span className="text-[10px] text-slate w-[70px] font-mono shrink-0 flex items-center gap-1">
              {warn && (
                <span
                  className="inline-flex items-center justify-center w-3 h-3 rounded-full text-[8px] font-bold text-white shrink-0"
                  style={{ backgroundColor: color }}
                >
                  !
                </span>
              )}
              {fuel.label}: {fmt(fuel.days)}d
            </span>
            <div className="flex-1 h-2.5 bg-border/50 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700 ease-out"
                style={{ width: `${pct}%`, backgroundColor: color }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Reserve Runway
// ────────────────────────────────────────────────────────────

function ReserveRunway({ months }: { months: number }) {
  const maxMonths = 12;
  const pct = Math.min(100, (months / maxMonths) * 100);
  const color = reserveColor(months);

  return (
    <div className="space-y-1">
      <div className="text-[10px] text-slate font-medium uppercase tracking-wide">Reserve Runway</div>
      <div className="flex-1 h-3 bg-border/50 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <div className="text-[10px] font-mono" style={{ color }}>
        {fmt(months)} months until floor
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Top Action
// ────────────────────────────────────────────────────────────

function TopAction({ text, level }: { text: string; level: TriggerLevel }) {
  return (
    <div className="space-y-1">
      <div className="text-[10px] text-slate font-medium uppercase tracking-wide">Top Action</div>
      <div
        className="text-sm font-semibold leading-snug px-3 py-2 rounded border"
        style={{
          color: LEVEL_HEX[level],
          borderColor: `${LEVEL_HEX[level]}30`,
          backgroundColor: `${LEVEL_HEX[level]}08`,
        }}
      >
        {text}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Sub-indicators
// ────────────────────────────────────────────────────────────

function SubIndicators({
  pipelineScore,
  iranOpen,
  alternatesPct,
}: {
  pipelineScore: number;
  iranOpen: boolean;
  alternatesPct: number;
}) {
  return (
    <div className="flex items-center gap-5 pt-2 mt-2 border-t border-border">
      {/* Pipeline */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-slate">Pipeline:</span>
        <span className="font-mono text-[10px] font-semibold text-navy">{fmt(pipelineScore, 0)}%</span>
        <div className="w-12 h-1.5 bg-border/50 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-navy"
            style={{ width: `${Math.min(100, pipelineScore)}%` }}
          />
        </div>
      </div>

      {/* Iran */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-slate">Iran:</span>
        <span
          className={`text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded ${
            iranOpen
              ? 'text-green-muted bg-green-muted/10'
              : 'text-red-muted bg-red-muted/10'
          }`}
        >
          {iranOpen ? 'OPEN' : 'CLOSED'}
        </span>
      </div>

      {/* Alternates */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-slate">Alternates:</span>
        <span className="font-mono text-[10px] font-semibold text-navy">{fmt(alternatesPct, 0)}% active</span>
        <div className="w-12 h-1.5 bg-border/50 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-navy"
            style={{ width: `${Math.min(100, alternatesPct)}%` }}
          />
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Main Component
// ────────────────────────────────────────────────────────────

export function CrisisHeroBanner() {
  const scenario = useAppStore((s) => s.scenario);
  const { m1, m2, m5, m6, m4, formulaParams: fp } = scenario;

  // A) Trigger / Stress
  const triggerOutput = useMemo(() => computeTrigger(scenario), [scenario]);
  const level = triggerOutput.recommendedLevel;

  // B) Days of cover for each fuel
  const hsdDays = useMemo(() => getDaysOfCover(m1.hsdStock, m1.hsdDailyConsumption), [m1]);
  const msDays = useMemo(() => getDaysOfCover(m1.msStock, m1.msDailyConsumption), [m1]);
  const foDays = useMemo(() => getDaysOfCover(m1.foStock, m1.foDailyConsumption), [m1]);

  // C) Reserve timeline (current conservation level)
  const reserveTimeline = useMemo(() => {
    return computeReserveTimeline({
      sbpReserves: m6.sbpReserves,
      reservesFloor: m6.reservesFloor,
      brentSpot: m6.currentBrentSpot,
      productPremium: fp.m6_productPremium,
      freightPremium: fp.m6_freightPremium,
      normalDemandBpd: fp.m6_normalDemandBpd,
      imfAvailable: m6.imfAvailable,
      saudiFacilityMonthly: (m6.saudiDoubled ? m6.saudiDeferredFacility * 2 : m6.saudiDeferredFacility) / 12,
      barterMonthly: m6.barterCapacity / 12000,
    });
  }, [m6, fp]);

  const currentLevelKey = level === 'NORMAL' ? 'none' : level.toLowerCase() as 'none' | 'alert' | 'austerity' | 'emergency';
  const monthsToFloor = reserveTimeline.monthsToFloor[currentLevelKey];

  // D) Import recommendation
  const currentStockBarrels = useMemo(
    () => m1.hsdStock * 7.46 + m1.msStock * 8.5 + m1.foStock * 6.35 + m1.crudeOilStock,
    [m1],
  );

  const importRec = useMemo(() => {
    const params: ImportRecommendationParams = {
      sbpReserves: m6.sbpReserves,
      reservesFloor: m6.reservesFloor,
      imfAvailable: m6.imfAvailable,
      saudiFacility: m6.saudiDoubled ? m6.saudiDeferredFacility * 2 : m6.saudiDeferredFacility,
      chinaSwap: m6.chinaSwapLine,
      barter: m6.barterCapacity,
      brentSpot: m6.currentBrentSpot,
      productPremium: fp.m6_productPremium,
      freightPremium: fp.m6_freightPremium,
      warDurationMonths: fp.m6_warDurationMonths,
      normalDemandBpd: fp.m6_normalDemandBpd,
      maxLockdownDays: 2,
      currentStockBarrels,
    };
    return computeImportRecommendation(params);
  }, [m6, fp, currentStockBarrels]);

  // E) Sub-indicators
  const pipelineScore = useMemo(
    () => getPipelineStatusScore(m2.cargoes, scenario.baselineMode, fp.m2_pipelineScoreBaseline),
    [m2.cargoes, scenario.baselineMode, fp.m2_pipelineScoreBaseline],
  );

  const iranOutput = useMemo(
    () => computeIranCorridor(m5, scenario.baselineMode, fp),
    [m5, scenario.baselineMode, fp],
  );
  const iranOpen = iranOutput.corridorScore > 0;

  const alternatesPct = useMemo(() => {
    const active = m4.sources.filter((s) => s.activated);
    if (active.length === 0) return 0;
    const totalLiftable = active.reduce((s, a) => s + a.maxLiftableKbblMonth, 0);
    return Math.min(100, (totalLiftable / fp.m4_activationScoreBaseline) * 100);
  }, [m4.sources, fp.m4_activationScoreBaseline]);

  // Top action text
  const topActionText = useMemo(() => {
    const recMBbl = importRec.recommended / 1_000_000;
    if (level === 'EMERGENCY') {
      if (hsdDays < 7) return `Emergency: HSD at ${fmt(hsdDays)}d -- begin rationing immediately`;
      return `Emergency: Import ${fmt(recMBbl)}M bbl/month, enforce full conservation`;
    }
    if (level === 'AUSTERITY') {
      return `Austerity: Import ${fmt(recMBbl)}M bbl/month, begin HSD rationing`;
    }
    if (level === 'ALERT') {
      return `Alert: Import ${fmt(recMBbl)}M bbl/month, activate alternate sources`;
    }
    return `Normal: Import ${fmt(recMBbl)}M bbl/month at current demand`;
  }, [level, importRec.recommended, hsdDays]);

  return (
    <div
      className={`rounded-lg border-l-4 p-4 ${LEVEL_BG[level]}`}
      style={{ borderLeftColor: LEVEL_HEX[level] }}
    >
      {/* Main row: 4 sections */}
      <div className="grid grid-cols-[auto_1fr_1fr_1fr] gap-5 items-start">
        {/* A: Mini Stress Gauge */}
        <div className="flex justify-center">
          <MiniStressGauge stress={triggerOutput.compositeStress} level={level} />
        </div>

        {/* B: Days to Critical */}
        <DaysToCritical
          fuels={[
            { label: 'HSD', days: hsdDays },
            { label: 'MS', days: msDays },
            { label: 'FO', days: foDays },
          ]}
        />

        {/* C: Reserve Runway */}
        <ReserveRunway months={monthsToFloor} />

        {/* D: Top Action */}
        <TopAction text={topActionText} level={level} />
      </div>

      {/* E: Sub-indicators row */}
      <SubIndicators
        pipelineScore={pipelineScore}
        iranOpen={iranOpen}
        alternatesPct={alternatesPct}
      />
    </div>
  );
}
