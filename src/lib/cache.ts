
/**
 * @fileOverview A Firestore-backed cache for storing and retrieving API results.
 * THIS FILE IS NO LONGER IN USE as Firestore has been removed from the project.
 * It is kept to prevent breaking any potential lingering imports but its functions are disabled.
 */


/**
 * Creates a stable, Firestore-safe cache key.
 * @param lat - Latitude (or 0 if not applicable)
 * @param lng - Longitude (or 0 if not applicable)
 * @param prefix - A prefix to avoid key collisions between different flows.
 * @returns A string cache key.
 */
export function createCacheKey(lat: number, lng: number, prefix: string): string {
  if (lat === 0 && lng === 0) {
    return prefix;
  }
  const roundedLat = lat.toFixed(2);
  const roundedLng = lng.toFixed(2);
  return `${prefix}_${roundedLat}_${roundedLng}`.replace(/\./g, '_');
}

/**
 * Retrieves an item from the cache. Always returns null as DB is removed.
 * @param key - The cache key.
 * @returns Null.
 */
export async function getFromCache(key: string): Promise<any | null> {
  console.warn("[Cache] Firestore is not available. Skipping cache read.");
  return null;
}

/**
 * Adds an item to the cache. Does nothing as DB is removed.
 * @param key - The cache key.
 * @param data - The data to store.
 */
export async function setInCache(key: string, data: any): Promise<void> {
   console.warn("[Cache] Firestore is not available. Skipping cache write.");
   return;
}
