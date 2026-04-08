'use client';

import { useAppStore } from '@/lib/store';
import { getWeightedDaysOfCover } from '@/lib/calculations/m1-inventory';
import { computeTrigger } from '@/lib/calculations/m8-trigger';

const LEVEL_COLORS: Record<string, string> = {
  NORMAL: 'bg-green-muted',
  ALERT: 'bg-ochre',
  AUSTERITY: 'bg-ochre-light',
  EMERGENCY: 'bg-red-muted',
};

export function StatusBar() {
  const scenario = useAppStore((s) => s.scenario);
  const daysOfCover = getWeightedDaysOfCover(scenario.m1);
  const trigger = computeTrigger(scenario);

  return (
    <footer className="bg-navy text-white px-6 py-2 flex items-center justify-between text-xs font-mono no-print">
      <div className="flex items-center gap-6">
        <span>
          Days of Cover: <strong className="text-sm">{daysOfCover.toFixed(1)}</strong>
        </span>
        <span className="flex items-center gap-1.5">
          Trigger Level:{' '}
          <span className={`inline-block px-2 py-0.5 rounded text-white text-xs font-bold ${LEVEL_COLORS[trigger.recommendedLevel]}`}>
            {trigger.recommendedLevel}
          </span>
        </span>
        <span>
          Stress: <strong>{trigger.compositeStress.toFixed(1)}</strong>/100
        </span>
      </div>
      <div className="flex items-center gap-6">
        <span>
          Brent: <strong>${scenario.m6.currentBrentSpot}/bbl</strong>
        </span>
        <span>
          SBP Reserves: <strong>${scenario.m6.sbpReserves.toFixed(1)}B</strong>
        </span>
        <span className="text-slate-light">
          Mode: {scenario.baselineMode === 'full_corridor_compromised' ? 'Full Corridor Compromised' : 'Iran-Permitted Transit'}
        </span>
      </div>
    </footer>
  );
}
