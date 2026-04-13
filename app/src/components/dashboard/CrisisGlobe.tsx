'use client';

import dynamic from 'next/dynamic';
import { useState, useEffect, useRef, useCallback } from 'react';

// Dynamic import — react-globe.gl uses Three.js which requires the browser window object
const Globe = dynamic(() => import('react-globe.gl').then((mod) => mod.default), {
  ssr: false,
  loading: () => (
    <div className="h-full flex items-center justify-center bg-navy-dark text-slate text-sm">
      Loading globe...
    </div>
  ),
});

// ---------- Types ----------

interface OilRoute {
  from: string;
  fromCoords: [number, number];
  to: string;
  toCoords: [number, number];
  status: string;
  color: string;
}

interface KeyLocation {
  name: string;
  coords: [number, number];
  type: string;
}

interface WarZoneFeature {
  type: string;
  properties: { name: string; status: string; severity: string };
  geometry: { type: string; coordinates: number[][][] };
}

interface GeoData {
  warZones?: { type: string; features: WarZoneFeature[] };
  oilRoutes?: OilRoute[];
  keyLocations?: KeyLocation[];
  conflicts?: unknown;
}

// ---------- Component ----------

export function CrisisGlobe() {
  const globeRef = useRef<any>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);

  const [containerWidth, setContainerWidth] = useState(800);
  const [containerHeight, setContainerHeight] = useState(500);

  const [arcs, setArcs] = useState<OilRoute[]>([]);
  const [locations, setLocations] = useState<KeyLocation[]>([]);
  const [warZoneFeatures, setWarZoneFeatures] = useState<WarZoneFeature[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ---- Resize observer for responsive sizing ----
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const measure = () => {
      setContainerWidth(el.clientWidth);
      setContainerHeight(el.clientHeight);
    };

    measure();

    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ---- Fetch geo data ----
  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      try {
        const res = await fetch('/api/geo-data?type=all');
        if (!res.ok) throw new Error(`API error ${res.status}`);
        const data: GeoData = await res.json();
        if (cancelled) return;

        setArcs(data.oilRoutes ?? []);
        setLocations(data.keyLocations ?? []);
        setWarZoneFeatures(data.warZones?.features ?? []);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load geo data');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchData();
    return () => {
      cancelled = true;
    };
  }, []);

  // ---- Set initial point of view once globe is ready ----
  const handleGlobeReady = useCallback(() => {
    if (globeRef.current) {
      globeRef.current.pointOfView({ lat: 25, lng: 58, altitude: 2.5 }, 1000);
    }
  }, []);

  // ---- Accessor callbacks (stable references) ----
  const arcStartLat = useCallback((d: any) => d.fromCoords[1], []);
  const arcStartLng = useCallback((d: any) => d.fromCoords[0], []);
  const arcEndLat = useCallback((d: any) => d.toCoords[1], []);
  const arcEndLng = useCallback((d: any) => d.toCoords[0], []);
  const arcColor = useCallback((d: any) => d.color, []);
  const arcLabel = useCallback(
    (d: any) => `<span style="color:#fff;font-size:12px">${d.from} &rarr; ${d.to} <em>(${d.status})</em></span>`,
    [],
  );

  const pointLat = useCallback((d: any) => d.coords[1], []);
  const pointLng = useCallback((d: any) => d.coords[0], []);
  const pointColor = useCallback(
    (d: any) =>
      d.type === 'chokepoint' ? '#c0392b' : d.type === 'terminal' ? '#d4a017' : '#27ae60',
    [],
  );
  const pointLabel = useCallback(
    (d: any) =>
      `<span style="color:#fff;font-size:12px">${d.name} <em>(${d.type})</em></span>`,
    [],
  );

  const polygonGeoJsonGeometry = useCallback((d: any) => d.geometry, []);
  const polygonCapColor = useCallback(
    (d: any) =>
      d.properties.severity === 'critical'
        ? 'rgba(192, 57, 43, 0.3)'
        : d.properties.severity === 'high'
          ? 'rgba(212, 160, 23, 0.25)'
          : 'rgba(192, 57, 43, 0.15)',
    [],
  );
  const polygonSideColor = useCallback(() => 'rgba(192, 57, 43, 0.1)', []);
  const polygonStrokeColor = useCallback(() => '#c0392b', []);
  const polygonLabel = useCallback(
    (d: any) =>
      `<span style="color:#fff;font-size:12px">${d.properties.name} <em>(${d.properties.status})</em></span>`,
    [],
  );

  // ---- Render ----

  if (error) {
    return (
      <div className="w-full h-full bg-navy-dark rounded-lg flex items-center justify-center text-red-muted text-sm">
        Globe error: {error}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="w-full h-full bg-navy-dark rounded-lg overflow-hidden relative"
      style={{ minHeight: 400 }}
    >
      {loading ? (
        <div className="h-full flex items-center justify-center text-slate text-sm">
          Fetching crisis data...
        </div>
      ) : (
        <Globe
          ref={globeRef}
          width={containerWidth}
          height={containerHeight}
          globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
          bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
          backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
          onGlobeReady={handleGlobeReady}
          // Arcs -- oil supply routes
          arcsData={arcs}
          arcStartLat={arcStartLat}
          arcStartLng={arcStartLng}
          arcEndLat={arcEndLat}
          arcEndLng={arcEndLng}
          arcColor={arcColor}
          arcStroke={1.5}
          arcDashLength={0.5}
          arcDashGap={0.3}
          arcDashAnimateTime={2000}
          arcLabel={arcLabel}
          // Points -- key locations
          pointsData={locations}
          pointLat={pointLat}
          pointLng={pointLng}
          pointColor={pointColor}
          pointAltitude={0.01}
          pointRadius={0.4}
          pointLabel={pointLabel}
          // Polygons -- war zones
          polygonsData={warZoneFeatures}
          polygonGeoJsonGeometry={polygonGeoJsonGeometry}
          polygonCapColor={polygonCapColor}
          polygonSideColor={polygonSideColor}
          polygonStrokeColor={polygonStrokeColor}
          polygonAltitude={0.01}
          polygonLabel={polygonLabel}
        />
      )}

      {/* Legend overlay */}
      <div className="absolute bottom-3 left-3 bg-navy/80 backdrop-blur-sm text-white text-[10px] rounded px-3 py-2 space-y-1 pointer-events-none">
        <div className="font-semibold text-[11px] mb-1 text-slate-light">Legend</div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-0.5 bg-green-muted inline-block" /> Active route
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-0.5 bg-ochre inline-block" /> Rerouted
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-0.5 bg-red-muted inline-block" /> Disrupted
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-0.5 bg-slate-light inline-block" /> Inactive
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-red-muted/30 inline-block border border-red-muted" />{' '}
          War zone
        </div>
      </div>
    </div>
  );
}
