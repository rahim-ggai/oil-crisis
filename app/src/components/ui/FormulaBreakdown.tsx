'use client';

import { useState } from 'react';
import { useAppStore } from '@/lib/store';
import type { FormulaTrace, FormulaStep, FormulaVariable, ValueKind } from '@/lib/calculations/formula-trace';
import { fmt } from '@/lib/calculations/formula-trace';
import type { ActivePanel } from '@/types';

// ────────────────────────────────────────────────────────────
// Variable kind badge
// ────────────────────────────────────────────────────────────
function KindBadge({ kind }: { kind: ValueKind }) {
  switch (kind) {
    case 'user-input':
      return <span className="text-[9px] bg-navy/8 text-navy px-1 py-0.5 rounded font-medium">input</span>;
    case 'constant':
      return <span className="text-[9px] text-slate/70 border-b border-dotted border-slate/30">const</span>;
    case 'computed':
      return <span className="text-[9px] text-slate/50">calc</span>;
  }
}

// ────────────────────────────────────────────────────────────
// Variable value display with kind-specific styling
// ────────────────────────────────────────────────────────────
function VariableValue({ variable }: { variable: FormulaVariable }) {
  const valStr = fmt(variable.value, variable.value % 1 === 0 && Math.abs(variable.value) < 1000 ? 0 : 2);
  const unitStr = variable.unit ? ` ${variable.unit}` : '';

  switch (variable.kind) {
    case 'user-input':
      return <span className="font-mono text-xs bg-navy/5 px-1 rounded text-navy">{valStr}{unitStr}</span>;
    case 'constant':
      return <span className="font-mono text-xs text-slate border-b border-dotted border-slate/30">{valStr}{unitStr}</span>;
    default:
      return <span className="font-mono text-xs text-navy">{valStr}{unitStr}</span>;
  }
}

// ────────────────────────────────────────────────────────────
// Single formula step
// ────────────────────────────────────────────────────────────
function StepView({ step, depth }: { step: FormulaStep; depth: number }) {
  const [childExpanded, setChildExpanded] = useState(false);
  const setActivePanel = useAppStore((s) => s.setActivePanel);

  return (
    <div className={`${depth > 0 ? 'ml-3 mt-1.5' : 'mt-2'}`}>
      {/* Step label */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-semibold text-navy uppercase tracking-wide">{step.label}</span>
        {step.unit && <span className="text-[9px] text-slate">({step.unit})</span>}
      </div>

      {/* Abstract formula */}
      <div className="text-[10px] text-slate font-mono mt-0.5">{step.formula}</div>

      {/* Substituted formula with live values */}
      <div className="text-xs text-navy font-mono font-medium mt-0.5">{step.substituted}</div>

      {/* Result */}
      <div className="text-xs font-mono mt-0.5">
        <span className="text-slate">= </span>
        <span className="text-navy font-semibold">{fmt(step.result, 2)}</span>
        {step.unit && <span className="text-slate ml-1">{step.unit}</span>}
      </div>

      {/* Variable legend */}
      {step.variables.length > 0 && (
        <div className="mt-1.5 grid gap-0.5">
          {step.variables.map((vr) => (
            <div key={vr.symbol} className="flex items-center gap-2 text-[10px]">
              <span className="font-mono text-navy w-12 flex-shrink-0">{vr.symbol}</span>
              <VariableValue variable={vr} />
              <span className="text-slate/60 truncate">{vr.label}</span>
              <KindBadge kind={vr.kind} />
              {vr.sourceModule && (
                <button
                  onClick={() => setActivePanel(vr.sourceModule as ActivePanel)}
                  className="text-[9px] text-accent-blue hover:underline cursor-pointer"
                >
                  M{vr.sourceModule.replace('m', '')}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Nested child trace (drill-down) */}
      {step.children && depth < 2 && (
        <button
          onClick={() => setChildExpanded(!childExpanded)}
          className="text-[9px] text-accent-blue hover:underline mt-1 cursor-pointer"
        >
          {childExpanded ? 'Hide breakdown' : 'Show breakdown'}
        </button>
      )}
      {childExpanded && step.children && (
        <div className="border-l border-navy/10 pl-2 mt-1">
          {step.children.steps.map((s, i) => (
            <StepView key={i} step={s} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
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
      {/* fx toggle button */}
      <button
        onClick={() => setExpanded(!expanded)}
        className={`inline-flex items-center gap-0.5 text-[10px] font-mono px-1 py-0.5 rounded transition-colors cursor-pointer ${
          expanded
            ? 'bg-navy/10 text-navy'
            : 'text-slate hover:text-navy hover:bg-slate-light/20'
        }`}
        title="Show formula breakdown"
      >
        <span className="italic font-semibold">fx</span>
      </button>

      {/* Expanded panel */}
      {expanded && (
        <div className="border-l-2 border-navy/20 pl-3 py-2 mt-1.5 bg-card/50 rounded-r">
          <div className="text-[11px] font-semibold text-navy mb-1">{trace.title}</div>
          {trace.steps.map((step, i) => (
            <StepView key={i} step={step} depth={0} />
          ))}
          {trace.steps.length > 1 && (
            <div className="mt-2 pt-1.5 border-t border-border text-xs font-mono">
              <span className="text-slate">Result: </span>
              <span className="text-navy font-bold">{fmt(trace.finalResult, 2)}</span>
              {trace.unit && <span className="text-slate ml-1">{trace.unit}</span>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Inline variant — fx button sits next to a value on the same line
// ────────────────────────────────────────────────────────────
interface InlineFormulaProps {
  trace: FormulaTrace;
  children: React.ReactNode; // The value display
}

export function InlineFormula({ trace, children }: InlineFormulaProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div>
      <div className="flex items-center gap-1">
        {children}
        <button
          onClick={() => setExpanded(!expanded)}
          className={`inline-flex items-center text-[10px] font-mono px-1 py-0.5 rounded transition-colors cursor-pointer ${
            expanded
              ? 'bg-navy/10 text-navy'
              : 'text-slate hover:text-navy hover:bg-slate-light/20'
          }`}
          title="Show formula breakdown"
        >
          <span className="italic font-semibold">fx</span>
        </button>
      </div>
      {expanded && (
        <div className="border-l-2 border-navy/20 pl-3 py-2 mt-1.5 bg-card/50 rounded-r">
          <div className="text-[11px] font-semibold text-navy mb-1">{trace.title}</div>
          {trace.steps.map((step, i) => (
            <StepView key={i} step={step} depth={0} />
          ))}
          {trace.steps.length > 1 && (
            <div className="mt-2 pt-1.5 border-t border-border text-xs font-mono">
              <span className="text-slate">Result: </span>
              <span className="text-navy font-bold">{fmt(trace.finalResult, 2)}</span>
              {trace.unit && <span className="text-slate ml-1">{trace.unit}</span>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
