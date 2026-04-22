import * as Location from "expo-location";

let cachedLocation: { lat: number; lng: number } | null = null;

/**
 * Get the user's current location (with permission handling).
 * Caches the result for 5 minutes.
 */
let lastFetchTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export async function getCurrentLocation(): Promise<{
  lat: number;
  lng: number;
} | null> {
  // Return cached if fresh
  if (cachedLocation && Date.now() - lastFetchTime < CACHE_DURATION) {
    return cachedLocation;
  }

  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      return null;
    }

    const loc = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    cachedLocation = { lat: loc.coords.latitude, lng: loc.coords.longitude };
    lastFetchTime = Date.now();
    return cachedLocation;
  } catch {
    return null;
  }
}

/**
 * Calculate distance between two lat/lng points using Haversine formula.
 * Returns distance in miles.
 */
export function haversineDistanceMiles(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 3958.8; // Earth radius in miles
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/**
 * Format a distance into a human-readable string.
 * Shows "~X miles away" with appropriate rounding.
 */
export function formatDistance(miles: number): string {
  if (miles < 1) return "< 1 mile away";
  if (miles < 10) return `~${Math.round(miles)} miles away`;
  return `~${Math.round(miles / 5) * 5} miles away`; // Round to nearest 5 for larger distances
}
