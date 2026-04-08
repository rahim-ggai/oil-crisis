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
}

export type ActivePanel =
  | 'dashboard'
  | 'm1' | 'm2' | 'm3' | 'm4' | 'm5' | 'm6' | 'm7' | 'm8'
  | 'scenarios'
  | 'report';
