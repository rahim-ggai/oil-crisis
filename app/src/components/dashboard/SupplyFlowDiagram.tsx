'use client';

import { useMemo } from 'react';
import type { AlternateSource } from '@/types';

interface SupplyFlowDiagramProps {
  sources: AlternateSource[];
  iranCorridorOpen: boolean;
  iranBblDay: number;
}

/** Determine route color based on freight premium and corridor status */
function getRouteColor(
  source: { freightPremiumPct: number; activated: boolean },
  isIran: boolean,
  iranCorridorOpen: boolean,
): string {
  if (!source.activated) return '#94a3b8'; // slate — deactivated
  if (isIran && !iranCorridorOpen) return '#c0392b'; // red — closed
  if (source.freightPremiumPct > 80) return '#c0392b'; // red — high-risk
  if (source.freightPremiumPct >= 30) return '#d4a017'; // ochre — war-zone affected
  return '#27ae60'; // green — unaffected
}

/** Compute line width proportional to volume (min 2px, max 8px) */
function getLineWidth(volume: number, maxVolume: number): number {
  if (maxVolume === 0) return 2;
  return 2 + (volume / maxVolume) * 6;
}

function formatVolume(kbbl: number): string {
  return kbbl.toLocaleString('en-US');
}

export function SupplyFlowDiagram({
  sources,
  iranCorridorOpen,
  iranBblDay,
}: SupplyFlowDiagramProps) {
  const iranMonthlyKbbl = Math.round((iranBblDay * 30) / 1000);

  // Build the list of visible sources: activated + Iran
  const visibleSources = useMemo(() => {
    const activeSources = sources
      .filter((s) => s.activated)
      .map((s) => ({
        id: s.id,
        label: `${s.country} (${s.product})`,
        volume: s.maxLiftableKbblMonth,
        transitDays: s.crisisTransitDays,
        freightPremiumPct: s.freightPremiumPct,
        activated: s.activated,
        isIran: false,
      }));

    // Add Iran as a special node
    const iranNode = {
      id: 'iran',
      label: 'Iran',
      volume: iranCorridorOpen ? iranMonthlyKbbl : 0,
      transitDays: 3,
      freightPremiumPct: iranCorridorOpen ? 0 : 999,
      activated: iranCorridorOpen,
      isIran: true,
    };

    const combined = [...activeSources, iranNode];
    // Sort by volume descending (largest at top)
    combined.sort((a, b) => b.volume - a.volume);
    return combined;
  }, [sources, iranCorridorOpen, iranMonthlyKbbl]);

  const maxVolume = useMemo(
    () => Math.max(...visibleSources.map((s) => s.volume), 1),
    [visibleSources],
  );

  const totalMonthlyInflow = useMemo(
    () =>
      visibleSources
        .filter((s) => s.activated && !s.isIran)
        .reduce((sum, s) => sum + s.volume, 0) +
      (iranCorridorOpen ? iranMonthlyKbbl : 0),
    [visibleSources, iranCorridorOpen, iranMonthlyKbbl],
  );

  // Layout constants
  const svgWidth = 800;
  const svgHeight = Math.max(400, visibleSources.length * 52 + 80);
  const leftX = 200;
  const rightX = 620;
  const nodeStartY = 40;
  const nodeSpacing = 48;
  const pakY = svgHeight / 2;
  const pakHeight = Math.min(280, visibleSources.length * 36);

  return (
    <div className="w-full">
      <svg
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        className="w-full h-auto"
        role="img"
        aria-label="Oil supply flow diagram from source countries to Pakistan"
      >
        <style>{`
          @keyframes flow {
            to { stroke-dashoffset: -20; }
          }
          .flow-line {
            animation: flow 1s linear infinite;
          }
          .flow-line-slow {
            animation: flow 2s linear infinite;
          }
        `}</style>

        <defs>
          <filter id="shadow" x="-4%" y="-4%" width="108%" height="108%">
            <feDropShadow dx="0" dy="1" stdDeviation="2" floodColor="#1a1a2e" floodOpacity="0.08" />
          </filter>
        </defs>

        {/* Connecting lines */}
        {visibleSources.map((source, i) => {
          const sourceY = nodeStartY + i * nodeSpacing + 16;
          const color = getRouteColor(source, source.isIran, iranCorridorOpen);
          const width = getLineWidth(source.volume, maxVolume);
          const isActive = source.activated && !(source.isIran && !iranCorridorOpen);
          const midX = (leftX + 30 + rightX - 10) / 2;

          return (
            <path
              key={`line-${source.id}`}
              d={`M ${leftX + 30} ${sourceY} C ${midX} ${sourceY}, ${midX} ${pakY}, ${rightX - 10} ${pakY}`}
              fill="none"
              stroke={color}
              strokeWidth={width}
              strokeDasharray={isActive ? '8 6' : '4 8'}
              opacity={isActive ? 0.85 : 0.35}
              className={isActive ? 'flow-line' : ''}
            />
          );
        })}

        {/* Source nodes (left side) */}
        {visibleSources.map((source, i) => {
          const y = nodeStartY + i * nodeSpacing;
          const color = getRouteColor(source, source.isIran, iranCorridorOpen);
          const isActive = source.activated && !(source.isIran && !iranCorridorOpen);

          return (
            <g key={`node-${source.id}`} opacity={isActive ? 1 : 0.5}>
              {/* Node background */}
              <rect
                x={8}
                y={y}
                width={leftX - 4}
                height={32}
                rx={6}
                fill={isActive ? color : '#94a3b8'}
                fillOpacity={0.1}
                stroke={isActive ? color : '#94a3b8'}
                strokeWidth={1}
              />
              {/* Country label */}
              <text
                x={16}
                y={y + 14}
                fontSize={10.5}
                fontFamily="'IBM Plex Sans', sans-serif"
                fontWeight={500}
                fill={isActive ? '#1a1a2e' : '#94a3b8'}
              >
                {source.label}
              </text>
              {/* Volume + transit */}
              <text
                x={16}
                y={y + 26}
                fontSize={9}
                fontFamily="'IBM Plex Mono', monospace"
                fill={isActive ? '#64748b' : '#94a3b8'}
              >
                {source.isIran && !iranCorridorOpen
                  ? 'CLOSED'
                  : `${formatVolume(source.volume)} kbbl/mo`}
                {source.activated && !source.isIran && (
                  <tspan fill="#94a3b8">{` | ${source.transitDays}d`}</tspan>
                )}
                {source.isIran && iranCorridorOpen && (
                  <tspan fill="#94a3b8">{` | ${source.transitDays}d`}</tspan>
                )}
              </text>

              {/* CLOSED badge for Iran */}
              {source.isIran && !iranCorridorOpen && (
                <g>
                  <rect
                    x={leftX - 58}
                    y={y + 6}
                    width={46}
                    height={18}
                    rx={3}
                    fill="#c0392b"
                  />
                  <text
                    x={leftX - 35}
                    y={y + 19}
                    fontSize={9}
                    fontFamily="'IBM Plex Mono', monospace"
                    fontWeight={600}
                    fill="#ffffff"
                    textAnchor="middle"
                  >
                    CLOSED
                  </text>
                </g>
              )}

              {/* Small circle connector */}
              <circle
                cx={leftX + 30}
                cy={y + 16}
                r={4}
                fill={isActive ? color : '#94a3b8'}
                fillOpacity={isActive ? 1 : 0.4}
              />
            </g>
          );
        })}

        {/* Pakistan node (right side) */}
        <g filter="url(#shadow)">
          <rect
            x={rightX - 10}
            y={pakY - pakHeight / 2}
            width={160}
            height={pakHeight}
            rx={8}
            fill="#1a1a2e"
            fillOpacity={0.95}
          />
          <text
            x={rightX + 70}
            y={pakY - 14}
            fontSize={16}
            fontFamily="'IBM Plex Sans', sans-serif"
            fontWeight={700}
            fill="#ffffff"
            textAnchor="middle"
          >
            PAKISTAN
          </text>
          <text
            x={rightX + 70}
            y={pakY + 6}
            fontSize={11}
            fontFamily="'IBM Plex Mono', monospace"
            fill="#94a3b8"
            textAnchor="middle"
          >
            Oil Imports
          </text>
          <line
            x1={rightX + 10}
            y1={pakY + 16}
            x2={rightX + 130}
            y2={pakY + 16}
            stroke="#ffffff"
            strokeOpacity={0.15}
            strokeWidth={1}
          />
          <text
            x={rightX + 70}
            y={pakY + 36}
            fontSize={18}
            fontFamily="'IBM Plex Mono', monospace"
            fontWeight={600}
            fill="#27ae60"
            textAnchor="middle"
          >
            {formatVolume(totalMonthlyInflow)}
          </text>
          <text
            x={rightX + 70}
            y={pakY + 52}
            fontSize={10}
            fontFamily="'IBM Plex Mono', monospace"
            fill="#94a3b8"
            textAnchor="middle"
          >
            kbbl/month total
          </text>
        </g>

        {/* Legend */}
        <g transform={`translate(16, ${svgHeight - 30})`}>
          <circle cx={0} cy={0} r={4} fill="#27ae60" />
          <text x={8} y={4} fontSize={9} fill="#64748b" fontFamily="'IBM Plex Sans', sans-serif">Unaffected</text>

          <circle cx={80} cy={0} r={4} fill="#d4a017" />
          <text x={88} y={4} fontSize={9} fill="#64748b" fontFamily="'IBM Plex Sans', sans-serif">War-zone premium</text>

          <circle cx={196} cy={0} r={4} fill="#c0392b" />
          <text x={204} y={4} fontSize={9} fill="#64748b" fontFamily="'IBM Plex Sans', sans-serif">Closed / High-risk</text>

          <line x1={316} y1={0} x2={340} y2={0} stroke="#94a3b8" strokeWidth={2} strokeDasharray="4 4" />
          <text x={346} y={4} fontSize={9} fill="#64748b" fontFamily="'IBM Plex Sans', sans-serif">Deactivated</text>
        </g>
      </svg>
    </div>
  );
}
