// Pure OSM Overpass logic: build the query, parse the response, resolve a
// speed limit (explicit tag or UK default-by-road-type), find the nearest
// speed camera. No SDK/DOM dependency — only `fetch`, so this is testable
// with plain Node + fixture JSON.
//
// Verified live against overpass-api.de (see the design doc): CORS is
// permissive, a real browser UA passes its anti-abuse filter with no
// special headers, and this exact combined-query shape (ways + camera
// nodes in one request) returns valid results.
const OVERPASS_URL = 'https://overpass-api.de/api/interpreter'
const ROAD_RADIUS_M = 100
const CAMERA_RADIUS_M = 1000

// UK default speed limits by highway type, used only when a road has no
// explicit maxspeed tag — the common case for ordinary residential streets
// (confirmed live: 0/11 nearby ways were tagged at the test location).
export const UK_DEFAULT_LIMITS: Record<string, number> = {
  motorway: 70,
  motorway_link: 70,
  trunk: 60,
  trunk_link: 60,
  primary: 60,
  primary_link: 60,
  secondary: 60,
  secondary_link: 60,
  tertiary: 60,
  tertiary_link: 60,
  unclassified: 60,
  residential: 30,
  living_street: 20,
}

export type LimitSource = 'tagged' | 'default-table' | 'no-road-found' | 'unknown-highway-type'

export interface DrivingInfo {
  limitMph: number | null
  limitSource: LimitSource
  roadName: string | null
  highway: string | null
  distanceM: number | null
  cameraDistanceM: number | null
}

interface OverpassGeomPoint { lat: number; lon: number }
interface OverpassElement {
  type: 'way' | 'node'
  tags?: Record<string, string>
  geometry?: OverpassGeomPoint[]
  lat?: number
  lon?: number
}
interface OverpassResponse { elements: OverpassElement[] }

export function buildOverpassQuery(lat: number, lon: number, roadRadiusM = ROAD_RADIUS_M, cameraRadiusM = CAMERA_RADIUS_M): string {
  return `[out:json][timeout:25];(way(around:${roadRadiusM},${lat},${lon})["highway"];node(around:${cameraRadiusM},${lat},${lon})["highway"="speed_camera"];);out body geom;`
}

export function parseMaxspeed(tag: string | undefined): number | null {
  if (!tag) return null
  const mph = tag.match(/(\d+)\s*mph/i)
  if (mph) return parseInt(mph[1], 10)
  const bare = tag.match(/^(\d+)$/)
  if (bare) return parseInt(bare[1], 10)
  return null
}

export function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function nearestWay(ways: OverpassElement[], lat: number, lon: number): { way: OverpassElement; distanceM: number } | null {
  let best: OverpassElement | null = null
  let bestDist = Infinity
  for (const w of ways) {
    for (const pt of w.geometry || []) {
      const d = haversineMeters(lat, lon, pt.lat, pt.lon)
      if (d < bestDist) { bestDist = d; best = w }
    }
  }
  return best ? { way: best, distanceM: Math.round(bestDist) } : null
}

export function nearestCamera(nodes: OverpassElement[], lat: number, lon: number): { distanceM: number } | null {
  let bestDist = Infinity
  for (const n of nodes) {
    if (typeof n.lat !== 'number' || typeof n.lon !== 'number') continue
    const d = haversineMeters(lat, lon, n.lat, n.lon)
    if (d < bestDist) bestDist = d
  }
  return bestDist < Infinity ? { distanceM: Math.round(bestDist) } : null
}

// Pure parsing step, split out from lookupDrivingInfo so it's testable
// against captured fixture JSON with zero network involved.
export function parseDrivingInfo(json: OverpassResponse, lat: number, lon: number): DrivingInfo {
  const ways = json.elements.filter((e) => e.type === 'way' && e.tags?.highway)
  const cameraNodes = json.elements.filter((e) => e.type === 'node' && e.tags?.highway === 'speed_camera')

  const camera = nearestCamera(cameraNodes, lat, lon)
  const nearest = nearestWay(ways, lat, lon)

  if (!nearest) {
    return { limitMph: null, limitSource: 'no-road-found', roadName: null, highway: null, distanceM: null, cameraDistanceM: camera?.distanceM ?? null }
  }

  const { way, distanceM } = nearest
  const explicit = parseMaxspeed(way.tags?.maxspeed)
  if (explicit != null) {
    return { limitMph: explicit, limitSource: 'tagged', roadName: way.tags?.name ?? null, highway: way.tags?.highway ?? null, distanceM, cameraDistanceM: camera?.distanceM ?? null }
  }
  const fallback = way.tags?.highway ? UK_DEFAULT_LIMITS[way.tags.highway] ?? null : null
  return {
    limitMph: fallback,
    limitSource: fallback != null ? 'default-table' : 'unknown-highway-type',
    roadName: way.tags?.name ?? null,
    highway: way.tags?.highway ?? null,
    distanceM,
    cameraDistanceM: camera?.distanceM ?? null,
  }
}

const FETCH_TIMEOUT_MS = 15_000

export async function lookupDrivingInfo(lat: number, lon: number): Promise<DrivingInfo> {
  // A hung connection (observed against the real API under heavy polling —
  // Overpass can hold a request open with no response at all, not just
  // reject fast) would otherwise never resolve this promise, permanently
  // wedging startSpeedTracking's lookupInFlight guard and freezing the
  // limit forever instead of just going stale for one cycle.
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    const res = await fetch(OVERPASS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'data=' + encodeURIComponent(buildOverpassQuery(lat, lon)),
      signal: controller.signal,
    })
    if (!res.ok) throw new Error(`Overpass HTTP ${res.status}`)
    const json = (await res.json()) as OverpassResponse
    return parseDrivingInfo(json, lat, lon)
  } finally {
    clearTimeout(timer)
  }
}
