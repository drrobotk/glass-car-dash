// Stateful glue between the location stream (even.ts) and the pure OSM
// lookup (osm.ts). Speed/heading/trip update on every location callback;
// the (comparatively expensive, shared-public-service) Overpass lookup only
// re-fires when position has moved meaningfully or a timeout elapsed — see
// the design doc for why these two rates are deliberately decoupled.
import type { Runtime, RawLocation } from './even.ts'
import { lookupDrivingInfo, haversineMeters, type LimitSource } from './osm.ts'

const MOVE_THRESHOLD_M = 120 // within the designed 100-150m range
const LOOKUP_TIMEOUT_MS = 30_000
const MPS_TO_MPH = 2.23694
const METERS_TO_MILES = 1 / 1609.34

export type CompassLabel = 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW'
const COMPASS: CompassLabel[] = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']

export function headingToCompass(deg: number): CompassLabel {
  const idx = Math.round(((deg % 360) + 360) % 360 / 45) % 8
  return COMPASS[idx]
}

export interface DrivingState {
  speedMph: number | null
  heading: CompassLabel | null
  limitMph: number | null
  limitSource: LimitSource | 'pending'
  cameraDistanceM: number | null
  tripMiles: number
  tripSeconds: number
}

const initialState: DrivingState = {
  speedMph: null, heading: null, limitMph: null, limitSource: 'pending',
  cameraDistanceM: null, tripMiles: 0, tripSeconds: 0,
}

// Returns a stop function. Stopping only silences further onUpdate calls —
// there's no real unsubscribe plumbed through the SDK wrapper, because this
// app starts tracking once at launch and runs it for the app's whole
// lifetime (see the design doc's Open Question); a soft stop is enough.
export function startSpeedTracking(rt: Runtime, onUpdate: (state: DrivingState) => void): () => void {
  let stopped = false
  let state: DrivingState = { ...initialState }

  let tripMeters = 0
  let tripStartedAt: number | null = null
  let lastPos: { lat: number; lon: number } | null = null
  let lastLookupPos: { lat: number; lon: number } | null = null
  let lastLookupAt = 0
  let lookupInFlight = false

  function emit() {
    if (!stopped) onUpdate({ ...state })
  }

  async function maybeLookup(lat: number, lon: number) {
    if (lookupInFlight) return
    const now = Date.now()
    const movedEnough = !lastLookupPos || haversineMeters(lat, lon, lastLookupPos.lat, lastLookupPos.lon) > MOVE_THRESHOLD_M
    const timedOut = now - lastLookupAt > LOOKUP_TIMEOUT_MS
    if (!movedEnough && !timedOut) return

    lookupInFlight = true
    try {
      const info = await lookupDrivingInfo(lat, lon)
      if (stopped) return
      state = { ...state, limitMph: info.limitMph, limitSource: info.limitSource, cameraDistanceM: info.cameraDistanceM }
      lastLookupPos = { lat, lon }
      lastLookupAt = now
      emit()
    } catch {
      // A failed/slow lookup keeps the previous cached limit/camera state —
      // this is a non-critical background enhancement, never surfaced as
      // an error. Still counts as "tried" so a down service can't get
      // hammered every location update.
      lastLookupAt = now
    } finally {
      lookupInFlight = false
    }
  }

  void rt.startLocationUpdates((loc: RawLocation) => {
    if (stopped) return
    if (tripStartedAt == null) tripStartedAt = Date.now()
    if (lastPos) tripMeters += haversineMeters(lastPos.lat, lastPos.lon, loc.lat, loc.lon)
    lastPos = { lat: loc.lat, lon: loc.lon }

    state = {
      ...state,
      speedMph: loc.speedMps != null ? loc.speedMps * MPS_TO_MPH : state.speedMph,
      heading: loc.headingDeg != null ? headingToCompass(loc.headingDeg) : state.heading,
      tripMiles: tripMeters * METERS_TO_MILES,
      tripSeconds: tripStartedAt ? Math.round((Date.now() - tripStartedAt) / 1000) : 0,
    }
    emit()
    void maybeLookup(loc.lat, loc.lon)
  })

  return () => { stopped = true }
}
