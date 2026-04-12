import type {
  M1State, M2State, M3State, M4State, M5State, M6State, M7State, M8State,
  Cargo, Refinery, YieldProfile, AlternateSource, ConservationMatrix, DemandReduction,
  ScenarioState, FormulaParams
} from '@/types';

// ============================================================
// Module 1 — Domestic Fuel Inventory Defaults
// ============================================================
export const DEFAULT_M1: M1State = {
  crudeOilStock: 3_105_532, // barrels (423,674 MT × 7.33 bbl/MT, DSSP 08-Apr-2026)
  hsdStock: 333_906, // tonnes (17.54 days cover, DSSP 08-Apr-2026)
  msStock: 393_483, // tonnes (18.19 days cover, DSSP 08-Apr-2026)
  foStock: 238_053, // tonnes (HSFO+LSFO+RFO combined, DSSP 08-Apr-2026)
  lpgStock: 45_000, // tonnes (~9 days, Senate briefing — not in DSSP)
  jp1Stock: 31_431, // tonnes (15.16 days cover, DSSP 08-Apr-2026)
  hsdDailyConsumption: 19_040, // tonnes/day (actual MTD avg sales, DSSP 08-Apr-2026)
  msDailyConsumption: 21_634, // tonnes/day (actual MTD avg sales, DSSP 08-Apr-2026)
  foDailyConsumption: 2_828, // tonnes/day (238,053 MT / 84.18 days cover, DSSP 08-Apr-2026)
  totalPetroleumConsumption: 423_000, // barrels/day (CEIC Dec 2024)
};

// ============================================================
// Module 2 — Seaborne Supply Pipeline Defaults
// ============================================================
export const DEFAULT_LOSS_PROBABILITIES: Record<string, number> = {
  docked: 0.02,
  in_war_zone: 0.35,
  outside_war_zone: 0.05,
  contracted_not_dispatched: 0.15,
};

export const SEED_CARGOES: Cargo[] = [
  { id: 'c1', vesselName: 'MT Karachi Star', imoNumber: 'IMO 9801234', product: 'Arab Light', quantityBarrels: 1_000_000, quantityTonnes: 136_000, loadingPort: 'Ras Tanura', eta: '2026-04-18', insurer: "Lloyd's", flagState: 'Pakistan', status: 'in_war_zone', lossProbability: 0.35 },
  { id: 'c2', vesselName: 'MT Sindh Pioneer', imoNumber: 'IMO 9802345', product: 'Arab Light', quantityBarrels: 800_000, quantityTonnes: 109_000, loadingPort: 'Jubail', eta: '2026-04-22', insurer: 'PICC (China)', flagState: 'China', status: 'in_war_zone', lossProbability: 0.35 },
  { id: 'c3', vesselName: 'Pacific Voyager', imoNumber: 'IMO 9803456', product: 'ESPO', quantityBarrels: 700_000, quantityTonnes: 95_000, loadingPort: 'Kozmino', eta: '2026-04-25', insurer: 'K Club', flagState: 'Liberia', status: 'outside_war_zone', lossProbability: 0.05 },
  { id: 'c4', vesselName: 'MT Punjab Spirit', imoNumber: 'IMO 9804567', product: 'Bonny Light', quantityBarrels: 900_000, quantityTonnes: 122_000, loadingPort: 'Bonny Island', eta: '2026-04-28', insurer: 'Gard', flagState: 'Marshall Islands', status: 'outside_war_zone', lossProbability: 0.05 },
  { id: 'c5', vesselName: 'Al Qamar', imoNumber: 'IMO 9805678', product: 'Murban', quantityBarrels: 600_000, quantityTonnes: 82_000, loadingPort: 'Fujairah', eta: '2026-04-15', insurer: 'PICC (China)', flagState: 'China', status: 'docked', lossProbability: 0.02 },
  { id: 'c6', vesselName: 'Tapis Express', imoNumber: 'IMO 9806789', product: 'Tapis', quantityBarrels: 500_000, quantityTonnes: 68_000, loadingPort: 'Kertih', eta: '2026-04-20', insurer: 'West of England', flagState: 'Singapore', status: 'outside_war_zone', lossProbability: 0.05 },
  { id: 'c7', vesselName: 'Caspian Bridge', imoNumber: 'IMO 9807890', product: 'CPC Blend', quantityBarrels: 400_000, quantityTonnes: 54_000, loadingPort: 'Ceyhan', eta: '2026-05-05', insurer: 'Skuld', flagState: 'Greece', status: 'contracted_not_dispatched', lossProbability: 0.15 },
  { id: 'c8', vesselName: 'MT Gwadar Hope', imoNumber: 'IMO 9808901', product: 'Iranian Light', quantityBarrels: 750_000, quantityTonnes: 102_000, loadingPort: 'Bandar Abbas', eta: '2026-04-16', insurer: 'PICC (China)', flagState: 'China', status: 'in_war_zone', lossProbability: 0.35 },
];

export const DEFAULT_M2: M2State = {
  cargoes: SEED_CARGOES,
};

// ============================================================
// Module 3 — Crude Oil Conversion Matrix Defaults
// ============================================================
export const DEFAULT_REFINERIES: Refinery[] = [
  { id: 'parco', name: 'PARCO MCR (Mahmoodkot)', shortName: 'PARCO', capacityBpd: 120_000, technology: 'Mild conversion', nelsonIndex: 6.5, utilization: 0.90, crudeDiet: { 'Arab Light': 40, 'Upper Zakum': 20, 'Murban': 20, 'Indigenous': 20 } },
  { id: 'cnergyico', name: 'Cnergyico (Hub, Balochistan)', shortName: 'Cnergyico', capacityBpd: 156_000, technology: 'Hydroskimming', nelsonIndex: 2.0, utilization: 0.90, crudeDiet: { 'Arab Light': 60, 'Iranian Light': 40 } },
  { id: 'nrl', name: 'NRL (Korangi, Karachi)', shortName: 'NRL', capacityBpd: 64_000, technology: 'Hydroskimming + lube', nelsonIndex: 4.5, utilization: 0.90, crudeDiet: { 'Arab Light': 70, 'Indigenous': 30 } },
  { id: 'arl', name: 'ARL (Rawalpindi)', shortName: 'ARL', capacityBpd: 53_400, technology: 'Hydroskimming', nelsonIndex: 3.5, utilization: 0.90, crudeDiet: { 'Indigenous': 80, 'Arab Light': 20 } },
  { id: 'prl', name: 'PRL (Korangi, Karachi)', shortName: 'PRL', capacityBpd: 50_000, technology: 'Hydroskimming', nelsonIndex: 3.0, utilization: 0.90, crudeDiet: { 'Arab Light': 50, 'Murban': 50 } },
];

export const DEFAULT_YIELD_MATRIX: Record<string, YieldProfile> = {
  'Arab Light': { lpg: 2, naphthaPetrol: 18, hsd: 45, jp1Kero: 5, fo: 28, loss: 2 },
  'Arab Heavy': { lpg: 1, naphthaPetrol: 14, hsd: 38, jp1Kero: 4, fo: 41, loss: 2 },
  'Iranian Light': { lpg: 2, naphthaPetrol: 17, hsd: 43, jp1Kero: 5, fo: 31, loss: 2 },
  'Iranian Heavy': { lpg: 1, naphthaPetrol: 13, hsd: 36, jp1Kero: 4, fo: 44, loss: 2 },
  'Murban': { lpg: 3, naphthaPetrol: 22, hsd: 47, jp1Kero: 5, fo: 21, loss: 2 },
  'Upper Zakum': { lpg: 2, naphthaPetrol: 17, hsd: 42, jp1Kero: 5, fo: 32, loss: 2 },
  'Urals': { lpg: 1, naphthaPetrol: 12, hsd: 32, jp1Kero: 4, fo: 49, loss: 2 },
  'ESPO': { lpg: 2, naphthaPetrol: 19, hsd: 44, jp1Kero: 5, fo: 28, loss: 2 },
  'Bonny Light': { lpg: 2, naphthaPetrol: 24, hsd: 48, jp1Kero: 5, fo: 19, loss: 2 },
  'Forcados': { lpg: 2, naphthaPetrol: 18, hsd: 46, jp1Kero: 5, fo: 27, loss: 2 },
  'Tapis': { lpg: 3, naphthaPetrol: 25, hsd: 47, jp1Kero: 5, fo: 18, loss: 2 },
  'Kimanis': { lpg: 2, naphthaPetrol: 22, hsd: 48, jp1Kero: 5, fo: 21, loss: 2 },
  'Azeri Light': { lpg: 2, naphthaPetrol: 21, hsd: 46, jp1Kero: 5, fo: 24, loss: 2 },
  'CPC Blend': { lpg: 3, naphthaPetrol: 23, hsd: 45, jp1Kero: 5, fo: 22, loss: 2 },
  'WTI/Permian': { lpg: 3, naphthaPetrol: 26, hsd: 46, jp1Kero: 5, fo: 18, loss: 2 },
  'Merey': { lpg: 1, naphthaPetrol: 11, hsd: 30, jp1Kero: 4, fo: 52, loss: 2 },
  'Indigenous': { lpg: 2, naphthaPetrol: 20, hsd: 44, jp1Kero: 5, fo: 27, loss: 2 },
};

export const DEFAULT_M3: M3State = {
  refineries: DEFAULT_REFINERIES,
  yieldMatrix: DEFAULT_YIELD_MATRIX,
  foStorageDays: 14,
  refineryShutdownLogic: true,
};

// ============================================================
// Module 4 — Alternate Sourcing Defaults
// ============================================================
export const DEFAULT_ALTERNATE_SOURCES: AlternateSource[] = [
  { id: 'a1', country: 'Russia', supplier: 'Rosneft (ESPO via Pacific)', product: 'ESPO', maxLiftableKbblMonth: 3_000, normalTransitDays: 18, crisisTransitDays: 18, freightPremiumPct: 25, paymentTerms: 'USD/CNY, deferred', notes: 'Unaffected route — Pacific bypasses ME', activated: true },
  { id: 'a2', country: 'Russia', supplier: 'Rosneft (Urals via Baltic)', product: 'Urals', maxLiftableKbblMonth: 4_500, normalTransitDays: 25, crisisTransitDays: 50, freightPremiumPct: 120, paymentTerms: 'USD/CNY', notes: 'Refinery feasibility issue — high FO yield', activated: false },
  { id: 'a3', country: 'Nigeria', supplier: 'NNPC', product: 'Bonny Light', maxLiftableKbblMonth: 2_500, normalTransitDays: 25, crisisTransitDays: 32, freightPremiumPct: 60, paymentTerms: 'USD', notes: 'Via Cape of Good Hope; high MS yield', activated: true },
  { id: 'a4', country: 'Angola', supplier: 'Sonangol', product: 'Cabinda/Girassol', maxLiftableKbblMonth: 2_000, normalTransitDays: 28, crisisTransitDays: 35, freightPremiumPct: 60, paymentTerms: 'USD', notes: 'Via Cape', activated: false },
  { id: 'a5', country: 'Kazakhstan', supplier: 'KazMunayGas', product: 'CPC Blend', maxLiftableKbblMonth: 800, normalTransitDays: 30, crisisTransitDays: 30, freightPremiumPct: 40, paymentTerms: 'USD/CNY', notes: 'Volume-constrained; complex logistics', activated: false },
  { id: 'a6', country: 'Malaysia', supplier: 'Petronas', product: 'Tapis/Kimanis', maxLiftableKbblMonth: 1_200, normalTransitDays: 12, crisisTransitDays: 12, freightPremiumPct: 15, paymentTerms: 'USD', notes: 'Unaffected route — Strait of Malacca', activated: true },
  { id: 'a7', country: 'Brunei', supplier: 'PetroleumBRUNEI', product: 'Champion/Seria Light', maxLiftableKbblMonth: 600, normalTransitDays: 14, crisisTransitDays: 14, freightPremiumPct: 15, paymentTerms: 'USD', notes: 'Unaffected', activated: false },
  { id: 'a8', country: 'Azerbaijan', supplier: 'SOCAR', product: 'Azeri Light', maxLiftableKbblMonth: 1_500, normalTransitDays: 20, crisisTransitDays: 45, freightPremiumPct: 100, paymentTerms: 'USD', notes: 'Pipeline to Med, then Cape rerouting', activated: false },
  { id: 'a9', country: 'Venezuela', supplier: 'PDVSA', product: 'Merey', maxLiftableKbblMonth: 800, normalTransitDays: 35, crisisTransitDays: 42, freightPremiumPct: 70, paymentTerms: 'CNY/barter', notes: 'Sanctions waiver required; bad refinery fit', activated: false },
  { id: 'a10', country: 'Brazil', supplier: 'Petrobras', product: 'Lula/Buzios', maxLiftableKbblMonth: 1_500, normalTransitDays: 30, crisisTransitDays: 38, freightPremiumPct: 60, paymentTerms: 'USD', notes: 'Via Cape', activated: false },
  { id: 'a11', country: 'USA', supplier: 'Private', product: 'WTI/Permian', maxLiftableKbblMonth: 2_000, normalTransitDays: 28, crisisTransitDays: 35, freightPremiumPct: 50, paymentTerms: 'USD', notes: 'Sanctions waiver path; politically sensitive', activated: false },
];

export const DEFAULT_M4: M4State = {
  sources: DEFAULT_ALTERNATE_SOURCES,
};

// ============================================================
// Module 5 — Iran-Specific Supply Corridors Defaults
// ============================================================
export const DEFAULT_M5: M5State = {
  bandarAbbasCapacity: 200_000, // bbl/day [ASSUMPTION]
  khargIslandCapacity: 350_000, // reduced from 500k — Ras Laffan/Kharg damage uncertain, conservative estimate
  chineseFlaggedVessels: 8, // [ASSUMPTION]; Iran permitting China/Russia/Pakistan/India flagged vessels
  vesselTurnaroundDays: 6,
  discountToBrent: 0.25,
  paymentMechanism: 'CNY through central holding entity',
  truckingCapacity: 5_000,
  borderDegradation: 0,
  securitySituation: 'normal',
  iranianProductionPct: 1.0,
};

// ============================================================
// Module 6 — Price-Linked Procurement Defaults
// ============================================================
export const DEFAULT_M6: M6State = {
  preCrisisBrent: 71, // ICE Brent Futures, 27 Feb 2026
  currentBrentSpot: 132, // Dated Brent physical $131.97 (CNBC 10-Apr-2026); futures ~$97 but physical reflects actual procurement cost
  brentMultiplier: 1.86, // 132/71 = 1.86
  sbpReserves: 15.0, // $16.4B as of 3-Apr-2026 minus $1.4B Eurobond repayment on 8-Apr (ProPakistani)
  reservesFloor: 10,
  imfAvailable: 1.21, // 3rd EFF review + 2nd RSF staff-level agreement, Mar 27 2026 (IMF.org)
  saudiDeferredFacility: 1.2, // Current facility; Pakistan requested expansion to $5B (Geo News Mar 9)
  saudiDoubled: false, // Expansion requested but not confirmed
  uaeDeposits: 0, // Repaid $3B in 2024, no new deposits
  chinaSwapLine: 3.0, // CNY 20B (~$3B); reduced from $4B assumption (SBP/PBOC data)
  barterCapacity: 500,
  normalMonthlyImportBill: 1.4,
  exchangeRate: 279, // SBP reference rate, 11-Apr-2026
};

// ============================================================
// Module 7 — Conservation Levels Defaults
// ============================================================
export const DEFAULT_ALERT_MATRIX: ConservationMatrix = {
  privateVehicles: 'Odd/even by plate',
  goodsTransport: '90% operational',
  industryAllocation: '95% normal',
  publicTransport: 'Normal operations',
  powerGeneration: 'Normal grid mix',
  lockdownDays: 'None',
  agriculture: 'Full diesel allocation',
  aviation: 'Normal',
  cng: 'Normal',
};

export const DEFAULT_AUSTERITY_MATRIX: ConservationMatrix = {
  privateVehicles: 'Weekend driving ban; 20L/week cap',
  goodsTransport: '65% of fleet; food/medicine priority',
  industryAllocation: '70% of normal',
  publicTransport: 'Expanded schedules; fare subsidy; 110% capacity',
  powerGeneration: 'Shift to coal/hydro/nuclear; gas conserved',
  lockdownDays: '1 day/week (Sunday)',
  agriculture: '80% allocation; harvest priority',
  aviation: 'Domestic flights cut 40%',
  cng: 'Expanded CNG promotion',
};

export const DEFAULT_EMERGENCY_MATRIX: ConservationMatrix = {
  privateVehicles: 'Complete ban except medical/emergency/state',
  goodsTransport: '35% of fleet; military/food/medicine/LEA only',
  industryAllocation: '40% — essential only (food, pharma, utilities, defence)',
  publicTransport: '24/7 operations; mandatory use',
  powerGeneration: 'Rolling load-shedding 6h urban, 10h rural',
  lockdownDays: '2 days/week (Sat-Sun)',
  agriculture: '60% allocation; state-coordinated harvest',
  aviation: 'Domestic cut 80%; essential international only',
  cng: 'Mandatory CNG conversion subsidies',
};

export const DEFAULT_ALERT_REDUCTIONS: DemandReduction = { hsd: 0.08, ms: 0.12, fo: 0.05, jp1: 0.05 };
export const DEFAULT_AUSTERITY_REDUCTIONS: DemandReduction = { hsd: 0.22, ms: 0.35, fo: 0.15, jp1: 0.30 };
export const DEFAULT_EMERGENCY_REDUCTIONS: DemandReduction = { hsd: 0.40, ms: 0.60, fo: 0.25, jp1: 0.60 };

export const DEFAULT_M7: M7State = {
  alertMatrix: DEFAULT_ALERT_MATRIX,
  austerityMatrix: DEFAULT_AUSTERITY_MATRIX,
  emergencyMatrix: DEFAULT_EMERGENCY_MATRIX,
  alertReductions: DEFAULT_ALERT_REDUCTIONS,
  austerityReductions: DEFAULT_AUSTERITY_REDUCTIONS,
  emergencyReductions: DEFAULT_EMERGENCY_REDUCTIONS,
};

// ============================================================
// Module 8 — Dynamic Trigger Logic Defaults
// ============================================================
export const DEFAULT_M8: M8State = {
  weights: { wD: 0.40, wP: 0.25, wS: 0.15, wA: 0.10, wI: 0.10 },
  manualOverride: null,
  deEscalationDays: 0,
};

// ============================================================
// Formula Parameters Defaults
// ============================================================
export const DEFAULT_FORMULA_PARAMS: FormulaParams = {
  // M1
  m1_hsdWeight: 0.5,
  m1_msWeight: 0.35,
  m1_foWeight: 0.15,
  // M2
  m2_lossProb_docked: 0.02,
  m2_lossProb_warZone: 0.35,
  m2_lossProb_outsideWarZone: 0.05,
  m2_lossProb_contracted: 0.15,
  m2_pipelineScoreBaseline: 3_000_000,
  m2_iranPermittedTransitCap: 0.15,
  m2_fullCorridorFloor: 0.40,
  // M3
  m3_foInfeasibleThreshold: 55,
  m3_foFeasibleThreshold: 30,
  m3_parcoHsdBonus: 5,
  m3_parcoFoReduction: 5,
  m3_barrelToTonneConversion: 0.136,
  // M5
  m5_vlccLoadSize: 500_000,
  m5_maxCapacityBaseline: 700_000,
  m5_securityMultiplier_hostile: 0.25,
  m5_securityMultiplier_tense: 0.60,
  m5_securityMultiplier_normal: 1.00,
  // M6
  m6_productPremium: 1.10,
  m6_freightPremium: 1.45, // Updated: VLCC rates $900k→$4M/day (~4.4x); war-risk insurance 1-7.5% hull value (Lloyd's List Apr 2026)
  m6_warDurationMonths: 6,
  m6_normalDemandBpd: 423_000,
  // M8 thresholds
  m8_stressD_maxDays: 30,
  m8_stressP_maxMultiplier: 4,
  m8_bufferDiscount: 0.5,
  m8_thresholdAlert: 25,
  m8_thresholdAusterity: 50,
  m8_thresholdEmergency: 75,
  // M8 hard overrides
  m8_hardOverride_criticalStockDays: 7,
  m8_hardOverride_noCargoDays: 14,
  m8_hardOverride_priceMultiplier: 4,
  m8_hardOverride_reservesFloor: 12,
  m8_hardOverride_minAlternateScore: 30,
  // M4
  m4_activationScoreBaseline: 10_000,
};

// ============================================================
// Full default scenario
// ============================================================
export const DEFAULT_SCENARIO: ScenarioState = {
  scenarioName: 'Default Baseline',
  baselineMode: 'full_corridor_compromised',
  m1: DEFAULT_M1,
  m2: DEFAULT_M2,
  m3: DEFAULT_M3,
  m4: DEFAULT_M4,
  m5: DEFAULT_M5,
  m6: DEFAULT_M6,
  m7: DEFAULT_M7,
  m8: DEFAULT_M8,
  formulaParams: DEFAULT_FORMULA_PARAMS,
};

// ============================================================
// Source tooltips for every default value
// ============================================================
export const SOURCE_TOOLTIPS: Record<string, { source: string; date: string; assumption?: boolean; verify?: boolean; reasoning?: string }> = {
  'crudeOilStock': { source: 'OCAC DSSP — Refinery Stocks sheet', date: '08-Apr-2026', reasoning: '423,674 MT × 7.33 bbl/MT; 7.04 days cover across all refineries' },
  'hsdStock': { source: 'OCAC DSSP — HSD sheet total', date: '08-Apr-2026', reasoning: '333,906 MT = 17.54 days cover at 19,040 MT/day' },
  'msStock': { source: 'OCAC DSSP — MS sheet total', date: '08-Apr-2026', reasoning: '393,483 MT = 18.19 days cover at 21,634 MT/day' },
  'foStock': { source: 'OCAC DSSP — SUMMARY (HSFO+LSFO+RFO)', date: '08-Apr-2026', reasoning: '238,053 MT combined = 84.18 days cover' },
  'lpgStock': { source: 'Senate Petroleum Committee briefing', date: 'March 2026', reasoning: '~9 days cover — not tracked in DSSP' },
  'jp1Stock': { source: 'OCAC DSSP — SUMMARY', date: '08-Apr-2026', reasoning: '31,431 MT = 15.16 days cover' },
  'hsdDailyConsumption': { source: 'OCAC DSSP — HSD sheet avg daily sales', date: '08-Apr-2026' },
  'msDailyConsumption': { source: 'OCAC DSSP — MS sheet avg daily sales', date: '08-Apr-2026' },
  'foDailyConsumption': { source: 'OCAC DSSP — derived from stock/days cover', date: '08-Apr-2026', reasoning: '238,053 MT / 84.18 days = 2,828 MT/day' },
  'totalPetroleumConsumption': { source: 'CEIC', date: 'Dec 2024' },
  'preCrisisBrent': { source: 'ICE Brent Futures', date: '27 Feb 2026' },
  'currentBrentSpot': { source: 'Dated Brent physical $131.97 (CNBC); futures ~$97 but physical reflects procurement cost', date: '10-Apr-2026' },
  'sbpReserves': { source: 'SBP Weekly Statement', date: 'Week ending 27 March 2026' },
  'reservesFloor': { source: 'Working Group estimate', date: 'April 2026', assumption: true, reasoning: 'Roughly 1.5 months normal imports' },
  'imfAvailable': { source: 'IMF 3rd EFF review + 2nd RSF staff-level agreement', date: '27-Mar-2026', reasoning: '$1.0B EFF + $0.21B RSF = $1.21B pending board approval' },
  'saudiDeferredFacility': { source: 'Bilateral agreement; expansion to $5B requested (Geo News)', date: 'Mar 2026', reasoning: 'Current $1.2B/yr; Pakistan requested $5B expansion, not yet confirmed' },
  'chinaSwapLine': { source: 'PBOC-SBP CNY 20B swap arrangement', date: '2024-2025', reasoning: 'Reduced from $4B to ~$3B based on CNY 20B at current rates' },
  'exchangeRate': { source: 'SBP Reference Rate', date: '11-Apr-2026', reasoning: 'PKR 279/USD, stable at 278-280 range' },
  'nelsonIndex': { source: 'Estimated from technology type', date: 'April 2026', assumption: true, verify: true },
  'foStorageDays': { source: 'Working Group estimate', date: 'April 2026', assumption: true },
};
