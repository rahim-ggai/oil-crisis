'use client';

import { useMemo } from 'react';

interface DieselSector {
  name: string;
  pct: number;
  bblDay: number;
}

interface DieselAllocationFlowProps {
  totalHsdBblDay: number;
  sectors: DieselSector[];
  level: string;
}

const SECTOR_COLORS: Record<string, string> = {
  Transport: '#1a1a2e',
  Agriculture: '#27ae60',
  Industry: '#2563eb',
  Power: '#d4a017',
  'Public Transport': '#6366f1',
  Other: '#94a3b8',
};

export function DieselAllocationFlow({ totalHsdBblDay, sectors, level }: DieselAllocationFlowProps) {
  // Filter out zero-allocation sectors
  const activeSectors = useMemo(() => sectors.filter((s) => s.bblDay > 0), [sectors]);

  const svgWidth = 700;
  const svgHeight = Math.max(320, activeSectors.length * 48 + 80);
  const sourceX = 60;
  const sourceY = svgHeight / 2;
  const sectorStartX = 480;

  return (
    <div className="w-full">
      <div className="flex items-center gap-3 mb-2">
        <h4 className="text-xs font-semibold text-navy uppercase tracking-wide">
          HSD (Diesel) Allocation at {level} Level
        </h4>
        <span className="font-mono text-xs text-slate">
          Total: {Math.round(totalHsdBblDay).toLocaleString()} bbl/day
        </span>
      </div>

      <svg
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        className="w-full"
        style={{ maxHeight: '400px' }}
      >
        {/* Animated flow line styles */}
        <defs>
          <style>{`
            @keyframes dieselFlow {
              to { stroke-dashoffset: -20; }
            }
            .diesel-flow { animation: dieselFlow 1.5s linear infinite; }
          `}</style>
        </defs>

        {/* Source node — Diesel Supply */}
        <rect
          x={sourceX - 50}
          y={sourceY - 30}
          width={100}
          height={60}
          rx={8}
          fill="#1a1a2e"
        />
        <text
          x={sourceX}
          y={sourceY - 6}
          textAnchor="middle"
          fill="white"
          fontSize={11}
          fontWeight={700}
        >
          DIESEL
        </text>
        <text
          x={sourceX}
          y={sourceY + 10}
          textAnchor="middle"
          fill="white"
          fontSize={9}
          opacity={0.8}
        >
          {Math.round(totalHsdBblDay).toLocaleString()} bbl/d
        </text>

        {/* Sector nodes and flow lines */}
        {activeSectors.map((sector, i) => {
          const sectorY = 40 + i * ((svgHeight - 80) / Math.max(activeSectors.length - 1, 1));
          const color = SECTOR_COLORS[sector.name] || '#64748b';
          const lineWidth = Math.max(1.5, Math.min(8, (sector.pct / 100) * 16));
          const opacity = sector.pct > 0 ? 0.8 : 0.2;

          // Bezier curve from source to sector
          const midX = (sourceX + 50 + sectorStartX) / 2;

          return (
            <g key={sector.name}>
              {/* Flow line */}
              <path
                d={`M ${sourceX + 50} ${sourceY} C ${midX} ${sourceY}, ${midX} ${sectorY}, ${sectorStartX} ${sectorY}`}
                fill="none"
                stroke={color}
                strokeWidth={lineWidth}
                opacity={opacity}
                strokeDasharray="10 6"
                className="diesel-flow"
              />

              {/* Percentage label on the line */}
              <text
                x={midX}
                y={sectorY + (sourceY - sectorY) * 0.3 - 6}
                textAnchor="middle"
                fontSize={9}
                fill={color}
                fontWeight={600}
                fontFamily="'IBM Plex Mono', monospace"
              >
                {sector.pct}%
              </text>

              {/* Sector node */}
              <rect
                x={sectorStartX}
                y={sectorY - 16}
                width={200}
                height={32}
                rx={6}
                fill={color}
                opacity={0.12}
                stroke={color}
                strokeWidth={1.5}
              />
              <text
                x={sectorStartX + 8}
                y={sectorY + 1}
                fill={color}
                fontSize={11}
                fontWeight={600}
              >
                {sector.name}
              </text>
              <text
                x={sectorStartX + 192}
                y={sectorY + 1}
                textAnchor="end"
                fill={color}
                fontSize={10}
                fontFamily="'IBM Plex Mono', monospace"
                fontWeight={500}
              >
                {Math.round(sector.bblDay).toLocaleString()} bbl/d
              </text>
            </g>
          );
        })}
      </svg>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mt-2 text-[10px]">
        {activeSectors.map((s) => (
          <span key={s.name} className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: SECTOR_COLORS[s.name] || '#64748b' }} />
            <span className="text-slate">{s.name}: {s.pct}%</span>
          </span>
        ))}
      </div>
    </div>
  );
}
