'use server';
/**
 * @fileOverview Enhanced OpenTripMap API integration with comprehensive place categories
 */
import { z } from 'zod';
import type { Place } from '@/lib/types';
import { getAllCategories, getHighPriorityCategories, getCategoryById } from '../../lib/place-categories';

const OpenTripMapInputSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
  radius: z.number(), // Made required to avoid undefined
  kinds: z.string().optional(), // Category filter (e.g., 'tourism', 'accommodation')
  categoryId: z.string().optional(), // Our internal category ID
});

type OpenTripMapInput = z.infer<typeof OpenTripMapInputSchema>;

// Use environment variable for API key
const API_KEY = process.env.OPENTRIPMAP_API_KEY;
if (!API_KEY) {
  console.warn('[OpenTripMap] API_KEY not found, OpenTripMap searches will be skipped');
}

/**
 * OpenTripMap categories mapping for comprehensive place discovery
 */
export async function getOpenTripMapCategories(): Promise<{ [key: string]: string[] }> {
  return {
    // Religious places
    'hindu-temple': ['religion'],
    'mosque': ['religion'],
    'church': ['religion'],
    'gurudwara': ['religion'],
    'buddhist-site': ['religion'],
    
    // Historical places
    'fort': ['historic', 'fortifications'],
    'palace': ['historic', 'palaces'],
    'monument': ['historic', 'monuments_and_memorials'],
    'archaeological-site': ['historic', 'archaeology'],
    'heritage-building': ['historic', 'architecture'],
    
    // Nature & outdoor
    'hill-station': ['natural', 'interesting_places'],
    'waterfall': ['natural'],
    'lake': ['natural'],
    'national-park': ['natural', 'protected_areas'],
    'garden': ['natural', 'gardens'],
    'beach': ['natural', 'beaches'],
    
    // Cultural
    'museum': ['museums'],
    'cultural-center': ['cultural'],
    'library': ['cultural'],
    
    // Commercial
    'market': ['shops'],
    'handicraft-center': ['shops'],
    
    // Entertainment
    'amusement-park': ['amusements'],
    'zoo': ['amusements'],
    
    // Transportation
    'railway-heritage': ['transport']
  };
}

/**
 * Fetches places from OpenTripMap based on location and category.
 */
export async function fetchPlacesFromOpenTripMap(input: OpenTripMapInput): Promise<Place[]> {
  if (!API_KEY) {
    console.log('[OpenTripMap] Skipping - API key not available');
    return [];
  }
  const { latitude, longitude, radius, kinds } = input;

  const url = new URL('https://api.opentripmap.com/0.1/en/places/radius');
  url.searchParams.append('radius', radius.toString());
  url.searchParams.append('lat', latitude.toString());
  url.searchParams.append('lon', longitude.toString());
  url.searchParams.append('apikey', API_KEY);
  if (kinds) url.searchParams.append('kinds', kinds);

  try {
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`[fetchPlacesFromOpenTripMap] OpenTripMap API Error: Status ${response.status}`, errorBody);
      throw new Error(`OpenTripMap API Error: Status ${response.status}`);
    }

    const data = await response.json();

    if (!data.features || data.features.length === 0) {
      console.log(`[fetchPlacesFromOpenTripMap] No results from OpenTripMap.`);
      return [];
    }

    // Transform OpenTripMap data into our internal `Place` schema
    return data.features.map((feature: any): Place => {
      const properties = feature.properties;
      return {
        place_id: properties.xid || properties.id || `otm-${Math.random().toString(36).slice(2)}`,
        name: properties.name || 'Unnamed Place',
        vicinity: properties.address || 'Address not available',
        rating: properties.rate || undefined,
        types: properties.kinds ? properties.kinds.split(',') : ['place'],
        point: { lat: feature.geometry.coordinates[1], lon: feature.geometry.coordinates[0] },
        photoUrl: properties.preview ? `https://api.opentripmap.com${properties.preview.source}` : 'https://placehold.co/600x400.png',
        photoHint: properties.kinds || 'place',
        description: properties.wikipedia_extracts?.text || `A ${properties.kinds || 'point of interest'} named ${properties.name}.`,
      };
    }).slice(0, 25); // Limit to 25 results per category
  } catch (error) {
    console.error('[fetchPlacesFromOpenTripMap] An exception occurred while calling OpenTripMap API:', error);
    return []; // Return empty array on error
  }
}

/**
 * Fetch places by our internal category ID
 */
export async function fetchPlacesByCategory(
  latitude: number,
  longitude: number,
  categoryId: string,
  radius: number = 5000
): Promise<Place[]> {
  if (!API_KEY) {
    console.log('[OpenTripMap] Skipping category search - API key not available');
    return [];
  }
  
  const categoryMapping = getOpenTripMapCategories();
  const openTripMapKinds = categoryMapping[categoryId];
  
  if (!openTripMapKinds) {
    console.log(`[OpenTripMap] No mapping found for category: ${categoryId}`);
    return [];
  }
  
  console.log(`[OpenTripMap] Searching for ${categoryId} using kinds: ${openTripMapKinds.join(', ')}`);
  
  const results: Place[] = [];
  
  // Try each OpenTripMap kind for better coverage
  for (const kind of openTripMapKinds) {
    try {
      const places = await fetchPlacesFromOpenTripMap({
        latitude,
        longitude,
        radius,
        kinds: kind
      });
      
      // Add category metadata to each place
      places.forEach(place => {
        place.types = [...(place.types || []), categoryId];
        if (!place.description || place.description.includes('point of interest')) {
          const category = getCategoryById(categoryId);
          if (category) {
            place.description = `${place.name} is a ${category.name.toLowerCase()} in this area.`;
          }
        }
      });
      
      results.push(...places);
    } catch (error) {
      console.warn(`[OpenTripMap] Failed to fetch with kind ${kind}:`, error);
    }
  }
  
  // Remove duplicates based on place_id
  const uniqueResults = results.filter((place, index, self) => 
    index === self.findIndex(p => p.place_id === place.place_id)
  );
  
  console.log(`[OpenTripMap] Found ${uniqueResults.length} unique places for ${categoryId}`);
  return uniqueResults;
}

/**
 * Comprehensive places search - fetches multiple high-priority categories
 */
export async function fetchDiversePlaces(
  latitude: number,
  longitude: number,
  radius: number = 5000,
  maxPerCategory: number = 3
): Promise<Place[]> {
  if (!API_KEY) {
    console.log('[OpenTripMap] Skipping comprehensive search - API key not available');
    return [];
  }
  
  console.log(`[OpenTripMap] 🌟 Starting comprehensive place discovery`);
  
  const highPriorityCategories = getHighPriorityCategories();
  console.log(`[OpenTripMap] Searching ${highPriorityCategories.length} high-priority categories`);
  
  const allResults: Place[] = [];
  
  for (const category of highPriorityCategories) {
    try {
      console.log(`[OpenTripMap] 🔍 Searching for ${category.name} (${category.id})`);
      const places = await fetchPlacesByCategory(latitude, longitude, category.id, radius);
      
      // Limit results per category to avoid overwhelming
      const limitedPlaces = places.slice(0, maxPerCategory);
      allResults.push(...limitedPlaces);
      
      console.log(`[OpenTripMap] ✅ Found ${places.length} ${category.name}s, added ${limitedPlaces.length}`);
      
      // Small delay to respect API limits
      await new Promise(resolve => setTimeout(resolve, 300));
      
    } catch (error) {
      console.warn(`[OpenTripMap] ⚠️ Failed to search ${category.name}:`, error);
    }
  }
  
  console.log(`[OpenTripMap] 🎉 Comprehensive search completed: ${allResults.length} total places`);
  return allResults;
}

/**
 * Search for religious places
 */
export async function fetchReligiousPlaces(
  latitude: number,
  longitude: number,
  radius: number = 5000
): Promise<Place[]> {
  const religiousCategories = ['hindu-temple', 'mosque', 'church', 'gurudwara', 'buddhist-site'];
  const results: Place[] = [];
  
  for (const categoryId of religiousCategories) {
    const places = await fetchPlacesByCategory(latitude, longitude, categoryId, radius);
    results.push(...places);
  }
  
  console.log(`[OpenTripMap] 🕉️ Found ${results.length} religious places`);
  return results;
}

/**
 * Search for historical places
 */
export async function fetchHistoricalPlaces(
  latitude: number,
  longitude: number,
  radius: number = 5000
): Promise<Place[]> {
  const historicalCategories = ['fort', 'palace', 'monument', 'archaeological-site', 'heritage-building'];
  const results: Place[] = [];
  
  for (const categoryId of historicalCategories) {
    const places = await fetchPlacesByCategory(latitude, longitude, categoryId, radius);
    results.push(...places);
  }
  
  console.log(`[OpenTripMap] 🏰 Found ${results.length} historical places`);
  return results;
}

/**
 * Search for nature places
 */
export async function fetchNaturePlaces(
  latitude: number,
  longitude: number,
  radius: number = 5000
): Promise<Place[]> {
  const natureCategories = ['hill-station', 'waterfall', 'lake', 'national-park', 'garden', 'beach'];
  const results: Place[] = [];
  
  for (const categoryId of natureCategories) {
    const places = await fetchPlacesByCategory(latitude, longitude, categoryId, radius);
    results.push(...places);
  }
  
  console.log(`[OpenTripMap] ⛰️ Found ${results.length} nature places`);
  return results;
}
