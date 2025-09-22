import { Place } from '@/lib/types';
import { trackCacheHit, performanceAnalytics } from './performance-analytics';

export interface CachedLocationData {
  latitude: number;
  longitude: number;
  places: Place[];
  timestamp: number;
  radiusUsed: number;
  dataType: 'places' | 'hotels' | 'restaurants' | 'mixed';
  source: string;
}

export interface CacheConfig {
  maxAge: number; // in milliseconds
  maxEntries: number;
  radiusTolerance: number; // in meters - how close locations need to be to be considered the same
  variableTTL: {
    places: number;
    hotels: number;
    restaurants: number;
    aiResponses: number;
  };
}

class CacheService {
  private cache: Map<string, CachedLocationData> = new Map();
  private config: CacheConfig = {
    maxAge: 30 * 60 * 1000, // 30 minutes (fallback)
    maxEntries: 50, // Increased for better performance
    radiusTolerance: 1000, // 1km radius tolerance
    variableTTL: {
      places: 2 * 60 * 60 * 1000,     // 2 hours
      hotels: 4 * 60 * 60 * 1000,     // 4 hours
      restaurants: 1 * 60 * 60 * 1000, // 1 hour
      aiResponses: 24 * 60 * 60 * 1000 // 24 hours
    }
  };

  private generateCacheKey(latitude: number, longitude: number, radius: number): string {
    // Round coordinates to reduce cache fragmentation
    const roundedLat = Math.round(latitude * 1000) / 1000;
    const roundedLon = Math.round(longitude * 1000) / 1000;
    const roundedRadius = Math.round(radius / 1000) * 1000; // Round to nearest km
    return `${roundedLat},${roundedLon},${roundedRadius}`;
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; // Distance in meters
  }

  private isLocationSimilar(lat1: number, lon1: number, lat2: number, lon2: number): boolean {
    const distance = this.calculateDistance(lat1, lon1, lat2, lon2);
    return distance <= this.config.radiusTolerance;
  }

  private cleanExpiredEntries(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, data] of this.cache.entries()) {
      const ttl = this.getTTLForDataType(data.dataType || 'places');
      if (now - data.timestamp > ttl) {
        expiredKeys.push(key);
      }
    }

    if (expiredKeys.length > 0) {
      console.log(`[Cache] 🗑️ Cleaning ${expiredKeys.length} expired entries`);
      expiredKeys.forEach(key => this.cache.delete(key));
    }
  }

  private getTTLForDataType(dataType: 'places' | 'hotels' | 'restaurants' | 'mixed'): number {
    switch (dataType) {
      case 'hotels':
        return this.config.variableTTL.hotels;
      case 'restaurants':
        return this.config.variableTTL.restaurants;
      case 'places':
        return this.config.variableTTL.places;
      case 'mixed':
      default:
        return this.config.variableTTL.places; // Default to places TTL
    }
  }

  private enforceSizeLimit(): void {
    if (this.cache.size > this.config.maxEntries) {
      // Remove oldest entries
      const entries = Array.from(this.cache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      const toRemove = entries.slice(0, this.cache.size - this.config.maxEntries);
      toRemove.forEach(([key]) => {
        this.cache.delete(key);
        performanceAnalytics.recordCacheEviction();
      });
      
      // Update cache size metrics
      performanceAnalytics.updateCacheSize(this.cache.size);
    }
  }

  public get(latitude: number, longitude: number, radius: number = 5000): CachedLocationData | null {
    const startTime = Date.now();
    this.cleanExpiredEntries();

    // First try exact match
    const exactKey = this.generateCacheKey(latitude, longitude, radius);
    const exactMatch = this.cache.get(exactKey);
    if (exactMatch) {
      const retrievalTime = Date.now() - startTime;
      console.log('[Cache] ✅ Exact cache hit for', exactKey);
      trackCacheHit(true, retrievalTime);
      return exactMatch;
    }

    // Try to find similar location with sufficient radius
    for (const [key, data] of this.cache.entries()) {
      if (this.isLocationSimilar(latitude, longitude, data.latitude, data.longitude) && 
          data.radiusUsed >= radius) {
        const retrievalTime = Date.now() - startTime;
        console.log('[Cache] ✅ Similar location cache hit:', key);
        trackCacheHit(true, retrievalTime);
        return data;
      }
    }

    const retrievalTime = Date.now() - startTime;
    console.log('[Cache] ❌ Cache miss for', exactKey);
    trackCacheHit(false, retrievalTime);
    return null;
  }

  public set(
    latitude: number, 
    longitude: number, 
    radius: number, 
    places: Place[], 
    dataType: 'places' | 'hotels' | 'restaurants' | 'mixed' = 'mixed',
    source: string = 'unknown'
  ): void {
    this.cleanExpiredEntries();
    this.enforceSizeLimit();

    const key = this.generateCacheKey(latitude, longitude, radius);
    const ttl = this.getTTLForDataType(dataType);
    const cacheData: CachedLocationData = {
      latitude,
      longitude,
      places,
      timestamp: Date.now(),
      radiusUsed: radius,
      dataType,
      source
    };

    this.cache.set(key, cacheData);
    console.log(`[Cache] ✅ Cached ${dataType} data for ${key} (${places.length} places, TTL: ${ttl/1000/60}min, Source: ${source})`);
    
    // Update cache size metrics
    performanceAnalytics.updateCacheSize(this.cache.size);
  }

  public clear(): void {
    this.cache.clear();
    console.log('[Cache] 🗑️ Cache cleared');
  }

  public getStats(): { size: number; keys: string[] } {
    this.cleanExpiredEntries();
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }

  // Store user session data
  private sessionData: Map<string, any> = new Map();

  public setSessionData(key: string, data: any): void {
    this.sessionData.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  public getSessionData(key: string, maxAge: number = 24 * 60 * 60 * 1000): any | null {
    const stored = this.sessionData.get(key);
    if (!stored) return null;

    const now = Date.now();
    if (now - stored.timestamp > maxAge) {
      this.sessionData.delete(key);
      return null;
    }

    return stored.data;
  }

  public clearSessionData(): void {
    this.sessionData.clear();
  }
}

// Export singleton instance
export const cacheService = new CacheService();