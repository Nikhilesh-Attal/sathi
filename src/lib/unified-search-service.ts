import { qdrantStorage, type SearchParams, type SearchResult } from './qdrant-storage';
import { dataIngestionPipeline, type IngestionResult } from './data-ingestion-pipeline';
import { getEmbedding } from './embedding';
import type { UnifiedPlace } from './data-aggregator';
import type { ExploreOutput } from './schemas';
import type { Place } from './types';

export interface UnifiedSearchParams {
  query?: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  radius?: number; // in meters
  categories?: ('attraction' | 'restaurant' | 'hotel' | 'shopping' | 'entertainment' | 'nature')[];
  sources?: ('rapidapi' | 'geoapify' | 'opentripmap' | 'openstreetmap')[];
  limit?: number;
  minRating?: number;
  priceRange?: 'budget' | 'mid-range' | 'luxury';
  sortBy?: 'relevance' | 'rating' | 'distance' | 'name';
  fallbackToAPI?: boolean; // Whether to fetch from APIs if no results found
}

export interface UnifiedSearchResult extends SearchResult {
  fromCache: boolean;
  fallbackUsed: boolean;
  suggestion?: string;
}

export interface SearchAnalytics {
  totalSearches: number;
  cacheHitRate: number;
  averageResultCount: number;
  popularQueries: Array<{ query: string; count: number }>;
  slowQueries: Array<{ query: string; time: number }>;
}

export class UnifiedSearchService {
  private static instance: UnifiedSearchService;
  private searchCache: Map<string, { result: UnifiedSearchResult; timestamp: number }> = new Map();
  private analytics: SearchAnalytics = {
    totalSearches: 0,
    cacheHitRate: 0,
    averageResultCount: 0,
    popularQueries: [],
    slowQueries: [],
  };
  private cacheTimeout = 30 * 60 * 1000; // 30 minutes

  private constructor() {}

  public static getInstance(): UnifiedSearchService {
    if (!UnifiedSearchService.instance) {
      UnifiedSearchService.instance = new UnifiedSearchService();
    }
    return UnifiedSearchService.instance;
  }

  /**
   * Main search function that queries the unified database
   */
  async search(params: UnifiedSearchParams): Promise<UnifiedSearchResult> {
    const startTime = Date.now();
    const cacheKey = this.generateCacheKey(params);
    
    console.log('[UnifiedSearchService] Starting search with params:', params);
    this.analytics.totalSearches++;

    // Check cache first
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      console.log('[UnifiedSearchService] ✅ Returning cached result');
      this.analytics.cacheHitRate = (this.analytics.cacheHitRate + 1) / this.analytics.totalSearches;
      return cached;
    }

    try {
      // Convert to Qdrant search params
      const searchParams = await this.convertToQdrantParams(params);
      
      // Search the unified database
      let result = await qdrantStorage.searchPlaces(searchParams);
      
      let fallbackUsed = false;
      
      // If no results and fallback is enabled, try API aggregation
      if (result.places.length === 0 && params.fallbackToAPI !== false) {
        console.log('[UnifiedSearchService] No results found, attempting API fallback');
        
        const fallbackResult = await this.fallbackToAPIs(params);
        if (fallbackResult) {
          result = fallbackResult;
          fallbackUsed = true;
        }
      }

      // Filter and sort results
      const filteredPlaces = this.filterAndSortResults(result.places, params);
      
      const searchTime = Date.now() - startTime;
      
      const unifiedResult: UnifiedSearchResult = {
        places: filteredPlaces,
        totalFound: result.totalFound,
        searchTime,
        sources: result.sources,
        fromCache: false,
        fallbackUsed,
        suggestion: this.generateSuggestion(params, filteredPlaces.length),
      };

      // Cache the result
      this.cacheResult(cacheKey, unifiedResult);
      
      // Update analytics
      this.updateAnalytics(params, unifiedResult, searchTime);

      console.log(`[UnifiedSearchService] ✅ Search completed: ${filteredPlaces.length} results in ${searchTime}ms`);
      
      return unifiedResult;

    } catch (error) {
      console.error('[UnifiedSearchService] ❌ Search failed:', error);
      
      const searchTime = Date.now() - startTime;
      return {
        places: [],
        totalFound: 0,
        searchTime,
        sources: [],
        fromCache: false,
        fallbackUsed: false,
      };
    }
  }

  /**
   * Search for places (attractions)
   */
  async searchPlaces(
    query: string,
    latitude?: number,
    longitude?: number,
    radius?: number,
    limit?: number
  ): Promise<Place[]> {
    const result = await this.search({
      query,
      latitude,
      longitude,
      radius,
      categories: ['attraction'],
      limit: limit || 20,
    });

    return this.convertToPlaceFormat(result.places);
  }

  /**
   * Search for hotels
   */
  async searchHotels(
    location: string,
    latitude?: number,
    longitude?: number,
    radius?: number,
    limit?: number
  ): Promise<Place[]> {
    const result = await this.search({
      query: location,
      latitude,
      longitude,
      radius,
      categories: ['hotel'],
      limit: limit || 20,
    });

    return this.convertToPlaceFormat(result.places);
  }

  /**
   * Search for restaurants
   */
  async searchRestaurants(
    location: string,
    latitude?: number,
    longitude?: number,
    radius?: number,
    limit?: number
  ): Promise<Place[]> {
    const result = await this.search({
      query: location,
      latitude,
      longitude,
      radius,
      categories: ['restaurant'],
      limit: limit || 20,
    });

    return this.convertToPlaceFormat(result.places);
  }

  /**
   * Comprehensive search that returns places, hotels, and restaurants
   */
  async exploreLocation(
    location: string,
    latitude?: number,
    longitude?: number,
    radius?: number
  ): Promise<ExploreOutput> {
    console.log(`[UnifiedSearchService] Exploring location: ${location}`);

    const searchPromises = [
      this.searchPlaces(location, latitude, longitude, radius, 20),
      this.searchHotels(location, latitude, longitude, radius, 20),
      this.searchRestaurants(location, latitude, longitude, radius, 20),
    ];

    const [places, hotels, restaurants] = await Promise.all(searchPromises);

    return {
      places,
      hotels,
      restaurants,
    };
  }

  /**
   * Text-based semantic search using embeddings
   */
  async semanticSearch(
    query: string,
    limit: number = 20,
    categories?: string[]
  ): Promise<UnifiedPlace[]> {
    console.log(`[UnifiedSearchService] Semantic search: "${query}"`);
    
    const embedding = await getEmbedding(query);
    
    const result = await qdrantStorage.searchPlaces({
      vector: embedding,
      categories,
      limit,
      minScore: 0.75, // Higher threshold for semantic search
    });

    return result.places;
  }

  /**
   * Get recommendations based on a place
   */
  async getRecommendations(
    placeId: string,
    limit: number = 10
  ): Promise<UnifiedPlace[]> {
    // Get the place to use its embedding for similarity search
    const place = await qdrantStorage.getPlaceById(placeId);
    if (!place || !place.embeddings.length) {
      return [];
    }

    const result = await qdrantStorage.searchPlaces({
      vector: place.embeddings,
      latitude: place.coordinates.latitude,
      longitude: place.coordinates.longitude,
      radiusMeters: 50000, // 50km radius
      categories: [place.category],
      limit: limit + 1, // +1 to exclude the original place
      minScore: 0.7,
    });

    // Filter out the original place
    return result.places.filter(p => p.id !== placeId);
  }

  /**
   * Get trending places (most searched/highest rated)
   */
  async getTrendingPlaces(
    category?: string,
    location?: { latitude: number; longitude: number; radius: number },
    limit: number = 20
  ): Promise<UnifiedPlace[]> {
    const searchParams: SearchParams = {
      categories: category ? [category] : undefined,
      latitude: location?.latitude,
      longitude: location?.longitude,
      radiusMeters: location?.radius,
      limit: limit * 2, // Get more to filter by rating
    };

    const result = await qdrantStorage.searchPlaces(searchParams);
    
    // Sort by rating and return top results
    return result.places
      .filter(place => place.rating && place.rating >= 4.0)
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
      .slice(0, limit);
  }

  /**
   * Convert UnifiedSearchParams to QdrantSearchParams
   */
  private async convertToQdrantParams(params: UnifiedSearchParams): Promise<SearchParams> {
    const searchParams: SearchParams = {
      latitude: params.latitude,
      longitude: params.longitude,
      radiusMeters: params.radius,
      categories: params.categories,
      sources: params.sources,
      limit: params.limit || 20,
    };

    // Generate embedding if query is provided
    if (params.query) {
      searchParams.vector = await getEmbedding(params.query);
    }

    return searchParams;
  }

  /**
   * Fallback to API aggregation when no results found
   */
  private async fallbackToAPIs(params: UnifiedSearchParams): Promise<SearchResult | null> {
    if (!params.location && (!params.latitude || !params.longitude)) {
      return null;
    }

    try {
      const ingestionResult = await dataIngestionPipeline.ingestForLocation({
        location: params.location,
        latitude: params.latitude,
        longitude: params.longitude,
        radius: params.radius || 10000,
        categories: params.categories,
      });

      if (ingestionResult.success && ingestionResult.aggregationResult.places.length > 0) {
        // Search again after ingestion
        const searchParams = await this.convertToQdrantParams(params);
        return await qdrantStorage.searchPlaces(searchParams);
      }
    } catch (error) {
      console.error('[UnifiedSearchService] API fallback failed:', error);
    }

    return null;
  }

  /**
   * Filter and sort search results
   */
  private filterAndSortResults(places: UnifiedPlace[], params: UnifiedSearchParams): UnifiedPlace[] {
    let filtered = places;

    // Filter by minimum rating
    if (params.minRating) {
      filtered = filtered.filter(place => 
        place.rating && place.rating >= params.minRating!
      );
    }

    // Sort results
    switch (params.sortBy) {
      case 'rating':
        filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      case 'name':
        filtered.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'distance':
        if (params.latitude && params.longitude) {
          filtered.sort((a, b) => {
            const distA = this.calculateDistance(
              params.latitude!, params.longitude!,
              a.coordinates.latitude, a.coordinates.longitude
            );
            const distB = this.calculateDistance(
              params.latitude!, params.longitude!,
              b.coordinates.latitude, b.coordinates.longitude
            );
            return distA - distB;
          });
        }
        break;
      case 'relevance':
      default:
        // Keep the original order (by relevance/score)
        break;
    }

    return filtered;
  }

  /**
   * Convert UnifiedPlace to Place format
   */
  private convertToPlaceFormat(places: UnifiedPlace[]): Place[] {
    return places.map(place => ({
      place_id: place.id,
      name: place.name,
      description: place.description,
      vicinity: place.address,
      rating: place.rating,
      photoUrl: place.image || 'https://placehold.co/600x400.png',
      photoHint: place.category,
      types: place.tags,
      point: {
        lat: place.coordinates.latitude,
        lon: place.coordinates.longitude,
      },
      itemType: this.mapCategoryToItemType(place.category),
      address: place.address,
      imageUrl: place.image,
      createdAt: new Date(place.lastUpdated).getTime(),
    }));
  }

  /**
   * Map category to itemType
   */
  private mapCategoryToItemType(category: string): 'place' | 'hotel' | 'restaurant' | 'user' {
    switch (category.toLowerCase()) {
      case 'hotel':
      case 'accommodation':
        return 'hotel';
      case 'restaurant':
      case 'food':
        return 'restaurant';
      default:
        return 'place';
    }
  }

  /**
   * Generate cache key
   */
  private generateCacheKey(params: UnifiedSearchParams): string {
    return btoa(JSON.stringify(params)).replace(/[^a-zA-Z0-9]/g, '');
  }

  /**
   * Get result from cache
   */
  private getFromCache(key: string): UnifiedSearchResult | null {
    const cached = this.searchCache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      cached.result.fromCache = true;
      return cached.result;
    }
    
    if (cached) {
      this.searchCache.delete(key); // Remove expired cache
    }
    
    return null;
  }

  /**
   * Cache search result
   */
  private cacheResult(key: string, result: UnifiedSearchResult): void {
    this.searchCache.set(key, {
      result: { ...result },
      timestamp: Date.now(),
    });

    // Limit cache size
    if (this.searchCache.size > 1000) {
      const oldestKey = this.searchCache.keys().next().value;
      this.searchCache.delete(oldestKey);
    }
  }

  /**
   * Calculate distance between two coordinates
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
    return degrees * (Math.PI / 180);
  }

  /**
   * Generate search suggestion
   */
  private generateSuggestion(params: UnifiedSearchParams, resultCount: number): string | undefined {
    if (resultCount === 0) {
      if (params.categories && params.categories.length > 0) {
        return `Try searching without category filters or expand your search radius`;
      }
      if (params.radius && params.radius < 10000) {
        return `Try expanding your search radius to find more results`;
      }
      return `Try a broader search term or check the spelling`;
    }
    
    if (resultCount < 5 && params.radius && params.radius < 20000) {
      return `Expand search radius to ${params.radius * 2}m for more results`;
    }

    return undefined;
  }

  /**
   * Update analytics
   */
  private updateAnalytics(
    params: UnifiedSearchParams, 
    result: UnifiedSearchResult,
    searchTime: number
  ): void {
    // Update average result count
    this.analytics.averageResultCount = 
      (this.analytics.averageResultCount + result.places.length) / 2;

    // Track popular queries
    if (params.query) {
      const existing = this.analytics.popularQueries.find(q => q.query === params.query);
      if (existing) {
        existing.count++;
      } else {
        this.analytics.popularQueries.push({ query: params.query, count: 1 });
      }
      
      // Keep only top 50
      this.analytics.popularQueries = this.analytics.popularQueries
        .sort((a, b) => b.count - a.count)
        .slice(0, 50);
    }

    // Track slow queries
    if (searchTime > 5000) { // 5 seconds
      this.analytics.slowQueries.push({
        query: params.query || 'location-based',
        time: searchTime,
      });
      
      // Keep only last 20 slow queries
      this.analytics.slowQueries = this.analytics.slowQueries.slice(-20);
    }
  }

  /**
   * Get search analytics
   */
  getAnalytics(): SearchAnalytics {
    return { ...this.analytics };
  }

  /**
   * Clear search cache
   */
  clearCache(): void {
    this.searchCache.clear();
    console.log('[UnifiedSearchService] Cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    size: number;
    hitRate: number;
    oldestEntry: string | null;
  } {
    let oldestTimestamp = Date.now();
    let oldestKey = null;

    for (const [key, value] of this.searchCache.entries()) {
      if (value.timestamp < oldestTimestamp) {
        oldestTimestamp = value.timestamp;
        oldestKey = key;
      }
    }

    return {
      size: this.searchCache.size,
      hitRate: this.analytics.cacheHitRate,
      oldestEntry: oldestKey ? new Date(oldestTimestamp).toISOString() : null,
    };
  }
}

// Export singleton instance
export const unifiedSearchService = UnifiedSearchService.getInstance();

// Export convenient search functions
export const searchPlacesUnified = (
  query: string,
  latitude?: number,
  longitude?: number,
  radiusMeters?: number,
  categories?: string[],
  limit?: number
) => unifiedSearchService.search({
  query,
  latitude,
  longitude,
  radius: radiusMeters,
  categories: categories as any,
  limit,
});

export const exploreLocationUnified = (
  location: string,
  latitude?: number,
  longitude?: number,
  radius?: number
) => unifiedSearchService.exploreLocation(location, latitude, longitude, radius);