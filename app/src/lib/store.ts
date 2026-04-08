'use client';

import { create } from 'zustand';
import type {
  ScenarioState, ActivePanel, BaselineMode, TriggerLevel,
  M1State, M2State, M3State, M4State, M5State, M6State, M7State, M8State, Cargo, AlternateSource
} from '@/types';
import { DEFAULT_SCENARIO } from './defaults';

interface AppStore {
  // Navigation
  activePanel: ActivePanel;
  setActivePanel: (panel: ActivePanel) => void;

  // Scenario state
  scenario: ScenarioState;

  // Top-level
  setScenarioName: (name: string) => void;
  setBaselineMode: (mode: BaselineMode) => void;

  // Module setters
  updateM1: (partial: Partial<M1State>) => void;
  updateM2: (partial: Partial<M2State>) => void;
  updateM3: (partial: Partial<M3State>) => void;
  updateM4: (partial: Partial<M4State>) => void;
  updateM5: (partial: Partial<M5State>) => void;
  updateM6: (partial: Partial<M6State>) => void;
  updateM7: (partial: Partial<M7State>) => void;
  updateM8: (partial: Partial<M8State>) => void;

  // Cargo operations
  addCargo: (cargo: Cargo) => void;
  updateCargo: (id: string, partial: Partial<Cargo>) => void;
  removeCargo: (id: string) => void;

  // Alternate source operations
  updateSource: (id: string, partial: Partial<AlternateSource>) => void;
  toggleSource: (id: string) => void;

  // Scenario management
  loadScenario: (scenario: ScenarioState) => void;
  resetToDefaults: () => void;
  exportScenarioJSON: () => string;
}

export const useAppStore = create<AppStore>((set, get) => ({
  activePanel: 'dashboard',
  setActivePanel: (panel) => set({ activePanel: panel }),

  scenario: { ...DEFAULT_SCENARIO },

  setScenarioName: (name) => set((s) => ({ scenario: { ...s.scenario, scenarioName: name } })),
  setBaselineMode: (mode) => set((s) => ({ scenario: { ...s.scenario, baselineMode: mode } })),

  updateM1: (partial) => set((s) => ({ scenario: { ...s.scenario, m1: { ...s.scenario.m1, ...partial } } })),
  updateM2: (partial) => set((s) => ({ scenario: { ...s.scenario, m2: { ...s.scenario.m2, ...partial } } })),
  updateM3: (partial) => set((s) => ({ scenario: { ...s.scenario, m3: { ...s.scenario.m3, ...partial } } })),
  updateM4: (partial) => set((s) => ({ scenario: { ...s.scenario, m4: { ...s.scenario.m4, ...partial } } })),
  updateM5: (partial) => set((s) => ({ scenario: { ...s.scenario, m5: { ...s.scenario.m5, ...partial } } })),
  updateM6: (partial) => set((s) => ({ scenario: { ...s.scenario, m6: { ...s.scenario.m6, ...partial } } })),
  updateM7: (partial) => set((s) => ({ scenario: { ...s.scenario, m7: { ...s.scenario.m7, ...partial } } })),
  updateM8: (partial) => set((s) => ({ scenario: { ...s.scenario, m8: { ...s.scenario.m8, ...partial } } })),

  addCargo: (cargo) => set((s) => ({
    scenario: { ...s.scenario, m2: { ...s.scenario.m2, cargoes: [...s.scenario.m2.cargoes, cargo] } }
  })),
  updateCargo: (id, partial) => set((s) => ({
    scenario: {
      ...s.scenario,
      m2: {
        ...s.scenario.m2,
        cargoes: s.scenario.m2.cargoes.map((c) => c.id === id ? { ...c, ...partial } : c)
      }
    }
  })),
  removeCargo: (id) => set((s) => ({
    scenario: {
      ...s.scenario,
      m2: { ...s.scenario.m2, cargoes: s.scenario.m2.cargoes.filter((c) => c.id !== id) }
    }
  })),

  updateSource: (id, partial) => set((s) => ({
    scenario: {
      ...s.scenario,
      m4: {
        ...s.scenario.m4,
        sources: s.scenario.m4.sources.map((src) => src.id === id ? { ...src, ...partial } : src)
      }
    }
  })),
  toggleSource: (id) => set((s) => ({
    scenario: {
      ...s.scenario,
      m4: {
        ...s.scenario.m4,
        sources: s.scenario.m4.sources.map((src) => src.id === id ? { ...src, activated: !src.activated } : src)
      }
    }
  })),

  loadScenario: (scenario) => set({ scenario }),
  resetToDefaults: () => set({ scenario: { ...DEFAULT_SCENARIO } }),
  exportScenarioJSON: () => JSON.stringify(get().scenario, null, 2),
}));
