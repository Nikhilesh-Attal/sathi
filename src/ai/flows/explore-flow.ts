// 'use server';

// import { ai } from '@/ai/genkit';
// import { ExploreInputSchema, ExploreOutputSchema, type ExploreInput, type ExploreOutput } from '@/lib/schemas';
// import { fetchPlacesFromOpenTripMap } from '@/ai/tools/opentripmap-tool';
// import { fetchPlacesFromQdrant } from '@/ai/tools/qdrant-tool';
// import { fetchPlacesFromRapidAPI } from '@/ai/tools/rapidapi-tool';
// import { fetchPlacesFromGeoapify, fetchHotelsFromGeoapify, fetchRestaurantsFromGeoapify, normalizeGeoapifyResult } from '@/ai/tools/geoapify-tool';
// import { fetchPlacesFromOpenStreetMap, fetchHotelsFromOpenStreetMap, fetchRestaurantsFromOpenStreetMap } from '@/ai/tools/openstreetmap-tool';
// import { getFromCache, setInCache, createCacheKey } from '@/lib/cache';
// import { Point } from '@qdrant/js-client-rest/types/types';
// import { normalizeList } from "@/lib/normalizers";

// const RADIUS_TIERS = [50000, 100000, 150000, 200000, 300000, 500000];

// // Rough bounding box for India
// const INDIA_BOUNDING_BOX = {
//   minLat: 6.55,
//   maxLat: 35.5,
//   minLon: 68.7,
//   maxLon: 97.4,
// };

//   export type Place = {
//   id: string;
//   name: string;
//   lat: number;
//   lon: number;
//   type: string;
//   source: string; // qdrant | osm | geoapify | rapidapi
// };

// function isLocationInIndia(latitude: number, longitude: number): boolean {
//   return latitude >= INDIA_BOUNDING_BOX.minLat && latitude <= INDIA_BOUNDING_BOX.maxLat &&
//          longitude >= INDIA_BOUNDING_BOX.minLon && longitude <= INDIA_BOUNDING_BOX.maxLon;
// }

// // Local helper because rapidapi-tool no longer exports it
// function getNearestCityName(lat: number, lon: number): string {
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
//     { name: "Surat", lat: 21.1702, lon: 72.8311 },
//   ];

//   let nearestCity = "Delhi";
//   let minDistance = Infinity;

//   for (const city of indianCities) {
//     const d = Math.hypot(lat - city.lat, lon - city.lon);
//     if (d < minDistance) {
//       minDistance = d;
//       nearestCity = city.name;
//     }
//   }
//   return nearestCity;
// }

// // AI Fallback function
// async function getAIFallbackPlaces(latitude: number, longitude: number): Promise<ExploreOutput> {
//   console.log(`[AI Fallback] Generating fallback data for lat: ${latitude}, lon: ${longitude}`);
  
//   // This is a simple fallback - in production, you might want to use AI to generate
//   // more sophisticated fallback data based on the coordinates
//   const nearestCity = getNearestCityName(latitude, longitude);
  
//   return {
//     places: [
//       {
//         name: `Explore ${nearestCity}`,
//         description: `Popular attractions and places to visit in ${nearestCity}`,
//         rating: 4.0,
//         category: 'city',
//         address: nearestCity,
//         coordinates: { latitude, longitude },
//         source: 'ai-fallback'
//       }
//     ],
//     hotels: [
//       {
//         name: `Hotels in ${nearestCity}`,
//         description: `Accommodation options in ${nearestCity}`,
//         rating: 4.0,
//         category: 'accommodation', 
//         address: nearestCity,
//         coordinates: { latitude, longitude },
//         source: 'ai-fallback'
//       }
//     ],
//     restaurants: [
//       {
//         name: `Restaurants in ${nearestCity}`,
//         description: `Dining options in ${nearestCity}`,
//         rating: 4.0,
//         category: 'restaurant',
//         address: nearestCity,
//         coordinates: { latitude, longitude },
//         source: 'ai-fallback'
//       }
//     ]
//   };
// }

// export async function explorePlaces(input: ExploreInput): Promise<ExploreOutput> {
//   return exploreFlow(input);
// }

// const exploreFlow = ai.defineFlow(
//   {
//     name: 'exploreFlow',
//     inputSchema: ExploreInputSchema,
//     outputSchema: ExploreOutputSchema,
//   },
//   async ({ latitude, longitude }) => {
//     console.log(`[exploreFlow] Starting exploration for lat: ${latitude}, lon: ${longitude}`);

//     // 1. Try Qdrant (only if in India)
//     if (isLocationInIndia(latitude, longitude)) {
//       console.log(`[exploreFlow] Location is in India. Attempting tiered search from Qdrant.`);

//       for (const radius of RADIUS_TIERS) {
//         try {
//           console.log(`[exploreFlow] Searching Qdrant with radius: ${radius}m`);
//           const qdrantResults = await fetchPlacesFromQdrant({ latitude, longitude, radiusMeters: radius });

//           const normalizedQdrantPlaces = normalizeList(qdrantResults.places, 'place');
//           const normalizedQdrantHotels = normalizeList(qdrantResults.hotels, 'hotel');
//           const normalizedQdrantRestaurants = normalizeList(qdrantResults.restaurants, 'restaurant');


//           if (normalizedQdrantPlaces.length > 0 || normalizedQdrantHotels.length > 0 || normalizedQdrantRestaurants.length > 0) {
//             console.log(`[exploreFlow] ✅ Qdrant returned results for radius ${radius}m - Places: ${normalizedQdrantPlaces.length}, Hotels: ${normalizedQdrantHotels.length}, Restaurants: ${normalizedQdrantRestaurants.length}`);
//             return {
//               places: normalizedQdrantPlaces,
//               hotels: normalizedQdrantHotels,
//               restaurants: normalizedQdrantRestaurants,
//             };
//           }
//         } catch (error: any) {
//           console.error(`[exploreFlow] ❌ Qdrant error at radius ${radius}m:`, error);
//         }
//       }
//       console.log(`[exploreFlow] No Qdrant results found in India. Falling back to RapidAPI.`);
//     } else {
//       console.log(`[exploreFlow] Location outside India, skipping Qdrant.`);
//     }

//     // 2. Try RapidAPI (Travel Places API)
//     try {
//       console.log(`[exploreFlow] Fetching from RapidAPI...`);
//       const nearestCity = getNearestCityName(latitude, longitude);
//       const rapidResults = await fetchPlacesFromRapidAPI(nearestCity, 20);

//       if (rapidResults.length > 0) {
//         console.log(`[exploreFlow] ✅ RapidAPI returned ${rapidResults.length} results`);
//         const normalizedRapidPlaces = normalizeList(rapidResults.filter(p => p.category !== 'accommodation' && p.category !== 'restaurant'), 'place');
//         const normalizedRapidHotels = normalizeList(rapidResults.filter(p => p.category === 'accommodation'), 'hotel');
//         const normalizedRapidRestaurants = normalizeList(rapidResults.filter(p => p.category === 'restaurant'), 'restaurant');
//         return {
//           places: normalizedRapidPlaces,
//           hotels: normalizedRapidHotels,
//           restaurants: normalizedRapidRestaurants
//         };
//       }
//     } catch (error: any) {
//       console.error("[exploreFlow] ❌ RapidAPI fetch failed:", error);
//     }
// {/*
//     // 3. Try Geoapify
//     try {
//       console.log(`[exploreFlow] Fetching from Geoapify...`);
//       const [geoPlaces, geoHotels, geoRestaurants] = await Promise.all([
//         fetchPlacesFromGeoapify(latitude, longitude, 5000),
//         fetchHotelsFromGeoapify(latitude, longitude, 5000),
//         fetchRestaurantsFromGeoapify(latitude, longitude, 5000)
//       ]);

//       const normalizedGeoPlaces = normalizeList(geoPlaces, 'place');
//       const normalizedGeoHotels = normalizeList(geoHotels, 'hotel');
//       const normalizedGeoRestaurants = normalizeList(geoRestaurants, 'restaurant');


//       if (normalizedGeoPlaces.length > 0 || normalizedGeoHotels.length > 0 || normalizedGeoRestaurants.length > 0) {
//         console.log(`[exploreFlow] ✅ Geoapify returned Places: ${normalizedGeoPlaces.length}, Hotels: ${normalizedGeoHotels.length}, Restaurants: ${normalizedGeoRestaurants.length}`);
//         return {
//           places: normalizedGeoPlaces,
//           hotels: normalizedGeoHotels,
//           restaurants: normalizedGeoRestaurants
//         };
//       }
//     } catch (error: any) {
//       console.error("[exploreFlow] ❌ Geoapify fetch failed:", error);
//     }

//     // 4. Try OpenStreetMap (cached)
//     const cacheKey = createCacheKey(latitude, longitude, 'explore_osm_v2');
//     const cachedData = await getFromCache(cacheKey);
//     if (cachedData) {
//       console.log(`[exploreFlow] ✅ Cache hit for OSM data`);
//        // Assuming cached data is already normalized
//       return cachedData as ExploreOutput;
//     }

//     console.log(`[exploreFlow] Cache miss for OSM. Fetching fresh data for lat: ${latitude}, lon: ${longitude}`);
//     try {
//       const [osmPlaces, osmHotels, osmRestaurants] = await Promise.all([
//         fetchPlacesFromOpenStreetMap(latitude, longitude, 5000),
//         fetchHotelsFromOpenStreetMap(latitude, longitude, 5000),
//         fetchRestaurantsFromOpenStreetMap(latitude, longitude, 5000)
//       ]);

//       const normalizedOsmPlaces = normalizeList(osmPlaces, 'place');
//       const normalizedOsmHotels = normalizeList(osmHotels, 'hotel');
//       const normalizedOsmRestaurants = normalizeList(osmRestaurants, 'restaurant');


//       const osmResponse: ExploreOutput = {
//         places: normalizedOsmPlaces,
//         hotels: normalizedOsmHotels,
//         restaurants: normalizedOsmRestaurants
//       };

//       // Only cache if we got some results
//       if (osmResponse.places.length > 0 || osmResponse.hotels.length > 0 || osmResponse.restaurants.length > 0) {
//         await setInCache(cacheKey, osmResponse);
//         console.log(`[exploreFlow] ✅ OSM returned: ${osmResponse.places.length} places, ${osmResponse.hotels.length} hotels, ${osmResponse.restaurants.length} restaurants.`);
//         return osmResponse;
//       }
//     } catch (error: any) {
//       console.error("[exploreFlow] ❌ OSM fetch failed:", error);
//     }

//     // 5. Try OpenTripMap as additional fallback (your existing implementation)
//     try {
//       console.log(`[exploreFlow] Trying OpenTripMap as additional fallback...`);

//       const [otmPlaces, otmHotels, otmRestaurants] = await Promise.all([
//         fetchPlacesFromOpenTripMap({ latitude, longitude, tags: ['"tourism"="attraction"'] }),
//         fetchPlacesFromOpenTripMap({ latitude, longitude, tags: ['"tourism"="hotel"'] }),
//         fetchPlacesFromOpenTripMap({ latitude, longitude, tags: ['"amenity"="restaurant"'] })
//       ]);

//       const normalizedOtmPlaces = normalizeList(otmPlaces, 'place');
//       const normalizedOtmHotels = normalizeList(otmHotels, 'hotel');
//       const normalizedOtmRestaurants = normalizeList(otmRestaurants, 'restaurant');


//       const otmResponse: ExploreOutput = {
//         places: normalizedOtmPlaces,
//         hotels: normalizedOtmHotels,
//         restaurants: normalizedOtmRestaurants
//       };


//       if (otmResponse.places.length > 0 || otmResponse.hotels.length > 0 || otmResponse.restaurants.length > 0) {
//         console.log(`[exploreFlow] ✅ OpenTripMap returned: ${otmResponse.places.length} places, ${otmResponse.hotels.length} hotels, ${otmResponse.restaurants.length} restaurants.`);
//         return otmResponse;
//       }
//     } catch (error: any) {
//       console.error("[exploreFlow] ❌ OpenTripMap fetch failed:", error);
//     }


//     // 6. Final AI Fallback
//     try {
//       console.log(`[exploreFlow] All services failed, using AI fallback...`);
//       const aiResponse = await getAIFallbackPlaces(latitude, longitude);

//        const normalizedAiPlaces = normalizeList(aiResponse.places, 'place');
//        const normalizedAiHotels = normalizeList(aiResponse.hotels, 'hotel');
//        const normalizedAiRestaurants = normalizeList(aiResponse.restaurants, 'restaurant');


//       console.log(`[exploreFlow] ✅ AI fallback returned data`);
//       return {
//          places: normalizedAiPlaces,
//          hotels: normalizedAiHotels,
//          restaurants: normalizedAiRestaurants,
//       };
//     } catch (error: any) {
//       console.error("[exploreFlow] ❌ AI fallback failed:", error);

//       // Last resort - return empty but valid response
//       return {
//         places: [],
//         hotels: [],
//         restaurants: []
//       };
//     }
//        */}
//   }
// );


// 'use server';

// import { ai } from '@/ai/genkit';
// import { ExploreInputSchema, ExploreOutputSchema, type ExploreInput, type ExploreOutput } from '@/lib/schemas';
// import { fetchPlacesFromOpenTripMap } from '@/ai/tools/opentripmap-tool';
// import { fetchPlacesFromQdrant } from '@/ai/tools/qdrant-tool';
// import { fetchPlacesFromRapidAPI } from '@/ai/tools/rapidapi-tool'; // Keep this import
// import { fetchPlacesFromGeoapify, fetchHotelsFromGeoapify, fetchRestaurantsFromGeoapify, normalizeGeoapifyResult } from '@/ai/tools/geoapify-tool';
// import { fetchPlacesFromOpenStreetMap, fetchHotelsFromOpenStreetMap, fetchRestaurantsFromOpenStreetMap } from '@/ai/tools/openstreetmap-tool';
// import { getFromCache, setInCache, createCacheKey } from '@/lib/cache';
// import { Point } from '@qdrant/js-client-rest/types/types';
// import { normalizeList } from "@/lib/normalizers";

// const RADIUS_TIERS = [50000, 100000, 150000, 200000, 300000, 500000];

// // Rough bounding box for India
// const INDIA_BOUNDING_BOX = {
//   minLat: 6.55,
//   maxLat: 35.5,
//   minLon: 68.7,
//   maxLon: 97.4,
// };

// // Keep this type definition
//   export type Place = {
//   id: string;
//   name: string;
//   lat: number;
//   lon: number;
//   type: string;
//   source: string; // qdrant | osm | geoapify | rapidapi
// };

// function isLocationInIndia(latitude: number, longitude: number): boolean {
//   return latitude >= INDIA_BOUNDING_BOX.minLat && latitude <= INDIA_BOUNDING_BOX.maxLat &&
//          longitude >= INDIA_BOUNDING_BOX.minLon && longitude <= INDIA_BOUNDING_BOX.lon; // Fix: Changed maxLon to lon
// }

// // Local helper function for AI fallback (Keep this)
// function getNearestCityName(lat: number, lon: number): string {
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
//     { name: "Surat", lat: 21.1702, lon: 72.8311 },
//   ];

//   let nearestCity = "Delhi";
//   let minDistance = Infinity;

//   for (const city of indianCities) {
//     const d = Math.hypot(lat - city.lat, lon - city.lon);
//     if (d < minDistance) {
//       minDistance = d;
//       nearestCity = city.name;
//     }
//   }
//   return nearestCity;
// }


// // AI Fallback function (Keep this)
// async function getAIFallbackPlaces(latitude: number, longitude: number): Promise<ExploreOutput> {
//   console.log(`[AI Fallback] Generating fallback data for lat: ${latitude}, lon: ${longitude}`);

//   const nearestCity = getNearestCityName(latitude, longitude);

//   return {
//     places: [
//       {
//         name: `Explore ${nearestCity}`,
//         description: `Popular attractions and places to visit in ${nearestCity}`,
//         rating: 4.0,
//         category: 'city',
//         address: nearestCity,
//         coordinates: { latitude, longitude },
//         source: 'ai-fallback'
//       }
//     ],
//     hotels: [
//       {
//         name: `Hotels in ${nearestCity}`,
//         description: `Accommodation options in ${nearestCity}`,
//         rating: 4.0,
//         category: 'accommodation',
//         address: nearestCity,
//         coordinates: { latitude, longitude },
//         source: 'ai-fallback'
//       }
//     ],
//     restaurants: [
//       {
//         name: `Restaurants in ${nearestCity}`,
//         description: `Dining options in ${nearestCity}`,
//         rating: 4.0,
//         category: 'restaurant',
//         address: nearestCity,
//         coordinates: { latitude, longitude },
//         source: 'ai-fallback'
//       }
//     ]
//   };
// }

// export async function explorePlaces(input: ExploreInput): Promise<ExploreOutput> {
//   return exploreFlow(input);
// }

// const exploreFlow = ai.defineFlow(
//   {
//     name: 'exploreFlow',
//     inputSchema: ExploreInputSchema,
//     outputSchema: ExploreOutputSchema,
//   },
//   async ({ latitude, longitude }) => {
//     console.log(`[exploreFlow] Starting exploration for lat: ${latitude}, lon: ${longitude}`);

//     // 1. Try Qdrant (only if in India)
//     if (isLocationInIndia(latitude, longitude)) {
//       console.log(`[exploreFlow] Location is in India. Attempting tiered search from Qdrant.`);

//       for (const radius of RADIUS_TIERS) {
//         try {
//           console.log(`[exploreFlow] Searching Qdrant with radius: ${radius}m`);
//           const qdrantResults = await fetchPlacesFromQdrant({ latitude, longitude, radiusMeters: radius });

//           const normalizedQdrantPlaces = normalizeList(qdrantResults.places, 'place');
//           const normalizedQdrantHotels = normalizeList(qdrantResults.hotels, 'hotel');
//           const normalizedQdrantRestaurants = normalizeList(qdrantResults.restaurants, 'restaurant');


//           if (normalizedQdrantPlaces.length > 0 || normalizedQdrantHotels.length > 0 || normalizedQdrantRestaurants.length > 0) {
//             console.log(`[exploreFlow] ✅ Qdrant returned results for radius ${radius}m - Places: ${normalizedQdrantPlaces.length}, Hotels: ${normalizedQdrantHotels.length}, Restaurants: ${normalizedQdrantRestaurants.length}`);
//             return {
//               places: normalizedQdrantPlaces,
//               hotels: normalizedQdrantHotels,
//               restaurants: normalizedQdrantRestaurants,
//             };
//           }
//         } catch (error: any) {
//           console.error(`[exploreFlow] ❌ Qdrant error at radius ${radius}m:`, error);
//         }
//       }
//       console.log(`[exploreFlow] No Qdrant results found in India. Falling back to RapidAPI.`);
//     } else {
//       console.log(`[exploreFlow] Location outside India, skipping Qdrant.`);
//     }

// {/* 
//   // 2. Try RapidAPI (Travel Places API)
//      try {
//        console.log(`[exploreFlow] Fetching from RapidAPI...`);
//        const cityForRapidAPI = getNearestCityName(latitude, longitude); // Get a city name
//        const rapidResults = await fetchPlacesFromRapidAPI(cityForRapidAPI, 20); // Pass the city name

//        if (rapidResults.length > 0) {
//          // ... (rest of the RapidAPI handling)
//        }
//        console.log(`[exploreFlow] RapidAPI returned no results.`);
//      } catch (error: any) {
//        console.error("[exploreFlow] ❌ RapidAPI fetch failed:", error);
//         // Allow flow to continue to next data source
//      }

//     // 3. Try Geoapify
//     try {
//       console.log(`[exploreFlow] Fetching from Geoapify...`);
//       const [geoPlaces, geoHotels, geoRestaurants] = await Promise.all([
//         fetchPlacesFromGeoapify(latitude, longitude, 5000),
//         fetchHotelsFromGeoapify(latitude, longitude, 5000),
//         fetchRestaurantsFromGeoapify(latitude, longitude, 5000)
//       ]);

//       const normalizedGeoPlaces = normalizeList(geoPlaces, 'place');
//       const normalizedGeoHotels = normalizeList(geoHotels, 'hotel');
//       const normalizedGeoRestaurants = normalizeList(geoRestaurants, 'restaurant');


//       if (normalizedGeoPlaces.length > 0 || normalizedGeoHotels.length > 0 || normalizedGeoRestaurants.length > 0) {
//         console.log(`[exploreFlow] ✅ Geoapify returned Places: ${normalizedGeoPlaces.length}, Hotels: ${normalizedGeoHotels.length}, Restaurants: ${normalizedGeoRestaurants.length}`);
//         return {
//           places: normalizedGeoPlaces,
//           hotels: normalizedGeoHotels,
//           restaurants: normalizedGeoRestaurants
//         };
//       }
//        console.log(`[exploreFlow] Geoapify returned no results.`);
//     } catch (error: any) {
//       console.error("[exploreFlow] ❌ Geoapify fetch failed:", error);
//        // Allow flow to continue to next data source
//     }
// */}
//    // 4. Try OpenStreetMap (cached)
//     // Attempt tiered search with increasing radii
//     latitude = 28.7041;
//     longitude = 77.1025;
//     // 4. Try OpenStreetMap (cached)
//     // Attempt tiered search with increasing radii
//     latitude = 28.7041;
//     longitude = 77.1025;
//     const cacheKey = createCacheKey(latitude, longitude, 'explore_osm_v2');
//     const cachedData = await getFromCache(cacheKey);
//     if (cachedData) {
//       console.log(`[exploreFlow] ✅ Cache hit for OSM data`);
//       return cachedData;
//     }
//     console.log(`[exploreFlow] Cache miss for OSM. Attempting tiered search from OSM.`);

//     for (const radius of RADIUS_TIERS) {
//       try {
//         console.log(`[exploreFlow] Searching OSM with radius: ${radius}m`);
//         const [osmPlaces, osmHotels, osmRestaurants] = await Promise.all([
//           fetchPlacesFromOpenStreetMap(latitude, longitude, radius),
//           fetchHotelsFromOpenStreetMap(latitude, longitude, radius),
//           fetchRestaurantsFromOpenStreetMap(latitude, longitude, radius)
//         ]);

//         console.log(`[exploreFlow] Raw OSM data received:`, {
//           places: osmPlaces,
//           hotels: osmHotels,
//           restaurants: osmRestaurants,
//         });

//         if (osmPlaces.length > 0 || osmHotels.length > 0 || osmRestaurants.length > 0) {
//           console.log(`[exploreFlow] ✅ OSM returned results for radius ${radius}m - Places: ${osmPlaces.length}, Hotels: ${osmHotels.length}, Restaurants: ${osmRestaurants.length}`);
          
//       const osmResponse: ExploreOutput = { 
//         places: normalizeList(osmPlaces, 'place'),
//         hotels: normalizeList(osmHotels, 'hotel'),
//         restaurants: osmRestaurants 
//       };

//       // Only cache if we got some results
//         await setInCache(cacheKey, osmResponse);
//         return osmResponse;
//       }
//       } catch (error: any) {
//       console.error("[exploreFlow] ❌ OSM fetch failed:", error);
//       }
//     }
//     if (!(cachedData)) { // Only log if no cached data was found initially
//       console.log(`[exploreFlow] No OSM results found after tiered search.`);
//     }
// {/*

//     // 5. Try OpenTripMap as additional fallback (your existing implementation)
//     try {
//       console.log(`[exploreFlow] Trying OpenTripMap as additional fallback...`);

//       const [otmPlaces, otmHotels, otmRestaurants] = await Promise.all([
//         fetchPlacesFromOpenTripMap({ latitude, longitude, tags: ['"tourism"="attraction"'] }),
//         fetchPlacesFromOpenTripMap({ latitude, longitude, tags: ['"tourism"="hotel"'] }),
//         fetchPlacesFromOpenTripMap({ latitude, longitude, tags: ['"amenity"="restaurant"'] })
//       ]);

//       const normalizedOtmPlaces = normalizeList(otmPlaces, 'place');
//       const normalizedOtmHotels = normalizeList(otmHotels, 'hotel');
//       const normalizedOtmRestaurants = normalizeList(otmRestaurants, 'restaurant');


//       const otmResponse: ExploreOutput = {
//         places: normalizedOtmPlaces,
//         hotels: normalizedOtmHotels,
//         restaurants: normalizedOtmRestaurants
//       };


//       if (otmResponse.places.length > 0 || otmResponse.hotels.length > 0 || otmResponse.restaurants.length > 0) {
//         console.log(`[exploreFlow] ✅ OpenTripMap returned: ${otmResponse.places.length} places, ${otmResponse.hotels.length} hotels, ${otmResponse.restaurants.length} restaurants.`);
//         return otmResponse;
//       }
//        console.log(`[exploreFlow] OpenTripMap returned no results.`);
//     } catch (error: any) {
//       console.error("[exploreFlow] ❌ OpenTripMap fetch failed:", error);
//        // Allow flow to continue to next data source
//     }


//     // 6. Final AI Fallback
//     try {
//       console.log(`[exploreFlow] All services failed, using AI fallback...`);
//       const aiResponse = await getAIFallbackPlaces(latitude, longitude);

//        const normalizedAiPlaces = normalizeList(aiResponse.places, 'place');
//        const normalizedAiHotels = normalizeList(aiResponse.hotels, 'hotel');
//        const normalizedAiRestaurants = normalizeList(aiResponse.restaurants, 'restaurant');


//       console.log(`[exploreFlow] ✅ AI fallback returned data`);
//       return {
//          places: normalizedAiPlaces,
//          hotels: normalizedAiHotels,
//          restaurants: normalizedAiRestaurants,
//       };
//     } catch (error: any) {
//       console.error("[exploreFlow] ❌ AI fallback failed:", error);

//       // Last resort - return empty but valid response
//       return {
//         places: [],
//         hotels: [],
//         restaurants: []
//       };
//     }    */}
//   }
// );


// {/*
//   Yes, I can explain what we are trying to edit and why, even though I'm currently unable to perform the edit myself.

// What we are trying to edit:

// We are focusing on modifying the exploreFlow function within the src/ai/flows/explore-flow.ts file. This function is responsible for the logic of fetching nearby places, hotels, and restaurants. Specifically, we are targeting the part of this function that interacts with OpenStreetMap.

// Why we are doing this:

// Our goal is to successfully retrieve data from OpenStreetMap to populate the explore feature of your application. Based on the logs we've seen, even with broader tags and increased search radii, the OpenStreetMap Nominatim API (which your code currently uses) is not returning any results for the locations and types of places you are searching for.

// We've determined that this is likely because Nominatim, while useful for geocoding, is not the most effective tool for complex spatial queries like "find all hotels within a 500km radius."

// The Overpass API, on the other hand, is specifically designed for these types of queries against the OpenStreetMap database.

// Therefore, we need to switch from using the Nominatim API to the Overpass API for retrieving nearby features. This involves:

// Replacing the Nominatim API calls: We need to remove the calls to the Nominatim-based functions (fetchPlacesFromOpenStreetMap, fetchHotelsFromOpenStreetMap, fetchRestaurantsFromOpenStreetMap) in explore-flow.ts.
// Calling the new Overpass API function: We will call the queryOverpass function (which we added in src/ai/tools/openstreetmap-tool.ts) from within explore-flow.ts.
// Passing the correct parameters: We need to ensure that queryOverpass receives the necessary information, such as the coordinates, the current search radius from the tiered search, and the appropriate tags for the types of places we want to find.
// Handling the Overpass API response: The Overpass API returns data in a different format than Nominatim. We will need to add logic to parse this response and extract the relevant information (name, coordinates, etc.) for each feature.
// By making these changes, we are shifting from an API that is not well-suited for our specific data retrieval needs to one that is. This increases the likelihood of successfully fetching data from OpenStreetMap, which will then allow your explore feature to display nearby places.

// In essence, we are changing the "how" of getting OpenStreetMap data in your exploreFlow to use a more powerful and appropriate tool (Overpass API) for the job.
//  */}


'use server';

import { ai } from '@/ai/genkit';
import { ExploreInputSchema, ExploreOutputSchema, type ExploreInput, type ExploreOutput } from '@/lib/schemas';
import { fetchPlacesFromOpenTripMap } from '@/ai/tools/opentripmap-tool';
import { fetchPlacesFromQdrant } from '@/ai/tools/qdrant-tool';
import { fetchPlacesFromRapidAPI } from '@/ai/tools/rapidapi-tool';
import { fetchPlacesFromGeoapify, fetchHotelsFromGeoapify, fetchRestaurantsFromGeoapify, normalizeGeoapifyResult } from '@/ai/tools/geoapify-tool';
import { fetchPlacesFromOpenStreetMap, fetchHotelsFromOpenStreetMap, fetchRestaurantsFromOpenStreetMap } from '@/ai/tools/openstreetmap-tool';
import { getFromCache, setInCache, createCacheKey } from '@/lib/cache';
import { Point } from '@qdrant/js-client-rest/types/types';
import { normalizeList } from "@/lib/normalizers";

const RADIUS_TIERS = [50000, 100000, 150000, 200000, 300000, 500000];

// Rough bounding box for India
const INDIA_BOUNDING_BOX = {
  minLat: 6.55,
  maxLat: 35.5,
  minLon: 68.7,
  maxLon: 97.4,
};

export type Place = {
  id: string;
  name: string;
  lat: number;
  lon: number;
  type: string;
  source: string; // qdrant | osm | geoapify | rapidapi
};

function isLocationInIndia(latitude: number, longitude: number): boolean {
  return latitude >= INDIA_BOUNDING_BOX.minLat && latitude <= INDIA_BOUNDING_BOX.maxLat &&
         longitude >= INDIA_BOUNDING_BOX.minLon && longitude <= INDIA_BOUNDING_BOX.maxLon;
}

function getNearestCityName(lat: number, lon: number): string {
  const indianCities = [
    { name: "Mumbai", lat: 19.0760, lon: 72.8777 },
    { name: "Delhi", lat: 28.7041, lon: 77.1025 },
    { name: "Bangalore", lat: 12.9716, lon: 77.5946 },
    { name: "Hyderabad", lat: 17.3850, lon: 78.4867 },
    { name: "Chennai", lat: 13.0827, lon: 80.2707 },
    { name: "Kolkata", lat: 22.5726, lon: 88.3639 },
    { name: "Pune", lat: 18.5204, lon: 73.8567 },
    { name: "Ahmedabad", lat: 23.0225, lon: 72.5714 },
    { name: "Jaipur", lat: 26.9124, lon: 75.7873 },
    { name: "Surat", lat: 21.1702, lon: 72.8311 },
  ];

  let nearestCity = "Delhi";
  let minDistance = Infinity;

  for (const city of indianCities) {
    const d = Math.hypot(lat - city.lat, lon - city.lon);
    if (d < minDistance) {
      minDistance = d;
      nearestCity = city.name;
    }
  }
  return nearestCity;
}

async function getAIFallbackPlaces(latitude: number, longitude: number): Promise<ExploreOutput> {
  console.log(`[AI Fallback] Generating fallback data for lat: ${latitude}, lon: ${longitude}`);

  const nearestCity = getNearestCityName(latitude, longitude);

  return {
    places: [
      {
        name: `Explore ${nearestCity}`,
        description: `Popular attractions and places to visit in ${nearestCity}`,
        rating: 4.0,
        category: 'city',
        address: nearestCity,
        coordinates: { latitude, longitude },
        source: 'ai-fallback'
      }
    ],
    hotels: [
      {
        name: `Hotels in ${nearestCity}`,
        description: `Accommodation options in ${nearestCity}`,
        rating: 4.0,
        category: 'accommodation',
        address: nearestCity,
        coordinates: { latitude, longitude },
        source: 'ai-fallback'
      }
    ],
    restaurants: [
      {
        name: `Restaurants in ${nearestCity}`,
        description: `Dining options in ${nearestCity}`,
        rating: 4.0,
        category: 'restaurant',
        address: nearestCity,
        coordinates: { latitude, longitude },
        source: 'ai-fallback'
      }
    ]
  };
}

export async function explorePlaces(input: ExploreInput): Promise<ExploreOutput> {
  return exploreFlow(input);
}

const exploreFlow = ai.defineFlow(
  {
    name: 'exploreFlow',
    inputSchema: ExploreInputSchema,
    outputSchema: ExploreOutputSchema,
  },
  async ({ latitude, longitude }) => {
    console.log(`[exploreFlow] Starting exploration for lat: ${latitude}, lon: ${longitude}`);

    // 1. Try Qdrant (only if in India)
    if (isLocationInIndia(latitude, longitude)) {
      console.log(`[exploreFlow] Location is in India. Attempting tiered search from Qdrant.`);

      for (const radius of RADIUS_TIERS) {
        try {
          console.log(`[exploreFlow] Searching Qdrant with radius: ${radius}m`);
          const qdrantResults = await fetchPlacesFromQdrant({ latitude, longitude, radiusMeters: radius });

          const normalizedQdrantPlaces = normalizeList(qdrantResults.places, 'place');
          const normalizedQdrantHotels = normalizeList(qdrantResults.hotels, 'hotel');
          const normalizedQdrantRestaurants = normalizeList(qdrantResults.restaurants, 'restaurant');

          if (normalizedQdrantPlaces.length > 0 || normalizedQdrantHotels.length > 0 || normalizedQdrantRestaurants.length > 0) {
            console.log(`[exploreFlow] ✅ Qdrant returned results for radius ${radius}m - Places: ${normalizedQdrantPlaces.length}, Hotels: ${normalizedQdrantHotels.length}, Restaurants: ${normalizedQdrantRestaurants.length}`);
            return {
              places: normalizedQdrantPlaces,
              hotels: normalizedQdrantHotels,
              restaurants: normalizedQdrantRestaurants,
            };
          }
        } catch (error: any) {
          console.error(`[exploreFlow] ❌ Qdrant error at radius ${radius}m:`, error);
        }
      }
      console.log(`[exploreFlow] No Qdrant results found in India. Falling back to RapidAPI.`);
    } else {
      console.log(`[exploreFlow] Location outside India, skipping Qdrant.`);
    }

    // 2. Try RapidAPI (Travel Places API)
    try {
      console.log(`[exploreFlow] Fetching from RapidAPI...`);
      const cityForRapidAPI = getNearestCityName(latitude, longitude);
      const rapidResults = await fetchPlacesFromRapidAPI(cityForRapidAPI, 20);

      if (rapidResults.length > 0) {
        // ... (rest of the RapidAPI handling)
      }
      console.log(`[exploreFlow] RapidAPI returned no results.`);
    } catch (error: any) {
      console.error("[exploreFlow] ❌ RapidAPI fetch failed:", error);
    }

    // 3. Try Geoapify
    try {
      console.log(`[exploreFlow] Fetching from Geoapify...`);
      const [geoPlaces, geoHotels, geoRestaurants] = await Promise.all([
        fetchPlacesFromGeoapify(latitude, longitude, 5000),
        fetchHotelsFromGeoapify(latitude, longitude, 5000),
        fetchRestaurantsFromGeoapify(latitude, longitude, 5000)
      ]);

      const normalizedGeoPlaces = normalizeList(geoPlaces, 'place');
      const normalizedGeoHotels = normalizeList(geoHotels, 'hotel');
      const normalizedGeoRestaurants = normalizeList(geoRestaurants, 'restaurant');

      if (normalizedGeoPlaces.length > 0 || normalizedGeoHotels.length > 0 || normalizedGeoRestaurants.length > 0) {
        console.log(`[exploreFlow] ✅ Geoapify returned Places: ${normalizedGeoPlaces.length}, Hotels: ${normalizedGeoHotels.length}, Restaurants: ${normalizedGeoRestaurants.length}`);
        return {
          places: normalizedGeoPlaces,
          hotels: normalizedGeoHotels,
          restaurants: normalizedGeoRestaurants
        };
      }
      console.log(`[exploreFlow] Geoapify returned no results.`);
    } catch (error: any) {
      console.error("[exploreFlow] ❌ Geoapify fetch failed:", error);
    }
  

    // 4. Try OpenStreetMap (cached)
    const cacheKey = createCacheKey(latitude, longitude, 'explore_osm_v3');
    const cachedData = await getFromCache(cacheKey);
    if (cachedData) {
      console.log(`[exploreFlow] ✅ Cache hit for OSM data`);
      return cachedData;
    }
    console.log(`[exploreFlow] Cache miss for OSM. Attempting tiered search from OSM.`);

    for (const radius of RADIUS_TIERS) {
      try {
        console.log(`[exploreFlow] Searching OSM with radius: ${radius}m`);
        const [osmPlaces, osmHotels, osmRestaurants] = await Promise.all([
          fetchPlacesFromOpenStreetMap(latitude, longitude, radius),
          fetchHotelsFromOpenStreetMap(latitude, longitude, radius),
          fetchRestaurantsFromOpenStreetMap(latitude, longitude, radius)
        ]);

        console.log(`[exploreFlow] Raw OSM data received:`, {
          places: osmPlaces,
          hotels: osmHotels,
          restaurants: osmRestaurants,
        });

        if (osmPlaces.length > 0 || osmHotels.length > 0 || osmRestaurants.length > 0) {
          console.log(`[exploreFlow] ✅ OSM returned results for radius ${radius}m - Places: ${osmPlaces.length}, Hotels: ${osmHotels.length}, Restaurants: ${osmRestaurants.length}`);
          
          const osmResponse: ExploreOutput = { 
            places: normalizeList(osmPlaces, 'place'),
            hotels: normalizeList(osmHotels, 'hotel'),
            restaurants: normalizeList(osmRestaurants, 'restaurant')
          };

          // Only cache if we got some results
          await setInCache(cacheKey, osmResponse);
          return osmResponse;
        }
      } catch (error: any) {
        console.error("[exploreFlow] ❌ OSM fetch failed:", error);
      }
    }
    console.log(`[exploreFlow] No OSM results found after tiered search.`);
  
 // 5. Try OpenTripMap as additional fallback
try {
  console.log(`[exploreFlow] Trying OpenTripMap as additional fallback...`);

  const [otmPlaces, otmHotels, otmRestaurants] = await Promise.all([
    fetchPlacesFromOpenTripMap({ latitude, longitude, radius: 10000, kinds: 'historic' }), // Single category for places
    fetchPlacesFromOpenTripMap({ latitude, longitude, radius: 10000, kinds: 'hotel' }),   // Single category for hotels
    fetchPlacesFromOpenTripMap({ latitude, longitude, radius: 10000, kinds: 'eating' }),  // Single category for restaurants
  ]);

  const normalizedOtmPlaces = normalizeList(otmPlaces, 'place');
  const normalizedOtmHotels = normalizeList(otmHotels, 'hotel');
  const normalizedOtmRestaurants = normalizeList(otmRestaurants, 'restaurant');

  const otmResponse: ExploreOutput = {
    places: normalizedOtmPlaces,
    hotels: normalizedOtmHotels,
    restaurants: normalizedOtmRestaurants
  };

  if (otmResponse.places.length > 0 || otmResponse.hotels.length > 0 || otmResponse.restaurants.length > 0) {
    console.log(`[exploreFlow] ✅ OpenTripMap returned: ${otmResponse.places.length} places, ${otmResponse.hotels.length} hotels, ${otmResponse.restaurants.length} restaurants.`);
    return otmResponse;
  }
  console.log(`[exploreFlow] OpenTripMap returned no results.`);
} catch (error: any) {
  console.error("[exploreFlow] ❌ OpenTripMap fetch failed:", error);
}

    // 6. Final AI Fallback
    try {
      console.log(`[exploreFlow] All services failed, using AI fallback...`);
      const aiResponse = await getAIFallbackPlaces(latitude, longitude);

      const normalizedAiPlaces = normalizeList(aiResponse.places, 'place');
      const normalizedAiHotels = normalizeList(aiResponse.hotels, 'hotel');
      const normalizedAiRestaurants = normalizeList(aiResponse.restaurants, 'restaurant');

      console.log(`[exploreFlow] ✅ AI fallback returned data`);
      return {
        places: normalizedAiPlaces,
        hotels: normalizedAiHotels,
        restaurants: normalizedAiRestaurants,
      };
    } catch (error: any) {
      console.error("[exploreFlow] ❌ AI fallback failed:", error);

      // Last resort - return empty but valid response
      return {
        places: [],
        hotels: [],
        restaurants: []
      };
    }
    
    // Return empty response if no results found
    return {
      places: [],
      hotels: [],
      restaurants: []
    };
  }
);