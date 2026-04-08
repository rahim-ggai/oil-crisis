'use client';

import { useAppStore } from '@/lib/store';
import { exportToExcel } from '@/lib/excel-export';
import type { BaselineMode } from '@/types';

export function Header() {
  const { scenario, setScenarioName, setBaselineMode } = useAppStore();

  return (
    <>
      <div className="classification-banner">
        CONFIDENTIAL — National Energy Security Working Group
      </div>
      <header className="bg-card border-b border-border px-6 py-3 flex items-center justify-between gap-4 no-print">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold text-navy tracking-tight">
            Pakistan Energy Crisis Simulation
          </h1>
          <div className="h-5 w-px bg-border" />
          <input
            type="text"
            value={scenario.scenarioName}
            onChange={(e) => setScenarioName(e.target.value)}
            className="text-sm font-medium bg-input-bg border border-border rounded px-2 py-1 w-60"
            title="Scenario name"
          />
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate font-medium">Baseline:</span>
            <button
              onClick={() => setBaselineMode('full_corridor_compromised')}
              className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                scenario.baselineMode === 'full_corridor_compromised'
                  ? 'bg-navy text-white'
                  : 'bg-input-bg text-slate hover:bg-border'
              }`}
            >
              Full Corridor Compromised
            </button>
            <button
              onClick={() => setBaselineMode('iran_permitted_transit')}
              className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                scenario.baselineMode === 'iran_permitted_transit'
                  ? 'bg-navy text-white'
                  : 'bg-input-bg text-slate hover:bg-border'
              }`}
            >
              Iran-Permitted Transit
            </button>
          </div>
          <div className="h-5 w-px bg-border" />
          <button
            onClick={() => exportToExcel(scenario)}
            className="px-2 py-1 rounded text-xs font-medium bg-input-bg text-slate hover:bg-border transition-colors"
          >
            Export Excel
          </button>
          <div className="h-5 w-px bg-border" />
          <span className="text-xs font-mono text-slate">
            {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
          </span>
        </div>
      </header>
    </>
  );
}
