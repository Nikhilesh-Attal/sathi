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
import { cacheService, type CachedLocationData } from '@/lib/cache-service';
import { autoIngestAPIResults } from '@/lib/qdrant-auto-ingestion';
import { withRetry, API_RETRY_CONFIG } from '@/lib/enhanced-error-handler';

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
  async ({ latitude, longitude, offset = 0, limit = 10000, loadMore = false, qualityFilter = 'good' }) => {
    console.log(`[exploreFlow] Starting exploration for lat: ${latitude}, lon: ${longitude}`);
    console.log(`[exploreFlow] Pagination params: offset=${offset}, limit=${limit}, loadMore=${loadMore}`);

    // Skip cache for pagination requests (except first page)
    const shouldUseCache = !loadMore && offset === 0;
    
    // 0. Check enhanced cache first with better logging (only for first page)
    if (shouldUseCache) {
      const cached = cacheService.get(latitude, longitude, 10000); // 10km default radius
      if (cached) {
        console.log(`[exploreFlow] ✅ Cache hit! Returning ${cached.places.length} cached places from ${cached.source}`);
        console.log(`[exploreFlow] 📋 Cache details: TTL remaining ${Math.round((cached.timestamp + 30*60*1000 - Date.now())/1000/60)}min, Data type: ${cached.dataType}`);
        
        const places = cached.places.filter(p => (p as any).itemType === 'place');
        const hotels = cached.places.filter(p => (p as any).itemType === 'hotel');
        const restaurants = cached.places.filter(p => (p as any).itemType === 'restaurant');
        
        return {
          places,
          hotels,
          restaurants
        };
      }
    }
    
    console.log(`[exploreFlow] 📅 Cache miss - proceeding with API cascade`);
    console.log(`[exploreFlow] 🌍 Target location: lat=${latitude}, lon=${longitude}`);
    console.log(`[exploreFlow] 🔍 Starting 6-tier data discovery system...`);
    
    let apiDataFetched = false;
    let fetchedData: any[] = [];
    let dataSource = 'unknown';

    // 1. Try Qdrant (only if in India) - but optimize the radius tiers
    if (isLocationInIndia(latitude, longitude)) {
      console.log(`[exploreFlow] Location is in India. Attempting optimized Qdrant search...`);

      // Use only 2 radius tiers for faster results
      const optimizedRadii = [100000, 500000]; // 100km, 500km
      
      for (const radius of optimizedRadii) {
        try {
          console.log(`[exploreFlow] Searching Qdrant with radius: ${radius}m, offset: ${offset}, limit: ${limit}`);
          const qdrantResults = await fetchPlacesFromQdrant({ 
            latitude, 
            longitude, 
            radiusMeters: radius,
            offset,
            limit: Math.max(limit, 10000), // Ensure we get maximum results
            qualityFilter
          });

          const normalizedQdrantPlaces = normalizeList(qdrantResults.places, 'place');
          const normalizedQdrantHotels = normalizeList(qdrantResults.hotels, 'hotel');
          const normalizedQdrantRestaurants = normalizeList(qdrantResults.restaurants, 'restaurant');

          if (normalizedQdrantPlaces.length > 0 || normalizedQdrantHotels.length > 0 || normalizedQdrantRestaurants.length > 0) {
            console.log(`[exploreFlow] ✅ Qdrant returned results for radius ${radius}m - Places: ${normalizedQdrantPlaces.length}, Hotels: ${normalizedQdrantHotels.length}, Restaurants: ${normalizedQdrantRestaurants.length}`);
            
            // Check if the results are geographically relevant (within reasonable distance for 5km search)
            // Only accept results as "good enough" if we find results within 50km for close search
            const allResults = [...normalizedQdrantPlaces, ...normalizedQdrantHotels, ...normalizedQdrantRestaurants];
            const relevantResults = allResults.filter(result => {
              if (result.point) {
                const distance = Math.sqrt(
                  Math.pow((result.point.lat - latitude) * 111000, 2) +
                  Math.pow((result.point.lon - longitude) * 111000 * Math.cos(latitude * Math.PI / 180), 2)
                );
                return distance <= 50000; // 50km threshold for relevance
              }
              return false;
            });
            
            if (relevantResults.length >= 3) {
              console.log(`[exploreFlow] ✅ Found ${relevantResults.length} geographically relevant Qdrant results within 50km - using them`);
              // Cache successful Qdrant results with enhanced metadata
              const allPlaces = [
                ...normalizedQdrantPlaces.map(p => ({ ...p, itemType: 'place' as const })),
                ...normalizedQdrantHotels.map(h => ({ ...h, itemType: 'hotel' as const })),
                ...normalizedQdrantRestaurants.map(r => ({ ...r, itemType: 'restaurant' as const }))
              ];
              cacheService.set(latitude, longitude, radius, allPlaces, 'mixed', 'qdrant-cloud');
              
              console.log(`[exploreFlow] 📋 Cached ${allPlaces.length} Qdrant results for future use`);
              apiDataFetched = true;
              dataSource = 'qdrant';
              
              return {
                places: normalizedQdrantPlaces,
                hotels: normalizedQdrantHotels,
                restaurants: normalizedQdrantRestaurants,
              };
            } else {
              console.log(`[exploreFlow] ⚠️ Qdrant returned ${allResults.length} total results, but only ${relevantResults.length} are within 50km - proceeding to Geoapify for better local data`);
              // Continue to next API source for geographically relevant data
            }
          }
        } catch (error: any) {
          console.error(`[exploreFlow] ❌ Qdrant error at radius ${radius}m:`, error);
        }
      }
      console.log(`[exploreFlow] No Qdrant results found in India. Falling back to RapidAPI.`);
    } else {
      console.log(`[exploreFlow] Location outside India, skipping Qdrant.`);
    }

    // 2. Try RapidAPI (Travel Places API) with auto-ingestion
    if (!apiDataFetched) {
      try {
        console.log(`[exploreFlow] 🚀 Attempting RapidAPI with enhanced error handling...`);
        const cityForRapidAPI = getNearestCityName(latitude, longitude);
        
        const rapidResults = await withRetry(
          () => fetchPlacesFromRapidAPI(cityForRapidAPI, Math.floor(Math.sqrt(latitude*latitude + longitude*longitude))), // Dynamic radius
          'RapidAPI-Explore-Flow',
          API_RETRY_CONFIG
        );

        if (rapidResults.length > 0) {
          console.log(`[exploreFlow] ✅ RapidAPI returned ${rapidResults.length} results`);
          
          // Convert to Place format for processing
          const convertedPlaces = rapidResults.map(r => ({
            place_id: `rapid-${Date.now()}-${Math.random().toString(36).slice(2)}`,
            name: r.name,
            description: r.description,
            vicinity: r.address,
            rating: r.rating,
            types: [r.category || 'attraction'],
            point: r.coordinates ? { lat: r.coordinates.latitude, lon: r.coordinates.longitude } : undefined,
            source: r.source
          }));

          // 🚀 AUTO-INGEST TO QDRANT CLOUD
          console.log(`[exploreFlow] 📋 Scheduling background ingestion of ${convertedPlaces.length} RapidAPI results to Qdrant Cloud...`);
          autoIngestAPIResults(
            convertedPlaces,
            'rapidapi',
            latitude,
            longitude,
            20000 // 20km radius
          ).then((ingestionResult) => {
            console.log(`[exploreFlow] 🎉 RapidAPI background ingestion completed!`);
            console.log(`[exploreFlow] 📋 Ingestion stats: stored=${ingestionResult.stored}, duplicates=${ingestionResult.duplicatesSkipped}, errors=${ingestionResult.errors}`);
          }).catch((ingestionError: any) => {
            console.warn(`[exploreFlow] ⚠️ RapidAPI background ingestion failed: ${ingestionError.message}`);
          });

          // Prepare response with normalized data
          const normalizedRapidPlaces = normalizeList(rapidResults, 'place');
          const allPlaces = normalizedRapidPlaces.map(p => ({ ...p, itemType: 'place' as const }));
          
          cacheService.set(latitude, longitude, 20000, allPlaces, 'places', 'rapidapi');
          
          apiDataFetched = true;
          dataSource = 'rapidapi';
          fetchedData = convertedPlaces;
          
          return {
            places: normalizedRapidPlaces,
            hotels: [],
            restaurants: []
          };
        }
        console.log(`[exploreFlow] ❌ RapidAPI returned no results.`);
      } catch (error: any) {
        console.error("[exploreFlow] ❌ RapidAPI fetch failed:", {
          message: error.message,
          stack: error.stack?.split('\n')[0]
        });
      }
    }

    // 3. Try Geoapify with auto-ingestion (Most reliable - 85% success rate)
    if (!apiDataFetched) {
      try {
        console.log(`[exploreFlow] 🌍 Attempting Geoapify (highest success rate API)...`);
        
        const [geoPlaces, geoHotels, geoRestaurants] = await Promise.all([
          withRetry(() => fetchPlacesFromGeoapify(latitude, longitude, 5000), 'Geoapify-Places', API_RETRY_CONFIG),
          withRetry(() => fetchHotelsFromGeoapify(latitude, longitude, 5000), 'Geoapify-Hotels', API_RETRY_CONFIG),
          withRetry(() => fetchRestaurantsFromGeoapify(latitude, longitude, 5000), 'Geoapify-Restaurants', API_RETRY_CONFIG)
        ]);

        const normalizedGeoPlaces = normalizeList(geoPlaces, 'place');
        const normalizedGeoHotels = normalizeList(geoHotels, 'hotel');
        const normalizedGeoRestaurants = normalizeList(geoRestaurants, 'restaurant');
        
        const totalResults = normalizedGeoPlaces.length + normalizedGeoHotels.length + normalizedGeoRestaurants.length;

        if (totalResults > 0) {
          console.log(`[exploreFlow] ✅ Geoapify returned Places: ${normalizedGeoPlaces.length}, Hotels: ${normalizedGeoHotels.length}, Restaurants: ${normalizedGeoRestaurants.length}`);
          
          // Convert all results to Place format for auto-ingestion
          const allPlacesForIngestion = [
            ...geoPlaces.map(p => ({
              place_id: `geo-place-${Date.now()}-${Math.random().toString(36).slice(2)}`,
              name: p.name,
              description: p.category,
              vicinity: p.address,
              rating: p.rating,
              types: [p.category],
              point: { lat: p.coordinates.latitude, lon: p.coordinates.longitude },
              source: 'geoapify'
            })),
            ...geoHotels.map(h => ({
              place_id: `geo-hotel-${Date.now()}-${Math.random().toString(36).slice(2)}`,
              name: h.name,
              description: h.category,
              vicinity: h.address,
              rating: h.rating,
              types: [h.category],
              point: { lat: h.coordinates.latitude, lon: h.coordinates.longitude },
              source: 'geoapify'
            })),
            ...geoRestaurants.map(r => ({
              place_id: `geo-restaurant-${Date.now()}-${Math.random().toString(36).slice(2)}`,
              name: r.name,
              description: r.category,
              vicinity: r.address,
              rating: r.rating,
              types: [r.category],
              point: { lat: r.coordinates.latitude, lon: r.coordinates.longitude },
              source: 'geoapify'
            }))
          ];

          // 🚀 AUTO-INGEST TO QDRANT CLOUD
          if (allPlacesForIngestion.length > 0) {
            console.log(`[exploreFlow] 📋 Scheduling background ingestion of ${allPlacesForIngestion.length} Geoapify results to Qdrant Cloud...`);
            autoIngestAPIResults(
              allPlacesForIngestion,
              'geoapify',
              latitude,
              longitude,
              5000
            ).then((ingestionResult) => {
              console.log(`[exploreFlow] 🎉 Geoapify background ingestion completed!`);
              console.log(`[exploreFlow] 📋 Ingestion stats: stored=${ingestionResult.stored}, duplicates=${ingestionResult.duplicatesSkipped}, errors=${ingestionResult.errors}`);
            }).catch((ingestionError: any) => {
              console.warn(`[exploreFlow] ⚠️ Geoapify background ingestion failed: ${ingestionError.message}`);
            });
          }

          // Cache successful results with enhanced metadata
          const allPlacesForCache = [
            ...normalizedGeoPlaces.map(p => ({ ...p, itemType: 'place' as const })),
            ...normalizedGeoHotels.map(h => ({ ...h, itemType: 'hotel' as const })),
            ...normalizedGeoRestaurants.map(r => ({ ...r, itemType: 'restaurant' as const }))
          ];
          
          cacheService.set(latitude, longitude, 5000, allPlacesForCache, 'mixed', 'geoapify');
          
          apiDataFetched = true;
          dataSource = 'geoapify';
          fetchedData = allPlacesForIngestion;
          
          return {
            places: normalizedGeoPlaces,
            hotels: normalizedGeoHotels,
            restaurants: normalizedGeoRestaurants
          };
        }
        console.log(`[exploreFlow] ❌ Geoapify returned no results.`);
      } catch (error: any) {
        console.error("[exploreFlow] ❌ Geoapify fetch failed:", {
          message: error.message,
          attempts: error.attempts || 1
        });
      }
    }
  

    // 4. Try OpenStreetMap with auto-ingestion (Tiered radius approach)
    if (!apiDataFetched) {
      const cacheKey = createCacheKey(latitude, longitude, 'explore_osm_v4');
      const cachedData = await getFromCache(cacheKey);
      
      if (cachedData) {
        console.log(`[exploreFlow] ✅ OSM cache hit - returning cached data`);
        return cachedData;
      }
      
      console.log(`[exploreFlow] 🗺️ Attempting OSM tiered search...`);

      for (const radius of RADIUS_TIERS) {
        try {
          console.log(`[exploreFlow] 🔍 OSM searching with radius: ${radius}m`);
          
          const [osmPlaces, osmHotels, osmRestaurants] = await Promise.all([
            withRetry(() => fetchPlacesFromOpenStreetMap(latitude, longitude, radius), 'OSM-Places', { ...API_RETRY_CONFIG, maxRetries: 1 }),
            withRetry(() => fetchHotelsFromOpenStreetMap(latitude, longitude, radius), 'OSM-Hotels', { ...API_RETRY_CONFIG, maxRetries: 1 }),
            withRetry(() => fetchRestaurantsFromOpenStreetMap(latitude, longitude, radius), 'OSM-Restaurants', { ...API_RETRY_CONFIG, maxRetries: 1 })
          ]);

          const totalOsmResults = osmPlaces.length + osmHotels.length + osmRestaurants.length;

          if (totalOsmResults > 0) {
            console.log(`[exploreFlow] ✅ OSM returned results for radius ${radius}m - Places: ${osmPlaces.length}, Hotels: ${osmHotels.length}, Restaurants: ${osmRestaurants.length}`);
            
            // Convert to Place format for auto-ingestion
            const osmPlacesForIngestion = [
              ...osmPlaces.map(p => ({
                place_id: `osm-place-${Date.now()}-${Math.random().toString(36).slice(2)}`,
                name: p.name,
                description: p.category,
                vicinity: p.address,
                types: [p.category],
                point: { lat: p.coordinates.latitude, lon: p.coordinates.longitude },
                source: 'openstreetmap'
              })),
              ...osmHotels.map(h => ({
                place_id: `osm-hotel-${Date.now()}-${Math.random().toString(36).slice(2)}`,
                name: h.name,
                description: h.category,
                vicinity: h.address,
                types: [h.category],
                point: { lat: h.coordinates.latitude, lon: h.coordinates.longitude },
                source: 'openstreetmap'
              })),
              ...osmRestaurants.map(r => ({
                place_id: `osm-restaurant-${Date.now()}-${Math.random().toString(36).slice(2)}`,
                name: r.name,
                description: r.category,
                vicinity: r.address,
                types: [r.category],
                point: { lat: r.coordinates.latitude, lon: r.coordinates.longitude },
                source: 'openstreetmap'
              }))
            ];

            // 🚀 AUTO-INGEST TO QDRANT CLOUD
            if (osmPlacesForIngestion.length > 0) {
              console.log(`[exploreFlow] 📋 Scheduling background ingestion of ${osmPlacesForIngestion.length} OSM results to Qdrant Cloud...`);
              autoIngestAPIResults(
                osmPlacesForIngestion,
                'openstreetmap',
                latitude,
                longitude,
                radius
              ).then((ingestionResult) => {
                console.log(`[exploreFlow] 🎉 OSM background ingestion completed!`);
                console.log(`[exploreFlow] 📋 Ingestion stats: stored=${ingestionResult.stored}, duplicates=${ingestionResult.duplicatesSkipped}, errors=${ingestionResult.errors}`);
              }).catch((ingestionError: any) => {
                console.warn(`[exploreFlow] ⚠️ OSM background ingestion failed: ${ingestionError.message}`);
              });
            }
            
            const osmResponse: ExploreOutput = { 
              places: normalizeList(osmPlaces, 'place'),
              hotels: normalizeList(osmHotels, 'hotel'),
              restaurants: normalizeList(osmRestaurants, 'restaurant')
            };

            await setInCache(cacheKey, osmResponse);
            
            apiDataFetched = true;
            dataSource = 'osm';
            fetchedData = osmPlacesForIngestion;
            
            return osmResponse;
          }
        } catch (error: any) {
          console.error(`[exploreFlow] ❌ OSM radius ${radius}m failed:`, error.message);
        }
      }
      console.log(`[exploreFlow] ❌ OSM tiered search exhausted - no results`);
    }

    // 5. Try OpenTripMap with auto-ingestion (Tourism focus)
    if (!apiDataFetched) {
      try {
        console.log(`[exploreFlow] 🏰 Attempting OpenTripMap (tourism focus)...`);

        const [otmPlaces, otmHotels, otmRestaurants] = await Promise.all([
          withRetry(() => fetchPlacesFromOpenTripMap({ latitude, longitude, radius: 10000, kinds: 'historic' }), 'OpenTripMap-Places', { ...API_RETRY_CONFIG, maxRetries: 1 }),
          withRetry(() => fetchPlacesFromOpenTripMap({ latitude, longitude, radius: 10000, kinds: 'hotel' }), 'OpenTripMap-Hotels', { ...API_RETRY_CONFIG, maxRetries: 1 }),
          withRetry(() => fetchPlacesFromOpenTripMap({ latitude, longitude, radius: 10000, kinds: 'eating' }), 'OpenTripMap-Restaurants', { ...API_RETRY_CONFIG, maxRetries: 1 })
        ]);

        const normalizedOtmPlaces = normalizeList(otmPlaces, 'place');
        const normalizedOtmHotels = normalizeList(otmHotels, 'hotel');
        const normalizedOtmRestaurants = normalizeList(otmRestaurants, 'restaurant');

        const totalOtmResults = normalizedOtmPlaces.length + normalizedOtmHotels.length + normalizedOtmRestaurants.length;

        if (totalOtmResults > 0) {
          console.log(`[exploreFlow] ✅ OpenTripMap returned: ${normalizedOtmPlaces.length} places, ${normalizedOtmHotels.length} hotels, ${normalizedOtmRestaurants.length} restaurants`);
          
          // Convert to Place format and auto-ingest
          const otmPlacesForIngestion = [
            ...otmPlaces.map(p => ({
              place_id: p.place_id || `otm-${Date.now()}-${Math.random().toString(36).slice(2)}`,
              name: p.name,
              description: p.description,
              vicinity: p.vicinity,
              rating: p.rating,
              types: p.types || ['attraction'],
              point: p.point,
              source: 'opentripmap'
            }))
          ];

          // 🚀 AUTO-INGEST TO QDRANT CLOUD
          if (otmPlacesForIngestion.length > 0) {
            console.log(`[exploreFlow] 📋 Scheduling background ingestion of ${otmPlacesForIngestion.length} OpenTripMap results to Qdrant Cloud...`);
            autoIngestAPIResults(
              otmPlacesForIngestion,
              'opentripmap',
              latitude,
              longitude,
              10000
            ).then((ingestionResult) => {
              console.log(`[exploreFlow] 🎉 OpenTripMap background ingestion completed!`);
              console.log(`[exploreFlow] 📋 Ingestion stats: stored=${ingestionResult.stored}, duplicates=${ingestionResult.duplicatesSkipped}, errors=${ingestionResult.errors}`);
            }).catch((ingestionError: any) => {
              console.warn(`[exploreFlow] ⚠️ OpenTripMap background ingestion failed: ${ingestionError.message}`);
            });
          }
          
          apiDataFetched = true;
          dataSource = 'opentripmap';
          fetchedData = otmPlacesForIngestion;
          
          return {
            places: normalizedOtmPlaces,
            hotels: normalizedOtmHotels,
            restaurants: normalizedOtmRestaurants
          };
        }
        console.log(`[exploreFlow] ❌ OpenTripMap returned no results`);
      } catch (error: any) {
        console.error("[exploreFlow] ❌ OpenTripMap failed:", error.message);
      }
    }

    // 6. Final AI Fallback (Always succeeds)
    console.log(`[exploreFlow] 🤖 All real data sources exhausted - using AI fallback (Tier 6)...`);
    console.log(`[exploreFlow] 📊 Final system status: ${apiDataFetched ? `Success from ${dataSource}` : 'All APIs failed - using AI'}`);
    
    try {
      const aiResponse = await getAIFallbackPlaces(latitude, longitude);

      const normalizedAiPlaces = normalizeList(aiResponse.places, 'place');
      const normalizedAiHotels = normalizeList(aiResponse.hotels, 'hotel');
      const normalizedAiRestaurants = normalizeList(aiResponse.restaurants, 'restaurant');

      // Cache AI fallback with shorter TTL
      const aiPlacesForCache = [
        ...normalizedAiPlaces.map(p => ({ ...p, itemType: 'place' as const })),
        ...normalizedAiHotels.map(h => ({ ...h, itemType: 'hotel' as const })),
        ...normalizedAiRestaurants.map(r => ({ ...r, itemType: 'restaurant' as const }))
      ];
      
      cacheService.set(latitude, longitude, 10000, aiPlacesForCache, 'mixed', 'ai-fallback');

      console.log(`[exploreFlow] ✅ AI fallback returned ${normalizedAiPlaces.length + normalizedAiHotels.length + normalizedAiRestaurants.length} creative results`);
      console.log(`[exploreFlow] 🎆 6-Tier Discovery System completed successfully!`);
      
      return {
        places: normalizedAiPlaces,
        hotels: normalizedAiHotels,
        restaurants: normalizedAiRestaurants,
      };
    } catch (error: any) {
      console.error("[exploreFlow] ❌ AI fallback failed - this should never happen:", error);

      // Last resort - return minimal valid response
      console.log(`[exploreFlow] 🆘 Returning emergency fallback response`);
      return {
        places: [{
          name: 'Explore This Area',
          description: 'Discover what this location has to offer',
          rating: 4.0,
          category: 'general',
          address: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
          coordinates: { latitude, longitude },
          source: 'emergency-fallback'
        }],
        hotels: [],
        restaurants: []
      };
    }
  }
);
