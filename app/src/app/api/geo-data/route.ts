import { NextRequest, NextResponse } from 'next/server';

const SHIPPING_LANES_URL = 'https://raw.githubusercontent.com/newzealandpaul/Shipping-Lanes/main/data/Shipping_Lanes_v1.geojson';
const GDELT_GEO_URL = 'https://api.gdeltproject.org/api/v2/geo/geo?query=conflict+war+military+iran+hormuz&format=geojson&mode=pointdata&maxpoints=200';

// Cache in memory
let shippingLanesCache: { data: unknown; fetchedAt: number } | null = null;
let conflictCache: { data: unknown; fetchedAt: number } | null = null;

const SHIPPING_CACHE_MS = 24 * 60 * 60 * 1000; // 24h
const CONFLICT_CACHE_MS = 15 * 60 * 1000; // 15min

export async function GET(request: NextRequest) {
  const type = request.nextUrl.searchParams.get('type') ?? 'all';

  try {
    const results: Record<string, unknown> = {};

    if (type === 'shipping' || type === 'all') {
      if (!shippingLanesCache || Date.now() - shippingLanesCache.fetchedAt > SHIPPING_CACHE_MS) {
        const res = await fetch(SHIPPING_LANES_URL);
        if (res.ok) {
          shippingLanesCache = { data: await res.json(), fetchedAt: Date.now() };
        }
      }
      results.shippingLanes = shippingLanesCache?.data ?? null;
    }

    if (type === 'conflicts' || type === 'all') {
      if (!conflictCache || Date.now() - conflictCache.fetchedAt > CONFLICT_CACHE_MS) {
        const res = await fetch(GDELT_GEO_URL);
        if (res.ok) {
          conflictCache = { data: await res.json(), fetchedAt: Date.now() };
        }
      }
      results.conflicts = conflictCache?.data ?? null;
    }

    // War zones — hardcoded GeoJSON polygons
    if (type === 'warzones' || type === 'all') {
      results.warZones = {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            properties: { name: 'Strait of Hormuz Exclusion Zone', status: 'active', severity: 'critical' },
            geometry: {
              type: 'Polygon',
              coordinates: [[[55.5, 25.5], [57.5, 25.5], [57.5, 27.0], [56.5, 27.5], [55.5, 27.0], [55.5, 25.5]]],
            },
          },
          {
            type: 'Feature',
            properties: { name: 'Yemen/Houthi Threat Zone (Bab el-Mandeb)', status: 'active', severity: 'high' },
            geometry: {
              type: 'Polygon',
              coordinates: [[[42.0, 12.0], [45.5, 12.0], [45.5, 16.0], [43.0, 16.0], [42.0, 14.0], [42.0, 12.0]]],
            },
          },
          {
            type: 'Feature',
            properties: { name: 'Iran Military Strike Zone', status: 'post-conflict', severity: 'medium' },
            geometry: {
              type: 'Polygon',
              coordinates: [[[49.0, 26.0], [56.5, 26.0], [56.5, 30.0], [54.0, 32.0], [50.0, 32.0], [49.0, 28.0], [49.0, 26.0]]],
            },
          },
          {
            type: 'Feature',
            properties: { name: 'Arabian Sea Risk Zone', status: 'elevated', severity: 'medium' },
            geometry: {
              type: 'Polygon',
              coordinates: [[[57.0, 20.0], [66.0, 20.0], [66.0, 25.5], [57.0, 25.5], [57.0, 20.0]]],
            },
          },
        ],
      };
    }

    // Oil supply route coordinates
    if (type === 'routes' || type === 'all') {
      results.oilRoutes = [
        { from: 'Russia (ESPO)', fromCoords: [133.0, 42.7], to: 'Karachi', toCoords: [67.0, 24.8], status: 'active', color: '#27ae60' },
        { from: 'Nigeria (Bonny)', fromCoords: [7.1, 4.4], to: 'Karachi', toCoords: [67.0, 24.8], status: 'active', color: '#27ae60' },
        { from: 'Malaysia (Kertih)', fromCoords: [103.4, 4.2], to: 'Karachi', toCoords: [67.0, 24.8], status: 'active', color: '#27ae60' },
        { from: 'Saudi (Yanbu/Red Sea)', fromCoords: [38.0, 24.1], to: 'Karachi', toCoords: [67.0, 24.8], status: 'rerouted', color: '#d4a017' },
        { from: 'Azerbaijan (Ceyhan)', fromCoords: [35.8, 36.8], to: 'Karachi', toCoords: [67.0, 24.8], status: 'inactive', color: '#94a3b8' },
        { from: 'Iran (Bandar Abbas)', fromCoords: [56.3, 27.2], to: 'Karachi', toCoords: [67.0, 24.8], status: 'disrupted', color: '#c0392b' },
        { from: 'UAE (Fujairah)', fromCoords: [56.3, 25.1], to: 'Karachi', toCoords: [67.0, 24.8], status: 'disrupted', color: '#c0392b' },
        { from: 'Angola (Luanda)', fromCoords: [13.2, -8.8], to: 'Karachi', toCoords: [67.0, 24.8], status: 'inactive', color: '#94a3b8' },
        { from: 'Brazil (Santos)', fromCoords: [-46.3, -23.9], to: 'Karachi', toCoords: [67.0, 24.8], status: 'inactive', color: '#94a3b8' },
      ];
    }

    // Key locations for labels
    if (type === 'locations' || type === 'all') {
      results.keyLocations = [
        { name: 'Karachi / Port Qasim', coords: [67.0, 24.8], type: 'port' },
        { name: 'Gwadar', coords: [62.3, 25.1], type: 'port' },
        { name: 'Strait of Hormuz', coords: [56.3, 26.6], type: 'chokepoint' },
        { name: 'Fujairah', coords: [56.3, 25.1], type: 'port' },
        { name: 'Ras Tanura', coords: [50.2, 26.6], type: 'port' },
        { name: 'Bandar Abbas', coords: [56.3, 27.2], type: 'port' },
        { name: 'Bab el-Mandeb', coords: [43.3, 12.6], type: 'chokepoint' },
        { name: 'Suez Canal', coords: [32.3, 30.0], type: 'chokepoint' },
        { name: 'Malacca Strait', coords: [101.0, 2.5], type: 'chokepoint' },
        { name: 'Kharg Island', coords: [50.3, 29.2], type: 'terminal' },
        { name: 'Yanbu', coords: [38.0, 24.1], type: 'port' },
        { name: 'Kozmino (ESPO)', coords: [133.0, 42.7], type: 'terminal' },
        { name: 'Bonny Island', coords: [7.1, 4.4], type: 'terminal' },
      ];
    }

    return NextResponse.json(results);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
