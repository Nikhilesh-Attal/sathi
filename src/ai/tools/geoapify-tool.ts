import axios from "axios";
import { getAllCategories, getHighPriorityCategories, getCategoryById } from '../../lib/place-categories';

const GEOAPIFY_KEY = process.env.GEOAPIFY_KEY as string;

export interface GeoapifyPlace {
  name: string;
  category: string;
  address: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  distance?: number;
  rating?: number;
  source: string;
  itemType?: 'place' | 'hotel' | 'restaurant';
  subcategory?: string;
  types?: string[];
}

export interface GeoapifyParams {
  lat: number;
  lon: number;
  radius: number;
  categories?: string;
  limit?: number;
  categoryIds?: string[]; // Our internal category IDs
}

/**
 * Get Geoapify categories for comprehensive place discovery
 */
export function getGeoapifyCategories(): { [key: string]: string[] } {
  return {
    // Religious places
    'hindu-temple': ['religion.hindu', 'tourism.sights'],
    'mosque': ['religion.muslim', 'tourism.sights'],
    'church': ['religion.christian', 'tourism.sights'],
    'gurudwara': ['religion.sikh', 'tourism.sights'],
    'buddhist-site': ['religion.buddhist', 'tourism.sights'],
    
    // Historical places
    'fort': ['tourism.sights', 'heritage', 'building.castle'],
    'palace': ['tourism.sights', 'heritage', 'building.palace'],
    'monument': ['tourism.sights', 'heritage'],
    'archaeological-site': ['tourism.sights', 'heritage'],
    'heritage-building': ['tourism.sights', 'heritage', 'building'],
    
    // Nature & outdoor
    'hill-station': ['natural', 'tourism.sights'],
    'waterfall': ['natural.waterfall', 'tourism.sights'],
    'lake': ['natural.water', 'tourism.sights'],
    'national-park': ['leisure.park', 'natural'],
    'garden': ['leisure.park', 'tourism.sights'],
    'beach': ['natural.beach', 'tourism.sights'],
    
    // Cultural
    'museum': ['entertainment.museum', 'tourism.sights'],
    'cultural-center': ['entertainment.culture', 'tourism.sights'],
    'library': ['education.library'],
    
    // Commercial
    'market': ['commercial.shopping_mall', 'commercial.market'],
    'handicraft-center': ['commercial.crafts', 'tourism.sights'],
    
    // Entertainment
    'amusement-park': ['entertainment.amusement_park'],
    'zoo': ['entertainment.zoo'],
    
    // Transportation
    'railway-heritage': ['tourism.sights', 'transport.railway']
  };
}

export async function fetchPlacesFromGeoapify(
  lat: number, 
  lon: number, 
  radius: number = 5000,
  categories: string = "tourism.sights"
): Promise<GeoapifyPlace[]> {
  try {
    console.log(`[Geoapify] Fetching places for lat: ${lat}, lon: ${lon}, radius: ${radius}m`);
    console.log(`[Geoapify] 🔍 API Query params: categories="${categories}", filter="circle:${lon},${lat},${radius}", bias="proximity:${lon},${lat}"`);
    
    // Use Places API instead of tile API
    const response = await axios.get("https://api.geoapify.com/v2/places", {
      params: {
        categories: categories,
        filter: `circle:${lon},${lat},${radius}`,
        bias: `proximity:${lon},${lat}`,
        limit: 20,
        apiKey: GEOAPIFY_KEY,
      },
      timeout: 10000
    });

    if (!response.data?.features) {
      console.log('[Geoapify] No features found in response');
      return [];
    }

    const places: GeoapifyPlace[] = response.data.features.map((feature: any, index: number) => {
      const properties = feature.properties;
      const geometry = feature.geometry;
      
      const place = {
        name: properties.name || properties.formatted || 'Unknown Place',
        category: properties.categories?.[0] || categories,
        address: properties.formatted || properties.address_line1 || '',
        coordinates: {
          latitude: geometry.coordinates[1],
          longitude: geometry.coordinates[0]
        },
        distance: properties.distance ? Math.round(properties.distance) : undefined,
        rating: properties.rating,
        source: 'geoapify'
      };
      
      // Debug logging to see what coordinates Geoapify is returning
      console.log(`[Geoapify] 📍 Place ${index + 1}: "${place.name}" at (${place.coordinates.latitude}, ${place.coordinates.longitude}) - ${place.distance ? place.distance + 'm from center' : 'no distance'} - Address: ${place.address}`);
      
      return place;
    });

    console.log(`[Geoapify] ✅ Successfully fetched ${places.length} places`);
    return places;

  } catch (error: any) {
    console.error("[Geoapify] ❌ Error fetching places:", {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data
    });
    
    // Return empty array instead of null for consistency
    return [];
  }
}

export async function fetchHotelsFromGeoapify(
  lat: number, 
  lon: number, 
  radius: number = 5000
): Promise<GeoapifyPlace[]> {
  return fetchPlacesFromGeoapify(lat, lon, radius, "accommodation.hotel");
}

export async function fetchRestaurantsFromGeoapify(
  lat: number, 
  lon: number, 
  radius: number = 5000
): Promise<GeoapifyPlace[]> {
  return fetchPlacesFromGeoapify(lat, lon, radius, "catering.restaurant");
}

/**
 * Fetch places by our internal category IDs
 */
export async function fetchPlacesByCategory(
  lat: number,
  lon: number,
  categoryId: string,
  radius: number = 5000
): Promise<GeoapifyPlace[]> {
  const categoryMapping = getGeoapifyCategories();
  const geoapifyCategories = categoryMapping[categoryId];
  
  if (!geoapifyCategories) {
    console.log(`[Geoapify] No mapping found for category: ${categoryId}`);
    return [];
  }
  
  console.log(`[Geoapify] Searching for ${categoryId} using categories: ${geoapifyCategories.join(', ')}`);
  
  const results: GeoapifyPlace[] = [];
  
  // Try each Geoapify category for better coverage
  for (const category of geoapifyCategories) {
    try {
      const places = await fetchPlacesFromGeoapify(lat, lon, radius, category);
      places.forEach(place => {
        place.itemType = categoryId.includes('hotel') ? 'hotel' : 
                        categoryId.includes('restaurant') ? 'restaurant' : 'place';
        place.subcategory = categoryId;
      });
      results.push(...places);
    } catch (error) {
      console.warn(`[Geoapify] Failed to fetch with category ${category}:`, error);
    }
  }
  
  // Remove duplicates based on coordinates
  const uniqueResults = results.filter((place, index, self) => 
    index === self.findIndex(p => 
      Math.abs(p.coordinates.latitude - place.coordinates.latitude) < 0.0001 &&
      Math.abs(p.coordinates.longitude - place.coordinates.longitude) < 0.0001
    )
  );
  
  console.log(`[Geoapify] Found ${uniqueResults.length} unique places for ${categoryId}`);
  return uniqueResults;
}

/**
 * Comprehensive places search - fetches multiple categories for rich discovery
 */
export async function fetchDiversePlaces(
  lat: number,
  lon: number,
  radius: number = 5000,
  maxPerCategory: number = 5
): Promise<GeoapifyPlace[]> {
  console.log(`[Geoapify] 🌟 Starting comprehensive place discovery`);
  
  const highPriorityCategories = getHighPriorityCategories();
  console.log(`[Geoapify] Searching ${highPriorityCategories.length} high-priority categories`);
  
  const allResults: GeoapifyPlace[] = [];
  
  for (const category of highPriorityCategories) {
    try {
      console.log(`[Geoapify] 🔍 Searching for ${category.name} (${category.id})`);
      const places = await fetchPlacesByCategory(lat, lon, category.id, radius);
      
      // Take only the top results per category to avoid overwhelming
      const limitedPlaces = places.slice(0, maxPerCategory);
      allResults.push(...limitedPlaces);
      
      console.log(`[Geoapify] ✅ Found ${places.length} ${category.name}s, added ${limitedPlaces.length}`);
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));
      
    } catch (error) {
      console.warn(`[Geoapify] ⚠️ Failed to search ${category.name}:`, error);
    }
  }
  
  console.log(`[Geoapify] 🎉 Comprehensive search completed: ${allResults.length} total places`);
  return allResults;
}

/**
 * Search for religious places (temples, mosques, churches, etc.)
 */
export async function fetchReligiousPlaces(
  lat: number,
  lon: number,
  radius: number = 5000
): Promise<GeoapifyPlace[]> {
  const religiousCategories = ['hindu-temple', 'mosque', 'church', 'gurudwara', 'buddhist-site'];
  const results: GeoapifyPlace[] = [];
  
  for (const categoryId of religiousCategories) {
    const places = await fetchPlacesByCategory(lat, lon, categoryId, radius);
    results.push(...places);
  }
  
  console.log(`[Geoapify] 🕉️ Found ${results.length} religious places`);
  return results;
}

/**
 * Search for historical places (forts, palaces, monuments, etc.)
 */
export async function fetchHistoricalPlaces(
  lat: number,
  lon: number,
  radius: number = 5000
): Promise<GeoapifyPlace[]> {
  const historicalCategories = ['fort', 'palace', 'monument', 'archaeological-site', 'heritage-building'];
  const results: GeoapifyPlace[] = [];
  
  for (const categoryId of historicalCategories) {
    const places = await fetchPlacesByCategory(lat, lon, categoryId, radius);
    results.push(...places);
  }
  
  console.log(`[Geoapify] 🏰 Found ${results.length} historical places`);
  return results;
}

/**
 * Search for nature places (hills, waterfalls, parks, etc.)
 */
export async function fetchNaturePlaces(
  lat: number,
  lon: number,
  radius: number = 5000
): Promise<GeoapifyPlace[]> {
  const natureCategories = ['hill-station', 'waterfall', 'lake', 'national-park', 'garden', 'beach'];
  const results: GeoapifyPlace[] = [];
  
  for (const categoryId of natureCategories) {
    const places = await fetchPlacesByCategory(lat, lon, categoryId, radius);
    results.push(...places);
  }
  
  console.log(`[Geoapify] ⛰️ Found ${results.length} nature places`);
  return results;
}

export async function geocodeWithGeoapify(address: string): Promise<{
  latitude: number;
  longitude: number;
  formatted_address: string;
} | null> {
  try {
    const response = await axios.get("https://api.geoapify.com/v1/geocode/search", {
      params: {
        text: address,
        apiKey: GEOAPIFY_KEY,
        limit: 1
      },
      timeout: 10000
    });

    if (!response.data?.features?.length) {
      return null;
    }

    const feature = response.data.features[0];
    const [longitude, latitude] = feature.geometry.coordinates;

    return {
      latitude,
      longitude,
      formatted_address: feature.properties.formatted
    };

  } catch (error: any) {
    console.error("[Geoapify] ❌ Geocoding error:", error.message);
    return null;
  }
}

export async function reverseGeocodeWithGeoapify(
  lat: number, 
  lon: number
): Promise<string | null> {
  try {
    const response = await axios.get("https://api.geoapify.com/v1/geocode/reverse", {
      params: {
        lat,
        lon,
        apiKey: GEOAPIFY_KEY
      },
      timeout: 10000
    });

    if (!response.data?.features?.length) {
      return null;
    }

    return response.data.features[0].properties.formatted;

  } catch (error: any) {
    console.error("[Geoapify] ❌ Reverse geocoding error:", error.message);
    return null;
  }
}

export function normalizeGeoapifyResult(item: any) {
  return {
    id: `${item.name}-${item.coordinates.latitude}-${item.coordinates.longitude}`,
    name: item.name,
    lat: item.coordinates.latitude,
    lon: item.coordinates.longitude,
    category: item.category,
    address: item.address,
    distance: item.distance,
    source: "geoapify"
  };
}
