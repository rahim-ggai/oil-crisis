'use client';

import { useMemo } from 'react';
import { useAppStore } from '@/lib/store';
import {
  getWeightedDaysOfCover,
  getDaysOfCover,
} from '@/lib/calculations/m1-inventory';
import { getRiskWeightedBarrels, getPipelineStatusScore } from '@/lib/calculations/m2-pipeline';
import { computeAllRefineryOutputs, getTotalDailyOutput } from '@/lib/calculations/m3-refining';
import { computeIranCorridor } from '@/lib/calculations/m5-iran';
import { computeAffordability } from '@/lib/calculations/m6-price';
import { computeTrigger } from '@/lib/calculations/m8-trigger';
import type { TriggerLevel } from '@/types';

const LEVEL_LABELS: Record<TriggerLevel, string> = {
  NORMAL: 'NORMAL',
  ALERT: 'ALERT',
  AUSTERITY: 'AUSTERITY',
  EMERGENCY: 'EMERGENCY',
};

function fmt(n: number, decimals = 1): string {
  if (!isFinite(n)) return '--';
  return n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function fmtInt(n: number): string {
  if (!isFinite(n)) return '--';
  return Math.round(n).toLocaleString('en-US');
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <h3 className="text-sm font-semibold text-navy uppercase tracking-wide border-b border-navy pb-1 mb-3">
        {title}
      </h3>
      {children}
    </div>
  );
}

function Row({ label, value, unit }: { label: string; value: string | number; unit?: string }) {
  const displayValue = typeof value === 'number' ? (Number.isFinite(value) ? value.toLocaleString('en-US') : '--') : value;
  return (
    <div className="flex justify-between py-1 text-xs border-b border-border/50">
      <span className="text-slate">{label}</span>
      <span className="font-mono font-medium text-navy">{displayValue}{unit ? ` ${unit}` : ''}</span>
    </div>
  );
}

export function ReportPanel() {
  const scenario = useAppStore((s) => s.scenario);
  const { m1, m2, m3, m4, m5, m6, m7, m8 } = scenario;

  const triggerOutput = useMemo(() => computeTrigger(scenario), [scenario]);
  const iranOutput = useMemo(() => computeIranCorridor(m5, scenario.baselineMode), [m5, scenario.baselineMode]);
  const affordability = useMemo(() => computeAffordability(m6), [m6]);
  const rwBarrels = useMemo(() => getRiskWeightedBarrels(m2.cargoes, scenario.baselineMode), [m2.cargoes, scenario.baselineMode]);
  const pipelineScore = useMemo(() => getPipelineStatusScore(m2.cargoes, scenario.baselineMode), [m2.cargoes, scenario.baselineMode]);
  const refineryOutputs = useMemo(() => computeAllRefineryOutputs(m3, m1.foDailyConsumption), [m3, m1.foDailyConsumption]);
  const totalOutput = useMemo(() => getTotalDailyOutput(refineryOutputs), [refineryOutputs]);

  const weightedDays = useMemo(() => getWeightedDaysOfCover(m1), [m1]);
  const hsdDays = getDaysOfCover(m1.hsdStock, m1.hsdDailyConsumption);
  const msDays = getDaysOfCover(m1.msStock, m1.msDailyConsumption);
  const foDays = getDaysOfCover(m1.foStock, m1.foDailyConsumption);

  const dateStr = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  const activeSources = m4.sources.filter((s) => s.activated);
  const totalAlternateLiftable = activeSources.reduce((sum, s) => sum + s.maxLiftableKbblMonth, 0);

  return (
    <div>
      {/* Print button */}
      <div className="no-print mb-4 flex justify-end">
        <button
          onClick={() => window.print()}
          className="px-4 py-2 text-sm font-medium bg-navy text-white rounded hover:bg-navy-light transition-colors"
        >
          Print Report
        </button>
      </div>

      {/* Report document */}
      <div className="max-w-3xl mx-auto bg-white border border-border rounded-lg print:border-none print:rounded-none print:shadow-none">
        {/* Classification banner */}
        <div className="bg-navy text-white text-center py-2 text-[10px] font-mono font-semibold tracking-[0.15em] uppercase rounded-t-lg print:rounded-none print:bg-white print:text-black print:border-b-2 print:border-black">
          CONFIDENTIAL -- National Energy Security Working Group
        </div>

        <div className="p-8 print:p-6">
          {/* Title block */}
          <div className="text-center mb-8 pb-6 border-b-2 border-navy">
            <h1 className="text-xl font-semibold text-navy mb-1">Scenario Analysis Report</h1>
            <p className="text-sm text-navy font-medium">{scenario.scenarioName}</p>
            <p className="text-xs text-slate mt-2">{dateStr}</p>
            <p className="text-xs text-slate">
              Baseline: {scenario.baselineMode === 'full_corridor_compromised' ? 'Full Corridor Compromised' : 'Iran-Permitted Transit'}
            </p>
          </div>

          {/* Executive Summary */}
          <Section title="Executive Summary">
            <div className="bg-input-bg rounded p-4 mb-4 print:bg-white print:border print:border-black">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-xs text-slate">Trigger Level</p>
                  <p className="font-mono text-lg font-semibold text-navy">{triggerOutput.recommendedLevel}</p>
                </div>
                <div>
                  <p className="text-xs text-slate">Days of Cover</p>
                  <p className="font-mono text-lg font-semibold text-navy">{fmt(weightedDays, 0)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate">Composite Stress</p>
                  <p className="font-mono text-lg font-semibold text-navy">{fmt(triggerOutput.compositeStress, 1)}/100</p>
                </div>
              </div>
            </div>
            <div className="text-xs text-foreground leading-relaxed space-y-2">
              <p>
                Under the <strong>{scenario.scenarioName}</strong> configuration, the weighted days of fuel cover
                stand at <strong>{fmt(weightedDays, 0)} days</strong> (HSD: {fmt(hsdDays, 0)}d, MS: {fmt(msDays, 0)}d, FO: {fmt(foDays, 0)}d).
                Brent crude is trading at <strong>${fmt(m6.currentBrentSpot, 0)}/bbl</strong>,
                a {fmt(((m6.currentBrentSpot - m6.preCrisisBrent) / m6.preCrisisBrent) * 100, 0)}% increase over the pre-crisis baseline.
              </p>
              <p>
                SBP reserves at <strong>${fmt(m6.sbpReserves, 1)}B</strong> provide approximately {fmt(m6.sbpReserves / m6.normalMonthlyImportBill, 1)} months
                of import cover. The Iranian corridor is {iranOutput.totalBblDay === 0 ? 'closed' : iranOutput.corridorScore < 50 ? 'degraded' : 'open'} with
                throughput of {fmtInt(iranOutput.totalBblDay)} bbl/day.
              </p>
              <p>
                The Module 8 trigger function recommends <strong>{triggerOutput.recommendedLevel}</strong> level
                with a composite stress score of {fmt(triggerOutput.compositeStress, 1)}/100.
                {triggerOutput.hardOverrideActive ? ` Hard override active: ${triggerOutput.hardOverrideActive}` : ''}
              </p>
            </div>
          </Section>

          {/* M1 — Inventory */}
          <Section title="M1: Domestic Fuel Inventory">
            <Row label="Crude oil stock" value={fmtInt(m1.crudeOilStock)} unit="barrels" />
            <Row label="HSD stock" value={fmtInt(m1.hsdStock)} unit="tonnes" />
            <Row label="MS stock" value={fmtInt(m1.msStock)} unit="tonnes" />
            <Row label="FO stock" value={fmtInt(m1.foStock)} unit="tonnes" />
            <Row label="LPG stock" value={fmtInt(m1.lpgStock)} unit="tonnes" />
            <Row label="JP-1 stock" value={fmtInt(m1.jp1Stock)} unit="tonnes" />
            <Row label="HSD days of cover" value={fmt(hsdDays, 1)} unit="days" />
            <Row label="MS days of cover" value={fmt(msDays, 1)} unit="days" />
            <Row label="FO days of cover" value={fmt(foDays, 1)} unit="days" />
            <Row label="Weighted days of cover" value={fmt(weightedDays, 1)} unit="days" />
          </Section>

          {/* M2 — Pipeline */}
          <Section title="M2: Seaborne Supply Pipeline">
            <Row label="Total cargoes" value={m2.cargoes.length} />
            <Row label="Risk-weighted volume" value={fmtInt(rwBarrels)} unit="barrels" />
            <Row label="Pipeline status score" value={fmt(pipelineScore, 1)} unit="/100" />
            <div className="mt-3">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border text-left text-slate">
                    <th className="py-1 font-medium">Vessel</th>
                    <th className="py-1 font-medium">Product</th>
                    <th className="py-1 font-medium text-right">Qty (bbl)</th>
                    <th className="py-1 font-medium">Status</th>
                    <th className="py-1 font-medium text-right">Loss Prob.</th>
                  </tr>
                </thead>
                <tbody>
                  {m2.cargoes.map((c) => (
                    <tr key={c.id} className="border-b border-border/30">
                      <td className="py-1">{c.vesselName}</td>
                      <td className="py-1">{c.product}</td>
                      <td className="py-1 font-mono text-right">{fmtInt(c.quantityBarrels)}</td>
                      <td className="py-1">{c.status.replace(/_/g, ' ')}</td>
                      <td className="py-1 font-mono text-right">{(c.lossProbability * 100).toFixed(0)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          {/* M3 — Refining */}
          <Section title="M3: Crude Oil Conversion Matrix">
            <Row label="Total refining capacity" value={fmtInt(m3.refineries.reduce((s, r) => s + r.capacityBpd, 0))} unit="bpd" />
            <Row label="Daily HSD output" value={fmt(totalOutput.hsd, 0)} unit="tonnes" />
            <Row label="Daily MS/naphtha output" value={fmt(totalOutput.naphthaPetrol, 0)} unit="tonnes" />
            <Row label="Daily FO output" value={fmt(totalOutput.fo, 0)} unit="tonnes" />
            <Row label="FO storage buffer" value={m3.foStorageDays.toString()} unit="days" />
          </Section>

          {/* M4 — Alternates */}
          <Section title="M4: Alternate Sourcing and Logistics">
            <Row label="Active alternate sources" value={activeSources.length} />
            <Row label="Total liftable volume" value={fmtInt(totalAlternateLiftable)} unit="kbbl/month" />
            <div className="mt-3">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border text-left text-slate">
                    <th className="py-1 font-medium">Country</th>
                    <th className="py-1 font-medium">Product</th>
                    <th className="py-1 font-medium text-right">Max kbbl/mo</th>
                    <th className="py-1 font-medium text-right">Transit (crisis)</th>
                    <th className="py-1 font-medium">Active</th>
                  </tr>
                </thead>
                <tbody>
                  {m4.sources.map((s) => (
                    <tr key={s.id} className="border-b border-border/30">
                      <td className="py-1">{s.country}</td>
                      <td className="py-1">{s.product}</td>
                      <td className="py-1 font-mono text-right">{fmtInt(s.maxLiftableKbblMonth)}</td>
                      <td className="py-1 font-mono text-right">{s.crisisTransitDays}d</td>
                      <td className="py-1">{s.activated ? 'Yes' : 'No'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          {/* M5 — Iran */}
          <Section title="M5: Iran-Specific Supply Corridors">
            <Row label="Corridor status" value={iranOutput.totalBblDay === 0 ? 'Closed' : iranOutput.corridorScore < 50 ? 'Degraded' : 'Open'} />
            <Row label="Maritime throughput" value={fmtInt(iranOutput.maritimeBblDay)} unit="bbl/day" />
            <Row label="Overland throughput" value={fmtInt(iranOutput.overlandBblDay)} unit="bbl/day" />
            <Row label="Total throughput" value={fmtInt(iranOutput.totalBblDay)} unit="bbl/day" />
            <Row label="Corridor score" value={fmt(iranOutput.corridorScore, 0)} unit="/100" />
            <Row label="Iranian production" value={`${(m5.iranianProductionPct * 100).toFixed(0)}%`} />
            <Row label="Security situation" value={m5.securitySituation} />
          </Section>

          {/* M6 — Price */}
          <Section title="M6: Price-Linked Procurement">
            <Row label="Pre-crisis Brent" value={`$${fmt(m6.preCrisisBrent, 0)}`} unit="/bbl" />
            <Row label="Current Brent spot" value={`$${fmt(m6.currentBrentSpot, 0)}`} unit="/bbl" />
            <Row label="Price multiplier" value={`${fmt(m6.brentMultiplier, 2)}x`} />
            <Row label="SBP reserves" value={`$${fmt(m6.sbpReserves, 1)}B`} />
            <Row label="Reserves floor" value={`$${fmt(m6.reservesFloor, 0)}B`} />
            <Row label="Max monthly expenditure" value={`$${fmt(affordability.maxMonthlyExpenditure, 2)}B`} />
            <Row label="Affordable barrels" value={fmtInt(affordability.affordableBarrels)} unit="bbl/month" />
            <Row label="Normal demand" value={fmtInt(affordability.normalDemandBarrels)} unit="bbl/month" />
            <Row label="Months of war funding" value={affordability.monthsOfWarFunding.toString()} />
          </Section>

          {/* M7 — Conservation */}
          <Section title="M7: Conservation Levels">
            <div className="text-xs space-y-3">
              {(['alert', 'austerity', 'emergency'] as const).map((level) => {
                const reductions = level === 'alert' ? m7.alertReductions : level === 'austerity' ? m7.austerityReductions : m7.emergencyReductions;
                return (
                  <div key={level}>
                    <p className="font-semibold text-navy capitalize mb-1">{level} Level Demand Reductions</p>
                    <div className="grid grid-cols-4 gap-2">
                      <div>HSD: <span className="font-mono">{(reductions.hsd * 100).toFixed(0)}%</span></div>
                      <div>MS: <span className="font-mono">{(reductions.ms * 100).toFixed(0)}%</span></div>
                      <div>FO: <span className="font-mono">{(reductions.fo * 100).toFixed(0)}%</span></div>
                      <div>JP-1: <span className="font-mono">{(reductions.jp1 * 100).toFixed(0)}%</span></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Section>

          {/* M8 — Trigger */}
          <Section title="M8: Dynamic Trigger Logic">
            <Row label="Composite stress" value={fmt(triggerOutput.compositeStress, 2)} unit="/100" />
            <Row label="Recommended level" value={triggerOutput.recommendedLevel} />
            <Row label="Days-of-cover stress (D)" value={fmt(triggerOutput.components.stressD, 2)} />
            <Row label="Price stress (P)" value={fmt(triggerOutput.components.stressP, 2)} />
            <Row label="Pipeline stress (S)" value={fmt(triggerOutput.components.stressS, 2)} />
            <Row label="Alternate buffer (A)" value={fmt(triggerOutput.components.bufferA, 2)} />
            <Row label="Iran corridor buffer (I)" value={fmt(triggerOutput.components.bufferI, 2)} />
            <Row label="Weights" value={`D:${m8.weights.wD} P:${m8.weights.wP} S:${m8.weights.wS} A:${m8.weights.wA} I:${m8.weights.wI}`} />
            {m8.manualOverride && <Row label="Manual override" value={m8.manualOverride} />}
            {triggerOutput.hardOverrideActive && <Row label="Hard override" value={triggerOutput.hardOverrideActive} />}
          </Section>

          {/* Recommendations */}
          <Section title="Recommendations">
            <div className="text-xs text-foreground leading-relaxed space-y-2">
              {triggerOutput.recommendedLevel === 'NORMAL' && (
                <p>Current conditions do not warrant elevated conservation measures. Continue monitoring all indicators. Maintain readiness for rapid escalation if conditions deteriorate.</p>
              )}
              {triggerOutput.recommendedLevel === 'ALERT' && (
                <>
                  <p>1. Activate Alert-level conservation measures: odd/even plate restrictions for private vehicles, maintain 90% goods transport operations.</p>
                  <p>2. Accelerate activation of alternate supply sources. Current active sources: {activeSources.length} ({fmtInt(totalAlternateLiftable)} kbbl/month).</p>
                  <p>3. Engage diplomatic channels for deferred payment facilities.</p>
                  <p>4. Brief provincial governments on potential escalation protocols.</p>
                </>
              )}
              {triggerOutput.recommendedLevel === 'AUSTERITY' && (
                <>
                  <p>1. Implement Austerity-level conservation: weekend driving bans, 20L/week fuel cap, 65% goods transport, expanded public transit.</p>
                  <p>2. Activate all viable alternate supply sources immediately. Consider sources with higher freight premiums.</p>
                  <p>3. Invoke Saudi deferred payment facility{m6.saudiDoubled ? ' (doubled)' : ''}. Draw on China swap line (${ fmt(m6.chinaSwapLine, 1)}B).</p>
                  <p>4. Shift power generation to coal/hydro/nuclear. Suspend non-essential industrial allocation to 70%.</p>
                  <p>5. Coordinate with military for logistics support and strategic reserve deployment.</p>
                </>
              )}
              {triggerOutput.recommendedLevel === 'EMERGENCY' && (
                <>
                  <p>1. IMMEDIATE: Implement Emergency-level conservation. Complete private vehicle ban except medical/emergency/state. Goods transport at 35% -- military/food/medicine only.</p>
                  <p>2. IMMEDIATE: Activate all alternate supply sources regardless of cost premium.</p>
                  <p>3. Deploy strategic reserves under military coordination.</p>
                  <p>4. Implement rolling load-shedding: 6h urban, 10h rural. 24/7 public transport operations.</p>
                  <p>5. Request emergency IMF/bilateral assistance. Invoke all deferred payment facilities.</p>
                  <p>6. Mobilize rationing infrastructure at district level. Prepare for potential 2-day weekly lockdowns.</p>
                  <p>7. Convene National Energy Security Committee for daily situation reports.</p>
                </>
              )}
            </div>
          </Section>

          {/* Footer */}
          <div className="mt-8 pt-4 border-t border-border text-center text-[10px] text-slate">
            <p>This document is produced by the Pakistan Energy Crisis Simulation System.</p>
            <p>Generated {dateStr}. Classification: CONFIDENTIAL.</p>
          </div>
        </div>

        {/* Bottom classification banner */}
        <div className="bg-navy text-white text-center py-2 text-[10px] font-mono font-semibold tracking-[0.15em] uppercase rounded-b-lg print:rounded-none print:bg-white print:text-black print:border-t-2 print:border-black">
          CONFIDENTIAL -- National Energy Security Working Group
        </div>
      </div>
    </div>
  );
}
