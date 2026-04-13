"use client";

import "leaflet/dist/leaflet.css";
import { useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

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

interface ShipMapProps {
  vessels: VesselPosition[];
  vesselTracks: Record<string, VesselTrack[]>;
  selectedVessel: string | null;
  onVesselSelect: (imo: string) => void;
}

const shipIcon = new L.Icon({
  iconUrl:
    "data:image/svg+xml;base64," +
    btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M2 21c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1 .6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/>
      <path d="M19.38 20A11.6 11.6 0 0 0 21 14l-9-4-9 4c0 2.9.94 5.34 2.81 7.76"/>
      <path d="M19 13V7a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v6"/>
      <path d="M12 10v4"/>
      <path d="M12 2v3"/>
    </svg>
  `),
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -16],
});

const startIcon = new L.Icon({
  iconUrl:
    "data:image/svg+xml;base64," +
    btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="#10b981" stroke="white" stroke-width="2">
      <circle cx="12" cy="12" r="10"/>
      <text x="12" y="16" text-anchor="middle" fill="white" font-size="12" font-weight="bold">S</text>
    </svg>
  `),
  iconSize: [24, 24],
  iconAnchor: [12, 12],
  popupAnchor: [0, -12],
});

function MapUpdater({ vessels }: { vessels: VesselPosition[] }) {
  const map = useMap();

  useEffect(() => {
    if (vessels.length > 0) {
      const bounds = L.latLngBounds(
        vessels.map((v) => [v.latitude, v.longitude] as [number, number]),
      );
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [vessels, map]);

  return null;
}

export function ShipMap({
  vessels,
  vesselTracks,
  selectedVessel,
  onVesselSelect,
}: ShipMapProps) {
  const defaultCenter: [number, number] = [24.8607, 67.0011];
  const defaultZoom = 6;

  return (
    <div className="h-150 w-full rounded-lg overflow-hidden border border-gray-300">
      <MapContainer
        center={defaultCenter}
        zoom={defaultZoom}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapUpdater vessels={vessels} />

        {vessels.map((vessel) => (
          <Marker
            key={vessel.mmsi}
            position={[vessel.latitude, vessel.longitude]}
            icon={shipIcon}
            eventHandlers={{
              click: () => onVesselSelect(vessel.imo),
            }}
          >
            <Popup>
              <div className="min-w-50">
                <h3 className="font-bold text-base mb-2">{vessel.name}</h3>
                <div className="space-y-1 text-sm">
                  <p>
                    <strong>IMO:</strong> {vessel.imo}
                  </p>
                  <p>
                    <strong>MMSI:</strong> {vessel.mmsi}
                  </p>
                  <p>
                    <strong>Type:</strong> {vessel.shipType}
                  </p>
                  <p>
                    <strong>Flag:</strong> {vessel.flag}
                  </p>
                  <p>
                    <strong>Speed:</strong> {vessel.speed} knots
                  </p>
                  <p>
                    <strong>Course:</strong> {vessel.course}°
                  </p>
                  <p>
                    <strong>Destination:</strong> {vessel.destination || "N/A"}
                  </p>
                  <p>
                    <strong>ETA:</strong> {vessel.eta || "N/A"}
                  </p>
                  <p>
                    <strong>Status:</strong> {vessel.status}
                  </p>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Show tracks for all vessels that have them */}
        {vessels.map((vessel) => {
          const tracks = vesselTracks[vessel.imo];
          if (!tracks || tracks.length === 0) return null;

          const startPoint = tracks[tracks.length - 1]; // Oldest position (start of journey)
          const isSelected = selectedVessel === vessel.imo;

          return (
            <div key={`track-${vessel.imo}`}>
              {/* Historical track (red polyline) */}
              <Polyline
                positions={tracks.map(
                  (t) => [t.latitude, t.longitude] as [number, number],
                )}
                color={isSelected ? "#ef4444" : "#f97316"}
                weight={isSelected ? 3 : 2}
                opacity={isSelected ? 0.8 : 0.5}
              />

              {/* Start point marker (green) */}
              <Marker
                position={[startPoint.latitude, startPoint.longitude]}
                icon={startIcon}
              >
                <Popup>
                  <div>
                    <strong>{vessel.name}</strong>
                    <p className="text-xs mt-1">Journey Start</p>
                    <p className="text-xs">
                      {new Date(startPoint.timestamp).toLocaleString()}
                    </p>
                  </div>
                </Popup>
              </Marker>

              {/* Projected route to destination (dashed blue line) */}
              {vessel.destination && vessel.destination !== "N/A" && (
                <Polyline
                  positions={[
                    [vessel.latitude, vessel.longitude],
                    [startPoint.latitude, startPoint.longitude], // Using start as proxy for destination
                  ]}
                  color="#3b82f6"
                  weight={2}
                  opacity={0.6}
                  dashArray="10, 10"
                />
              )}
            </div>
          );
        })}
      </MapContainer>
    </div>
  );
}
