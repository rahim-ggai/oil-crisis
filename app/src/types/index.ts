// ============================================================
// Pakistan Energy Crisis Simulation — Core Types
// ============================================================

export type BaselineMode = 'full_corridor_compromised' | 'iran_permitted_transit';
export type TriggerLevel = 'NORMAL' | 'ALERT' | 'AUSTERITY' | 'EMERGENCY';
export type ConservationLevel = 'none' | 'alert' | 'austerity' | 'emergency';

export type CargoStatus = 'docked' | 'in_war_zone' | 'outside_war_zone' | 'contracted_not_dispatched';

export interface FlaggedValue {
  value: number;
  isOverridden: boolean;
  source: string;
  assumption?: boolean; // true if [ASSUMPTION]
  verify?: boolean; // true if [VERIFY]
  reasoning?: string;
}

// ============================================================
// Module 1 — Domestic Fuel Inventory
// ============================================================
export interface M1State {
  crudeOilStock: number; // barrels
  hsdStock: number; // tonnes
  msStock: number; // tonnes
  foStock: number; // tonnes
  lpgStock: number; // tonnes
  jp1Stock: number; // tonnes
  hsdDailyConsumption: number; // tonnes/day
  msDailyConsumption: number; // tonnes/day
  foDailyConsumption: number; // tonnes/day
  totalPetroleumConsumption: number; // barrels/day
}

// ============================================================
// Module 2 — Seaborne Supply Pipeline
// ============================================================
export interface Cargo {
  id: string;
  vesselName: string;
  imoNumber: string;
  product: string;
  quantityBarrels: number;
  quantityTonnes: number;
  loadingPort: string;
  eta: string; // ISO date
  insurer: string;
  flagState: string;
  status: CargoStatus;
  lossProbability: number; // 0-1
}

export interface M2State {
  cargoes: Cargo[];
}

// ============================================================
// Module 3 — Crude Oil Conversion Matrix
// ============================================================
export interface Refinery {
  id: string;
  name: string;
  shortName: string;
  capacityBpd: number;
  technology: string;
  nelsonIndex: number;
  utilization: number; // 0-1
  crudeDiet: Record<string, number>; // crude grade -> % allocation (0-100)
}

export interface YieldProfile {
  lpg: number;
  naphthaPetrol: number;
  hsd: number;
  jp1Kero: number;
  fo: number;
  loss: number;
}

export interface M3State {
  refineries: Refinery[];
  yieldMatrix: Record<string, YieldProfile>; // crude grade -> yields
  foStorageDays: number;
  refineryShutdownLogic: boolean;
}

// ============================================================
// Module 4 — Alternate Sourcing & Logistics
// ============================================================
export interface AlternateSource {
  id: string;
  country: string;
  supplier: string;
  product: string;
  maxLiftableKbblMonth: number;
  normalTransitDays: number;
  crisisTransitDays: number;
  freightPremiumPct: number;
  paymentTerms: string;
  notes: string;
  activated: boolean;
}

export interface M4State {
  sources: AlternateSource[];
}

// ============================================================
// Module 5 — Iran-Specific Supply Corridors
// ============================================================
export interface M5State {
  // 5a: Maritime under Chinese Flag
  bandarAbbasCapacity: number; // bbl/day
  khargIslandCapacity: number; // bbl/day
  chineseFlaggedVessels: number;
  vesselTurnaroundDays: number;
  discountToBrent: number; // 0-1
  paymentMechanism: string;
  // 5b: Overland via Taftan
  truckingCapacity: number; // bbl/day
  borderDegradation: number; // 0-1
  securitySituation: 'normal' | 'tense' | 'hostile';
  // 5c: Degraded Production
  iranianProductionPct: number; // 0-1
}

// ============================================================
// Module 6 — Price-Linked Procurement
// ============================================================
export interface M6State {
  preCrisisBrent: number; // USD/bbl
  currentBrentSpot: number; // USD/bbl
  brentMultiplier: number;
  sbpReserves: number; // USD billions
  reservesFloor: number; // USD billions
  imfAvailable: number; // USD billions
  saudiDeferredFacility: number; // USD billions/year
  saudiDoubled: boolean;
  uaeDeposits: number; // USD billions
  chinaSwapLine: number; // USD billions
  barterCapacity: number; // USD millions/year
  normalMonthlyImportBill: number; // USD billions
  exchangeRate: number; // PKR/USD
}

// ============================================================
// Module 7 — Conservation Levels
// ============================================================
export interface ConservationMatrix {
  privateVehicles: string;
  goodsTransport: string;
  industryAllocation: string;
  publicTransport: string;
  powerGeneration: string;
  lockdownDays: string;
  agriculture: string;
  aviation: string;
  cng: string;
}

export interface DemandReduction {
  hsd: number; // 0-1
  ms: number; // 0-1
  fo: number; // 0-1
  jp1: number; // 0-1
}

export interface M7State {
  alertMatrix: ConservationMatrix;
  austerityMatrix: ConservationMatrix;
  emergencyMatrix: ConservationMatrix;
  alertReductions: DemandReduction;
  austerityReductions: DemandReduction;
  emergencyReductions: DemandReduction;
}

// ============================================================
// Module 8 — Dynamic Trigger Logic
// ============================================================
export interface TriggerWeights {
  wD: number; // days of cover
  wP: number; // price stress
  wS: number; // pipeline reliability
  wA: number; // alternates active
  wI: number; // Iran corridor
}

export interface M8State {
  weights: TriggerWeights;
  manualOverride: TriggerLevel | null;
  deEscalationDays: number; // consecutive days condition met
}

// ============================================================
// Formula Parameters — editable constants across all modules
// ============================================================
export interface FormulaParams {
  // M1: Weighted days of cover
  m1_hsdWeight: number;     // default 0.5
  m1_msWeight: number;      // default 0.35
  m1_foWeight: number;      // default 0.15

  // M2: Pipeline risk
  m2_lossProb_docked: number;              // default 0.02
  m2_lossProb_warZone: number;             // default 0.35
  m2_lossProb_outsideWarZone: number;      // default 0.05
  m2_lossProb_contracted: number;          // default 0.15
  m2_pipelineScoreBaseline: number;        // default 3,000,000 bbl
  m2_iranPermittedTransitCap: number;      // default 0.15
  m2_fullCorridorFloor: number;            // default 0.40

  // M3: Refinery feasibility
  m3_foInfeasibleThreshold: number;        // default 55%
  m3_foFeasibleThreshold: number;          // default 30% (implied: score=100 at this)
  m3_parcoHsdBonus: number;                // default 5%
  m3_parcoFoReduction: number;             // default 5%
  m3_barrelToTonneConversion: number;      // default 0.136

  // M5: Iran corridor
  m5_vlccLoadSize: number;                 // default 500,000 bbl
  m5_maxCapacityBaseline: number;          // default 700,000 bbl/day
  m5_securityMultiplier_hostile: number;   // default 0.25
  m5_securityMultiplier_tense: number;     // default 0.60
  m5_securityMultiplier_normal: number;    // default 1.00

  // M6: Price/affordability
  m6_productPremium: number;               // default 1.10
  m6_freightPremium: number;               // default 1.15
  m6_warDurationMonths: number;            // default 6
  m6_normalDemandBpd: number;              // default 423,000

  // M8: Trigger thresholds
  m8_stressD_maxDays: number;              // default 30
  m8_stressP_maxMultiplier: number;        // default 4 (5× = max stress)
  m8_bufferDiscount: number;               // default 0.5
  m8_thresholdAlert: number;               // default 25
  m8_thresholdAusterity: number;           // default 50
  m8_thresholdEmergency: number;           // default 75

  // M8: Hard overrides
  m8_hardOverride_criticalStockDays: number;     // default 7
  m8_hardOverride_noCargoDays: number;           // default 14
  m8_hardOverride_priceMultiplier: number;       // default 4
  m8_hardOverride_reservesFloor: number;         // default 12 (USD bn)
  m8_hardOverride_minAlternateScore: number;     // default 30

  // M4/M8: Alternate activation
  m4_activationScoreBaseline: number;      // default 10,000 kbbl/month
}

// ============================================================
// Top-level scenario state
// ============================================================
export interface ScenarioState {
  scenarioName: string;
  baselineMode: BaselineMode;
  m1: M1State;
  m2: M2State;
  m3: M3State;
  m4: M4State;
  m5: M5State;
  m6: M6State;
  m7: M7State;
  m8: M8State;
  formulaParams: FormulaParams;
}

export type ActivePanel =
  | 'dashboard'
  | 'm1' | 'm2' | 'm3' | 'm4' | 'm5' | 'm6' | 'm7' | 'm8'
  | 'scenarios'
  | 'report'
  | 'formulas';
