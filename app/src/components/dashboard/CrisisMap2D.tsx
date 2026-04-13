'use client';

import 'leaflet/dist/leaflet.css';
import { useEffect, useState } from 'react';
import {
  MapContainer,
  TileLayer,
  Polygon,
  Polyline,
  CircleMarker,
  Tooltip,
} from 'react-leaflet';

// ============================================================
// Types
// ============================================================

interface WarZoneFeature {
  type: string;
  properties: { name: string; status: string; severity: string };
  geometry: { type: string; coordinates: number[][][] };
}

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

interface ConflictPoint {
  lat: number;
  lng: number;
  name: string;
}

interface GeoData {
  warZones?: { type: string; features: WarZoneFeature[] };
  oilRoutes?: OilRoute[];
  keyLocations?: KeyLocation[];
  conflicts?: {
    type: string;
    features?: Array<{
      geometry: { coordinates: [number, number] };
      properties?: { name?: string; urlpubtitle?: string };
    }>;
  };
  shippingLanes?: unknown;
}

// ============================================================
// Constants
// ============================================================

const MAP_CENTER: [number, number] = [25, 55];
const MAP_ZOOM = 4;
const DARK_TILE_URL =
  'https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png';
const DARK_TILE_ATTR =
  '&copy; <a href="https://stadiamaps.com/">Stadia Maps</a>, &copy; <a href="https://openmaptiles.org/">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

const LOCATION_COLORS: Record<string, string> = {
  chokepoint: '#c0392b',
  terminal: '#d4a017',
  port: '#27ae60',
};

// ============================================================
// Legend
// ============================================================

function MapLegend() {
  return (
    <div className="absolute bottom-3 left-3 z-[1000] bg-[#1a1a2e]/90 backdrop-blur-sm border border-[#2d2d4a] rounded-lg p-3 text-[11px] text-[#94a3b8] space-y-1.5 pointer-events-auto">
      <div className="text-[10px] font-semibold text-white/80 uppercase tracking-wider mb-1">
        Legend
      </div>
      <div className="flex items-center gap-2">
        <span className="inline-block w-4 h-[2px] border-t-2 border-dashed border-[#c0392b]" />
        <span>War / Exclusion Zone</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="inline-block w-4 h-[2px] bg-[#27ae60]" />
        <span>Active Route</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="inline-block w-4 h-[2px] bg-[#d4a017]" />
        <span>Rerouted</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="inline-block w-4 h-[2px] bg-[#c0392b]" />
        <span>Disrupted</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="inline-block w-4 h-[2px] bg-[#94a3b8] opacity-40" />
        <span>Inactive</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#c0392b]" />
        <span>Chokepoint</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#d4a017]" />
        <span>Terminal</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#27ae60]" />
        <span>Port</span>
      </div>
    </div>
  );
}

// ============================================================
// Main Component
// ============================================================

export function CrisisMap2D() {
  const [warZones, setWarZones] = useState<WarZoneFeature[]>([]);
  const [oilRoutes, setOilRoutes] = useState<OilRoute[]>([]);
  const [locations, setLocations] = useState<KeyLocation[]>([]);
  const [conflictPoints, setConflictPoints] = useState<ConflictPoint[]>([]);

  useEffect(() => {
    async function fetchGeoData() {
      try {
        const res = await fetch('/api/geo-data?type=all');
        if (!res.ok) return;
        const data: GeoData = await res.json();

        if (data.warZones?.features) {
          setWarZones(data.warZones.features);
        }
        if (data.oilRoutes) {
          setOilRoutes(data.oilRoutes);
        }
        if (data.keyLocations) {
          setLocations(data.keyLocations);
        }
        if (data.conflicts && typeof data.conflicts === 'object' && 'features' in data.conflicts) {
          const features = (data.conflicts as GeoData['conflicts'])?.features ?? [];
          const points: ConflictPoint[] = features
            .filter((f) => f.geometry?.coordinates)
            .map((f) => ({
              lat: f.geometry.coordinates[1],
              lng: f.geometry.coordinates[0],
              name: f.properties?.name || f.properties?.urlpubtitle || 'Conflict event',
            }));
          setConflictPoints(points);
        }
      } catch {
        // Silently fail — map still renders without data layers
      }
    }

    fetchGeoData();
  }, []);

  return (
    <div className="relative h-[500px] rounded-lg overflow-hidden">
      <MapContainer
        center={MAP_CENTER}
        zoom={MAP_ZOOM}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
        zoomControl={true}
      >
        <TileLayer attribution={DARK_TILE_ATTR} url={DARK_TILE_URL} />

        {/* War zones — dashed polygons */}
        {warZones.map((zone) => (
          <Polygon
            key={zone.properties.name}
            positions={zone.geometry.coordinates[0].map(
              ([lng, lat]) => [lat, lng] as [number, number],
            )}
            pathOptions={{
              color: zone.properties.severity === 'critical' ? '#c0392b' : '#d4a017',
              fillColor: zone.properties.severity === 'critical' ? '#c0392b' : '#d4a017',
              fillOpacity: 0.15,
              weight: 2,
              dashArray: '5, 5',
            }}
          >
            <Tooltip>
              <span className="font-sans text-xs">
                {zone.properties.name} — <em>{zone.properties.status}</em>
              </span>
            </Tooltip>
          </Polygon>
        ))}

        {/* Oil supply routes */}
        {oilRoutes.map((route) => (
          <Polyline
            key={`${route.from}-${route.to}`}
            positions={[
              [route.fromCoords[1], route.fromCoords[0]],
              [route.toCoords[1], route.toCoords[0]],
            ]}
            pathOptions={{
              color: route.color,
              weight: 2,
              dashArray: route.status === 'active' ? undefined : '8, 6',
              opacity: route.status === 'inactive' ? 0.3 : 0.8,
            }}
          >
            <Tooltip>
              <span className="font-sans text-xs">
                {route.from} &rarr; {route.to}{' '}
                <span className="font-mono">({route.status})</span>
              </span>
            </Tooltip>
          </Polyline>
        ))}

        {/* Key locations */}
        {locations.map((loc) => (
          <CircleMarker
            key={loc.name}
            center={[loc.coords[1], loc.coords[0]]}
            radius={loc.type === 'chokepoint' ? 8 : 5}
            pathOptions={{
              color: LOCATION_COLORS[loc.type] ?? '#27ae60',
              fillColor: LOCATION_COLORS[loc.type] ?? '#27ae60',
              fillOpacity: 0.7,
              weight: 2,
            }}
          >
            <Tooltip permanent={false}>
              <span className="font-sans text-xs">
                {loc.name}
                <br />
                <span className="font-mono text-[10px] text-gray-500">
                  {loc.coords[1].toFixed(2)}, {loc.coords[0].toFixed(2)}
                </span>
              </span>
            </Tooltip>
          </CircleMarker>
        ))}

        {/* GDELT conflict events */}
        {conflictPoints.map((point, i) => (
          <CircleMarker
            key={`conflict-${i}`}
            center={[point.lat, point.lng]}
            radius={3}
            pathOptions={{
              color: '#c0392b',
              fillColor: '#c0392b',
              fillOpacity: 0.5,
              weight: 1,
            }}
          >
            <Tooltip>
              <span className="font-sans text-xs">{point.name}</span>
            </Tooltip>
          </CircleMarker>
        ))}
      </MapContainer>

      {/* Legend overlay */}
      <MapLegend />
    </div>
  );
}
