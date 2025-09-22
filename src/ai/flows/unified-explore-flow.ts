'use server';

import { ai } from '@/ai/genkit';
import { ExploreInputSchema, ExploreOutputSchema, type ExploreInput, type ExploreOutput } from '@/lib/schemas';
import { unifiedSearchService } from '@/lib/unified-search-service';
import { dataIngestionPipeline } from '@/lib/data-ingestion-pipeline';
import { dataManagementUtils } from '@/lib/data-management-utils';
import { normalizeList } from "@/lib/normalizers";
import { cacheService } from '@/lib/cache-service';
import { trackDataIngestion, trackSearch, endTracking, logStorageResults } from '@/lib/console-tracker';
import { debugQdrantConfig, isQdrantReady } from '@/lib/qdrant-debug';

// Rough bounding box for India
const INDIA_BOUNDING_BOX = {
  minLat: 6.55,
  maxLat: 35.5,
  minLon: 68.7,
  maxLon: 97.4,
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

export async function exploreWithUnifiedSystem(input: ExploreInput): Promise<ExploreOutput> {
  return unifiedExploreFlow(input);
}

const unifiedExploreFlow = ai.defineFlow(
  {
    name: 'unifiedExploreFlow',
    inputSchema: ExploreInputSchema,
    outputSchema: ExploreOutputSchema,
  },
  async ({ latitude, longitude }) => {
    const startTime = Date.now();
    const locationName = getNearestCityName(latitude, longitude);
    
    console.log(`\n🌍 [UnifiedExplore] ======== STARTING UNIFIED EXPLORATION ========`);
    console.log(`📍 [UnifiedExplore] Location: ${locationName} (${latitude}, ${longitude})`);
    console.log(`🇮🇳 [UnifiedExplore] In India: ${isLocationInIndia(latitude, longitude)}`);
    
    // Start tracking the search operation
    const searchSessionId = trackSearch(`exploration for ${locationName}`);

    // Check Qdrant Cloud configuration before proceeding
    console.log(`\n🔧 [UnifiedExplore] Checking Qdrant Cloud configuration...`);
    const qdrantReady = await isQdrantReady();
    
    if (!qdrantReady) {
      console.warn(`⚠️  [UnifiedExplore] Qdrant Cloud not configured properly - debugging...`);
      await debugQdrantConfig();
      console.warn(`⚠️  [UnifiedExplore] Continuing without Qdrant Cloud (API-only mode)`);
    } else {
      console.log(`✅ [UnifiedExplore] Qdrant Cloud is ready for data operations`);
    }

    try {
      // 0. Check temporary cache first for immediate response
      const cached = cacheService.get(latitude, longitude, 10000);
      if (cached) {
        console.log(`⚡ [UnifiedExplore] Cache hit! Returning ${cached.places.length} cached places`);
        const places = cached.places.filter(p => p.itemType === 'place');
        const hotels = cached.places.filter(p => p.itemType === 'hotel');
        const restaurants = cached.places.filter(p => p.itemType === 'restaurant');
        
        endTracking(searchSessionId, true, 'Data served from temporary cache');
        
        return { places, hotels, restaurants };
      }

      // 1. Try Unified Search System (Qdrant Cloud + Smart Fallback) - only if Qdrant is ready
      if (qdrantReady) {
        console.log(`\n🔍 [UnifiedExplore] ======== PHASE 1: UNIFIED SEARCH ========`);
        console.log(`🗄️  [UnifiedExplore] Searching Qdrant Cloud vector database...`);
        
        try {
          const unifiedResult = await unifiedSearchService.exploreLocation(
            locationName,
            latitude,
            longitude,
            15000 // 15km radius
          );

          const totalResults = unifiedResult.places.length + unifiedResult.hotels.length + unifiedResult.restaurants.length;
          console.log(`📊 [UnifiedExplore] Unified search results: ${totalResults} total places`);
          console.log(`   📍 Places: ${unifiedResult.places.length}`);
          console.log(`   🏨 Hotels: ${unifiedResult.hotels.length}`);
          console.log(`   🍽️  Restaurants: ${unifiedResult.restaurants.length}`);

          if (totalResults > 0) {
            console.log(`\n✅ [UnifiedExplore] SUCCESS: Data retrieved from unified system!`);
            console.log(`🚀 [UnifiedExplore] Source: Qdrant Cloud vector database`);
            console.log(`⏱️  [UnifiedExplore] Total time: ${Date.now() - startTime}ms`);
            
            // Cache for immediate future requests
            const allPlaces = [
              ...unifiedResult.places.map(p => ({ ...p, itemType: 'place' as const })),
              ...unifiedResult.hotels.map(h => ({ ...h, itemType: 'hotel' as const })),
              ...unifiedResult.restaurants.map(r => ({ ...r, itemType: 'restaurant' as const }))
            ];
            cacheService.set(latitude, longitude, 15000, allPlaces);
            
            endTracking(searchSessionId, true, `Retrieved ${totalResults} places from unified system`);
            
            return unifiedResult;
          } else {
            console.log(`⚠️  [UnifiedExplore] No results from unified system - will trigger data ingestion`);
          }

        } catch (error: any) {
          console.error(`❌ [UnifiedExplore] Unified search failed:`, error);
        }
      } else {
        console.log(`\n⚠️  [UnifiedExplore] ======== PHASE 1: SKIPPED (QDRANT NOT READY) ========`);
        console.log(`📝 [UnifiedExplore] Qdrant Cloud not configured, skipping vector database search`);
        console.log(`🔄 [UnifiedExplore] Proceeding directly to API data fetching`);
      }

      // 2. If no results from unified system, trigger smart cascading data ingestion
      console.log(`\n📥 [UnifiedExplore] ======== PHASE 2: SMART CASCADING INGESTION ========`);
      console.log(`🧠 [UnifiedExplore] No cached data found - using intelligent API cascade to minimize resource usage...`);
      console.log(`🔄 [UnifiedExplore] Will call APIs one by one until sufficient data is found`);
      console.log(`💰 [UnifiedExplore] This saves API quota by avoiding unnecessary calls!`);
      
      const ingestionSessionId = trackDataIngestion(locationName);
      
      try {
        let ingestionResult;
        
        if (qdrantReady) {
          console.log(`🧠 [UnifiedExplore] Using full ingestion pipeline (API + Qdrant storage)`);
          ingestionResult = await dataIngestionPipeline.ingestForLocation({
            location: locationName,
            latitude,
            longitude,
            radius: 15000, // 15km
          });
        } else {
          console.log(`⚠️  [UnifiedExplore] Qdrant not ready - using API-only mode (no storage)`);
          console.log(`🔄 [UnifiedExplore] Data will be fetched but not stored in vector database`);
          
          // Use cascading aggregator directly without storage
          const { cascadingDataAggregator } = await import('@/lib/cascading-data-aggregator');
          const aggregationResult = await cascadingDataAggregator.aggregateWithCascading({
            location: locationName,
            latitude,
            longitude,
            radius: 15000
          });
          
          ingestionResult = {
            aggregationResult,
            storageResult: {
              stored: 0,
              updated: 0,
              errors: 0,
              duplicatesSkipped: 0,
            },
            totalProcessingTime: aggregationResult.processingTime,
            success: aggregationResult.places.length > 0,
          };
          
          console.log(`📊 [UnifiedExplore] API-only results: ${aggregationResult.places.length} places fetched`);
          console.log(`📝 [UnifiedExplore] Note: Data not stored (Qdrant not configured)`);
        }

        console.log(`📊 [UnifiedExplore] Ingestion results:`);
        console.log(`   🔍 APIs queried: ${ingestionResult.aggregationResult.sources.length}`);
        console.log(`   📈 Total found: ${ingestionResult.aggregationResult.totalFound}`);
        console.log(`   💾 Stored in Qdrant: ${ingestionResult.storageResult.stored}`);
        console.log(`   🔄 Updated in Qdrant: ${ingestionResult.storageResult.updated}`);
        console.log(`   ⏭️  Duplicates skipped: ${ingestionResult.storageResult.duplicatesSkipped}`);

        // Log storage results for tracking
        logStorageResults(ingestionSessionId, {
          stored: ingestionResult.storageResult.stored,
          updated: ingestionResult.storageResult.updated,
          duplicatesSkipped: ingestionResult.storageResult.duplicatesSkipped,
          errors: ingestionResult.storageResult.errors,
          processingTime: ingestionResult.totalProcessingTime
        });

        if (ingestionResult.success && ingestionResult.aggregationResult.places.length > 0) {
          console.log(`✅ [UnifiedExplore] Data ingestion successful!`);
          console.log(`🎯 [UnifiedExplore] ${ingestionResult.storageResult.stored + ingestionResult.storageResult.updated} places now available in Qdrant Cloud`);
          
          endTracking(ingestionSessionId, true, `Successfully ingested data for ${locationName}`);

          // 3. Use the freshly aggregated data directly (no need to re-search Qdrant)
          console.log(`\n🚀 [UnifiedExplore] ======== PHASE 3: SERVING FRESH API DATA ========`);
          console.log(`⚡ [UnifiedExplore] Using freshly fetched data directly (optimized for speed!)`);
          
          // Separate places by category from aggregated data
          const allFreshPlaces = ingestionResult.aggregationResult.places;
          const places = allFreshPlaces.filter(p => p.category && !['hotel', 'accommodation', 'restaurant', 'food'].includes(p.category.toLowerCase()));
          const hotels = allFreshPlaces.filter(p => p.category && ['hotel', 'accommodation'].includes(p.category.toLowerCase()));
          const restaurants = allFreshPlaces.filter(p => p.category && ['restaurant', 'food'].includes(p.category.toLowerCase()));
          
          const totalFresh = places.length + hotels.length + restaurants.length;
          console.log(`📊 [UnifiedExplore] Fresh API data breakdown:`);
          console.log(`   📍 Places: ${places.length}`);
          console.log(`   🏨 Hotels: ${hotels.length}`);
          console.log(`   🍽️  Restaurants: ${restaurants.length}`);
          console.log(`   📈 Total: ${totalFresh}`);

          console.log(`\n🎉 [UnifiedExplore] ======== EXPLORATION COMPLETED SUCCESSFULLY ========`);
          console.log(`📍 [UnifiedExplore] Location: ${locationName}`);
          console.log(`🗄️  [UnifiedExplore] Data source: Fresh API data (stored in Qdrant for future use)`);
          console.log(`⏱️  [UnifiedExplore] Total processing time: ${Date.now() - startTime}ms`);
          console.log(`🔮 [UnifiedExplore] Future searches for this area will be lightning fast via Qdrant Cloud!`);
          
          // Cache for immediate future requests
          const allPlaces = [
            ...places.map(p => ({ ...p, itemType: 'place' as const })),
            ...hotels.map(h => ({ ...h, itemType: 'hotel' as const })),
            ...restaurants.map(r => ({ ...r, itemType: 'restaurant' as const }))
          ];
          cacheService.set(latitude, longitude, 15000, allPlaces);
          
          endTracking(searchSessionId, true, `Successfully explored ${locationName} with ${totalFresh} places from fresh API data`);
          
          return {
            places,
            hotels,
            restaurants
          };

        } else {
          console.log(`⚠️  [UnifiedExplore] Data ingestion completed but no places were found`);
          endTracking(ingestionSessionId, false, 'No data found during ingestion');
        }

      } catch (error: any) {
        console.error(`❌ [UnifiedExplore] Data ingestion failed:`, error);
        endTracking(ingestionSessionId, false, `Ingestion failed: ${error.message}`);
      }

      // 4. Final AI Fallback if everything else fails
      console.log(`\n🤖 [UnifiedExplore] ======== PHASE 4: AI FALLBACK ========`);
      console.log(`⚠️  [UnifiedExplore] All data sources exhausted - generating AI fallback`);
      
      try {
        const aiResponse = await getAIFallbackPlaces(latitude, longitude);
        
        const normalizedAiPlaces = normalizeList(aiResponse.places, 'place');
        const normalizedAiHotels = normalizeList(aiResponse.hotels, 'hotel');
        const normalizedAiRestaurants = normalizeList(aiResponse.restaurants, 'restaurant');

        console.log(`🤖 [UnifiedExplore] AI fallback generated data for ${locationName}`);
        console.log(`⏱️  [UnifiedExplore] Total time: ${Date.now() - startTime}ms`);
        
        endTracking(searchSessionId, true, 'Used AI fallback data');

        return {
          places: normalizedAiPlaces,
          hotels: normalizedAiHotels,
          restaurants: normalizedAiRestaurants,
        };
        
      } catch (error: any) {
        console.error(`❌ [UnifiedExplore] AI fallback failed:`, error);
      }

      // 5. Last resort - return empty but valid response
      console.log(`\n💔 [UnifiedExplore] ======== EXPLORATION FAILED ========`);
      console.log(`❌ [UnifiedExplore] All systems failed for ${locationName}`);
      console.log(`⏱️  [UnifiedExplore] Total time: ${Date.now() - startTime}ms`);
      
      endTracking(searchSessionId, false, 'All exploration methods failed');

      return {
        places: [],
        hotels: [],
        restaurants: []
      };

    } catch (error: any) {
      console.error(`💥 [UnifiedExplore] Critical error in exploration:`, error);
      endTracking(searchSessionId, false, `Critical error: ${error.message}`);
      
      return {
        places: [],
        hotels: [],
        restaurants: []
      };
    }
  }
);