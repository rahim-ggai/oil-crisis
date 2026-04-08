import * as XLSX from 'xlsx';
import type { ScenarioState } from '@/types';
import { SOURCE_TOOLTIPS } from './defaults';
import { SCENARIO_A, SCENARIO_B, SCENARIO_C, SCENARIO_D } from './presets';
import {
  getWeightedDaysOfCover,
  getDaysOfCover,
} from './calculations/m1-inventory';
import { getRiskWeightedBarrels, getPipelineStatusScore } from './calculations/m2-pipeline';
import { computeAllRefineryOutputs, getTotalDailyOutput } from './calculations/m3-refining';
import { computeIranCorridor } from './calculations/m5-iran';
import { computeAffordability } from './calculations/m6-price';
import { computeTrigger } from './calculations/m8-trigger';

function fmt(n: number, decimals = 1): string {
  if (!isFinite(n)) return '--';
  return n.toFixed(decimals);
}

function fmtInt(n: number): string {
  if (!isFinite(n)) return '--';
  return Math.round(n).toString();
}

function makeSheet(data: (string | number | null | undefined)[][]): XLSX.WorkSheet {
  const ws = XLSX.utils.aoa_to_sheet(data);
  return ws;
}

function setColWidths(ws: XLSX.WorkSheet, widths: number[]) {
  ws['!cols'] = widths.map((w) => ({ wch: w }));
}

export function exportToExcel(scenario: ScenarioState): void {
  const wb = XLSX.utils.book_new();
  const { m1, m2, m3, m4, m5, m6, m7, m8 } = scenario;
  const dateStr = new Date().toISOString().slice(0, 10);

  // Computed outputs
  const trigger = computeTrigger(scenario);
  const iranOutput = computeIranCorridor(m5, scenario.baselineMode);
  const affordability = computeAffordability(m6);
  const rwBarrels = getRiskWeightedBarrels(m2.cargoes, scenario.baselineMode);
  const pipelineScore = getPipelineStatusScore(m2.cargoes, scenario.baselineMode);
  const refineryOutputs = computeAllRefineryOutputs(m3, m1.foDailyConsumption);
  const totalOutput = getTotalDailyOutput(refineryOutputs);
  const weightedDays = getWeightedDaysOfCover(m1);
  const hsdDays = getDaysOfCover(m1.hsdStock, m1.hsdDailyConsumption);
  const msDays = getDaysOfCover(m1.msStock, m1.msDailyConsumption);
  const foDays = getDaysOfCover(m1.foStock, m1.foDailyConsumption);

  // ── 00_Cover ──
  const coverData: (string | number | null)[][] = [
    ['CONFIDENTIAL — National Energy Security Working Group'],
    [],
    ['Pakistan Energy Crisis Simulation'],
    ['Scenario Analysis Report'],
    [],
    ['Scenario Name', scenario.scenarioName],
    ['Baseline Mode', scenario.baselineMode === 'full_corridor_compromised' ? 'Full Corridor Compromised' : 'Iran-Permitted Transit'],
    ['Date Generated', dateStr],
    [],
    ['Trigger Level', trigger.recommendedLevel],
    ['Composite Stress', Number(fmt(trigger.compositeStress, 2))],
    ['Weighted Days of Cover', Number(fmt(weightedDays, 1))],
    [],
    ['Classification: CONFIDENTIAL'],
  ];
  const wsCover = makeSheet(coverData);
  setColWidths(wsCover, [30, 40]);
  XLSX.utils.book_append_sheet(wb, wsCover, '00_Cover');

  // ── 01_Executive_Summary ──
  const execData: (string | number | null)[][] = [
    ['Executive Summary'],
    [],
    ['Metric', 'Value', 'Unit'],
    ['Recommended Trigger Level', trigger.recommendedLevel, ''],
    ['Composite Stress Score', Number(fmt(trigger.compositeStress, 2)), '/100'],
    ['Weighted Days of Cover', Number(fmt(weightedDays, 1)), 'days'],
    ['HSD Days of Cover', Number(fmt(hsdDays, 1)), 'days'],
    ['MS Days of Cover', Number(fmt(msDays, 1)), 'days'],
    ['FO Days of Cover', Number(fmt(foDays, 1)), 'days'],
    ['Current Brent Spot', m6.currentBrentSpot, 'USD/bbl'],
    ['Price Multiplier', m6.brentMultiplier, 'x'],
    ['SBP Reserves', m6.sbpReserves, 'USD bn'],
    ['Months of Imports', Number(fmt(m6.sbpReserves / m6.normalMonthlyImportBill, 1)), 'months'],
    ['Iranian Corridor Status', iranOutput.totalBblDay === 0 ? 'Closed' : iranOutput.corridorScore < 50 ? 'Degraded' : 'Open', ''],
    ['Iranian Throughput', iranOutput.totalBblDay, 'bbl/day'],
    ['Risk-Weighted Pipeline Volume', Math.round(rwBarrels), 'barrels'],
    ['Pipeline Status Score', Number(fmt(pipelineScore, 1)), '/100'],
    ['Max Monthly Expenditure', Number(fmt(affordability.maxMonthlyExpenditure, 2)), 'USD bn'],
    ['Affordable Barrels', Math.round(affordability.affordableBarrels), 'bbl/month'],
    ['Normal Demand', Math.round(affordability.normalDemandBarrels), 'bbl/month'],
    [],
    ['Hard Override', trigger.hardOverrideActive || 'None'],
  ];
  const wsExec = makeSheet(execData);
  setColWidths(wsExec, [30, 20, 15]);
  XLSX.utils.book_append_sheet(wb, wsExec, '01_Executive_Summary');

  // ── 02_Inputs_Master ──
  const inputsData: (string | number | null)[][] = [
    ['All Editable Inputs'],
    [],
    ['Module', 'Parameter', 'Value', 'Unit'],
    ['M1', 'Crude Oil Stock', m1.crudeOilStock, 'barrels'],
    ['M1', 'HSD Stock', m1.hsdStock, 'tonnes'],
    ['M1', 'MS Stock', m1.msStock, 'tonnes'],
    ['M1', 'FO Stock', m1.foStock, 'tonnes'],
    ['M1', 'LPG Stock', m1.lpgStock, 'tonnes'],
    ['M1', 'JP-1 Stock', m1.jp1Stock, 'tonnes'],
    ['M1', 'HSD Daily Consumption', m1.hsdDailyConsumption, 'tonnes/day'],
    ['M1', 'MS Daily Consumption', m1.msDailyConsumption, 'tonnes/day'],
    ['M1', 'FO Daily Consumption', m1.foDailyConsumption, 'tonnes/day'],
    ['M1', 'Total Petroleum Consumption', m1.totalPetroleumConsumption, 'barrels/day'],
    [],
    ['M5', 'Bandar Abbas Capacity', m5.bandarAbbasCapacity, 'bbl/day'],
    ['M5', 'Kharg Island Capacity', m5.khargIslandCapacity, 'bbl/day'],
    ['M5', 'Chinese-Flagged Vessels', m5.chineseFlaggedVessels, 'count'],
    ['M5', 'Vessel Turnaround Days', m5.vesselTurnaroundDays, 'days'],
    ['M5', 'Discount to Brent', m5.discountToBrent * 100, '%'],
    ['M5', 'Trucking Capacity', m5.truckingCapacity, 'bbl/day'],
    ['M5', 'Border Degradation', m5.borderDegradation * 100, '%'],
    ['M5', 'Security Situation', m5.securitySituation, ''],
    ['M5', 'Iranian Production %', m5.iranianProductionPct * 100, '%'],
    [],
    ['M6', 'Pre-Crisis Brent', m6.preCrisisBrent, 'USD/bbl'],
    ['M6', 'Current Brent Spot', m6.currentBrentSpot, 'USD/bbl'],
    ['M6', 'Brent Multiplier', m6.brentMultiplier, 'x'],
    ['M6', 'SBP Reserves', m6.sbpReserves, 'USD bn'],
    ['M6', 'Reserves Floor', m6.reservesFloor, 'USD bn'],
    ['M6', 'IMF Available', m6.imfAvailable, 'USD bn'],
    ['M6', 'Saudi Deferred Facility', m6.saudiDeferredFacility, 'USD bn/yr'],
    ['M6', 'Saudi Doubled', m6.saudiDoubled ? 'Yes' : 'No', ''],
    ['M6', 'UAE Deposits', m6.uaeDeposits, 'USD bn'],
    ['M6', 'China Swap Line', m6.chinaSwapLine, 'USD bn'],
    ['M6', 'Barter Capacity', m6.barterCapacity, 'USD mn/yr'],
    ['M6', 'Normal Monthly Import Bill', m6.normalMonthlyImportBill, 'USD bn'],
    ['M6', 'Exchange Rate', m6.exchangeRate, 'PKR/USD'],
    [],
    ['M8', 'Weight D (Days of Cover)', m8.weights.wD, ''],
    ['M8', 'Weight P (Price Stress)', m8.weights.wP, ''],
    ['M8', 'Weight S (Pipeline)', m8.weights.wS, ''],
    ['M8', 'Weight A (Alternates)', m8.weights.wA, ''],
    ['M8', 'Weight I (Iran)', m8.weights.wI, ''],
    ['M8', 'Manual Override', m8.manualOverride || 'None', ''],
    ['M8', 'De-Escalation Days', m8.deEscalationDays, 'days'],
  ];
  const wsInputs = makeSheet(inputsData);
  setColWidths(wsInputs, [10, 30, 20, 15]);
  XLSX.utils.book_append_sheet(wb, wsInputs, '02_Inputs_Master');

  // ── 03_M1_Inventory ──
  // Use Excel formulas for days of cover
  const m1Data: (string | number | null)[][] = [
    ['M1: Domestic Fuel Inventory'],
    [],
    ['Product', 'Stock', 'Unit', 'Daily Consumption', 'Unit', 'Days of Cover'],
    ['HSD', m1.hsdStock, 'tonnes', m1.hsdDailyConsumption, 'tonnes/day', null],
    ['MS', m1.msStock, 'tonnes', m1.msDailyConsumption, 'tonnes/day', null],
    ['FO', m1.foStock, 'tonnes', m1.foDailyConsumption, 'tonnes/day', null],
    [],
    ['Weighted Days of Cover', Number(fmt(weightedDays, 1)), 'days'],
    ['Formula: 0.5*HSD + 0.35*MS + 0.15*FO'],
  ];
  const wsM1 = makeSheet(m1Data);
  // Add formulas for days of cover (F4, F5, F6)
  wsM1['F4'] = { t: 'n', f: 'B4/D4' };
  wsM1['F5'] = { t: 'n', f: 'B5/D5' };
  wsM1['F6'] = { t: 'n', f: 'B6/D6' };
  // Weighted days formula
  wsM1['B8'] = { t: 'n', f: '0.5*F4+0.35*F5+0.15*F6' };
  setColWidths(wsM1, [12, 15, 12, 18, 12, 15]);
  XLSX.utils.book_append_sheet(wb, wsM1, '03_M1_Inventory');

  // ── 04_M2_Pipeline ──
  const m2Header = ['Vessel', 'IMO', 'Product', 'Qty (bbl)', 'Qty (t)', 'Loading Port', 'ETA', 'Insurer', 'Flag', 'Status', 'Loss Prob.'];
  const m2Rows = m2.cargoes.map((c) => [
    c.vesselName, c.imoNumber, c.product, c.quantityBarrels, c.quantityTonnes,
    c.loadingPort, c.eta, c.insurer, c.flagState, c.status, c.lossProbability,
  ]);
  const m2Data: (string | number | null)[][] = [
    ['M2: Seaborne Supply Pipeline'],
    [],
    m2Header,
    ...m2Rows,
    [],
    ['Risk-Weighted Volume (barrels)', Math.round(rwBarrels)],
    ['Pipeline Status Score', Number(fmt(pipelineScore, 1))],
  ];
  const wsM2 = makeSheet(m2Data);
  setColWidths(wsM2, [20, 16, 14, 14, 14, 14, 12, 16, 14, 22, 12]);
  XLSX.utils.book_append_sheet(wb, wsM2, '04_M2_Pipeline');

  // ── 05_M3_Refining ──
  const m3Header = ['Refinery', 'Capacity (bpd)', 'Technology', 'Nelson Index', 'Utilization', 'Daily BPD', 'HSD (t/d)', 'MS (t/d)', 'FO (t/d)', 'Feasibility'];
  const m3Rows = refineryOutputs.map((o) => {
    const ref = m3.refineries.find((r) => r.id === o.refineryId);
    return [
      o.refineryName,
      ref?.capacityBpd || 0,
      ref?.technology || '',
      ref?.nelsonIndex || 0,
      ref ? `${(ref.utilization * 100).toFixed(0)}%` : '',
      Math.round(o.dailyBpd),
      Number(fmt(o.hsd, 0)),
      Number(fmt(o.naphthaPetrol, 0)),
      Number(fmt(o.fo, 0)),
      Number(fmt(o.feasibilityScore, 0)),
    ];
  });
  const m3Data: (string | number | null)[][] = [
    ['M3: Crude Oil Conversion Matrix'],
    [],
    m3Header,
    ...m3Rows,
    [],
    ['Yield Matrix (% by crude grade)'],
    ['Grade', 'LPG', 'Naphtha/Petrol', 'HSD', 'JP-1/Kero', 'FO', 'Loss'],
    ...Object.entries(m3.yieldMatrix).map(([grade, y]) => [
      grade, y.lpg, y.naphthaPetrol, y.hsd, y.jp1Kero, y.fo, y.loss,
    ]),
  ];
  const wsM3 = makeSheet(m3Data);
  setColWidths(wsM3, [20, 14, 18, 12, 12, 12, 12, 12, 12, 12]);
  XLSX.utils.book_append_sheet(wb, wsM3, '05_M3_Refining');

  // ── 06_M4_Alternates ──
  const m4Header = ['Country', 'Supplier', 'Product', 'Max kbbl/mo', 'Normal Transit', 'Crisis Transit', 'Freight Premium %', 'Payment', 'Activated', 'Notes'];
  const m4Rows = m4.sources.map((s) => [
    s.country, s.supplier, s.product, s.maxLiftableKbblMonth,
    s.normalTransitDays, s.crisisTransitDays, s.freightPremiumPct,
    s.paymentTerms, s.activated ? 'Yes' : 'No', s.notes,
  ]);
  const m4Data: (string | number | null)[][] = [
    ['M4: Alternate Sourcing & Logistics'],
    [],
    m4Header,
    ...m4Rows,
  ];
  const wsM4 = makeSheet(m4Data);
  setColWidths(wsM4, [12, 24, 16, 14, 14, 14, 16, 18, 10, 35]);
  XLSX.utils.book_append_sheet(wb, wsM4, '06_M4_Alternates');

  // ── 07_M5_Iran ──
  const m5Data: (string | number | null)[][] = [
    ['M5: Iran-Specific Supply Corridors'],
    [],
    ['Parameter', 'Value', 'Unit'],
    ['Bandar Abbas Capacity', m5.bandarAbbasCapacity, 'bbl/day'],
    ['Kharg Island Capacity', m5.khargIslandCapacity, 'bbl/day'],
    ['Chinese-Flagged Vessels', m5.chineseFlaggedVessels, 'count'],
    ['Vessel Turnaround Days', m5.vesselTurnaroundDays, 'days'],
    ['Discount to Brent', m5.discountToBrent * 100, '%'],
    ['Payment Mechanism', m5.paymentMechanism, ''],
    ['Trucking Capacity', m5.truckingCapacity, 'bbl/day'],
    ['Border Degradation', m5.borderDegradation * 100, '%'],
    ['Security Situation', m5.securitySituation, ''],
    ['Iranian Production %', m5.iranianProductionPct * 100, '%'],
    [],
    ['Computed Outputs'],
    ['Maritime Throughput', iranOutput.maritimeBblDay, 'bbl/day'],
    ['Overland Throughput', iranOutput.overlandBblDay, 'bbl/day'],
    ['Total Throughput', iranOutput.totalBblDay, 'bbl/day'],
    ['Monthly Throughput', iranOutput.totalBblMonth, 'bbl/month'],
    ['Corridor Score', iranOutput.corridorScore, '/100'],
  ];
  const wsM5 = makeSheet(m5Data);
  setColWidths(wsM5, [25, 20, 15]);
  XLSX.utils.book_append_sheet(wb, wsM5, '07_M5_Iran');

  // ── 08_M6_Price ──
  const m6Data: (string | number | null)[][] = [
    ['M6: Price-Linked Procurement'],
    [],
    ['Parameter', 'Value', 'Unit'],
    ['Pre-Crisis Brent', m6.preCrisisBrent, 'USD/bbl'],
    ['Current Brent Spot', m6.currentBrentSpot, 'USD/bbl'],
    ['Brent Multiplier', m6.brentMultiplier, 'x'],
    ['SBP Reserves', m6.sbpReserves, 'USD bn'],
    ['Reserves Floor', m6.reservesFloor, 'USD bn'],
    ['IMF Available', m6.imfAvailable, 'USD bn'],
    ['Saudi Deferred Facility', m6.saudiDeferredFacility, 'USD bn/yr'],
    ['Saudi Doubled', m6.saudiDoubled ? 'Yes' : 'No', ''],
    ['UAE Deposits', m6.uaeDeposits, 'USD bn'],
    ['China Swap Line', m6.chinaSwapLine, 'USD bn'],
    ['Barter Capacity', m6.barterCapacity, 'USD mn/yr'],
    ['Normal Monthly Import Bill', m6.normalMonthlyImportBill, 'USD bn'],
    ['Exchange Rate', m6.exchangeRate, 'PKR/USD'],
    [],
    ['Computed Outputs'],
    ['Max Monthly Expenditure', Number(fmt(affordability.maxMonthlyExpenditure, 2)), 'USD bn'],
    ['Affordable Barrels', Math.round(affordability.affordableBarrels), 'bbl/month'],
    ['Normal Demand Barrels', Math.round(affordability.normalDemandBarrels), 'bbl/month'],
    [],
    ['Affordability Curve'],
    ['Multiplier', 'Affordable Barrels (bbl/month)'],
    ...affordability.affordabilityCurve.map((p) => [p.multiplier, Math.round(p.affordableBarrels)]),
  ];
  const wsM6 = makeSheet(m6Data);
  setColWidths(wsM6, [25, 20, 15]);
  XLSX.utils.book_append_sheet(wb, wsM6, '08_M6_Price');

  // ── 09_M7_Conservation ──
  const conservationFields = ['privateVehicles', 'goodsTransport', 'industryAllocation', 'publicTransport', 'powerGeneration', 'lockdownDays', 'agriculture', 'aviation', 'cng'] as const;
  const m7Data: (string | number | null)[][] = [
    ['M7: Conservation Levels'],
    [],
    ['Conservation Matrix'],
    ['Sector', 'Alert', 'Austerity', 'Emergency'],
    ...conservationFields.map((f) => [
      f.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase()),
      m7.alertMatrix[f],
      m7.austerityMatrix[f],
      m7.emergencyMatrix[f],
    ]),
    [],
    ['Demand Reductions (%)'],
    ['Product', 'Alert', 'Austerity', 'Emergency'],
    ['HSD', m7.alertReductions.hsd * 100, m7.austerityReductions.hsd * 100, m7.emergencyReductions.hsd * 100],
    ['MS', m7.alertReductions.ms * 100, m7.austerityReductions.ms * 100, m7.emergencyReductions.ms * 100],
    ['FO', m7.alertReductions.fo * 100, m7.austerityReductions.fo * 100, m7.emergencyReductions.fo * 100],
    ['JP-1', m7.alertReductions.jp1 * 100, m7.austerityReductions.jp1 * 100, m7.emergencyReductions.jp1 * 100],
  ];
  const wsM7 = makeSheet(m7Data);
  setColWidths(wsM7, [22, 40, 40, 40]);
  XLSX.utils.book_append_sheet(wb, wsM7, '09_M7_Conservation');

  // ── 10_M8_Trigger ──
  const m8Data: (string | number | null)[][] = [
    ['M8: Dynamic Trigger Logic'],
    [],
    ['Component', 'Weight', 'Score', 'Weighted'],
    ['Days of Cover Stress (D)', m8.weights.wD, Number(fmt(trigger.components.stressD, 2)), null],
    ['Price Stress (P)', m8.weights.wP, Number(fmt(trigger.components.stressP, 2)), null],
    ['Pipeline Stress (S)', m8.weights.wS, Number(fmt(trigger.components.stressS, 2)), null],
    ['Alternate Buffer (A)', m8.weights.wA, Number(fmt(trigger.components.bufferA, 2)), null],
    ['Iran Buffer (I)', m8.weights.wI, Number(fmt(trigger.components.bufferI, 2)), null],
    [],
    ['Composite Stress', Number(fmt(trigger.compositeStress, 2))],
    ['Recommended Level', trigger.recommendedLevel],
    ['Manual Override', m8.manualOverride || 'None'],
    ['Hard Override', trigger.hardOverrideActive || 'None'],
    [],
    ['Thresholds'],
    ['NORMAL', '< 25'],
    ['ALERT', '25 - 49'],
    ['AUSTERITY', '50 - 74'],
    ['EMERGENCY', '>= 75'],
  ];
  const wsM8 = makeSheet(m8Data);
  // Add formulas for weighted column (D4:D8)
  wsM8['D4'] = { t: 'n', f: 'B4*C4' };
  wsM8['D5'] = { t: 'n', f: 'B5*C5' };
  wsM8['D6'] = { t: 'n', f: 'B6*C6' };
  wsM8['D7'] = { t: 'n', f: '-B7*C7*0.5' };
  wsM8['D8'] = { t: 'n', f: '-B8*C8*0.5' };
  setColWidths(wsM8, [25, 10, 10, 12]);
  XLSX.utils.book_append_sheet(wb, wsM8, '10_M8_Trigger');

  // ── 11_Scenarios_Compare ──
  const presets = [SCENARIO_A, SCENARIO_B, SCENARIO_C, SCENARIO_D];
  const presetTriggers = presets.map((p) => computeTrigger(p));
  const presetIran = presets.map((p) => computeIranCorridor(p.m5, p.baselineMode));
  const presetDays = presets.map((p) => getWeightedDaysOfCover(p.m1));

  const compareData: (string | number | null)[][] = [
    ['Scenario Comparison — 4 Presets'],
    [],
    ['Metric', 'Scenario A', 'Scenario B', 'Scenario C', 'Scenario D'],
    ['Name', ...presets.map((p) => p.scenarioName)],
    ['Baseline Mode', ...presets.map((p) => p.baselineMode === 'full_corridor_compromised' ? 'Full Compromised' : 'Iran Permitted')],
    ['Brent Spot (USD/bbl)', ...presets.map((p) => p.m6.currentBrentSpot)],
    ['Price Multiplier', ...presets.map((p) => p.m6.brentMultiplier)],
    ['Weighted Days of Cover', ...presetDays.map((d) => Number(fmt(d, 1)))],
    ['Composite Stress', ...presetTriggers.map((t) => Number(fmt(t.compositeStress, 1)))],
    ['Recommended Level', ...presetTriggers.map((t) => t.recommendedLevel)],
    ['Iran Corridor Score', ...presetIran.map((i) => Number(fmt(i.corridorScore, 0)))],
    ['Iran Throughput (bbl/d)', ...presetIran.map((i) => i.totalBblDay)],
    ['SBP Reserves (USD bn)', ...presets.map((p) => p.m6.sbpReserves)],
    ['Iranian Production %', ...presets.map((p) => p.m5.iranianProductionPct * 100)],
  ];
  const wsCompare = makeSheet(compareData);
  setColWidths(wsCompare, [25, 25, 25, 25, 25]);
  XLSX.utils.book_append_sheet(wb, wsCompare, '11_Scenarios_Compare');

  // ── 12_Assumptions_Log ──
  const assumptionRows: (string | number | null)[][] = [];
  for (const [key, tip] of Object.entries(SOURCE_TOOLTIPS)) {
    if (tip.assumption || tip.verify) {
      assumptionRows.push([
        key,
        tip.source,
        tip.date,
        tip.assumption ? 'ASSUMPTION' : '',
        tip.verify ? 'VERIFY' : '',
        tip.reasoning || '',
      ]);
    }
  }
  const assumptionData: (string | number | null)[][] = [
    ['Assumptions and Values Requiring Verification'],
    [],
    ['Parameter', 'Source', 'Date', 'Assumption?', 'Verify?', 'Reasoning'],
    ...assumptionRows,
    [],
    ['All Source Tooltips'],
    ['Parameter', 'Source', 'Date', 'Assumption?', 'Verify?', 'Reasoning'],
    ...Object.entries(SOURCE_TOOLTIPS).map(([key, tip]) => [
      key, tip.source, tip.date,
      tip.assumption ? 'Yes' : 'No',
      tip.verify ? 'Yes' : 'No',
      tip.reasoning || '',
    ]),
  ];
  const wsAssumptions = makeSheet(assumptionData);
  setColWidths(wsAssumptions, [25, 35, 15, 12, 10, 45]);
  XLSX.utils.book_append_sheet(wb, wsAssumptions, '12_Assumptions_Log');

  // ── 13_Methodology ──
  const methodologyData: (string | number | null)[][] = [
    ['Methodology'],
    [],
    ['Module', 'Description'],
    ['M1: Domestic Fuel Inventory', 'Tracks stock levels (crude oil, HSD, MS, FO, LPG, JP-1) against daily consumption rates. Days of cover = stock / daily consumption. Weighted days of cover uses 0.5*HSD + 0.35*MS + 0.15*FO to reflect transport criticality.'],
    ['M2: Seaborne Supply Pipeline', 'Tracks individual cargo vessels with status (docked, in war zone, outside war zone, contracted not dispatched). Loss probability assigned by status and baseline mode. Risk-weighted barrels = sum of quantity*(1-loss_probability). Pipeline status score normalized against 3M barrel baseline.'],
    ['M3: Crude Oil Conversion Matrix', 'Models 5 Pakistani refineries with crude diet, capacity, utilization, and technology. Blended yield profiles computed from crude grade allocations. FO storage constraint modeled — refinery shutdown when FO storage full. PARCO gets +5% diesel yield for mild conversion.'],
    ['M4: Alternate Sourcing', 'Catalogs 11 alternate crude/product sources with max liftable volumes, transit times (normal and crisis), freight premiums, and payment terms. Activation score = total activated volume / 10,000 kbbl/month * 100.'],
    ['M5: Iran-Specific Corridors', 'Maritime: min(port capacity * production%, vessel-constrained throughput). Overland: trucking capacity * (1-border degradation) * security multiplier * production%. Corridor score normalized against 700,000 bbl/day max.'],
    ['M6: Price-Linked Procurement', 'Models affordability: total funding = usable reserves + IMF + Saudi + UAE + China + barter. Monthly expenditure = total / war duration months. Affordable barrels = monthly expenditure / (effective brent * 1.10 product premium * 1.15 freight).'],
    ['M7: Conservation Levels', 'Three conservation tiers (Alert, Austerity, Emergency) with sector-specific measures and fuel demand reduction percentages for HSD, MS, FO, JP-1.'],
    ['M8: Dynamic Trigger Logic', 'Composite stress = wD*stressD + wP*stressP + wS*stressS - wA*bufferA*0.5 - wI*bufferI*0.5. Hard overrides for critical stock levels (<7 days), no cargoes arriving, extreme price/reserves, and Iran closure without alternates. Default weights: D=0.40, P=0.25, S=0.15, A=0.10, I=0.10.'],
    [],
    ['Trigger Level Thresholds'],
    ['Level', 'Composite Stress Range'],
    ['NORMAL', '0 - 24'],
    ['ALERT', '25 - 49'],
    ['AUSTERITY', '50 - 74'],
    ['EMERGENCY', '75 - 100'],
  ];
  const wsMethodology = makeSheet(methodologyData);
  setColWidths(wsMethodology, [25, 120]);
  XLSX.utils.book_append_sheet(wb, wsMethodology, '13_Methodology');

  // Write file
  const filename = `PECS_${scenario.scenarioName.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '')}_${dateStr}.xlsx`;
  XLSX.writeFile(wb, filename);
}
