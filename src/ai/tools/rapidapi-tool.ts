
import axios from "axios";
import { geocodeWithGeoapify } from './geoapify-tool';
import { withRetry, API_RETRY_CONFIG } from '../../lib/enhanced-error-handler';

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;

export interface RapidAPIPlace {
  name: string;
  description?: string;
  rating?: number;
  category?: string;
  address?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  image?: string;
  source: string;
}

// Enhanced Travel Places API config with multiple query types
const TRAVEL_PLACES_CONFIG = {
  host: "travel-places.p.rapidapi.com",
  endpoint: "/", // GraphQL endpoint
};

// Multiple query templates for different types of searches
const GRAPHQL_QUERIES = {
  nature: (lat: number, lng: number, radius: number) => `
    query {
      getPlaces(categories:["NATURE", "TOURISM"], lat: ${lat}, lng: ${lng}, maxDistMeters: ${radius}) {
        name
        lat
        lng
        abstract
        distance
        categories
        website
        phone
      }
    }
  `,
  attractions: (lat: number, lng: number, radius: number) => `
    query {
      getPlaces(categories:["TOURISM", "CULTURE", "ENTERTAINMENT"], lat: ${lat}, lng: ${lng}, maxDistMeters: ${radius}) {
        name
        lat
        lng
        abstract
        distance
        categories
        website
        phone
      }
    }
  `,
  general: (lat: number, lng: number, radius: number) => `
    query {
      getPlaces(lat: ${lat}, lng: ${lng}, maxDistMeters: ${radius}) {
        name
        lat
        lng
        abstract
        distance
        categories
        website
        phone
      }
    }
  `
};

export async function fetchPlacesFromRapidAPI(
  location: string,
  radius: number = 20
): Promise<RapidAPIPlace[]> {
  console.log(`[RapidAPI] 🚀 Starting enhanced fetch for location: ${location}`);

  if (!RAPIDAPI_KEY) {
    console.error("[RapidAPI] ❌ API key not configured");
    return [];
  }

  return withRetry(
    async () => {
      // Use geocoding to get coordinates for the location string
      const geocodeResult = await geocodeWithGeoapify(location);

      if (!geocodeResult) {
        console.warn(`[RapidAPI] ⚠️ Could not geocode location: ${location}. Skipping RapidAPI call.`);
        return [];
      }

      const { latitude, longitude } = geocodeResult;
      console.log(`[RapidAPI] 📍 Geocoded location: lat=${latitude}, lon=${longitude}`);

      // Try different query types in order of preference
      const queryTypes: (keyof typeof GRAPHQL_QUERIES)[] = ['attractions', 'nature', 'general'];
      let allResults: RapidAPIPlace[] = [];

      for (const queryType of queryTypes) {
        try {
          console.log(`[RapidAPI] 🔍 Trying ${queryType} query...`);
          
          const graphqlQuery = GRAPHQL_QUERIES[queryType](latitude, longitude, radius * 1000);
          const url = `https://${TRAVEL_PLACES_CONFIG.host}${TRAVEL_PLACES_CONFIG.endpoint}`;

          const response = await axios.post(url, { query: graphqlQuery }, {
            headers: {
              "x-rapidapi-key": RAPIDAPI_KEY,
              "x-rapidapi-host": TRAVEL_PLACES_CONFIG.host,
              "Content-Type": "application/json"
            },
            timeout: 15000
          });

          console.log(`[RapidAPI] 📊 ${queryType} query response status: ${response.status}`);

          const results = response.data?.data?.getPlaces || [];
          console.log(`[RapidAPI] ✅ ${queryType} query returned ${results.length} places`);

          if (results.length > 0) {
            const mappedResults = results.map((item: any) => ({
              name: item.name || 'Unknown Place',
              description: item.abstract || '',
              rating: undefined, // RapidAPI doesn't provide ratings in this endpoint
              category: item.categories?.[0] || queryType,
              address: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`, // Use coordinates as fallback
              coordinates: item.lat && item.lng ? {
                latitude: parseFloat(item.lat),
                longitude: parseFloat(item.lng)
              } : {
                latitude,
                longitude
              },
              image: undefined,
              source: `rapidapi-travel-places-${queryType}`
            }));

            allResults.push(...mappedResults);

            // If we got good results from attractions or nature, we can stop here
            if ((queryType === 'attractions' || queryType === 'nature') && results.length >= 5) {
              console.log(`[RapidAPI] 🎯 Got sufficient results from ${queryType}, stopping here`);
              break;
            }
          }

        } catch (error: any) {
          console.warn(`[RapidAPI] ⚠️ ${queryType} query failed:`, error.message);
          // Continue to next query type
        }
      }

      // Remove duplicates based on coordinates
      const uniqueResults = removeDuplicatesByCoordinates(allResults);
      console.log(`[RapidAPI] 🧹 Removed duplicates: ${allResults.length} → ${uniqueResults.length} places`);

      console.log(`[RapidAPI] 🏁 Final results: ${uniqueResults.length} unique places ready for return`);
      return uniqueResults.slice(0, 20); // Limit to 20 results
    },
    'RapidAPI-TravelPlaces',
    {
      ...API_RETRY_CONFIG,
      maxRetries: 1 // Reduce retries for faster fallback
    }
  );
}

/**
 * Remove duplicate places based on coordinates proximity
 */
function removeDuplicatesByCoordinates(places: RapidAPIPlace[]): RapidAPIPlace[] {
  const unique: RapidAPIPlace[] = [];
  const threshold = 0.001; // ~100 meters

  for (const place of places) {
    if (!place.coordinates) continue;

    const isDuplicate = unique.some(existing => {
      if (!existing.coordinates) return false;
      
      const latDiff = Math.abs(existing.coordinates.latitude - place.coordinates!.latitude);
      const lonDiff = Math.abs(existing.coordinates.longitude - place.coordinates!.longitude);
      
      return latDiff < threshold && lonDiff < threshold;
    });

    if (!isDuplicate) {
      unique.push(place);
    }
  }

  return unique;
}

/**
 * Enhanced function to fetch hotels (can be extended when hotel-specific APIs are available)
 */
export async function fetchHotelsFromRapidAPI(
  location: string,
  radius: number = 20
): Promise<RapidAPIPlace[]> {
  console.log(`[RapidAPI] 🏨 Fetching hotels for ${location} (radius: ${radius}km)`);
  // For now, return empty array - can be enhanced with hotel-specific RapidAPI endpoints
  console.log(`[RapidAPI] ℹ️ Hotel-specific endpoint not implemented yet`);
  return [];
}

/**
 * Enhanced function to fetch restaurants (can be extended when restaurant-specific APIs are available)
 */
export async function fetchRestaurantsFromRapidAPI(
  location: string,
  radius: number = 20
): Promise<RapidAPIPlace[]> {
  console.log(`[RapidAPI] 🍽️ Fetching restaurants for ${location} (radius: ${radius}km)`);
  // For now, return empty array - can be enhanced with restaurant-specific RapidAPI endpoints
  console.log(`[RapidAPI] ℹ️ Restaurant-specific endpoint not implemented yet`);
  return [];
}
