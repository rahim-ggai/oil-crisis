// Mock vessel data for demo purposes
// This provides realistic ship tracking data without requiring external API calls

export interface MockVesselPosition {
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

export interface MockVesselTrack {
  latitude: number;
  longitude: number;
  timestamp: string;
  speed: number;
  course: number;
}

// Demo vessels with positions around Pakistan/Arabian Sea
export const MOCK_VESSELS: MockVesselPosition[] = [
  {
    mmsi: '477123400',
    imo: '9333638',
    name: 'MAERSK ESSEX',
    latitude: 24.8607,
    longitude: 66.9750,
    speed: 12.5,
    course: 285,
    heading: 283,
    destination: 'KARACHI',
    eta: '2026-04-15 08:00',
    status: 'Under way using engine',
    shipType: 'Container Ship',
    flag: 'Hong Kong',
    lastUpdate: new Date().toISOString(),
  },
  {
    mmsi: '477456700',
    imo: '9321483',
    name: 'MSC OSCAR',
    latitude: 23.2156,
    longitude: 68.4521,
    speed: 15.2,
    course: 45,
    heading: 47,
    destination: 'PORT QASIM',
    eta: '2026-04-14 14:30',
    status: 'Under way using engine',
    shipType: 'Container Ship',
    flag: 'Panama',
    lastUpdate: new Date().toISOString(),
  },
  {
    mmsi: '477789100',
    imo: '9632634',
    name: 'EVER GIVEN',
    latitude: 22.5678,
    longitude: 65.2341,
    speed: 13.8,
    course: 320,
    heading: 318,
    destination: 'KARACHI',
    eta: '2026-04-16 10:00',
    status: 'Under way using engine',
    shipType: 'Container Ship',
    flag: 'Panama',
    lastUpdate: new Date().toISOString(),
  },
  {
    mmsi: '477234500',
    imo: '9811000',
    name: 'HMM ALGECIRAS',
    latitude: 25.1234,
    longitude: 67.8901,
    speed: 14.5,
    course: 180,
    heading: 182,
    destination: 'GWADAR',
    eta: '2026-04-14 20:00',
    status: 'Under way using engine',
    shipType: 'Container Ship',
    flag: 'South Korea',
    lastUpdate: new Date().toISOString(),
  },
  {
    mmsi: '477567800',
    imo: '9466819',
    name: 'CMA CGM MARCO POLO',
    latitude: 24.2345,
    longitude: 66.1234,
    speed: 11.3,
    course: 90,
    heading: 88,
    destination: 'KARACHI',
    eta: '2026-04-15 16:00',
    status: 'Under way using engine',
    shipType: 'Container Ship',
    flag: 'United Kingdom',
    lastUpdate: new Date().toISOString(),
  },
];

// Generate realistic historical track data
export function generateMockTrack(vessel: MockVesselPosition): MockVesselTrack[] {
  const tracks: MockVesselTrack[] = [];
  const now = new Date();
  const hoursBack = 168; // 7 days
  
  // Generate positions every 6 hours
  for (let i = hoursBack; i >= 0; i -= 6) {
    const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000);
    
    // Simulate movement along a route
    const progress = (hoursBack - i) / hoursBack;
    const latOffset = Math.sin(progress * Math.PI) * 2.5;
    const lonOffset = Math.cos(progress * Math.PI * 2) * 3.0;
    
    tracks.push({
      latitude: vessel.latitude - latOffset,
      longitude: vessel.longitude - lonOffset,
      timestamp: timestamp.toISOString(),
      speed: vessel.speed + (Math.random() - 0.5) * 2,
      course: vessel.course + (Math.random() - 0.5) * 10,
    });
  }
  
  return tracks;
}

// Get mock vessel by IMO
export function getMockVesselByIMO(imo: string): MockVesselPosition | null {
  return MOCK_VESSELS.find(v => v.imo === imo) || null;
}

// Get all mock vessels
export function getAllMockVessels(): MockVesselPosition[] {
  return MOCK_VESSELS;
}
