'use client';

import { useRef, useState } from 'react';
import { useAppStore } from '@/lib/store';
import { SCENARIO_A, SCENARIO_B, SCENARIO_C, SCENARIO_D } from '@/lib/presets';
import { ModulePanel, Card } from '@/components/ui/ModulePanel';
import { exportToExcel } from '@/lib/excel-export';
import { readExcelFile, parseDSSP, parseTankerPlan } from '@/lib/excel-import';
import type { ScenarioState } from '@/types';

const PRESET_INFO = [
  {
    key: 'A',
    scenario: SCENARIO_A,
    name: 'Scenario A: Partial Hormuz Closure',
    outcome: 'Moderate disruption. Iran-permitted transit active, Brent ~$107. Alert-level conservation likely.',
  },
  {
    key: 'B',
    scenario: SCENARIO_B,
    name: 'Scenario B: Complete Hormuz Closure (ToR Baseline)',
    outcome: 'Severe disruption. Full corridor compromised, Brent ~$142. Austerity-level conservation expected.',
  },
  {
    key: 'C',
    scenario: SCENARIO_C,
    name: 'Scenario C: Wider Gulf Conflict + Infrastructure',
    outcome: 'Critical. Iranian production at 25%, Brent ~$213. Emergency-level conservation probable.',
  },
  {
    key: 'D',
    scenario: SCENARIO_D,
    name: 'Scenario D: Combined Supply-and-Price Shock',
    outcome: 'Worst case. Brent ~$284, reserves depleted, IMF unavailable. Full emergency protocols.',
  },
];

export function ScenarioManager() {
  const { scenario, loadScenario, exportScenarioJSON, resetToDefaults, updateM1, updateM2 } = useAppStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dsspInputRef = useRef<HTMLInputElement>(null);
  const tankerInputRef = useRef<HTMLInputElement>(null);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  function handleSave() {
    const json = exportScenarioJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${scenario.scenarioName.replace(/\s+/g, '_').toLowerCase()}_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function handleLoad(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const parsed = JSON.parse(evt.target?.result as string) as ScenarioState;
        if (parsed.scenarioName && parsed.m1 && parsed.m8) {
          loadScenario(parsed);
        } else {
          alert('Invalid scenario file format.');
        }
      } catch {
        alert('Failed to parse scenario JSON file.');
      }
    };
    reader.readAsText(file);
    // Reset input so the same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function handleExcelExport() {
    exportToExcel(scenario);
  }

  async function handleDSSPImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setImportStatus('Parsing DSSP...');
      const wb = await readExcelFile(file);
      const result = parseDSSP(wb);
      if (Object.keys(result.m1).length > 0) {
        updateM1(result.m1);
        const fields = Object.entries(result.m1)
          .map(([k, v]) => `${k}: ${(v as number).toLocaleString()}`)
          .join(', ');
        setImportStatus(`DSSP imported (${result.date || 'date unknown'}): ${fields}`);
      } else {
        setImportStatus('DSSP import: no matching data found. Check file format.');
      }
    } catch (err) {
      setImportStatus(`DSSP import failed: ${err}`);
    }
    if (dsspInputRef.current) dsspInputRef.current.value = '';
  }

  async function handleTankerImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setImportStatus('Parsing Tanker Plan...');
      const wb = await readExcelFile(file);
      const result = parseTankerPlan(wb);
      if (result.cargoes.length > 0) {
        updateM2({ cargoes: result.cargoes });
        setImportStatus(`Tanker Plan imported (${result.month}): ${result.cargoes.length} vessels loaded`);
      } else {
        setImportStatus('Tanker Plan import: no vessel records found. Check file format.');
      }
    } catch (err) {
      setImportStatus(`Tanker Plan import failed: ${err}`);
    }
    if (tankerInputRef.current) tankerInputRef.current.value = '';
  }

  return (
    <ModulePanel title="Scenario Manager" subtitle="Save, load, and compare scenario configurations">
      {/* Actions row */}
      <div className="flex flex-wrap gap-3 mb-6">
        <button
          onClick={handleSave}
          className="px-4 py-2 text-sm font-medium bg-navy text-white rounded hover:bg-navy-light transition-colors"
        >
          Save Scenario (JSON)
        </button>

        <label className="px-4 py-2 text-sm font-medium bg-card border border-border text-navy rounded cursor-pointer hover:bg-card-hover transition-colors">
          Load Scenario (JSON)
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleLoad}
            className="hidden"
          />
        </label>

        <button
          onClick={handleExcelExport}
          className="px-4 py-2 text-sm font-medium bg-card border border-border text-navy rounded hover:bg-card-hover transition-colors"
        >
          Export to Excel
        </button>

        <div className="flex-1" />

        <button
          onClick={resetToDefaults}
          className="px-4 py-2 text-sm font-medium text-red-muted border border-red-muted/30 rounded hover:bg-red-muted/10 transition-colors"
        >
          Reset to Defaults
        </button>
      </div>

      {/* Ministry Data Import */}
      <Card title="Import Ministry Data (Excel)" className="mb-6">
        <p className="text-xs text-slate mb-4">
          Upload OCAC/Ministry Excel files to update the model with actual operational data. DSSP updates inventory (M1), Tanker Plan updates seaborne pipeline (M2).
        </p>
        <div className="flex flex-wrap gap-3 mb-3">
          <label className="px-4 py-2 text-sm font-medium bg-card border border-border text-navy rounded cursor-pointer hover:bg-card-hover transition-colors">
            Import DSSP (Stock Position)
            <input
              ref={dsspInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleDSSPImport}
              className="hidden"
            />
          </label>
          <label className="px-4 py-2 text-sm font-medium bg-card border border-border text-navy rounded cursor-pointer hover:bg-card-hover transition-colors">
            Import Tanker Plan (Vessels)
            <input
              ref={tankerInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleTankerImport}
              className="hidden"
            />
          </label>
        </div>
        {importStatus && (
          <div className={`text-xs font-mono p-2 rounded ${importStatus.includes('failed') || importStatus.includes('no matching') ? 'bg-red-muted/10 text-red-muted' : 'bg-green-muted/10 text-green-muted'}`}>
            {importStatus}
          </div>
        )}
      </Card>

      {/* Current scenario info */}
      <Card className="mb-6">
        <div className="flex items-center gap-4">
          <div>
            <p className="text-xs text-slate uppercase tracking-wide">Current Scenario</p>
            <p className="text-sm font-semibold text-navy">{scenario.scenarioName}</p>
          </div>
          <div className="h-8 w-px bg-border" />
          <div>
            <p className="text-xs text-slate uppercase tracking-wide">Baseline Mode</p>
            <p className="text-sm font-mono text-navy">
              {scenario.baselineMode === 'full_corridor_compromised' ? 'Full Corridor Compromised' : 'Iran-Permitted Transit'}
            </p>
          </div>
        </div>
      </Card>

      {/* Preset scenarios */}
      <h3 className="text-sm font-semibold text-navy mb-3">Preset Scenarios</h3>
      <div className="grid grid-cols-2 gap-4">
        {PRESET_INFO.map((preset) => (
          <Card key={preset.key} className="flex flex-col">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div>
                <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-navy text-white text-xs font-semibold mr-2">
                  {preset.key}
                </span>
                <span className="text-sm font-semibold text-navy">{preset.name}</span>
              </div>
            </div>
            <p className="text-xs text-slate mb-4 flex-1 leading-relaxed">{preset.outcome}</p>
            <button
              onClick={() => loadScenario(JSON.parse(JSON.stringify(preset.scenario)))}
              className="self-start px-3 py-1.5 text-xs font-medium bg-input-bg border border-border text-navy rounded hover:bg-card-hover transition-colors"
            >
              Load Scenario {preset.key}
            </button>
          </Card>
        ))}
      </div>
    </ModulePanel>
  );
}
