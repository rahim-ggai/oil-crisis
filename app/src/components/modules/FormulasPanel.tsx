'use client';

import { useAppStore } from '@/lib/store';
import { DEFAULT_FORMULA_PARAMS } from '@/lib/defaults';
import { ModulePanel, Card } from '@/components/ui/ModulePanel';
import { InputField } from '@/components/ui/InputField';
import type { FormulaParams } from '@/types';

function SectionDescription({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-slate mb-4">{children}</p>;
}

export function FormulasPanel() {
  const fp = useAppStore((s) => s.scenario.formulaParams);
  const m7 = useAppStore((s) => s.scenario.m7);
  const update = useAppStore((s) => s.updateFormulaParams);
  const updateM7 = useAppStore((s) => s.updateM7);
  const loadScenario = useAppStore((s) => s.loadScenario);
  const scenario = useAppStore((s) => s.scenario);

  const handleReset = () => {
    loadScenario({ ...scenario, formulaParams: { ...DEFAULT_FORMULA_PARAMS } });
  };

  const set = (key: keyof FormulaParams) => (val: number) => {
    update({ [key]: val });
  };

  const weightSum = fp.m1_hsdWeight + fp.m1_msWeight + fp.m1_foWeight;
  const weightSumOk = Math.abs(weightSum - 1.0) < 0.01;

  return (
    <ModulePanel
      title="Formula Parameters"
      subtitle="Edit the constants and thresholds used in all model calculations. Changes propagate immediately to all modules."
    >
      <div className="mb-6">
        <button
          onClick={handleReset}
          className="px-4 py-2 text-sm font-medium border border-border rounded bg-card hover:bg-card-hover text-navy transition-colors"
        >
          Reset All to Defaults
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* M1 */}
        <Card title="M1 — Days of Cover Weighting">
          <SectionDescription>
            Relative importance of each fuel type when computing the weighted days-of-cover index. Weights should sum to 1.0.
          </SectionDescription>
          <InputField label="HSD Weight" value={fp.m1_hsdWeight} onChange={set('m1_hsdWeight')} step={0.01} min={0} max={1} />
          <InputField label="MS Weight" value={fp.m1_msWeight} onChange={set('m1_msWeight')} step={0.01} min={0} max={1} />
          <InputField label="FO Weight" value={fp.m1_foWeight} onChange={set('m1_foWeight')} step={0.01} min={0} max={1} />
          <div className={`text-xs font-mono mt-2 ${weightSumOk ? 'text-green-700' : 'text-red-600'}`}>
            Sum: {weightSum.toFixed(2)} {weightSumOk ? '(valid)' : '(should be 1.0)'}
          </div>
        </Card>

        {/* M1/M7 — Demand Reductions */}
        <Card title="M1/M7 — Demand Reductions by Conservation Level" className="lg:col-span-2">
          <SectionDescription>
            Percentage reduction in demand for each fuel type at each conservation level. These directly affect the days-of-cover projections in M1 and the depletion curves. Values are set as decimals (e.g., 0.08 = 8% reduction).
          </SectionDescription>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6">
            <div>
              <h4 className="text-xs font-semibold text-navy mb-2 uppercase tracking-wide">Alert (Level 1)</h4>
              <InputField label="HSD (Diesel) Reduction" value={m7.alertReductions.hsd} onChange={(v) => updateM7({ alertReductions: { ...m7.alertReductions, hsd: v } })} step={0.01} min={0} max={1} unit="0-1" />
              <InputField label="MS (Petrol) Reduction" value={m7.alertReductions.ms} onChange={(v) => updateM7({ alertReductions: { ...m7.alertReductions, ms: v } })} step={0.01} min={0} max={1} unit="0-1" />
              <InputField label="FO (Furnace Oil) Reduction" value={m7.alertReductions.fo} onChange={(v) => updateM7({ alertReductions: { ...m7.alertReductions, fo: v } })} step={0.01} min={0} max={1} unit="0-1" />
              <InputField label="JP-1 (Jet Fuel) Reduction" value={m7.alertReductions.jp1} onChange={(v) => updateM7({ alertReductions: { ...m7.alertReductions, jp1: v } })} step={0.01} min={0} max={1} unit="0-1" />
            </div>
            <div>
              <h4 className="text-xs font-semibold text-navy mb-2 uppercase tracking-wide">Austerity (Level 2)</h4>
              <InputField label="HSD (Diesel) Reduction" value={m7.austerityReductions.hsd} onChange={(v) => updateM7({ austerityReductions: { ...m7.austerityReductions, hsd: v } })} step={0.01} min={0} max={1} unit="0-1" />
              <InputField label="MS (Petrol) Reduction" value={m7.austerityReductions.ms} onChange={(v) => updateM7({ austerityReductions: { ...m7.austerityReductions, ms: v } })} step={0.01} min={0} max={1} unit="0-1" />
              <InputField label="FO (Furnace Oil) Reduction" value={m7.austerityReductions.fo} onChange={(v) => updateM7({ austerityReductions: { ...m7.austerityReductions, fo: v } })} step={0.01} min={0} max={1} unit="0-1" />
              <InputField label="JP-1 (Jet Fuel) Reduction" value={m7.austerityReductions.jp1} onChange={(v) => updateM7({ austerityReductions: { ...m7.austerityReductions, jp1: v } })} step={0.01} min={0} max={1} unit="0-1" />
            </div>
            <div>
              <h4 className="text-xs font-semibold text-navy mb-2 uppercase tracking-wide">Emergency (Level 3)</h4>
              <InputField label="HSD (Diesel) Reduction" value={m7.emergencyReductions.hsd} onChange={(v) => updateM7({ emergencyReductions: { ...m7.emergencyReductions, hsd: v } })} step={0.01} min={0} max={1} unit="0-1" />
              <InputField label="MS (Petrol) Reduction" value={m7.emergencyReductions.ms} onChange={(v) => updateM7({ emergencyReductions: { ...m7.emergencyReductions, ms: v } })} step={0.01} min={0} max={1} unit="0-1" />
              <InputField label="FO (Furnace Oil) Reduction" value={m7.emergencyReductions.fo} onChange={(v) => updateM7({ emergencyReductions: { ...m7.emergencyReductions, fo: v } })} step={0.01} min={0} max={1} unit="0-1" />
              <InputField label="JP-1 (Jet Fuel) Reduction" value={m7.emergencyReductions.jp1} onChange={(v) => updateM7({ emergencyReductions: { ...m7.emergencyReductions, jp1: v } })} step={0.01} min={0} max={1} unit="0-1" />
            </div>
          </div>
        </Card>

        {/* M2 */}
        <Card title="M2 — Pipeline Risk Parameters">
          <SectionDescription>
            Loss probabilities by cargo status and baseline scoring thresholds for the seaborne supply pipeline reliability model.
          </SectionDescription>
          <InputField label="Loss Prob — Docked" value={fp.m2_lossProb_docked} onChange={set('m2_lossProb_docked')} step={0.01} min={0} max={1} unit="0-1" />
          <InputField label="Loss Prob — War Zone" value={fp.m2_lossProb_warZone} onChange={set('m2_lossProb_warZone')} step={0.01} min={0} max={1} unit="0-1" />
          <InputField label="Loss Prob — Outside War Zone" value={fp.m2_lossProb_outsideWarZone} onChange={set('m2_lossProb_outsideWarZone')} step={0.01} min={0} max={1} unit="0-1" />
          <InputField label="Loss Prob — Contracted" value={fp.m2_lossProb_contracted} onChange={set('m2_lossProb_contracted')} step={0.01} min={0} max={1} unit="0-1" />
          <InputField label="Pipeline Score Baseline" value={fp.m2_pipelineScoreBaseline} onChange={set('m2_pipelineScoreBaseline')} step={100000} min={0} unit="bbl" />
          <InputField label="Iran Permitted Transit Cap" value={fp.m2_iranPermittedTransitCap} onChange={set('m2_iranPermittedTransitCap')} step={0.01} min={0} max={1} unit="0-1" />
          <InputField label="Full Corridor Floor" value={fp.m2_fullCorridorFloor} onChange={set('m2_fullCorridorFloor')} step={0.01} min={0} max={1} unit="0-1" />
        </Card>

        {/* M3 */}
        <Card title="M3 — Refinery Feasibility">
          <SectionDescription>
            Thresholds governing when fuel-oil yield makes a crude grade infeasible for hydroskimming refineries, plus PARCO-specific adjustments.
          </SectionDescription>
          <InputField label="FO Infeasible Threshold" value={fp.m3_foInfeasibleThreshold} onChange={set('m3_foInfeasibleThreshold')} step={1} min={0} max={100} unit="%" />
          <InputField label="FO Feasible Threshold" value={fp.m3_foFeasibleThreshold} onChange={set('m3_foFeasibleThreshold')} step={1} min={0} max={100} unit="%" />
          <InputField label="PARCO HSD Bonus" value={fp.m3_parcoHsdBonus} onChange={set('m3_parcoHsdBonus')} step={1} min={0} max={100} unit="%" />
          <InputField label="PARCO FO Reduction" value={fp.m3_parcoFoReduction} onChange={set('m3_parcoFoReduction')} step={1} min={0} max={100} unit="%" />
          <InputField label="Barrel-to-Tonne Conversion" value={fp.m3_barrelToTonneConversion} onChange={set('m3_barrelToTonneConversion')} step={0.001} min={0} />
        </Card>

        {/* M5 */}
        <Card title="M5 — Iran Corridor">
          <SectionDescription>
            VLCC load sizing, maximum throughput baseline, and security-situation multipliers for the Iran maritime and overland corridors.
          </SectionDescription>
          <InputField label="VLCC Load Size" value={fp.m5_vlccLoadSize} onChange={set('m5_vlccLoadSize')} step={10000} min={0} unit="bbl" />
          <InputField label="Max Capacity Baseline" value={fp.m5_maxCapacityBaseline} onChange={set('m5_maxCapacityBaseline')} step={10000} min={0} unit="bbl/day" />
          <InputField label="Security Multiplier — Hostile" value={fp.m5_securityMultiplier_hostile} onChange={set('m5_securityMultiplier_hostile')} step={0.05} min={0} max={1} />
          <InputField label="Security Multiplier — Tense" value={fp.m5_securityMultiplier_tense} onChange={set('m5_securityMultiplier_tense')} step={0.05} min={0} max={1} />
          <InputField label="Security Multiplier — Normal" value={fp.m5_securityMultiplier_normal} onChange={set('m5_securityMultiplier_normal')} step={0.05} min={0} max={1} />
        </Card>

        {/* M6 */}
        <Card title="M6 — Price & Affordability">
          <SectionDescription>
            Premium multipliers applied to product and freight costs during crisis procurement, plus war-duration and baseline demand assumptions.
          </SectionDescription>
          <InputField label="Product Premium" value={fp.m6_productPremium} onChange={set('m6_productPremium')} step={0.01} min={1} unit="multiplier" />
          <InputField label="Freight Premium" value={fp.m6_freightPremium} onChange={set('m6_freightPremium')} step={0.01} min={1} unit="multiplier" />
          <InputField label="War Duration" value={fp.m6_warDurationMonths} onChange={set('m6_warDurationMonths')} step={1} min={1} unit="months" />
          <InputField label="Normal Demand" value={fp.m6_normalDemandBpd} onChange={set('m6_normalDemandBpd')} step={1000} min={0} unit="bbl/day" />
        </Card>

        {/* M8 — full width */}
        <Card title="M8 — Trigger Logic" className="lg:col-span-2">
          <SectionDescription>
            The most critical section. These parameters control how the composite stress score is normalized, which thresholds trigger each crisis level, and the hard-override conditions that can force an immediate escalation regardless of the composite score.
          </SectionDescription>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6">
            <div>
              <h4 className="text-xs font-semibold text-navy mb-2 uppercase tracking-wide">Stress Normalization</h4>
              <InputField label="Max Days (Stress D)" value={fp.m8_stressD_maxDays} onChange={set('m8_stressD_maxDays')} step={1} min={1} unit="days" />
              <InputField label="Max Price Multiplier (Stress P)" value={fp.m8_stressP_maxMultiplier} onChange={set('m8_stressP_maxMultiplier')} step={0.5} min={1} unit="x" />
              <InputField label="Buffer Discount" value={fp.m8_bufferDiscount} onChange={set('m8_bufferDiscount')} step={0.05} min={0} max={1} />
            </div>
            <div>
              <h4 className="text-xs font-semibold text-navy mb-2 uppercase tracking-wide">Level Thresholds</h4>
              <InputField label="Alert Threshold" value={fp.m8_thresholdAlert} onChange={set('m8_thresholdAlert')} step={1} min={0} max={100} />
              <InputField label="Austerity Threshold" value={fp.m8_thresholdAusterity} onChange={set('m8_thresholdAusterity')} step={1} min={0} max={100} />
              <InputField label="Emergency Threshold" value={fp.m8_thresholdEmergency} onChange={set('m8_thresholdEmergency')} step={1} min={0} max={100} />
            </div>
            <div>
              <h4 className="text-xs font-semibold text-navy mb-2 uppercase tracking-wide">Hard Override Conditions</h4>
              <InputField label="Critical Stock Days" value={fp.m8_hardOverride_criticalStockDays} onChange={set('m8_hardOverride_criticalStockDays')} step={1} min={0} unit="days" />
              <InputField label="No Cargo Days" value={fp.m8_hardOverride_noCargoDays} onChange={set('m8_hardOverride_noCargoDays')} step={1} min={0} unit="days" />
              <InputField label="Price Multiplier Override" value={fp.m8_hardOverride_priceMultiplier} onChange={set('m8_hardOverride_priceMultiplier')} step={0.5} min={1} unit="x" />
              <InputField label="Reserves Floor" value={fp.m8_hardOverride_reservesFloor} onChange={set('m8_hardOverride_reservesFloor')} step={0.5} min={0} unit="USD bn" />
              <InputField label="Min Alternate Score" value={fp.m8_hardOverride_minAlternateScore} onChange={set('m8_hardOverride_minAlternateScore')} step={1} min={0} max={100} />
            </div>
          </div>
        </Card>

        {/* M4 */}
        <Card title="M4 — Alternate Activation">
          <SectionDescription>
            Baseline capacity used to normalize the alternate-sourcing activation score.
          </SectionDescription>
          <InputField label="Activation Score Baseline" value={fp.m4_activationScoreBaseline} onChange={set('m4_activationScoreBaseline')} step={500} min={0} unit="kbbl/mo" />
        </Card>
      </div>
    </ModulePanel>
  );
}
