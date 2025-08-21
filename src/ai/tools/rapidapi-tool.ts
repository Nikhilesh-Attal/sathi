// import axios from "axios";

// const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;

// export interface RapidAPIPlace {
//   name: string;
//   description?: string;
//   rating?: number;
//   category?: string;
//   address?: string;
//   coordinates?: {
//     latitude: number;
//     longitude: number;
//   };
//   image?: string;
//   source: string;
// }

// // Multiple RapidAPI providers configuration
// const RAPIDAPI_PROVIDERS = {
//   travel_places: {
//     host: "travel-places.p.rapidapi.com",
//     endpoint: "/locations/search"
//   },
//   tripadvisor: {
//     host: "tripadvisor16.p.rapidapi.com", 
//     endpoint: "/api/v1/restaurant/searchRestaurants"
//   },
//   booking: {
//     host: "booking-com.p.rapidapi.com",
//     endpoint: "/v1/hotels/locations"
//   },
//   places_nearby: {
//     host: "places-nearby.p.rapidapi.com",
//     endpoint: "/nearby"
//   }
// };

// export async function fetchPlacesFromRapidAPI(
//   location: string, 
//   radius: number = 20,
//   provider: keyof typeof RAPIDAPI_PROVIDERS = 'travel_places'
// ): Promise<RapidAPIPlace[]> {
  
//   if (!RAPIDAPI_KEY) {
//     console.error("[RapidAPI] ❌ API key not configured");
//     return [];
//   }

//   // Try multiple providers in sequence
//   const providers: Array<keyof typeof RAPIDAPI_PROVIDERS> = ['travel_places', 'places_nearby', 'tripadvisor'];
  
//   for (const currentProvider of providers) {
//     try {
//       console.log(`[RapidAPI] Trying ${currentProvider} for location: ${location}`);
      
//       const result = await fetchFromProvider(location, radius, currentProvider);
      
//       if (result.length > 0) {
//         console.log(`[RapidAPI] ✅ ${currentProvider} returned ${result.length} results`);
//         return result;
//       }
      
//       console.log(`[RapidAPI] ${currentProvider} returned no results, trying next provider...`);
      
//     } catch (error: any) {
//       console.error(`[RapidAPI] ❌ ${currentProvider} failed:`, {
//         message: error.message,
//         status: error.response?.status,
//         data: error.response?.data
//       });
//     }
//   }

//   console.log("[RapidAPI] ❌ All providers failed");
//   return [];
// }

// async function fetchFromProvider(
//   location: string, 
//   radius: number, 
//   provider: keyof typeof RAPIDAPI_PROVIDERS
// ): Promise<RapidAPIPlace[]> {
  
//   const config = RAPIDAPI_PROVIDERS[provider];
  
//   switch (provider) {
//     case 'travel_places':
//       return await fetchFromTravelPlaces(location, radius, config);
    
//     case 'places_nearby':
//       return await fetchFromPlacesNearby(location, radius, config);
      
//     case 'tripadvisor':
//       return await fetchFromTripAdvisor(location, radius, config);
      
//     case 'booking':
//       return await fetchFromBooking(location, radius, config);
      
//     default:
//       throw new Error(`Unknown provider: ${provider}`);
//   }
// }

// async function fetchFromTravelPlaces(
//   location: string, 
//   radius: number, 
//   config: typeof RAPIDAPI_PROVIDERS.travel_places
// ): Promise<RapidAPIPlace[]> {
  
//   const response = await axios.get(`https://${config.host}${config.endpoint}`, {
//     params: { 
//       query: location, 
//       radius: radius 
//     },
//     headers: {
//       "x-rapidapi-key": RAPIDAPI_KEY!,
//       "x-rapidapi-host": config.host,
//     },
//     timeout: 10000
//   });

//   const results = response.data?.data || response.data?.results || [];
  
//   return results.map((item: any) => ({
//     name: item.name || item.title || 'Unknown Place',
//     description: item.description || item.snippet,
//     rating: item.rating || item.score,
//     category: item.category || item.type || 'attraction',
//     address: item.address || item.location,
//     coordinates: item.coordinates ? {
//       latitude: item.coordinates.lat || item.lat,
//       longitude: item.coordinates.lng || item.lng || item.lon
//     } : undefined,
//     image: item.image || item.photo,
//     source: 'rapidapi-travel-places'
//   }));
// }

// async function fetchFromPlacesNearby(
//   location: string, 
//   radius: number, 
//   config: typeof RAPIDAPI_PROVIDERS.places_nearby
// ): Promise<RapidAPIPlace[]> {
  
//   const response = await axios.get(`https://${config.host}${config.endpoint}`, {
//     params: { 
//       location: location,
//       radius: radius * 1000, // Convert to meters
//       type: 'tourist_attraction'
//     },
//     headers: {
//       "x-rapidapi-key": RAPIDAPI_KEY!,
//       "x-rapidapi-host": config.host,
//     },
//     timeout: 10000
//   });

//   const results = response.data?.results || [];
  
//   return results.map((item: any) => ({
//     name: item.name || 'Unknown Place',
//     description: item.vicinity,
//     rating: item.rating,
//     category: item.types?.[0] || 'place',
//     address: item.vicinity,
//     coordinates: {
//       latitude: item.geometry?.location?.lat,
//       longitude: item.geometry?.location?.lng
//     },
//     image: item.icon,
//     source: 'rapidapi-places-nearby'
//   }));
// }

// async function fetchFromTripAdvisor(
//   location: string, 
//   radius: number, 
//   config: typeof RAPIDAPI_PROVIDERS.tripadvisor
// ): Promise<RapidAPIPlace[]> {
  
//   const response = await axios.get(`https://${config.host}${config.endpoint}`, {
//     params: { 
//       locationId: location, // Note: TripAdvisor might need location ID instead of name
//     },
//     headers: {
//       "x-rapidapi-key": RAPIDAPI_KEY!,
//       "x-rapidapi-host": config.host,
//     },
//     timeout: 10000
//   });

//   const results = response.data?.data || [];
  
//   return results.map((item: any) => ({
//     name: item.name || 'Unknown Place',
//     description: item.description,
//     rating: item.rating,
//     category: 'restaurant',
//     address: item.address,
//     coordinates: item.latitude && item.longitude ? {
//       latitude: item.latitude,
//       longitude: item.longitude
//     } : undefined,
//     image: item.photo?.images?.medium?.url,
//     source: 'rapidapi-tripadvisor'
//   }));
// }

// async function fetchFromBooking(
//   location: string, 
//   radius: number, 
//   config: typeof RAPIDAPI_PROVIDERS.booking
// ): Promise<RapidAPIPlace[]> {
  
//   const response = await axios.get(`https://${config.host}${config.endpoint}`, {
//     params: { 
//       query: location,
//       locale: 'en-gb'
//     },
//     headers: {
//       "x-rapidapi-key": RAPIDAPI_KEY!,
//       "x-rapidapi-host": config.host,
//     },
//     timeout: 10000
//   });

//   const results = response.data || [];
  
//   return results.map((item: any) => ({
//     name: item.name || 'Unknown Place',
//     description: item.region || item.country,
//     category: 'accommodation',
//     address: `${item.name}, ${item.region}, ${item.country}`,
//     coordinates: item.latitude && item.longitude ? {
//       latitude: item.latitude,
//       longitude: item.longitude
//     } : undefined,
//     source: 'rapidapi-booking'
//   }));
// }

// export async function fetchHotelsFromRapidAPI(
//   location: string, 
//   radius: number = 20
// ): Promise<RapidAPIPlace[]> {
//   return fetchPlacesFromRapidAPI(location, radius, 'booking');
// }

// export async function fetchRestaurantsFromRapidAPI(
//   location: string, 
//   radius: number = 20
// ): Promise<RapidAPIPlace[]> {
//   return fetchPlacesFromRapidAPI(location, radius, 'tripadvisor');
// }

// // Utility function to get nearest city name for a coordinate (simple implementation)
// export function getNearestCityName(lat: number, lon: number): string {
//   // This is a simplified implementation - in production you'd want to use 
//   // reverse geocoding or a proper city database
//   const indianCities = [
//     { name: "Mumbai", lat: 19.0760, lon: 72.8777 },
//     { name: "Delhi", lat: 28.7041, lon: 77.1025 },
//     { name: "Bangalore", lat: 12.9716, lon: 77.5946 },
//     { name: "Hyderabad", lat: 17.3850, lon: 78.4867 },
//     { name: "Chennai", lat: 13.0827, lon: 80.2707 },
//     { name: "Kolkata", lat: 22.5726, lon: 88.3639 },
//     { name: "Pune", lat: 18.5204, lon: 73.8567 },
//     { name: "Ahmedabad", lat: 23.0225, lon: 72.5714 },
//     { name: "Jaipur", lat: 26.9124, lon: 75.7873 },
//     { name: "Surat", lat: 21.1702, lon: 72.8311 }
//   ];

//   let nearestCity = "Delhi"; // default
//   let minDistance = Infinity;

//   indianCities.forEach(city => {
//     const distance = Math.sqrt(
//       Math.pow(lat - city.lat, 2) + Math.pow(lon - city.lon, 2)
//     );
//     if (distance < minDistance) {
//       minDistance = distance;
//       nearestCity = city.name;
//     }
//   });

//   return nearestCity;
// }

// import axios from "axios";

// const RAPIDAPI_KEY = "421638054emshca6e07757099a5cp17be86jsndf61dfd9d63";

// export interface RapidAPIPlace {
//   name: string;
//   description?: string;
//   rating?: number;
//   category?: string;
//   address?: string;
//   coordinates?: {
//     latitude: number;
//     longitude: number;
//   };
//   image?: string;
//   source: string;
// }

// // Travel Places API config
// const TRAVEL_PLACES_CONFIG = {
//   host: "travel-places.p.rapidapi.com",
//   endpoint: "/locations/search",
// };

// export async function fetchPlacesFromRapidAPI(
//   location: string,
//   radius: number = 20
// ): Promise<RapidAPIPlace[]> {
//   try {
//     console.log(`[RapidAPI] Calling Travel Places for location: ${location}`);

//     const response = await axios.get(
//       `https://${TRAVEL_PLACES_CONFIG.host}${TRAVEL_PLACES_CONFIG.endpoint}`,
//       {
//         params: {
//           query: location,
//           radius: radius,
//         },
//         headers: {
//           "x-rapidapi-key": RAPIDAPI_KEY,
//           "x-rapidapi-host": TRAVEL_PLACES_CONFIG.host,
//         },
//         timeout: 10000,
//       }
//     );

//     const results = response.data?.data || response.data?.results || [];

//     return results.map((item: any) => ({
//       name: item.name || item.title || "Unknown Place",
//       description: item.description || item.snippet,
//       rating: item.rating || item.score,
//       category: item.category || item.type || "attraction",
//       address: item.address || item.location,
//       coordinates: item.coordinates
//         ? {
//             latitude: item.coordinates.lat || item.lat,
//             longitude: item.coordinates.lng || item.lng || item.lon,
//           }
//         : undefined,
//       image: item.image || item.photo,
//       source: "rapidapi-travel-places",
//     }));
//   } catch (error: any) {
//     console.error("[RapidAPI] ❌ Travel Places API failed:", {
//       message: error.message,
//       status: error.response?.status,
//       data: error.response?.data,
//     });
//     return [];
//   }
// }

import axios from "axios";
import { geocodeWithGeoapify } from './geoapify-tool'; // Import geocoding function

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY; // It's better to use environment variables

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

// Travel Places API config
const TRAVEL_PLACES_CONFIG = {
  host: "travel-places.p.rapidapi.com",
  // For GraphQL, the endpoint is typically just the base host
  endpoint: "/", // Modified endpoint for GraphQL
};

export async function fetchPlacesFromRapidAPI(
  location: string,
  radius: number = 20
): Promise<RapidAPIPlace[]> {
  console.log(`[RapidAPI] Attempting to fetch data for location: ${location}`); // Added: Indicate start of RapidAPI fetch

  if (!RAPIDAPI_KEY) {
    console.error("[RapidAPI] ❌ API key not configured");
    return [];
  }

  try {
    // Use geocoding to get coordinates for the location string
    const geocodeResult = await geocodeWithGeoapify(location);

    if (!geocodeResult) {
      console.warn(`[RapidAPI] ⚠️ Could not geocode location: ${location}. Skipping RapidAPI call.`); // Added: Warn if geocoding fails
      return [];
    }

    const { latitude, longitude } = geocodeResult;
    console.log(`[RapidAPI] Geocoded location: lat=${latitude}, lon=${longitude}`); // Added: Log geocoded coordinates


    // Define the GraphQL query with dynamic latitude, longitude, and radius
    const graphqlQuery = `
      query {
        getPlaces(categories:["NATURE"], lat: ${latitude}, lng: ${longitude}, maxDistMeters: ${radius * 1000}) {
          name
          lat
          lng
          abstract
          distance
          categories
        }
      }
    `;

    const url = `https://${TRAVEL_PLACES_CONFIG.host}${TRAVEL_PLACES_CONFIG.endpoint}`; // Use the modified endpoint

    console.log(`[RapidAPI] Making POST request to ${url} with radius ${radius * 1000}m`); // Added: Log the request details

    const response = await axios.post(url, { query: graphqlQuery }, {
      headers: {
        "x-rapidapi-key": RAPIDAPI_KEY,
        "x-rapidapi-host": TRAVEL_PLACES_CONFIG.host,
        "Content-Type": "application/json" // Set Content-Type for GraphQL POST
      },
      timeout: 10000
    });

    // Log the response status
    console.log(`[RapidAPI] Received response with status: ${response.status}`);

    // Extract results based on the query structure: data.getPlaces
    const results = response.data?.data?.getPlaces || [];

    console.log(`[RapidAPI] Found ${results.length} places in the response.`); // Added: Log the number of results found

    return results.map((item: any) => ({
      name: item.name || 'Unknown Place',
      description: item.abstract, // Mapping 'abstract' from API to 'description'
      rating: undefined, // API query doesn't seem to provide rating
      category: item.categories?.[0] || 'attraction', // Taking the first category
      address: undefined, // API query doesn't seem to provide address
      coordinates: item.lat && item.lng ? {
        latitude: item.lat,
        longitude: item.lng
      } : undefined,
      image: undefined, // API query doesn't to provide image
      source: 'rapidapi-travel-places'
    }));

  } catch (error: any) {
    console.error("[RapidAPI] ❌ Travel Places API failed:", {
      message: error.message,
      status: error.response?.status, // Include status in error log
      data: error.response?.data,
    });
    // Return empty array on error to prevent schema validation issues in exploreFlow
    return [];
  }
}
