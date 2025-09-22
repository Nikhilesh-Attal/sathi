import { getEmbedding } from './embedding';
import { fetchPlacesFromRapidAPI, type RapidAPIPlace } from '@/ai/tools/rapidapi-tool';
import { fetchPlacesFromGeoapify, type GeoapifyPlace } from '@/ai/tools/geoapify-tool';
import { fetchPlacesFromOpenTripMap } from '@/ai/tools/opentripmap-tool';
import type { Place } from './types';

export interface UnifiedPlace {
  id: string;
  name: string;
  description?: string;
  category: string;
  address: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  rating?: number;
  image?: string;
  source: string;
  sourceId?: string;
  embeddings: number[]; // 768-dimensional vector
  lastUpdated: string;
  tags: string[];
  city?: string;
  country?: string;
}

export interface AggregationParams {
  location?: string;
  latitude?: number;
  longitude?: number;
  radius?: number; // in meters
  categories?: string[];
  limit?: number;
}

export interface AggregationResult {
  places: UnifiedPlace[];
  sources: string[];
  totalFound: number;
  duplicatesRemoved: number;
  processingTime: number;
}

export class DataAggregator {
  private static instance: DataAggregator;
  
  private constructor() {}
  
  public static getInstance(): DataAggregator {
    if (!DataAggregator.instance) {
      DataAggregator.instance = new DataAggregator();
    }
    return DataAggregator.instance;
  }

  /**
   * Aggregate data from all available sources
   */
  async aggregateFromAllSources(params: AggregationParams): Promise<AggregationResult> {
    const startTime = Date.now();
    const sources: string[] = [];
    let allPlaces: UnifiedPlace[] = [];

    console.log('[DataAggregator] Starting aggregation with params:', params);

    try {
      // Fetch from all sources in parallel
      const fetchPromises: Promise<UnifiedPlace[]>[] = [];

      // RapidAPI
      if (params.location) {
        fetchPromises.push(this.fetchFromRapidAPI(params.location, params.radius || 5000));
        sources.push('rapidapi');
      }

      // Geoapify
      if (params.latitude && params.longitude) {
        fetchPromises.push(this.fetchFromGeoapify(params.latitude, params.longitude, params.radius || 5000));
        sources.push('geoapify');
      }

      // OpenTripMap
      if (params.latitude && params.longitude) {
        fetchPromises.push(this.fetchFromOpenTripMap(params.latitude, params.longitude, params.radius || 5000));
        sources.push('opentripmap');
      }

      // Wait for all API calls to complete
      const results = await Promise.allSettled(fetchPromises);
      
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          allPlaces.push(...result.value);
          console.log(`[DataAggregator] ✅ ${sources[index]} returned ${result.value.length} places`);
        } else {
          console.error(`[DataAggregator] ❌ ${sources[index]} failed:`, result.reason);
        }
      });

      // Remove duplicates
      const initialCount = allPlaces.length;
      const deduplicatedPlaces = this.removeDuplicates(allPlaces);
      const duplicatesRemoved = initialCount - deduplicatedPlaces.length;

      // Apply filters and limits
      const filteredPlaces = this.applyFilters(deduplicatedPlaces, params);
      const limitedPlaces = params.limit ? filteredPlaces.slice(0, params.limit) : filteredPlaces;

      const processingTime = Date.now() - startTime;

      console.log(`[DataAggregator] ✅ Aggregation complete: ${limitedPlaces.length} places from ${sources.length} sources in ${processingTime}ms`);

      return {
        places: limitedPlaces,
        sources,
        totalFound: initialCount,
        duplicatesRemoved,
        processingTime
      };

    } catch (error) {
      console.error('[DataAggregator] ❌ Aggregation failed:', error);
      return {
        places: [],
        sources: [],
        totalFound: 0,
        duplicatesRemoved: 0,
        processingTime: Date.now() - startTime
      };
    }
  }

  /**
   * Fetch and normalize data from RapidAPI
   */
  private async fetchFromRapidAPI(location: string, radius: number): Promise<UnifiedPlace[]> {
    try {
      const places = await fetchPlacesFromRapidAPI(location, radius / 1000); // Convert to km
      return Promise.all(places.map(place => this.normalizeRapidAPIPlace(place)));
    } catch (error) {
      console.error('[DataAggregator] RapidAPI error:', error);
      return [];
    }
  }

  /**
   * Fetch and normalize data from Geoapify
   */
  private async fetchFromGeoapify(lat: number, lon: number, radius: number): Promise<UnifiedPlace[]> {
    try {
      const places = await fetchPlacesFromGeoapify(lat, lon, radius);
      return Promise.all(places.map(place => this.normalizeGeoapifyPlace(place)));
    } catch (error) {
      console.error('[DataAggregator] Geoapify error:', error);
      return [];
    }
  }

  /**
   * Fetch and normalize data from OpenTripMap
   */
  private async fetchFromOpenTripMap(lat: number, lon: number, radius: number): Promise<UnifiedPlace[]> {
    try {
      const places = await fetchPlacesFromOpenTripMap({
        latitude: lat,
        longitude: lon,
        radius: radius / 1000, // Convert to km
      });
      return Promise.all(places.map(place => this.normalizeOpenTripMapPlace(place)));
    } catch (error) {
      console.error('[DataAggregator] OpenTripMap error:', error);
      return [];
    }
  }

  /**
   * Normalize RapidAPI place data
   */
  private async normalizeRapidAPIPlace(place: RapidAPIPlace): Promise<UnifiedPlace> {
    const text = `${place.name} ${place.category} ${place.description || ''} ${place.address || ''}`.trim();
    const embeddings = await getEmbedding(text);

    return {
      id: this.generateId(place.name, place.coordinates?.latitude, place.coordinates?.longitude, 'rapidapi'),
      name: place.name,
      description: place.description,
      category: this.normalizeCategory(place.category || 'attraction'),
      address: place.address || '',
      coordinates: place.coordinates || { latitude: 0, longitude: 0 },
      rating: place.rating,
      image: place.image,
      source: 'rapidapi',
      embeddings,
      lastUpdated: new Date().toISOString(),
      tags: [place.category || 'attraction', 'rapidapi'],
    };
  }

  /**
   * Normalize Geoapify place data
   */
  private async normalizeGeoapifyPlace(place: GeoapifyPlace): Promise<UnifiedPlace> {
    const text = `${place.name} ${place.category} ${place.address}`.trim();
    const embeddings = await getEmbedding(text);

    return {
      id: this.generateId(place.name, place.coordinates.latitude, place.coordinates.longitude, 'geoapify'),
      name: place.name,
      description: `${place.category} in ${place.address}`,
      category: this.normalizeCategory(place.category),
      address: place.address,
      coordinates: place.coordinates,
      rating: place.rating,
      source: 'geoapify',
      embeddings,
      lastUpdated: new Date().toISOString(),
      tags: [place.category, 'geoapify'],
    };
  }

  /**
   * Normalize OpenTripMap place data
   */
  private async normalizeOpenTripMapPlace(place: Place): Promise<UnifiedPlace> {
    const text = `${place.name} ${place.types?.join(' ') || ''} ${place.description || ''} ${place.vicinity || ''}`.trim();
    const embeddings = await getEmbedding(text);

    return {
      id: this.generateId(place.name, place.point?.lat, place.point?.lon, 'opentripmap'),
      name: place.name,
      description: place.description,
      category: this.normalizeCategory(place.types?.[0] || 'attraction'),
      address: place.vicinity || '',
      coordinates: {
        latitude: place.point?.lat || 0,
        longitude: place.point?.lon || 0,
      },
      rating: place.rating,
      image: place.photoUrl,
      source: 'opentripmap',
      sourceId: place.place_id,
      embeddings,
      lastUpdated: new Date().toISOString(),
      tags: place.types || ['attraction', 'opentripmap'],
    };
  }

  /**
   * Generate unique ID for a place
   */
  private generateId(name: string, lat?: number, lon?: number, source?: string): string {
    const nameSlug = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
    const coords = lat && lon ? `${lat.toFixed(4)}-${lon.toFixed(4)}` : 'unknown';
    const sourcePrefix = source || 'unknown';
    return `${sourcePrefix}-${nameSlug}-${coords}`;
  }

  /**
   * Normalize category names across different APIs
   */
  private normalizeCategory(category: string): string {
    const categoryMap: { [key: string]: string } = {
      // Tourism & Attractions
      'tourism.sights': 'attraction',
      'tourism': 'attraction',
      'tourist_attraction': 'attraction',
      'sights': 'attraction',
      'attraction': 'attraction',
      
      // Food & Dining
      'catering.restaurant': 'restaurant',
      'restaurant': 'restaurant',
      'food': 'restaurant',
      'catering': 'restaurant',
      
      // Accommodation
      'accommodation.hotel': 'hotel',
      'accommodation': 'hotel',
      'hotel': 'hotel',
      'lodging': 'hotel',
      
      // Shopping
      'commercial.shopping_mall': 'shopping',
      'shopping': 'shopping',
      'retail': 'shopping',
      
      // Entertainment
      'entertainment': 'entertainment',
      'leisure': 'entertainment',
      
      // Nature
      'natural': 'nature',
      'park': 'nature',
      
      // Default
      'place': 'attraction',
      'misc': 'attraction',
    };

    const normalized = categoryMap[category.toLowerCase()] || category.toLowerCase();
    return normalized;
  }

  /**
   * Remove duplicate places based on location and name similarity
   */
  private removeDuplicates(places: UnifiedPlace[]): UnifiedPlace[] {
    const uniquePlaces: UnifiedPlace[] = [];
    const seenLocations = new Set<string>();

    for (const place of places) {
      // Create a location key for duplicate detection
      const locationKey = `${place.coordinates.latitude.toFixed(4)}-${place.coordinates.longitude.toFixed(4)}`;
      
      // Check if we've seen this exact location
      const isDuplicateLocation = seenLocations.has(locationKey);
      
      // Check for name similarity with existing places
      const isDuplicateName = uniquePlaces.some(existing => 
        this.calculateNameSimilarity(place.name, existing.name) > 0.8 &&
        this.calculateDistance(
          place.coordinates.latitude, place.coordinates.longitude,
          existing.coordinates.latitude, existing.coordinates.longitude
        ) < 100 // within 100 meters
      );

      if (!isDuplicateLocation && !isDuplicateName) {
        uniquePlaces.push(place);
        seenLocations.add(locationKey);
      }
    }

    return uniquePlaces;
  }

  /**
   * Calculate name similarity using Levenshtein distance
   */
  private calculateNameSimilarity(name1: string, name2: string): number {
    const s1 = name1.toLowerCase().trim();
    const s2 = name2.toLowerCase().trim();
    
    if (s1 === s2) return 1;
    
    const maxLength = Math.max(s1.length, s2.length);
    if (maxLength === 0) return 1;
    
    return 1 - this.levenshteinDistance(s1, s2) / maxLength;
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(s1: string, s2: string): number {
    const matrix = [];
    
    for (let i = 0; i <= s2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= s1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= s2.length; i++) {
      for (let j = 1; j <= s1.length; j++) {
        if (s2.charAt(i - 1) === s1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[s2.length][s1.length];
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

  /**
   * Convert degrees to radians
   */
  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Apply filters to places
   */
  private applyFilters(places: UnifiedPlace[], params: AggregationParams): UnifiedPlace[] {
    let filtered = places;

    // Filter by categories
    if (params.categories && params.categories.length > 0) {
      filtered = filtered.filter(place => 
        params.categories!.some(cat => 
          place.category.includes(cat.toLowerCase()) ||
          place.tags.some(tag => tag.toLowerCase().includes(cat.toLowerCase()))
        )
      );
    }

    // Sort by rating (descending) and then by name
    filtered.sort((a, b) => {
      if (a.rating && b.rating) {
        return b.rating - a.rating;
      }
      if (a.rating && !b.rating) return -1;
      if (!a.rating && b.rating) return 1;
      return a.name.localeCompare(b.name);
    });

    return filtered;
  }
}

// Export singleton instance
export const dataAggregator = DataAggregator.getInstance();