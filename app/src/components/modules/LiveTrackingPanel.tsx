'use client';

import { useState } from 'react';

const EMBED_URL = 'https://embed.myshiptracking.com/embed?myst&zoom=6&lat=25.0&lng=58.0&show_names=true&show_menu=true&scroll_wheel=true&map_style=simple';

export function LiveTrackingPanel() {
  const [hasError, setHasError] = useState(false);

  return (
    <div className="h-full flex flex-col">
      <div className="flex-shrink-0 px-4 py-3 border-b border-border bg-card">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-navy">Live Vessel Tracking</h2>
            <p className="text-xs text-slate mt-0.5">
              Real-time AIS vessel positions. Centered on Strait of Hormuz, Gulf of Oman, and Pakistan coast.
            </p>
          </div>
          <a
            href="https://www.myshiptracking.com/?zoom=6&lat=25.0&lng=58.0"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-medium text-navy border border-border rounded px-3 py-1.5 hover:bg-card-hover transition-colors"
          >
            Open Full Map
          </a>
        </div>
      </div>
      <div className="flex-1 relative min-h-0">
        {hasError ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-input-bg">
            <p className="text-sm text-navy font-medium mb-2">Live map temporarily unavailable</p>
            <p className="text-xs text-slate mb-4">The embed service may be experiencing issues. Use the link below to access the map directly.</p>
            <a
              href="https://www.myshiptracking.com/?zoom=6&lat=25.0&lng=58.0"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-card bg-navy hover:bg-navy-light rounded px-4 py-2 transition-colors"
            >
              Open MyShipTracking Map
            </a>
          </div>
        ) : (
          <iframe
            src={EMBED_URL}
            className="absolute inset-0 w-full h-full border-0"
            title="MyShipTracking Live Vessel Map"
            loading="lazy"
            onError={() => setHasError(true)}
          />
        )}
      </div>
    </div>
  );
}
