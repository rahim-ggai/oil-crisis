'use client';

import { useAppStore } from '@/lib/store';
import type { ActivePanel } from '@/types';

const NAV_ITEMS: { id: ActivePanel; label: string; shortLabel?: string }[] = [
  { id: 'briefing', label: 'Briefing' },
  { id: 'oil-prices', label: 'Oil Prices' },
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'm1', label: 'M1: Inventory', shortLabel: 'Inventory' },
  { id: 'm2', label: 'M2: Pipeline', shortLabel: 'Pipeline' },
  { id: 'm3', label: 'M3: Refining', shortLabel: 'Refining' },
  { id: 'm4', label: 'M4: Alt Sources', shortLabel: 'Alt Sources' },
  { id: 'm5', label: 'M5: Iran', shortLabel: 'Iran' },
  { id: 'm6', label: 'M6: Price', shortLabel: 'Price' },
  { id: 'm7', label: 'M7: Conservation', shortLabel: 'Conservation' },
  { id: 'm8', label: 'M8: Trigger', shortLabel: 'Trigger' },
  { id: 'scenarios', label: 'Scenarios' },
  { id: 'report', label: 'Report' },
  { id: 'formulas', label: 'Formulas' },
];

export function LeftNav() {
  const { activePanel, setActivePanel } = useAppStore();

  return (
    <nav className="w-48 bg-card border-r border-border flex-shrink-0 overflow-y-auto no-print">
      <div className="py-2">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            onClick={() => setActivePanel(item.id)}
            className={`w-full text-left px-4 py-2 text-sm transition-colors ${
              activePanel === item.id
                ? 'bg-navy text-white font-medium'
                : 'text-foreground hover:bg-card-hover'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
    </nav>
  );
}
