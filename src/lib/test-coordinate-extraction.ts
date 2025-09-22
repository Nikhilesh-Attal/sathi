/**
 * Test function to verify coordinate extraction and place ingestion
 * This can be used to debug coordinate extraction issues
 */

import type { Place } from './types';

/**
 * Test coordinate extraction from different place formats
 */
export function testCoordinateExtraction() {
  console.log('[Test] Testing coordinate extraction from different formats...');

  // Test case 1: Geoapify format
  const geoapifyPlace: Place = {
    place_id: 'test-1',
    name: 'Test Place 1',
    itemType: 'place',
    point: { lat: 26.8894208, lon: 75.7825536 }
  };

  // Test case 2: Google Places format
  const googlePlace: Place = {
    place_id: 'test-2',
    name: 'Test Place 2',
    itemType: 'place',
    geometry: {
      location: {
        lat: 26.8894208,
        lng: 75.7825536
      }
    }
  };

  // Test case 3: Direct latitude/longitude format
  const directCoordPlace: Place = {
    place_id: 'test-3',
    name: 'Test Place 3',
    itemType: 'place',
    latitude: 26.8894208,
    longitude: 75.7825536
  };

  // Test case 4: Invalid coordinates
  const invalidPlace: Place = {
    place_id: 'test-4',
    name: 'Test Place 4',
    itemType: 'place'
    // No coordinates provided
  };

  const testPlaces = [geoapifyPlace, googlePlace, directCoordPlace, invalidPlace];

  for (const place of testPlaces) {
    const lat = place.point?.lat || place.geometry?.location?.lat || place.latitude || 0;
    const lon = place.point?.lon || place.geometry?.location?.lng || place.longitude || 0;
    
    console.log(`[Test] ${place.name}: lat=${lat}, lon=${lon}, valid=${lat !== 0 && lon !== 0}`);
  }

  console.log('[Test] Coordinate extraction test completed');
}

/**
 * Verify that a place has valid coordinates
 */
export function hasValidCoordinates(place: Place): boolean {
  const lat = place.point?.lat || place.geometry?.location?.lat || place.latitude || 0;
  const lon = place.point?.lon || place.geometry?.location?.lng || place.longitude || 0;
  
  return lat !== 0 && lon !== 0;
}

/**
 * Extract coordinates from a place with multiple fallbacks
 */
export function extractCoordinates(place: Place): { lat: number; lon: number } {
  const lat = place.point?.lat || place.geometry?.location?.lat || place.latitude || 0;
  const lon = place.point?.lon || place.geometry?.location?.lng || place.longitude || 0;
  
  return { lat, lon };
}

/**
 * Simulate the place ingestion process for testing
 */
export async function simulateIngestion(places: Place[]): Promise<void> {
  console.log(`[Test] Simulating ingestion for ${places.length} places...`);
  
  let validCount = 0;
  let invalidCount = 0;
  
  for (const place of places) {
    if (hasValidCoordinates(place)) {
      validCount++;
      console.log(`[Test] ✅ ${place.name} - Valid coordinates: ${JSON.stringify(extractCoordinates(place))}`);
    } else {
      invalidCount++;
      console.log(`[Test] ❌ ${place.name} - Invalid coordinates, would be skipped`);
    }
  }
  
  console.log(`[Test] Summary: ${validCount} valid, ${invalidCount} invalid places`);
}

// Export for potential use in debugging
export { testCoordinateExtraction as default };