'use client';

import { useState } from 'react';
import { useAppStore } from '@/lib/store';
import { Dashboard } from '@/components/dashboard/Dashboard';
import { M1Inventory } from '@/components/modules/M1Inventory';
import { M2Pipeline } from '@/components/modules/M2Pipeline';
import M3Refining from '@/components/modules/M3Refining';
import M4AltSources from '@/components/modules/M4AltSources';
import { M5Iran } from '@/components/modules/M5Iran';
import { M6Price } from '@/components/modules/M6Price';
import { M7Conservation } from '@/components/modules/M7Conservation';
import { M8Trigger } from '@/components/modules/M8Trigger';
import { ScenarioManager } from '@/components/scenarios/ScenarioManager';
import { ReportPanel } from '@/components/report/ReportPanel';
import { FormulasPanel } from '@/components/modules/FormulasPanel';
import { CrisisDecisionHome } from '@/components/dashboard/CrisisDecisionHome';
import { OilPriceDashboard } from '@/components/dashboard/OilPriceDashboard';
import { MapPanel } from '@/components/modules/MapPanel';
import { LiveTrackingPanel } from '@/components/modules/LiveTrackingPanel';
import { GlobalMonitorPanel } from '@/components/dashboard/GlobalMonitorPanel';

// Panels that should stay mounted once loaded (expensive to re-initialize)
const PERSISTENT_PANELS = ['live-tracking', 'map'] as const;

function ActiveContent({ panel }: { panel: string }) {
  switch (panel) {
    case 'briefing': return <CrisisDecisionHome />;
    case 'oil-prices': return <OilPriceDashboard />;
    case 'dashboard': return <Dashboard />;
    case 'm1': return <M1Inventory />;
    case 'm2': return <M2Pipeline />;
    case 'm3': return <M3Refining />;
    case 'm4': return <M4AltSources />;
    case 'm5': return <M5Iran />;
    case 'm6': return <M6Price />;
    case 'm7': return <M7Conservation />;
    case 'm8': return <M8Trigger />;
    case 'global-monitor': return <GlobalMonitorPanel />;
    case 'scenarios': return <ScenarioManager />;
    case 'report': return <ReportPanel />;
    case 'formulas': return <FormulasPanel />;
    default: return <Dashboard />;
  }
}

export function MainPanel() {
  const activePanel = useAppStore((s) => s.activePanel);
  // Track which persistent panels have been visited (mount once, never unmount)
  const [mountedPersistent, setMountedPersistent] = useState<Set<string>>(new Set());

  // Ensure persistent panels get mounted when first visited
  if (PERSISTENT_PANELS.includes(activePanel as typeof PERSISTENT_PANELS[number]) && !mountedPersistent.has(activePanel)) {
    setMountedPersistent((prev) => new Set(prev).add(activePanel));
  }

  const isPersistentActive = PERSISTENT_PANELS.includes(activePanel as typeof PERSISTENT_PANELS[number]);

  return (
    <>
      {/* Regular panels — only render the active one */}
      {!isPersistentActive && <ActiveContent panel={activePanel} />}

      {/* Persistent panels — stay mounted, hidden via CSS when not active */}
      {(mountedPersistent.has('live-tracking') || activePanel === 'live-tracking') && (
        <div className={`h-full ${activePanel === 'live-tracking' ? '' : 'hidden'}`}>
          <LiveTrackingPanel />
        </div>
      )}
      {(mountedPersistent.has('map') || activePanel === 'map') && (
        <div className={`h-full ${activePanel === 'map' ? '' : 'hidden'}`}>
          <MapPanel />
        </div>
      )}
    </>
  );
}
