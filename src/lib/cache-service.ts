import { Place } from '@/lib/types';

export interface CachedLocationData {
  latitude: number;
  longitude: number;
  places: Place[];
  timestamp: number;
  radiusUsed: number;
}

export interface CacheConfig {
  maxAge: number; // in milliseconds
  maxEntries: number;
  radiusTolerance: number; // in meters - how close locations need to be to be considered the same
}

class CacheService {
  private cache: Map<string, CachedLocationData> = new Map();
  private config: CacheConfig = {
    maxAge: 30 * 60 * 1000, // 30 minutes
    maxEntries: 20,
    radiusTolerance: 1000, // 1km radius tolerance
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
      if (now - data.timestamp > this.config.maxAge) {
        expiredKeys.push(key);
      }
    }

    expiredKeys.forEach(key => this.cache.delete(key));
  }

  private enforceSizeLimit(): void {
    if (this.cache.size > this.config.maxEntries) {
      // Remove oldest entries
      const entries = Array.from(this.cache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      const toRemove = entries.slice(0, this.cache.size - this.config.maxEntries);
      toRemove.forEach(([key]) => this.cache.delete(key));
    }
  }

  public get(latitude: number, longitude: number, radius: number = 5000): CachedLocationData | null {
    this.cleanExpiredEntries();

    // First try exact match
    const exactKey = this.generateCacheKey(latitude, longitude, radius);
    const exactMatch = this.cache.get(exactKey);
    if (exactMatch) {
      console.log('[Cache] ✅ Exact cache hit for', exactKey);
      return exactMatch;
    }

    // Try to find similar location with sufficient radius
    for (const [key, data] of this.cache.entries()) {
      if (this.isLocationSimilar(latitude, longitude, data.latitude, data.longitude) && 
          data.radiusUsed >= radius) {
        console.log('[Cache] ✅ Similar location cache hit:', key);
        return data;
      }
    }

    console.log('[Cache] ❌ Cache miss for', exactKey);
    return null;
  }

  public set(latitude: number, longitude: number, radius: number, places: Place[]): void {
    this.cleanExpiredEntries();
    this.enforceSizeLimit();

    const key = this.generateCacheKey(latitude, longitude, radius);
    const cacheData: CachedLocationData = {
      latitude,
      longitude,
      places,
      timestamp: Date.now(),
      radiusUsed: radius,
    };

    this.cache.set(key, cacheData);
    console.log('[Cache] ✅ Cached data for', key, `(${places.length} places)`);
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