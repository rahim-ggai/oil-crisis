'use client';

import { useRef, useState } from 'react';
import { useAppStore } from '@/lib/store';
import { exportToExcel } from '@/lib/excel-export';
import { readExcelFile, parseDSSP, parseTankerPlan } from '@/lib/excel-import';

export function Header() {
  const { scenario, setScenarioName, setBaselineMode, updateM1, updateM2 } = useAppStore();
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
        setImportMsg(`DSSP: ${Object.keys(result.m1).length} fields updated`);
      } else { setImportMsg('No data found in DSSP'); }
    } catch { setImportMsg('DSSP import failed'); }
    if (dsspRef.current) dsspRef.current.value = '';
    setTimeout(() => setImportMsg(null), 4000);
  }

  async function handleTanker(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const wb = await readExcelFile(file);
      const result = parseTankerPlan(wb);
      if (result.cargoes.length > 0) {
        updateM2({ cargoes: result.cargoes });
        setImportMsg(`Tanker Plan: ${result.cargoes.length} vessels`);
      } else { setImportMsg('No vessels found'); }
    } catch { setImportMsg('Tanker import failed'); }
    if (tankerRef.current) tankerRef.current.value = '';
    setTimeout(() => setImportMsg(null), 4000);
  }

  return (
    <>
      <div className="classification-banner">
        CONFIDENTIAL — National Energy Security Working Group
      </div>
      <header className="bg-card border-b border-border px-6 py-2 flex items-center justify-between gap-3 no-print sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <h1 className="text-sm font-semibold text-navy tracking-tight">
            Pakistan Energy Crisis Simulation
          </h1>
          <div className="h-4 w-px bg-border" />
          <input
            type="text"
            value={scenario.scenarioName}
            onChange={(e) => setScenarioName(e.target.value)}
            className="text-xs font-medium bg-input-bg border border-border rounded px-2 py-0.5 w-44"
            title="Scenario name"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Import buttons */}
          <label className="px-2 py-0.5 text-[10px] font-medium bg-input-bg border border-border text-navy rounded cursor-pointer hover:bg-card-hover transition-colors">
            DSSP
            <input ref={dsspRef} type="file" accept=".xlsx,.xls" onChange={handleDSSP} className="hidden" />
          </label>
          <label className="px-2 py-0.5 text-[10px] font-medium bg-input-bg border border-border text-navy rounded cursor-pointer hover:bg-card-hover transition-colors">
            Tanker Plan
            <input ref={tankerRef} type="file" accept=".xlsx,.xls" onChange={handleTanker} className="hidden" />
          </label>
          {importMsg && (
            <span className={`text-[10px] font-mono ${importMsg.includes('failed') ? 'text-red-muted' : 'text-green-muted'}`}>
              {importMsg}
            </span>
          )}

          <div className="h-4 w-px bg-border" />

          {/* Baseline toggle */}
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-slate">Baseline:</span>
            <button
              onClick={() => setBaselineMode('full_corridor_compromised')}
              className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                scenario.baselineMode === 'full_corridor_compromised'
                  ? 'bg-navy text-white'
                  : 'bg-input-bg text-slate hover:bg-border'
              }`}
            >
              Full Corridor Compromised
            </button>
            <button
              onClick={() => setBaselineMode('iran_permitted_transit')}
              className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                scenario.baselineMode === 'iran_permitted_transit'
                  ? 'bg-navy text-white'
                  : 'bg-input-bg text-slate hover:bg-border'
              }`}
            >
              Iran-Permitted Transit
            </button>
          </div>

          <div className="h-4 w-px bg-border" />

          <button
            onClick={() => exportToExcel(scenario)}
            className="px-2 py-0.5 rounded text-[10px] font-medium bg-input-bg text-slate hover:bg-border transition-colors"
          >
            Export Excel
          </button>

          <div className="h-4 w-px bg-border" />
          <span className="text-[10px] font-mono text-slate">
            {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
          </span>
        </div>
      </header>
    </>
  );
}
