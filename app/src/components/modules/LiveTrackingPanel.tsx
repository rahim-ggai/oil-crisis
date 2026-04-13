'use client';

export function LiveTrackingPanel() {
  return (
    <div className="h-full flex flex-col">
      <div className="flex-shrink-0 px-4 py-3 border-b border-border bg-card">
        <h2 className="text-lg font-semibold text-navy">Live Vessel Tracking</h2>
        <p className="text-xs text-slate mt-0.5">
          Real-time AIS vessel positions via MarineTraffic. Focus on Strait of Hormuz, Arabian Sea, and Port Qasim/Karachi approaches.
        </p>
      </div>
      <div className="flex-1 relative">
        <iframe
          src="https://www.marinetraffic.com/en/ais/home/centerx:62.0/centery:24.5/zoom:6"
          className="absolute inset-0 w-full h-full border-0"
          title="MarineTraffic Live Vessel Tracking"
          allow="geolocation"
          loading="lazy"
          referrerPolicy="no-referrer"
        />
      </div>
    </div>
  );
}
