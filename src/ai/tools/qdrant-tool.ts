import { QdrantClient } from '@qdrant/js-client-rest';
import { type ExploreOutput } from '@/lib/schemas';

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
  radiusMeters: number;
  limit?: number;
  minScore?: number;
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
  // src/ai/tools/qdrant-tool.ts
async searchInCollection(
  collectionName: string,
  params: QdrantSearchParams
): Promise<QdrantPlace[]> {
  try {
    const client = await this.ensureClient();
    const { latitude, longitude, radiusMeters, limit = 50 } = params;

    // Use geo filter to pull candidates
    const { points } = await client.scroll(collectionName, {
      limit: Math.min(200, Math.max(limit * 3, 60)), // oversample then filter by distance
      with_payload: true,
      filter: {
        must: [
          {
            key: 'coordinates', // your payload field
            geo_radius: {
              center: { lat: latitude, lon: longitude },
              radius: radiusMeters ?? 50000,
            },
          },
        ],
      },
    });

    const inRadius = (points ?? []).filter((p: any) => {
      const c = p.payload?.coordinates;
      if (!c?.latitude || !c?.longitude) return false;
      const d = this.calculateDistance(latitude, longitude, c.latitude, c.longitude);
      return !radiusMeters || d <= radiusMeters;
    });

    // Sort by distance then cap to limit
    const sorted = inRadius.sort((a: any, b: any) => {
      const da = this.calculateDistance(
        latitude, longitude, a.payload.coordinates.latitude, a.payload.coordinates.longitude
      );
      const db = this.calculateDistance(
        latitude, longitude, b.payload.coordinates.latitude, b.payload.coordinates.longitude
      );
      return da - db;
    }).slice(0, limit);

    return sorted.map((hit: any) => ({
      name: hit.payload?.name || 'Unknown Place',
      description: hit.payload?.description,
      rating: hit.payload?.rating,
      category: hit.payload?.category || 'misc',
      address: hit.payload?.address || '',
      coordinates: {
        latitude: hit.payload?.coordinates?.latitude,
        longitude: hit.payload?.coordinates?.longitude,
      },
      source: 'qdrant',
    }));
  } catch (error: any) {
    console.error('[Qdrant] searchInCollection failed:', error.message);
    return [];
  }
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
    console.log(`[Qdrant] Starting comprehensive search for lat: ${params.latitude}, lon: ${params.longitude}, radius: ${params.radiusMeters}m`);

    // Search in parallel across different collections
    const [places, hotels, restaurants] = await Promise.all([
      qdrantTool.searchInCollection(COLLECTION_NAMES.places, params),
      qdrantTool.searchInCollection(COLLECTION_NAMES.hotels, params),
      qdrantTool.searchInCollection(COLLECTION_NAMES.restaurants, params),
    ]);

    // Also try searching attractions collection and merge with places
    try {
      const attractions = await qdrantTool.searchInCollection(COLLECTION_NAMES.attractions, params);
      places.push(...attractions);
    } catch (error) {
      console.log('[Qdrant] Attractions collection not available or failed');
    }

    const result: ExploreOutput = {
      places: places.slice(0, 20), // Limit results
      hotels: hotels.slice(0, 20),
      restaurants: restaurants.slice(0, 20)
    };

    console.log(`[Qdrant] ✅ Total results - Places: ${result.places.length}, Hotels: ${result.hotels.length}, Restaurants: ${result.restaurants.length}`);
    
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