'use client';

import { useMemo, useRef, useState, useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { Card } from '@/components/ui/ModulePanel';
import { readExcelFile, parseDSSP, parseTankerPlan } from '@/lib/excel-import';
import { computeImportRecommendation, traceImportRecommendation } from '@/lib/calculations/import-recommendation';
import type { ImportRecommendationParams } from '@/lib/calculations/import-recommendation';
import {
  getWeightedDaysOfCover,
  getDaysOfCover,
  computeDepletionCurve,
  getReductionForLevel,
  traceWeightedDaysOfCover,
} from '@/lib/calculations/m1-inventory';
import { getRiskWeightedBarrels, traceRiskWeightedBarrels } from '@/lib/calculations/m2-pipeline';
import { computeIranCorridor, traceIranCorridor } from '@/lib/calculations/m5-iran';
import { computeAffordability, traceAffordability } from '@/lib/calculations/m6-price';
import { computeTrigger, traceTrigger } from '@/lib/calculations/m8-trigger';
import { InlineFormula } from '@/components/ui/FormulaBreakdown';
import type { ConservationLevel, DemandReduction, TriggerLevel } from '@/types';
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

const LEVEL_COLORS: Record<TriggerLevel, string> = {
  NORMAL: 'bg-green-muted/15 text-green-muted border-green-muted/30',
  ALERT: 'bg-ochre/15 text-ochre border-ochre/30',
  AUSTERITY: 'bg-[#e67e22]/15 text-[#e67e22] border-[#e67e22]/30',
  EMERGENCY: 'bg-red-muted/15 text-red-muted border-red-muted/30',
};

const LEVEL_DOT: Record<TriggerLevel, string> = {
  NORMAL: 'bg-green-muted',
  ALERT: 'bg-ochre',
  AUSTERITY: 'bg-[#e67e22]',
  EMERGENCY: 'bg-red-muted',
};

function fmt(n: number, decimals = 1): string {
  if (!isFinite(n)) return '--';
  return n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function fmtInt(n: number): string {
  if (!isFinite(n)) return '--';
  return Math.round(n).toLocaleString('en-US');
}

export function Dashboard() {
  const scenario = useAppStore((s) => s.scenario);
  const { m1, m2, m5, m6, m7, m8, formulaParams: fp } = scenario;
  const { updateM1, updateM2 } = useAppStore();
  const dsspRef = useRef<HTMLInputElement>(null);
  const tankerRef = useRef<HTMLInputElement>(null);
  const [importMsg, setImportMsg] = useState<string | null>(null);

  async function handleDSSP(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const wb = await readExcelFile(file);
      const result = parseDSSP(wb);
      if (Object.keys(result.m1).length > 0) {
        updateM1(result.m1);
        setImportMsg(`DSSP imported: ${Object.keys(result.m1).length} fields updated`);
      } else { setImportMsg('No matching data found in DSSP file'); }
    } catch (err) { setImportMsg(`Import failed: ${err}`); }
    if (dsspRef.current) dsspRef.current.value = '';
    setTimeout(() => setImportMsg(null), 5000);
  }

  async function handleTanker(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const wb = await readExcelFile(file);
      const result = parseTankerPlan(wb);
      if (result.cargoes.length > 0) {
        updateM2({ cargoes: result.cargoes });
        setImportMsg(`Tanker Plan imported: ${result.cargoes.length} vessels`);
      } else { setImportMsg('No vessel records found in file'); }
    } catch (err) { setImportMsg(`Import failed: ${err}`); }
    if (tankerRef.current) tankerRef.current.value = '';
    setTimeout(() => setImportMsg(null), 5000);
  }

  const triggerOutput = useMemo(() => computeTrigger(scenario), [scenario]);
  const iranOutput = useMemo(() => computeIranCorridor(m5, scenario.baselineMode, fp), [m5, scenario.baselineMode, fp]);
  const affordability = useMemo(() => computeAffordability(m6, fp), [m6, fp]);

  const m1Weights = useMemo(() => ({ hsd: fp.m1_hsdWeight, ms: fp.m1_msWeight, fo: fp.m1_foWeight }), [fp]);
  const weightedDaysOfCover = useMemo(() => getWeightedDaysOfCover(m1, undefined, m1Weights), [m1, m1Weights]);
  const hsdDays = useMemo(() => getDaysOfCover(m1.hsdStock, m1.hsdDailyConsumption), [m1]);
  const msDays = useMemo(() => getDaysOfCover(m1.msStock, m1.msDailyConsumption), [m1]);
  const foDays = useMemo(() => getDaysOfCover(m1.foStock, m1.foDailyConsumption), [m1]);

  const brentDelta = m6.currentBrentSpot - m6.preCrisisBrent;
  const brentDeltaPct = ((brentDelta / m6.preCrisisBrent) * 100);

  const usableReserves = Math.max(0, m6.sbpReserves - m6.reservesFloor);
  const monthsOfImports = m6.normalMonthlyImportBill > 0 ? m6.sbpReserves / m6.normalMonthlyImportBill : 0;

  const rwBarrels = useMemo(() => getRiskWeightedBarrels(m2.cargoes, scenario.baselineMode), [m2.cargoes, scenario.baselineMode]);

  const cargoStatusBuckets = useMemo(() => {
    const buckets: Record<string, number> = { docked: 0, in_war_zone: 0, outside_war_zone: 0, contracted_not_dispatched: 0 };
    m2.cargoes.forEach((c) => { buckets[c.status] = (buckets[c.status] || 0) + 1; });
    return buckets;
  }, [m2.cargoes]);

  const iranStatus = useMemo(() => {
    if (iranOutput.totalBblDay === 0) return 'Closed';
    if (iranOutput.corridorScore < 50) return 'Degraded';
    return 'Open';
  }, [iranOutput]);

  const iranStatusColor = useMemo(() => {
    if (iranStatus === 'Closed') return 'text-red-muted';
    if (iranStatus === 'Degraded') return 'text-ochre';
    return 'text-green-muted';
  }, [iranStatus]);

  // Depletion curves: 4 conservation scenarios
  const m7Reductions = useMemo(() => ({
    alert: m7.alertReductions,
    austerity: m7.austerityReductions,
    emergency: m7.emergencyReductions,
  }), [m7]);

  const depletionData = useMemo(() => {
    const levels: ConservationLevel[] = ['none', 'alert', 'austerity', 'emergency'];
    const curves = levels.map((level) => {
      const reduction = getReductionForLevel(level, m7Reductions);
      return computeDepletionCurve(m1, reduction, 90);
    });
    // Merge into single dataset for Recharts
    return curves[0].map((point, i) => ({
      day: point.day,
      hsd_none: curves[0][i].hsdDays,
      ms_none: curves[0][i].msDays,
      fo_none: curves[0][i].foDays,
      hsd_alert: curves[1][i].hsdDays,
      ms_alert: curves[1][i].msDays,
      fo_alert: curves[1][i].foDays,
      hsd_austerity: curves[2][i].hsdDays,
      ms_austerity: curves[2][i].msDays,
      fo_austerity: curves[2][i].foDays,
      hsd_emergency: curves[3][i].hsdDays,
      ms_emergency: curves[3][i].msDays,
      fo_emergency: curves[3][i].foDays,
    }));
  }, [m1, m7Reductions]);

  // ── Import Recommendation ──
  // Convert M1 stocks (tonnes) to barrels for total stock estimate
  // HSD: ~7.46 bbl/MT, MS: ~8.5 bbl/MT, FO: ~6.35 bbl/MT
  const currentStockBarrels = useMemo(() =>
    m1.hsdStock * 7.46 + m1.msStock * 8.5 + m1.foStock * 6.35 + m1.crudeOilStock,
  [m1]);

  // Local editable constraint state (initialized from store, analyst can tweak)
  const [irSbp, setIrSbp] = useState(m6.sbpReserves);
  const [irFloor, setIrFloor] = useState(m6.reservesFloor);
  const [irLockdown, setIrLockdown] = useState(2);
  const [irWarMonths, setIrWarMonths] = useState(fp.m6_warDurationMonths);
  const [irBrent, setIrBrent] = useState(m6.currentBrentSpot);

  // Sync from store when store values change
  useEffect(() => { setIrSbp(m6.sbpReserves); }, [m6.sbpReserves]);
  useEffect(() => { setIrBrent(m6.currentBrentSpot); }, [m6.currentBrentSpot]);

  const irParams: ImportRecommendationParams = useMemo(() => ({
    sbpReserves: irSbp,
    reservesFloor: irFloor,
    imfAvailable: m6.imfAvailable,
    saudiFacility: m6.saudiDoubled ? m6.saudiDeferredFacility * 2 : m6.saudiDeferredFacility,
    chinaSwap: m6.chinaSwapLine,
    barter: m6.barterCapacity,
    brentSpot: irBrent,
    productPremium: fp.m6_productPremium,
    freightPremium: fp.m6_freightPremium,
    warDurationMonths: irWarMonths,
    normalDemandBpd: fp.m6_normalDemandBpd,
    maxLockdownDays: irLockdown,
    currentStockBarrels,
  }), [irSbp, irFloor, irLockdown, irWarMonths, irBrent, m6, fp, currentStockBarrels]);

  const irResult = useMemo(() => computeImportRecommendation(irParams), [irParams]);
  const irTrace = useMemo(() => traceImportRecommendation(irParams), [irParams]);

  return (
    <div className="space-y-6">
      {/* Import Data Bar */}
      <div className="flex items-center gap-3 bg-card border border-border rounded-lg px-4 py-2.5">
        <span className="text-xs font-medium text-slate">Import Ministry Data:</span>
        <label className="px-3 py-1 text-xs font-medium bg-input-bg border border-border text-navy rounded cursor-pointer hover:bg-card-hover transition-colors">
          DSSP (Stock Position)
          <input ref={dsspRef} type="file" accept=".xlsx,.xls" onChange={handleDSSP} className="hidden" />
        </label>
        <label className="px-3 py-1 text-xs font-medium bg-input-bg border border-border text-navy rounded cursor-pointer hover:bg-card-hover transition-colors">
          Tanker Plan (Vessels)
          <input ref={tankerRef} type="file" accept=".xlsx,.xls" onChange={handleTanker} className="hidden" />
        </label>
        {importMsg && (
          <span className={`text-xs font-mono ml-2 ${importMsg.includes('failed') ? 'text-red-muted' : 'text-green-muted'}`}>
            {importMsg}
          </span>
        )}
      </div>

      {/* Vital Signs Cards */}
      <div className="grid grid-cols-3 gap-4">
        {/* 1. Days of Fuel Cover */}
        <Card>
          <p className="text-xs font-medium text-slate uppercase tracking-wide mb-2">Days of Fuel Cover</p>
          <InlineFormula trace={traceWeightedDaysOfCover(m1)}>
            <p className="font-mono text-4xl font-semibold text-navy leading-none">
              {fmt(weightedDaysOfCover, 0)}
            </p>
          </InlineFormula>
          <p className="text-xs text-slate mt-2">Weighted average (HSD/MS/FO)</p>
          <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
            <div>
              <span className="text-slate">HSD</span>
              <span className="font-mono ml-1 text-navy font-medium">{fmt(hsdDays, 0)}d</span>
            </div>
            <div>
              <span className="text-slate">MS</span>
              <span className="font-mono ml-1 text-navy font-medium">{fmt(msDays, 0)}d</span>
            </div>
            <div>
              <span className="text-slate">FO</span>
              <span className="font-mono ml-1 text-navy font-medium">{fmt(foDays, 0)}d</span>
            </div>
          </div>
        </Card>

        {/* 2. Brent Spot */}
        <Card>
          <p className="text-xs font-medium text-slate uppercase tracking-wide mb-2">Brent Spot</p>
          <p className="font-mono text-4xl font-semibold text-navy leading-none mb-2">
            ${fmt(m6.currentBrentSpot, 0)}
          </p>
          <p className="text-xs text-slate">USD/bbl</p>
          <div className="mt-3 text-xs">
            <span className={`font-mono font-medium ${brentDelta > 0 ? 'text-red-muted' : 'text-green-muted'}`}>
              {brentDelta > 0 ? '+' : ''}{fmt(brentDelta, 0)} ({brentDelta > 0 ? '+' : ''}{fmt(brentDeltaPct, 0)}%)
            </span>
            <span className="text-slate ml-1">vs pre-crisis ${fmt(m6.preCrisisBrent, 0)}</span>
          </div>
        </Card>

        {/* 3. SBP Usable Reserves */}
        <Card>
          <p className="text-xs font-medium text-slate uppercase tracking-wide mb-2">SBP Usable Reserves</p>
          <p className="font-mono text-4xl font-semibold text-navy leading-none mb-2">
            ${fmt(m6.sbpReserves, 1)}B
          </p>
          <p className="text-xs text-slate">USD bn (floor: ${fmt(m6.reservesFloor, 0)}B)</p>
          <div className="mt-3 text-xs">
            <span className="font-mono font-medium text-navy">{fmt(monthsOfImports, 1)}</span>
            <span className="text-slate ml-1">months of imports</span>
          </div>
        </Card>

        {/* 4. Active Trigger Level */}
        <Card>
          <p className="text-xs font-medium text-slate uppercase tracking-wide mb-2">Active Trigger Level</p>
          <div className="flex items-center gap-3 mb-2">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-semibold border ${LEVEL_COLORS[triggerOutput.recommendedLevel]}`}>
              <span className={`w-2 h-2 rounded-full ${LEVEL_DOT[triggerOutput.recommendedLevel]}`} />
              {triggerOutput.recommendedLevel}
            </span>
          </div>
          <div className="mt-1 text-xs">
            <InlineFormula trace={traceTrigger(scenario)}>
              <span>
                <span className="text-slate">Composite stress:</span>
                <span className="font-mono font-medium text-navy ml-1">{fmt(triggerOutput.compositeStress, 1)}</span>
                <span className="text-slate">/100</span>
              </span>
            </InlineFormula>
          </div>
          {triggerOutput.hardOverrideActive && (
            <p className="mt-2 text-[10px] text-red-muted leading-tight">{triggerOutput.hardOverrideActive}</p>
          )}
        </Card>

        {/* 5. Cargoes In Transit */}
        <Card>
          <p className="text-xs font-medium text-slate uppercase tracking-wide mb-2">Cargoes In Transit</p>
          <p className="font-mono text-4xl font-semibold text-navy leading-none mb-2">
            {m2.cargoes.length}
          </p>
          <div className="mt-1 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
            <div><span className="text-slate">Docked:</span> <span className="font-mono font-medium">{cargoStatusBuckets.docked}</span></div>
            <div><span className="text-slate">War zone:</span> <span className="font-mono font-medium">{cargoStatusBuckets.in_war_zone}</span></div>
            <div><span className="text-slate">Outside WZ:</span> <span className="font-mono font-medium">{cargoStatusBuckets.outside_war_zone}</span></div>
            <div><span className="text-slate">Not dispatched:</span> <span className="font-mono font-medium">{cargoStatusBuckets.contracted_not_dispatched}</span></div>
          </div>
          <div className="mt-2 text-xs">
            <InlineFormula trace={traceRiskWeightedBarrels(m2.cargoes, scenario.baselineMode)}>
              <span>
                <span className="text-slate">Risk-weighted volume:</span>
                <span className="font-mono font-medium text-navy ml-1">{fmtInt(rwBarrels)} bbl</span>
              </span>
            </InlineFormula>
          </div>
        </Card>

        {/* 6. Iranian Corridor Status */}
        <Card>
          <p className="text-xs font-medium text-slate uppercase tracking-wide mb-2">Iranian Corridor</p>
          <InlineFormula trace={traceIranCorridor(m5, scenario.baselineMode)}>
            <p className={`text-2xl font-semibold leading-none ${iranStatusColor}`}>
              {iranStatus}
            </p>
          </InlineFormula>
          <p className="text-xs text-slate mb-3">Score: <span className="font-mono font-medium">{fmt(iranOutput.corridorScore, 0)}</span>/100</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
            <div>
              <span className="text-slate">Maritime:</span>
              <span className="font-mono font-medium ml-1">{fmtInt(iranOutput.maritimeBblDay)}</span>
              <span className="text-slate"> bbl/d</span>
            </div>
            <div>
              <span className="text-slate">Overland:</span>
              <span className="font-mono font-medium ml-1">{fmtInt(iranOutput.overlandBblDay)}</span>
              <span className="text-slate"> bbl/d</span>
            </div>
          </div>
          <div className="mt-1 text-xs">
            <span className="text-slate">Total:</span>
            <span className="font-mono font-medium text-navy ml-1">{fmtInt(iranOutput.totalBblDay)} bbl/d</span>
          </div>
        </Card>
      </div>

      {/* Oil Import Recommendation */}
      <Card title="Oil Import Recommendation">
        <p className="text-xs text-slate mb-4">
          How much oil should Pakistan import per month? Bounded by financial capacity (upper) and minimum operational demand to limit commercial lockdowns (lower).
        </p>

        {/* Editable constraints */}
        <div className="grid grid-cols-5 gap-3 mb-4">
          <div>
            <label className="text-[10px] text-slate block mb-0.5">SBP Reserves ($B)</label>
            <input type="number" value={irSbp} onChange={(e) => setIrSbp(parseFloat(e.target.value) || 0)} step={0.1} className="w-full font-mono text-sm bg-input-bg border border-border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-navy" />
          </div>
          <div>
            <label className="text-[10px] text-slate block mb-0.5">Reserve Floor ($B)</label>
            <input type="number" value={irFloor} onChange={(e) => setIrFloor(parseFloat(e.target.value) || 0)} step={0.5} className="w-full font-mono text-sm bg-input-bg border border-border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-navy" />
          </div>
          <div>
            <label className="text-[10px] text-slate block mb-0.5">Max Lockdown Days/Week</label>
            <input type="number" value={irLockdown} onChange={(e) => setIrLockdown(parseFloat(e.target.value) || 0)} step={1} min={0} max={7} className="w-full font-mono text-sm bg-input-bg border border-border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-navy" />
          </div>
          <div>
            <label className="text-[10px] text-slate block mb-0.5">War Duration (months)</label>
            <input type="number" value={irWarMonths} onChange={(e) => setIrWarMonths(parseFloat(e.target.value) || 1)} step={1} min={1} className="w-full font-mono text-sm bg-input-bg border border-border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-navy" />
          </div>
          <div>
            <label className="text-[10px] text-slate block mb-0.5">Brent Physical ($/bbl)</label>
            <input type="number" value={irBrent} onChange={(e) => setIrBrent(parseFloat(e.target.value) || 0)} step={1} className="w-full font-mono text-sm bg-input-bg border border-border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-navy" />
          </div>
        </div>

        {/* Three result cards */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="bg-input-bg border border-border rounded-lg p-3">
            <p className="text-[10px] text-slate uppercase tracking-wide mb-1">Upper Bound (Financial)</p>
            <p className="font-mono text-2xl font-semibold text-navy">{fmtInt(Math.round(irResult.upperBound / 1000))}k</p>
            <p className="text-[10px] text-slate">bbl/month — max affordable</p>
            <div className="mt-2 text-[10px] text-slate space-y-0.5">
              <div>Funding: <span className="font-mono text-navy">${fmt(irResult.totalFunding, 2)}B</span></div>
              <div>Monthly budget: <span className="font-mono text-navy">${fmt(irResult.monthlyBudget, 2)}B</span></div>
              <div>Cost/bbl: <span className="font-mono text-navy">${fmt(irResult.perBarrelCost, 0)}</span></div>
            </div>
          </div>

          <div className="bg-input-bg border border-border rounded-lg p-3">
            <p className="text-[10px] text-slate uppercase tracking-wide mb-1">Lower Bound (Operational)</p>
            <p className="font-mono text-2xl font-semibold text-navy">{fmtInt(Math.round(irResult.lowerBound / 1000))}k</p>
            <p className="text-[10px] text-slate">bbl/month — min to avoid &gt;{irLockdown}d lockdown</p>
            <div className="mt-2 text-[10px] text-slate space-y-0.5">
              <div>Operating: <span className="font-mono text-navy">{(irResult.operatingFraction * 100).toFixed(0)}%</span> of week ({7 - irLockdown}d/7d)</div>
              <div>Reduced demand: <span className="font-mono text-navy">{fmtInt(Math.round(irResult.reducedDailyDemand))} bbl/d</span></div>
              <div>Stock offset: <span className="font-mono text-navy">{fmtInt(Math.round(irResult.stockCoverPerMonth))} bbl/mo</span></div>
            </div>
          </div>

          <div className={`border rounded-lg p-3 ${irResult.feasible ? 'bg-green-muted/5 border-green-muted/30' : 'bg-red-muted/5 border-red-muted/30'}`}>
            <p className="text-[10px] text-slate uppercase tracking-wide mb-1">Recommendation</p>
            <p className={`font-mono text-2xl font-semibold ${irResult.feasible ? 'text-green-muted' : 'text-red-muted'}`}>
              {fmtInt(Math.round(irResult.recommended / 1000))}k
            </p>
            <p className="text-[10px] text-slate">bbl/month</p>
            <div className={`mt-2 inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${irResult.feasible ? 'bg-green-muted/15 text-green-muted' : 'bg-red-muted/15 text-red-muted'}`}>
              {irResult.feasible ? 'FEASIBLE' : 'DEFICIT'}
              {irResult.feasible
                ? ` (+${irResult.surplusOrDeficitPct.toFixed(0)}% headroom)`
                : ` (${fmtInt(Math.round(irResult.deficit))} bbl shortfall)`
              }
            </div>
          </div>
        </div>

        {/* Reasoning */}
        <div className="bg-input-bg border border-border rounded p-3 text-xs text-foreground leading-relaxed">
          <span className="font-semibold text-navy">Reasoning: </span>
          {irResult.reasoning}
        </div>

        {/* Formula breakdown */}
        <div className="mt-2">
          <InlineFormula trace={irTrace}>
            <span className="text-xs text-slate">Show formula</span>
          </InlineFormula>
        </div>
      </Card>

      {/* Depletion Curves Chart */}
      <Card title="90-Day Depletion Curves by Conservation Level">
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={depletionData} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e0dc" />
              <XAxis
                dataKey="day"
                tick={{ fontSize: 11, fill: '#64748b' }}
                label={{ value: 'Day', position: 'insideBottomRight', offset: -5, style: { fontSize: 11, fill: '#64748b' } }}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#64748b' }}
                label={{ value: 'Days of Cover', angle: -90, position: 'insideLeft', style: { fontSize: 11, fill: '#64748b' } }}
              />
              <Tooltip
                contentStyle={{ fontSize: 11, fontFamily: 'IBM Plex Mono, monospace', background: '#fff', border: '1px solid #e2e0dc' }}
                formatter={(value: unknown) => [fmt(Number(value), 1), '']}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />

              {/* HSD lines */}
              <Line dataKey="hsd_none" name="HSD (No conservation)" stroke="#1a1a2e" strokeWidth={2} dot={false} />
              <Line dataKey="hsd_alert" name="HSD (Alert)" stroke="#1a1a2e" strokeWidth={1.5} strokeDasharray="8 4" dot={false} />
              <Line dataKey="hsd_austerity" name="HSD (Austerity)" stroke="#1a1a2e" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
              <Line dataKey="hsd_emergency" name="HSD (Emergency)" stroke="#1a1a2e" strokeWidth={1} strokeDasharray="2 2" dot={false} />

              {/* MS lines */}
              <Line dataKey="ms_none" name="MS (No conservation)" stroke="#2563eb" strokeWidth={2} dot={false} />
              <Line dataKey="ms_alert" name="MS (Alert)" stroke="#2563eb" strokeWidth={1.5} strokeDasharray="8 4" dot={false} />
              <Line dataKey="ms_austerity" name="MS (Austerity)" stroke="#2563eb" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
              <Line dataKey="ms_emergency" name="MS (Emergency)" stroke="#2563eb" strokeWidth={1} strokeDasharray="2 2" dot={false} />

              {/* FO lines */}
              <Line dataKey="fo_none" name="FO (No conservation)" stroke="#c0392b" strokeWidth={2} dot={false} />
              <Line dataKey="fo_alert" name="FO (Alert)" stroke="#c0392b" strokeWidth={1.5} strokeDasharray="8 4" dot={false} />
              <Line dataKey="fo_austerity" name="FO (Austerity)" stroke="#c0392b" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
              <Line dataKey="fo_emergency" name="FO (Emergency)" stroke="#c0392b" strokeWidth={1} strokeDasharray="2 2" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-3 flex items-center gap-6 text-xs text-slate">
          <span>Solid = No conservation</span>
          <span>Long dash = Alert</span>
          <span>Short dash = Austerity</span>
          <span>Dots = Emergency</span>
          <span className="ml-auto">
            <span className="inline-block w-3 h-0.5 bg-navy mr-1" /> HSD
            <span className="inline-block w-3 h-0.5 bg-accent-blue mx-1 ml-3" /> MS
            <span className="inline-block w-3 h-0.5 bg-red-muted mx-1 ml-3" /> FO
          </span>
        </div>
      </Card>

      {/* Recommendation Banner */}
      <div className={`rounded-lg border p-4 ${LEVEL_COLORS[triggerOutput.recommendedLevel]}`}>
        <div className="flex items-start gap-3">
          <span className={`mt-0.5 w-3 h-3 rounded-full flex-shrink-0 ${LEVEL_DOT[triggerOutput.recommendedLevel]}`} />
          <div>
            <p className="text-sm font-semibold mb-1">
              Module 8 trigger function recommends: {triggerOutput.recommendedLevel}
            </p>
            <div className="text-xs space-y-0.5 opacity-90">
              <p>Composite stress: {fmt(triggerOutput.compositeStress, 1)}/100</p>
              <p>
                Components &mdash;
                Days-of-cover stress: {fmt(triggerOutput.components.stressD, 1)} |
                Price stress: {fmt(triggerOutput.components.stressP, 1)} |
                Pipeline stress: {fmt(triggerOutput.components.stressS, 1)} |
                Alternate buffer: {fmt(triggerOutput.components.bufferA, 1)} |
                Iran buffer: {fmt(triggerOutput.components.bufferI, 1)}
              </p>
              {triggerOutput.hardOverrideActive && (
                <p className="font-medium mt-1">Override: {triggerOutput.hardOverrideActive}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
