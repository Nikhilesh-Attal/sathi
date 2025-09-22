import { getEmbedding } from './embedding';
import { fetchPlacesFromRapidAPI, type RapidAPIPlace } from '@/ai/tools/rapidapi-tool';
import { fetchPlacesFromGeoapify, type GeoapifyPlace } from '@/ai/tools/geoapify-tool';
import { fetchPlacesFromOpenTripMap } from '@/ai/tools/opentripmap-tool';
import { fetchFromOpenStreetMap, type OSMPlace } from '@/ai/tools/osm-tool';
import type { Place } from './types';
import type { UnifiedPlace, AggregationParams, AggregationResult } from './data-aggregator';

export interface CascadingConfig {
  minResultsThreshold: number; // Stop calling APIs when we have this many results
  maxResultsPerAPI: number;    // Limit results per API to avoid over-fetching
  timeoutPerAPI: number;       // Timeout for each API call in ms
  priorityOrder: string[];     // Order of APIs to try
}

export class CascadingDataAggregator {
  private static instance: CascadingDataAggregator;
  private config: CascadingConfig;
  
  private constructor(config?: Partial<CascadingConfig>) {
    this.config = {
      minResultsThreshold: 15,  // Stop when we have 15+ places
      maxResultsPerAPI: 25,     // Limit each API to 25 results
      timeoutPerAPI: 8000,      // 8 second timeout per API
      priorityOrder: ['rapidapi', 'geoapify', 'opentripmap', 'openstreetmap'],
      ...config,
    };
  }
  
  public static getInstance(config?: Partial<CascadingConfig>): CascadingDataAggregator {
    if (!CascadingDataAggregator.instance) {
      CascadingDataAggregator.instance = new CascadingDataAggregator(config);
    }
    return CascadingDataAggregator.instance;
  }

  /**
   * Smart cascading aggregation - calls APIs one by one until sufficient data is found
   */
  async aggregateWithCascading(params: AggregationParams): Promise<AggregationResult> {
    const startTime = Date.now();
    const sources: string[] = [];
    let allPlaces: UnifiedPlace[] = [];
    let totalFound = 0;
    let apisAttempted = 0;

    console.log('\n🎯 [CascadingAggregator] ======== STARTING SMART CASCADE ========');
    console.log(`📊 [CascadingAggregator] Target: ${this.config.minResultsThreshold} places minimum`);
    console.log(`🔄 [CascadingAggregator] Max per API: ${this.config.maxResultsPerAPI}`);
    console.log(`⏱️  [CascadingAggregator] Timeout per API: ${this.config.timeoutPerAPI}ms`);
    console.log(`📋 [CascadingAggregator] API priority: [${this.config.priorityOrder.join(' → ')}]`);

    try {
      // Try each API in priority order until we have enough results
      for (const apiName of this.config.priorityOrder) {
        apisAttempted++;
        
        console.log(`\n🔍 [CascadingAggregator] ======== API ${apisAttempted}: ${apiName.toUpperCase()} ========`);
        console.log(`📈 [CascadingAggregator] Current total: ${allPlaces.length} places`);
        console.log(`🎯 [CascadingAggregator] Need: ${Math.max(0, this.config.minResultsThreshold - allPlaces.length)} more`);

        if (allPlaces.length >= this.config.minResultsThreshold) {
          console.log(`✅ [CascadingAggregator] THRESHOLD REACHED! Stopping cascade early.`);
          console.log(`🚀 [CascadingAggregator] Saved API calls: ${this.config.priorityOrder.length - apisAttempted + 1} APIs skipped`);
          break;
        }

        const apiStartTime = Date.now();
        let apiResults: UnifiedPlace[] = [];

        try {
          // Call the appropriate API
          switch (apiName) {
            case 'rapidapi':
              if (params.location) {
                console.log(`📡 [CascadingAggregator] Calling RapidAPI for "${params.location}"...`);
                apiResults = await this.withTimeout(
                  this.fetchFromRapidAPI(params.location, params.radius || 5000),
                  this.config.timeoutPerAPI
                );
                sources.push('rapidapi');
              } else {
                console.log(`⏭️  [CascadingAggregator] Skipping RapidAPI (no location name provided)`);
                continue;
              }
              break;

            case 'geoapify':
              if (params.latitude && params.longitude) {
                console.log(`📡 [CascadingAggregator] Calling Geoapify for coordinates (${params.latitude}, ${params.longitude})...`);
                apiResults = await this.withTimeout(
                  this.fetchFromGeoapify(params.latitude, params.longitude, params.radius || 5000),
                  this.config.timeoutPerAPI
                );
                sources.push('geoapify');
              } else {
                console.log(`⏭️  [CascadingAggregator] Skipping Geoapify (no coordinates provided)`);
                continue;
              }
              break;

            case 'opentripmap':
              if (params.latitude && params.longitude) {
                console.log(`📡 [CascadingAggregator] Calling OpenTripMap for coordinates (${params.latitude}, ${params.longitude})...`);
                apiResults = await this.withTimeout(
                  this.fetchFromOpenTripMap(params.latitude, params.longitude, params.radius || 5000),
                  this.config.timeoutPerAPI
                );
                sources.push('opentripmap');
              } else {
                console.log(`⏭️  [CascadingAggregator] Skipping OpenTripMap (no coordinates provided)`);
                continue;
              }
              break;

            case 'openstreetmap':
              if (params.latitude && params.longitude) {
                console.log(`📡 [CascadingAggregator] Calling OpenStreetMap for coordinates (${params.latitude}, ${params.longitude})...`);
                apiResults = await this.withTimeout(
                  this.fetchFromOpenStreetMap(params.latitude, params.longitude, params.radius || 5000),
                  this.config.timeoutPerAPI
                );
                sources.push('openstreetmap');
              } else {
                console.log(`⏭️  [CascadingAggregator] Skipping OpenStreetMap (no coordinates provided)`);
                continue;
              }
              break;

            default:
              console.log(`⚠️  [CascadingAggregator] Unknown API: ${apiName}, skipping...`);
              continue;
          }

          const apiTime = Date.now() - apiStartTime;
          
          // Limit results from this API
          const limitedResults = apiResults.slice(0, this.config.maxResultsPerAPI);
          totalFound += apiResults.length;

          console.log(`📊 [CascadingAggregator] ${apiName} results:`)
          console.log(`   📈 Raw results: ${apiResults.length}`)
          console.log(`   ✂️  Limited to: ${limitedResults.length}`)
          console.log(`   ⏱️  API time: ${apiTime}ms`)

          if (limitedResults.length > 0) {
            // Add unique places only (basic deduplication against existing)
            const newPlaces = this.filterNewPlaces(limitedResults, allPlaces);
            allPlaces.push(...newPlaces);
            
            console.log(`   ➕ New unique places: ${newPlaces.length}`)
            console.log(`   📈 Running total: ${allPlaces.length}`)
          } else {
            console.log(`   ❌ No results from ${apiName}`)
          }

        } catch (error: any) {
          const apiTime = Date.now() - apiStartTime;
          console.error(`❌ [CascadingAggregator] ${apiName} failed after ${apiTime}ms:`, error.message);
          
          // Continue with next API instead of failing completely
          continue;
        }

        // Check if we should continue or stop
        if (allPlaces.length >= this.config.minResultsThreshold) {
          console.log(`\n🎉 [CascadingAggregator] SUCCESS! Target reached with ${allPlaces.length} places`);
          console.log(`⚡ [CascadingAggregator] Efficiency: Used ${apisAttempted}/${this.config.priorityOrder.length} APIs`);
          break;
        }
      }

      // Final processing
      const initialCount = allPlaces.length;
      console.log(`\n🔄 [CascadingAggregator] ======== FINAL PROCESSING ========`);
      console.log(`📊 [CascadingAggregator] Before deduplication: ${initialCount} places`);
      
      // Full deduplication pass
      const deduplicatedPlaces = this.removeDuplicates(allPlaces);
      const duplicatesRemoved = initialCount - deduplicatedPlaces.length;
      console.log(`🚮 [CascadingAggregator] Duplicates removed: ${duplicatesRemoved}`);
      console.log(`✅ [CascadingAggregator] After deduplication: ${deduplicatedPlaces.length} places`);

      // Apply filters and limits
      const filteredPlaces = this.applyFilters(deduplicatedPlaces, params);
      const limitedPlaces = params.limit ? filteredPlaces.slice(0, params.limit) : filteredPlaces;
      console.log(`🎯 [CascadingAggregator] After filtering & limits: ${limitedPlaces.length} places`);

      const processingTime = Date.now() - startTime;

      const result: AggregationResult = {
        places: limitedPlaces,
        sources,
        totalFound,
        duplicatesRemoved,
        processingTime
      };

      console.log(`\n🏁 [CascadingAggregator] ======== CASCADING COMPLETE ========`);
      console.log(`📊 [CascadingAggregator] Final summary:`);
      console.log(`   🎯 Target: ${this.config.minResultsThreshold} places`);
      console.log(`   ✅ Achieved: ${limitedPlaces.length} places`);
      console.log(`   🔍 APIs used: [${sources.join(', ')}] (${sources.length}/${this.config.priorityOrder.length})`);
      console.log(`   📈 Total found: ${totalFound} (before dedup/filtering)`);
      console.log(`   🚮 Duplicates: ${duplicatesRemoved}`);
      console.log(`   ⏱️  Total time: ${processingTime}ms`);
      console.log(`   💰 API efficiency: ${sources.length < this.config.priorityOrder.length ? 'OPTIMIZED' : 'ALL USED'}`)

      return result;

    } catch (error: any) {
      console.error(`💥 [CascadingAggregator] Critical aggregation error:`, error);
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
   * Add timeout to API calls
   */
  private async withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) => 
        setTimeout(() => reject(new Error(`Timeout after ${timeoutMs}ms`)), timeoutMs)
      )
    ]);
  }

  /**
   * Filter out places that are already in our collection (basic deduplication)
   */
  private filterNewPlaces(newPlaces: UnifiedPlace[], existingPlaces: UnifiedPlace[]): UnifiedPlace[] {
    if (existingPlaces.length === 0) return newPlaces;

    return newPlaces.filter(newPlace => {
      return !existingPlaces.some(existing => {
        // Check location-based similarity
        const distance = this.calculateDistance(
          newPlace.coordinates.latitude, newPlace.coordinates.longitude,
          existing.coordinates.latitude, existing.coordinates.longitude
        );
        
        // If very close (< 50m) and similar names, consider duplicate
        if (distance < 50 && this.calculateNameSimilarity(newPlace.name, existing.name) > 0.7) {
          return true;
        }

        return false;
      });
    });
  }

  // Reuse existing methods from original DataAggregator
  private async fetchFromRapidAPI(location: string, radius: number): Promise<UnifiedPlace[]> {
    try {
      const places = await fetchPlacesFromRapidAPI(location, radius / 1000);
      return Promise.all(places.map(place => this.normalizeRapidAPIPlace(place)));
    } catch (error) {
      console.error('[CascadingAggregator] RapidAPI error:', error);
      return [];
    }
  }

  private async fetchFromGeoapify(lat: number, lon: number, radius: number): Promise<UnifiedPlace[]> {
    try {
      const places = await fetchPlacesFromGeoapify(lat, lon, radius);
      return Promise.all(places.map(place => this.normalizeGeoapifyPlace(place)));
    } catch (error) {
      console.error('[CascadingAggregator] Geoapify error:', error);
      return [];
    }
  }

  private async fetchFromOpenTripMap(lat: number, lon: number, radius: number): Promise<UnifiedPlace[]> {
    try {
      const places = await fetchPlacesFromOpenTripMap({
        latitude: lat,
        longitude: lon,
        radius: radius / 1000,
      });
      return Promise.all(places.map(place => this.normalizeOpenTripMapPlace(place)));
    } catch (error) {
      console.error('[CascadingAggregator] OpenTripMap error:', error);
      return [];
    }
  }

  private async fetchFromOpenStreetMap(lat: number, lon: number, radius: number): Promise<UnifiedPlace[]> {
    try {
      const places = await fetchFromOpenStreetMap(lat, lon, radius);
      return Promise.all(places.map(place => this.normalizeOSMPlace(place)));
    } catch (error) {
      console.error('[CascadingAggregator] OpenStreetMap error:', error);
      return [];
    }
  }

  // Normalization methods (copied from original with minor adjustments)
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

  private async normalizeOSMPlace(place: OSMPlace): Promise<UnifiedPlace> {
    const text = `${place.name} ${place.category} ${place.address}`.trim();
    const embeddings = await getEmbedding(text);

    return {
      id: this.generateId(place.name, place.coordinates.latitude, place.coordinates.longitude, 'openstreetmap'),
      name: place.name,
      description: place.description || `${place.category} location`,
      category: this.normalizeCategory(place.category),
      address: place.address,
      coordinates: place.coordinates,
      rating: place.rating,
      source: 'openstreetmap',
      embeddings,
      lastUpdated: new Date().toISOString(),
      tags: [place.category, 'openstreetmap'],
    };
  }

  // Utility methods (copied from original)
  private generateId(name: string, lat?: number, lon?: number, source?: string): string {
    const nameSlug = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
    const coords = lat && lon ? `${lat.toFixed(4)}-${lon.toFixed(4)}` : 'unknown';
    const sourcePrefix = source || 'unknown';
    return `${sourcePrefix}-${nameSlug}-${coords}`;
  }

  private normalizeCategory(category: string): string {
    const categoryMap: { [key: string]: string } = {
      'tourism.sights': 'attraction', 'tourism': 'attraction', 'tourist_attraction': 'attraction',
      'sights': 'attraction', 'attraction': 'attraction',
      'catering.restaurant': 'restaurant', 'restaurant': 'restaurant', 'food': 'restaurant', 'catering': 'restaurant',
      'accommodation.hotel': 'hotel', 'accommodation': 'hotel', 'hotel': 'hotel', 'lodging': 'hotel',
      'commercial.shopping_mall': 'shopping', 'shopping': 'shopping', 'retail': 'shopping',
      'entertainment': 'entertainment', 'leisure': 'entertainment',
      'natural': 'nature', 'park': 'nature',
      'place': 'attraction', 'misc': 'attraction',
    };

    return categoryMap[category.toLowerCase()] || category.toLowerCase();
  }

  private removeDuplicates(places: UnifiedPlace[]): UnifiedPlace[] {
    const uniquePlaces: UnifiedPlace[] = [];
    const seenLocations = new Set<string>();

    for (const place of places) {
      const locationKey = `${place.coordinates.latitude.toFixed(4)}-${place.coordinates.longitude.toFixed(4)}`;
      const isDuplicateLocation = seenLocations.has(locationKey);
      const isDuplicateName = uniquePlaces.some(existing => 
        this.calculateNameSimilarity(place.name, existing.name) > 0.8 &&
        this.calculateDistance(
          place.coordinates.latitude, place.coordinates.longitude,
          existing.coordinates.latitude, existing.coordinates.longitude
        ) < 100
      );

      if (!isDuplicateLocation && !isDuplicateName) {
        uniquePlaces.push(place);
        seenLocations.add(locationKey);
      }
    }

    return uniquePlaces;
  }

  private calculateNameSimilarity(name1: string, name2: string): number {
    const s1 = name1.toLowerCase().trim();
    const s2 = name2.toLowerCase().trim();
    
    if (s1 === s2) return 1;
    const maxLength = Math.max(s1.length, s2.length);
    if (maxLength === 0) return 1;
    return 1 - this.levenshteinDistance(s1, s2) / maxLength;
  }

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

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000;
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

  private applyFilters(places: UnifiedPlace[], params: AggregationParams): UnifiedPlace[] {
    let filtered = places;

    if (params.categories && params.categories.length > 0) {
      filtered = filtered.filter(place => 
        params.categories!.some(cat => 
          place.category.includes(cat.toLowerCase()) ||
          place.tags.some(tag => tag.toLowerCase().includes(cat.toLowerCase()))
        )
      );
    }

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
export const cascadingDataAggregator = CascadingDataAggregator.getInstance();