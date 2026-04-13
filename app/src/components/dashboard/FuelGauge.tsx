'use client';

// ────────────────────────────────────────────────────────────
// FuelGauge — vertical tank SVG showing days of cover
// ────────────────────────────────────────────────────────────

interface FuelGaugeProps {
  label: string;        // "HSD", "MS", "FO"
  fullLabel: string;    // "High Speed Diesel"
  days: number;         // current days of cover
  maxDays?: number;     // scale max (default 60)
  threshold?: number;   // warning threshold (e.g., 15 for HSD)
}

function fmt(n: number): string {
  if (!isFinite(n)) return '--';
  return n.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

function fillColor(days: number, threshold: number): string {
  if (days > threshold * 1.5) return '#27ae60';  // green-muted
  if (days > threshold) return '#d4a017';          // ochre
  return '#c0392b';                                // red-muted
}

export function FuelGauge({
  label,
  fullLabel,
  days,
  maxDays = 60,
  threshold = 15,
}: FuelGaugeProps) {
  const tankW = 80;
  const tankH = 140;
  const svgW = tankW;
  const svgH = tankH + 4; // small margin for rounded top

  // Tank geometry
  const rx = 8;
  const tankX = 0;
  const tankY = 2;
  const innerPad = 3;

  // Fill calculation
  const clampedDays = Math.max(0, Math.min(days, maxDays));
  const fillPct = clampedDays / maxDays;
  const innerH = tankH - innerPad * 2;
  const fillH = innerH * fillPct;
  const fillY = tankY + innerPad + (innerH - fillH);
  const innerW = tankW - innerPad * 2;

  // Threshold line
  const thresholdPct = Math.min(threshold / maxDays, 1);
  const thresholdY = tankY + innerPad + innerH * (1 - thresholdPct);

  const color = fillColor(days, threshold);

  return (
    <div className="flex flex-col items-center gap-1">
      {/* Label */}
      <span className="text-xs font-semibold text-navy tracking-wide">{label}</span>

      {/* Tank SVG */}
      <svg
        width={svgW}
        height={svgH}
        viewBox={`0 0 ${svgW} ${svgH}`}
        className="overflow-visible"
      >
        {/* Tank outline */}
        <rect
          x={tankX}
          y={tankY}
          width={tankW}
          height={tankH}
          rx={rx}
          ry={rx}
          fill="none"
          stroke="#e2e0dc"
          strokeWidth={1.5}
        />

        {/* Tank background */}
        <rect
          x={tankX + innerPad}
          y={tankY + innerPad}
          width={innerW}
          height={innerH}
          rx={rx - 2}
          ry={rx - 2}
          fill="#f5f4f0"
        />

        {/* Animated fill */}
        <rect
          x={tankX + innerPad}
          y={fillY}
          width={innerW}
          height={fillH}
          rx={fillH > (rx - 2) * 2 ? rx - 2 : 0}
          ry={fillH > (rx - 2) * 2 ? rx - 2 : 0}
          fill={color}
          opacity={0.75}
          style={{
            transition: 'y 0.8s ease-out, height 0.8s ease-out, fill 0.5s ease',
          }}
        />

        {/* Threshold dashed line */}
        <line
          x1={tankX + 1}
          y1={thresholdY}
          x2={tankX + tankW - 1}
          y2={thresholdY}
          stroke="#1a1a2e"
          strokeWidth={1}
          strokeDasharray="4 3"
          opacity={0.5}
        />

        {/* Threshold label */}
        <text
          x={tankX + tankW + 4}
          y={thresholdY + 3}
          style={{ fontFamily: 'var(--font-mono)', fontSize: 8, fill: '#64748b' }}
        >
          {threshold}d
        </text>

        {/* Value inside tank */}
        <text
          x={tankW / 2}
          y={tankY + tankH / 2 + 4}
          textAnchor="middle"
          dominantBaseline="middle"
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 14,
            fontWeight: 600,
            fill: fillPct > 0.4 ? '#ffffff' : '#1a1a2e',
          }}
        >
          {fmt(days)}d
        </text>
      </svg>

      {/* Full label */}
      <span className="text-[10px] text-slate text-center leading-tight max-w-[80px]">
        {fullLabel}
      </span>
    </div>
  );
}
