import { QdrantClient } from '@qdrant/js-client-rest';
import { type ExploreOutput } from '@/lib/schemas';
import { filterTouristPlaces, filterHighQualityPlaces } from '@/lib/data-quality-filter';

const QDRANT_URL = process.env.QDRANT_URL;
const QDRANT_API_KEY = process.env.QDRANT_API_KEY;

export interface QdrantPlace {
  name: string;
  description?: string;
  rating?: number;
  category: string;
  address: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  distance?: number;
  source: string;
}

export interface QdrantSearchParams {
  latitude: number;
  longitude: number;
  radiusMeters?: number;
  limit?: number;
  offset?: number; // For pagination
  minScore?: number;
  qualityFilter?: 'all' | 'good' | 'excellent'; // Data quality filtering
}

class QdrantTool {
  private client: QdrantClient | null = null;
  private isInitialized = false;

  constructor() {
    this.initializeClient();
  }

  private async initializeClient(): Promise<void> {
    try {
      if (!QDRANT_URL || !QDRANT_API_KEY) {
        console.warn('[Qdrant] Missing configuration - URL or API key not provided');
        return;
      }

      this.client = new QdrantClient({
        url: QDRANT_URL,
        apiKey: QDRANT_API_KEY,
      });

      // Test connection
      await this.client.getCollections();
      this.isInitialized = true;
      console.log('[Qdrant] ✅ Client initialized successfully');
    } catch (error: any) {
      console.error('[Qdrant] ❌ Failed to initialize client:', error.message);
      this.client = null;
      this.isInitialized = false;
    }
  }

  private async ensureClient(): Promise<QdrantClient> {
    if (!this.client || !this.isInitialized) {
      await this.initializeClient();
    }
    
    if (!this.client) {
      throw new Error('Qdrant client not available');
    }
    
    return this.client;
  }

  /**
   * Search for places in a specific collection
   */
  // Enhanced search with pagination support
async searchInCollection(
  collectionName: string,
  params: QdrantSearchParams
): Promise<QdrantPlace[]> {
  const client = await this.ensureClient();
  const { latitude, longitude, radiusMeters, limit = 10000, offset = 0 } = params;
  
  console.log(`[Qdrant] Searching with unlimited results: offset=${offset}, limit=${limit}`);

  // Helper to perform geo scroll on a given field key with unlimited fetch
  const geoScroll = async (fieldKey: string) => {
    // Fetch maximum possible results - no practical limit
    const fetchLimit = Math.max(limit * 2, 10000); // Ensure we get all available data
    
    return client.scroll(collectionName, {
      limit: fetchLimit,
      with_payload: true,
      filter: {
        must: [
          {
            key: fieldKey,
            geo_radius: {
              center: { lat: latitude, lon: longitude },
              radius: radiusMeters ?? 50000,
            },
          },
        ],
      },
    });
  };

  let points: any[] | undefined;

  // Try 'coordinates' (preferred)
  try {
    const res = await geoScroll('coordinates');
    points = res.points;
  } catch (e1: any) {
    console.warn('[Qdrant] geo scroll on "coordinates" failed:', e1.message);
    // Fallback to legacy 'coords' (from external uploader)
    try {
      const res2 = await geoScroll('coords');
      points = res2.points;
    } catch (e2: any) {
      console.error('[Qdrant] geo scroll fallback on "coords" failed:', e2.message);
      
      // Final fallback: try simple scroll without geo filtering to see if data exists
      try {
        console.log('[Qdrant] Trying simple scroll without geo filtering...');
        const fetchLimit = Math.max(limit * 2, 10000); // No practical limit
        const res3 = await client.scroll(collectionName, {
          limit: fetchLimit,
          with_payload: true,
        });
        points = res3.points;
        console.log(`[Qdrant] 🔍 Simple scroll found ${points?.length || 0} total records`);
        
        // Debug: Log some sample data to see what we have
        if (points && points.length > 0) {
          console.log(`[Qdrant] 📝 Sample records:`);
          points.slice(0, 3).forEach((p, i) => {
            const payload = p.payload || {};
            const coords = payload.coords || {};
            console.log(`  ${i+1}. ${payload.name} at (${coords.lat}, ${coords.lon}) - ${payload.source}`);
          });
        }
      } catch (e3: any) {
        console.error('[Qdrant] Simple scroll also failed:', e3.message);
        return [];
      }
    }
  }

  const inRadius = (points ?? []).filter((p: any) => {
    // Support multiple payload shapes
    const pc = p.payload || {};
    const c = pc.coordinates || pc.coords || {};
    const lat = c.lat ?? c.latitude;
    const lon = c.lon ?? c.longitude;
    if (typeof lat !== 'number' || typeof lon !== 'number') {
      console.log(`[Qdrant] ⚠️ Skipping ${pc.name} - invalid coordinates: lat=${lat}, lon=${lon}`);
      return false;
    }
    const d = this.calculateDistance(latitude, longitude, lat, lon);
    const withinRadius = !radiusMeters || d <= radiusMeters;
    
    if (withinRadius) {
      console.log(`[Qdrant] ✅ ${pc.name} at (${lat}, ${lon}) - distance: ${Math.round(d)}m`);
    } else {
      console.log(`[Qdrant] ❌ ${pc.name} at (${lat}, ${lon}) - distance: ${Math.round(d)}m (beyond ${radiusMeters}m)`);
    }
    
    return withinRadius;
  });

  // Sort by distance and apply pagination
  const sorted = inRadius
    .sort((a: any, b: any) => {
      const pa = a.payload || {}; const ca = pa.coordinates || pa.coords || {};
      const pb = b.payload || {}; const cb = pb.coordinates || pb.coords || {};
      const latA = ca.lat ?? ca.latitude; const lonA = ca.lon ?? ca.longitude;
      const latB = cb.lat ?? cb.latitude; const lonB = cb.lon ?? cb.longitude;
      const da = this.calculateDistance(latitude, longitude, latA, lonA);
      const db = this.calculateDistance(latitude, longitude, latB, lonB);
      return da - db;
    })
    .slice(offset, offset + limit); // Apply offset and limit for pagination
  
  console.log(`[Qdrant] Returning ${sorted.length} items (offset: ${offset}, total filtered: ${inRadius.length})`);

  return sorted.map((hit: any) => {
    const p = hit.payload || {};
    const c = p.coordinates || p.coords || {};
    const lat = c.lat ?? c.latitude;
    const lon = c.lon ?? c.longitude;
    return {
      name: p.name || 'Unknown Place',
      description: p.description,
      rating: p.rating,
      category: p.category || 'misc',
      address: p.address || '',
      coordinates: { latitude: lat, longitude: lon },
      source: 'qdrant',
      itemType: p.itemType || 'place', // Include itemType from payload
    } as QdrantPlace & { itemType: string };
  });
}

  /**
   * Calculate distance between two coordinates (Haversine formula)
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000; // Earth's radius in meters
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI/180);
  }

  /**
   * Check if Qdrant is available and collections exist
   */
  async healthCheck(): Promise<{
    available: boolean;
    collections: string[];
    error?: string;
  }> {
    try {
      const client = await this.ensureClient();
      const collections = await client.getCollections();
      
      return {
        available: true,
        collections: collections.collections.map(c => c.name)
      };
    } catch (error: any) {
      return {
        available: false,
        collections: [],
        error: error.message
      };
    }
  }
}

// Create singleton instance
const qdrantTool = new QdrantTool();

// Collection names - adjust these based on your Qdrant setup
const COLLECTION_NAMES = {
  places: 'places',
  hotels: 'hotels', 
  restaurants: 'restaurants',
  attractions: 'attractions'
};

export async function fetchPlacesFromQdrant(params: QdrantSearchParams): Promise<ExploreOutput> {
  try {
    const { qualityFilter = 'all', ...searchParams } = params;
    console.log(`[Qdrant] Starting comprehensive search for lat: ${params.latitude}, lon: ${params.longitude}, radius: ${params.radiusMeters}m, quality: ${qualityFilter}`);

    // Search the unified 'places' collection which contains all data with itemType field
    let allResults = await qdrantTool.searchInCollection('places', { ...searchParams, limit: 10000 }); // Get more results before filtering

    console.log(`[Qdrant] Raw results before quality filtering: ${allResults.length}`);

    // Apply quality filtering based on the selected level
    if (qualityFilter === 'excellent') {
      allResults = filterHighQualityPlaces(allResults as any[]);
      console.log(`[Qdrant] After excellent quality filter: ${allResults.length}`);
    } else if (qualityFilter === 'good') {
      allResults = filterTouristPlaces(allResults as any[]);
      console.log(`[Qdrant] After good quality filter: ${allResults.length}`);
    }
    // For 'all', no additional filtering

    // Apply pagination after filtering
    const offset = params.offset || 0;
    const limit = params.limit || 50;
    const paginatedResults = allResults.slice(offset, offset + limit);

    // Separate results by itemType from the unified collection
    const places = paginatedResults.filter(item => {
      const itemType = (item as any).itemType;
      return !itemType || itemType === 'place';
    });
    
    const hotels = paginatedResults.filter(item => {
      const itemType = (item as any).itemType;
      return itemType === 'hotel';
    });
    
    const restaurants = paginatedResults.filter(item => {
      const itemType = (item as any).itemType;
      return itemType === 'restaurant';
    });

    const result: ExploreOutput = {
      places,
      hotels,
      restaurants
    };

    console.log(`[Qdrant] ✅ Quality-filtered and paginated results - Places: ${result.places.length}, Hotels: ${result.hotels.length}, Restaurants: ${result.restaurants.length}`);
    
    return result;

  } catch (error: any) {
    console.error('[Qdrant] ❌ fetchPlacesFromQdrant failed:', error.message);
    
    // Return empty results instead of throwing
    return {
      places: [],
      hotels: [],
      restaurants: []
    };
  }
}

export async function searchPlacesByName(name: string, limit: number = 10): Promise<QdrantPlace[]> {
  try {
    const client = await qdrantTool.ensureClient();
    
    // This would require text search capabilities in Qdrant
    // Implementation depends on your vector embeddings and search setup
    console.log(`[Qdrant] Text search for: ${name} (not implemented)`);
    
    return [];
  } catch (error: any) {
    console.error('[Qdrant] Text search failed:', error.message);
    return [];
  }
}

export async function getQdrantHealth(): Promise<{
  available: boolean;
  collections: string[];
  error?: string;
}> {
  return qdrantTool.healthCheck();
}

export { COLLECTION_NAMES };