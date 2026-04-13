"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { ModulePanel, Card } from "@/components/ui/ModulePanel";
import { MapPin, Navigation, Clock, Anchor } from "lucide-react";

const ShipMap = dynamic(
  () => import("./ShipMap").then((mod) => ({ default: mod.ShipMap })),
  {
    ssr: false,
    loading: () => (
      <div className="h-150 w-full rounded-lg border border-gray-300 bg-gray-100 flex items-center justify-center">
        <p className="text-gray-600">Loading map...</p>
      </div>
    ),
  },
);

interface VesselPosition {
  mmsi: string;
  imo: string;
  name: string;
  latitude: number;
  longitude: number;
  speed: number;
  course: number;
  heading: number;
  destination: string;
  eta: string;
  status: string;
  shipType: string;
  flag: string;
  lastUpdate: string;
}

interface VesselTrack {
  latitude: number;
  longitude: number;
  timestamp: string;
  speed: number;
  course: number;
}

// Default IMO numbers to load on mount
const DEFAULT_IMOS = [
  "9089229",
  "9839492",
  "9976769",
  "9137284",
  "8794310",
  "9171058",
  "9974917",
  "8967656",
];

export function MapPanel() {
  const [vessels, setVessels] = useState<VesselPosition[]>([]);
  const [vesselTracks, setVesselTracks] = useState<
    Record<string, VesselTrack[]>
  >({});
  const [selectedVessel, setSelectedVessel] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(false);
  const [initialLoadDone, setInitialLoadDone] = useState(false);

  const fetchVesselPosition = async (imo: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/ship-tracking/vessel?imo=${imo}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `API Error: ${response.status}`);
      }

      const apiResponse = await response.json();

      if (apiResponse.status === "success" && apiResponse.data) {
        // Map API v2 response to our VesselPosition format
        const vessel = {
          mmsi: apiResponse.data.mmsi?.toString() || "",
          imo: apiResponse.data.imo?.toString() || imo,
          name: apiResponse.data.vessel_name || "Unknown",
          latitude: apiResponse.data.lat || 0,
          longitude: apiResponse.data.lng || 0,
          speed: apiResponse.data.speed || 0,
          course: apiResponse.data.course || 0,
          heading: apiResponse.data.course || 0,
          destination: apiResponse.data.destination || "N/A",
          eta: apiResponse.data.eta || "N/A",
          status: apiResponse.data.nav_status?.toString() || "Unknown",
          shipType: apiResponse.data.vtype?.toString() || "Unknown",
          flag: apiResponse.data.flag || "Unknown",
          lastUpdate: apiResponse.data.received || new Date().toISOString(),
        };

        // Add to vessels list (don't replace existing ones)
        setVessels((prev) => {
          // Check if vessel already exists
          const existingIndex = prev.findIndex((v) => v.imo === vessel.imo);
          if (existingIndex >= 0) {
            // Update existing vessel
            const updated = [...prev];
            updated[existingIndex] = vessel;
            return updated;
          }
          // Add new vessel
          return [...prev, vessel];
        });

        // Auto-fetch route history for this vessel
        fetchVesselTrack(imo);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch vessel data",
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchVesselTrack = async (imo: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/ship-tracking/history?imo=${imo}&days=7`,
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `API Error: ${response.status}`);
      }

      const apiResponse = await response.json();

      if (apiResponse.status === "success" && apiResponse.data) {
        // Map API v2 track response to our VesselTrack format
        const tracks = apiResponse.data.map(
          (point: {
            lat: number;
            lng: number;
            time: string;
            speed: number;
            course: number;
          }) => ({
            latitude: point.lat || 0,
            longitude: point.lng || 0,
            timestamp: point.time || new Date().toISOString(),
            speed: point.speed || 0,
            course: point.course || 0,
          }),
        );
        setVesselTracks((prev) => ({ ...prev, [imo]: tracks }));
        setSelectedVessel(imo);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch vessel track",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleVesselSelect = (imo: string) => {
    setSelectedVessel(imo);
    if (!vesselTracks[imo]) {
      fetchVesselTrack(imo);
    }
  };

  // Auto-load default vessels on mount
  useEffect(() => {
    if (!initialLoadDone) {
      setInitialLoadDone(true);
      setInitialLoading(true);

      // Load each default IMO one by one
      const loadVessels = async () => {
        for (const imo of DEFAULT_IMOS) {
          try {
            await fetchVesselPosition(imo);
            // Small delay between requests to avoid rate limiting
            await new Promise((resolve) => setTimeout(resolve, 500));
          } catch (err) {
            console.error(`Failed to load vessel ${imo}:`, err);
          }
        }
        setInitialLoading(false);
      };

      loadVessels();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialLoadDone]);

  return (
    <ModulePanel
      title="Ship Tracking Map"
      subtitle="Track oil tankers and cargo vessels in real-time using MyShipTracking API"
    >
      <div className="space-y-6">
        {initialLoading && vessels.length === 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
              <p className="text-blue-800 font-medium">
                Loading {DEFAULT_IMOS.length} vessels... Please wait
              </p>
            </div>
          </div>
        )}

        <Card
          title={`Search Vessel ${vessels.length > 0 ? `(${vessels.length} tracked)` : ""}`}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Search by IMO Number
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  id="imo-search"
                  placeholder="e.g., 9565039"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      const input = e.target as HTMLInputElement;
                      if (input.value) {
                        fetchVesselPosition(input.value);
                        input.value = "";
                      }
                    }
                  }}
                />
                <button
                  onClick={() => {
                    const input = document.getElementById(
                      "imo-search",
                    ) as HTMLInputElement;
                    if (input.value) {
                      fetchVesselPosition(input.value);
                      input.value = "";
                    }
                  }}
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  {loading ? "Loading..." : "Add Ship"}
                </button>
                {vessels.length > 0 && (
                  <button
                    onClick={() => {
                      setVessels([]);
                      setVesselTracks({});
                      setSelectedVessel(null);
                      setError(null);
                    }}
                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 whitespace-nowrap"
                  >
                    Clear All
                  </button>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Enter IMO numbers one by one to track multiple vessels. Routes
                shown automatically.
              </p>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
                {error}
              </div>
            )}
          </div>
        </Card>

        <Card title="Interactive Map">
          <ShipMap
            vessels={vessels}
            vesselTracks={vesselTracks}
            selectedVessel={selectedVessel}
            onVesselSelect={handleVesselSelect}
          />
        </Card>

        {vessels.length > 0 && (
          <Card title="Tracked Vessels">
            <div className="space-y-4">
              {vessels.map((vessel) => (
                <div
                  key={vessel.mmsi}
                  className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                  onClick={() => handleVesselSelect(vessel.imo)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-semibold text-lg">{vessel.name}</h4>
                      <p className="text-sm text-gray-600">
                        IMO: {vessel.imo} | MMSI: {vessel.mmsi}
                      </p>
                    </div>
                    <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                      {vessel.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500 flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        Position
                      </p>
                      <p className="font-medium">
                        {vessel.latitude.toFixed(4)}°,{" "}
                        {vessel.longitude.toFixed(4)}°
                      </p>
                    </div>

                    <div>
                      <p className="text-gray-500 flex items-center gap-1">
                        <Navigation className="w-4 h-4" />
                        Speed/Course
                      </p>
                      <p className="font-medium">
                        {vessel.speed} kn / {vessel.course}°
                      </p>
                    </div>

                    <div>
                      <p className="text-gray-500 flex items-center gap-1">
                        <Anchor className="w-4 h-4" />
                        Destination
                      </p>
                      <p className="font-medium">
                        {vessel.destination || "N/A"}
                      </p>
                    </div>

                    <div>
                      <p className="text-gray-500 flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        ETA
                      </p>
                      <p className="font-medium">{vessel.eta || "N/A"}</p>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-gray-200 grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Ship Type</p>
                      <p className="font-medium">{vessel.shipType}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Flag</p>
                      <p className="font-medium">{vessel.flag}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {selectedVessel &&
          vesselTracks[selectedVessel] &&
          vesselTracks[selectedVessel].length > 0 && (
            <Card title="Vessel Route History">
              <div className="space-y-2">
                <p className="text-sm text-gray-600 mb-4">
                  Showing {vesselTracks[selectedVessel].length} position updates
                  from the last 7 days
                </p>
                <div className="max-h-96 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-4 py-2 text-left">Timestamp</th>
                        <th className="px-4 py-2 text-left">Position</th>
                        <th className="px-4 py-2 text-left">Speed</th>
                        <th className="px-4 py-2 text-left">Course</th>
                      </tr>
                    </thead>
                    <tbody>
                      {vesselTracks[selectedVessel].map(
                        (point: VesselTrack, idx: number) => (
                          <tr key={idx} className="border-t border-gray-200">
                            <td className="px-4 py-2">
                              {new Date(point.timestamp).toLocaleString()}
                            </td>
                            <td className="px-4 py-2">
                              {point.latitude.toFixed(4)}°,{" "}
                              {point.longitude.toFixed(4)}°
                            </td>
                            <td className="px-4 py-2">{point.speed} kn</td>
                            <td className="px-4 py-2">{point.course}°</td>
                          </tr>
                        ),
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </Card>
          )}
      </div>
    </ModulePanel>
  );
}
