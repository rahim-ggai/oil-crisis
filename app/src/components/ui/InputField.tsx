'use client';

import { SOURCE_TOOLTIPS } from '@/lib/defaults';

interface InputFieldProps {
  label: string;
  value: number;
  onChange: (val: number) => void;
  unit?: string;
  tooltipKey?: string;
  step?: number;
  min?: number;
  max?: number;
}

export function InputField({ label, value, onChange, unit, tooltipKey, step = 1, min, max }: InputFieldProps) {
  const tooltip = tooltipKey ? SOURCE_TOOLTIPS[tooltipKey] : undefined;

  return (
    <div className="mb-3">
      <div className="flex items-center gap-1 mb-1">
        <label className="text-xs font-medium text-foreground">{label}</label>
        {tooltip && (
          <span
            className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-slate-light/30 text-[9px] text-slate cursor-help"
            title={`Source: ${tooltip.source} (${tooltip.date})${tooltip.assumption ? ' [ASSUMPTION]' : ''}${tooltip.verify ? ' [VERIFY]' : ''}${tooltip.reasoning ? `\n${tooltip.reasoning}` : ''}`}
          >
            ?
          </span>
        )}
        {unit && <span className="text-[10px] text-slate ml-auto">{unit}</span>}
      </div>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        step={step}
        min={min}
        max={max}
        className="w-full font-mono text-sm bg-input-bg border border-border rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-navy"
      />
    </div>
  );
}
