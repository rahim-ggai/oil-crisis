'use client';

import { useState } from 'react';
import type { FormulaTrace, FormulaStep } from '@/lib/calculations/formula-trace';
import { fmt } from '@/lib/calculations/formula-trace';

// ────────────────────────────────────────────────────────────
// Simple step: formula + substituted values + result
// ────────────────────────────────────────────────────────────
function StepView({ step }: { step: FormulaStep }) {
  return (
    <div className="mt-1.5">
      <div className="text-[10px] text-slate font-mono">{step.formula}</div>
      <div className="text-xs text-navy font-mono font-medium">= {step.substituted}</div>
      <div className="text-xs font-mono">
        <span className="text-navy font-semibold">= {fmt(step.result, 2)}</span>
        {step.unit && <span className="text-slate ml-1">{step.unit}</span>}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Compact panel: title + steps
// ────────────────────────────────────────────────────────────
function TracePanel({ trace }: { trace: FormulaTrace }) {
  return (
    <div className="border-l-2 border-navy/20 pl-3 py-2 mt-1.5 bg-card/50 rounded-r">
      <div className="text-[11px] font-semibold text-navy">{trace.title}</div>
      {trace.steps.map((step, i) => (
        <StepView key={i} step={step} />
      ))}
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// fx toggle button
// ────────────────────────────────────────────────────────────
function FxButton({ expanded, onClick }: { expanded: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center text-[10px] font-mono px-1 py-0.5 rounded transition-colors cursor-pointer ${
        expanded
          ? 'bg-navy/10 text-navy'
          : 'text-slate hover:text-navy hover:bg-slate-light/20'
      }`}
      title="Show formula"
    >
      <span className="italic font-semibold">fx</span>
    </button>
  );
}

// ────────────────────────────────────────────────────────────
// Main FormulaBreakdown component
// ────────────────────────────────────────────────────────────
interface FormulaBreakdownProps {
  trace: FormulaTrace;
  defaultExpanded?: boolean;
}

export function FormulaBreakdown({ trace, defaultExpanded = false }: FormulaBreakdownProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <div className="inline-flex flex-col">
      <FxButton expanded={expanded} onClick={() => setExpanded(!expanded)} />
      {expanded && <TracePanel trace={trace} />}
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Inline variant — fx button sits next to a value
// ────────────────────────────────────────────────────────────
interface InlineFormulaProps {
  trace: FormulaTrace;
  children: React.ReactNode;
}

export function InlineFormula({ trace, children }: InlineFormulaProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div>
      <div className="flex items-center gap-1">
        {children}
        <FxButton expanded={expanded} onClick={() => setExpanded(!expanded)} />
      </div>
      {expanded && <TracePanel trace={trace} />}
    </div>
  );
}
