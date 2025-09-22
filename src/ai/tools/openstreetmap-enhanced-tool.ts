/**
 * Enhanced OpenStreetMap tool with comprehensive place categories
 * Uses Overpass API for powerful place discovery
 */

import axios from "axios";
import type { Place } from '@/lib/types';
import { getAllCategories, getHighPriorityCategories, getCategoryById } from '../../lib/place-categories';

export interface OpenStreetMapPlace {
  name: string;
  category: string;
  address: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  distance?: number;
  osm_id?: string;
  osm_type?: string;
  source: string;
  itemType?: 'place' | 'hotel' | 'restaurant';
  subcategory?: string;
  types?: string[];
}

/**
 * OpenStreetMap/OSM tags mapping for comprehensive place discovery
 */
export function getOSMTagsMapping(): { [key: string]: Array<{ [key: string]: string | string[] }> } {
  return {
    // Religious places
    'hindu-temple': [
      { amenity: 'place_of_worship', religion: 'hindu' },
      { building: 'temple' },
      { historic: 'temple' }
    ],
    'mosque': [
      { amenity: 'place_of_worship', religion: 'muslim' },
      { building: 'mosque' }
    ],
    'church': [
      { amenity: 'place_of_worship', religion: 'christian' },
      { building: ['church', 'cathedral', 'chapel'] }
    ],
    'gurudwara': [
      { amenity: 'place_of_worship', religion: 'sikh' },
      { building: 'gurudwara' }
    ],
    'buddhist-site': [
      { amenity: 'place_of_worship', religion: 'buddhist' },
      { amenity: 'monastery' },
      { historic: 'monastery' }
    ],
    
    // Historical places
    'fort': [
      { historic: ['castle', 'fort', 'fortress'] },
      { fortification_type: ['fort', 'castle'] }
    ],
    'palace': [
      { historic: 'palace' },
      { building: 'palace' }
    ],
    'monument': [
      { historic: ['monument', 'memorial'] },
      { tourism: 'attraction', historic: 'yes' }
    ],
    'archaeological-site': [
      { historic: 'archaeological_site' },
      { historic: 'ruins' }
    ],
    'heritage-building': [
      { historic: 'building' },
      { heritage: ['yes', '1', '2', '3'] }
    ],
    
    // Nature & outdoor
    'hill-station': [
      { natural: ['peak', 'hill'] },
      { tourism: 'viewpoint' },
      { place: ['village', 'town'], tourism: 'yes' }
    ],
    'waterfall': [
      { natural: 'waterfall' }
    ],
    'lake': [
      { natural: 'water', water: ['lake', 'reservoir'] }
    ],
    'national-park': [
      { leisure: 'nature_reserve' },
      { boundary: ['national_park', 'protected_area'] }
    ],
    'garden': [
      { leisure: ['park', 'garden'] },
      { garden: ['botanical', 'rose'] }
    ],
    'beach': [
      { natural: ['beach', 'coastline'] }
    ],
    
    // Cultural
    'museum': [
      { tourism: 'museum' },
      { amenity: 'arts_centre' }
    ],
    'cultural-center': [
      { amenity: ['theatre', 'arts_centre', 'community_centre'] }
    ],
    'library': [
      { amenity: 'library' }
    ],
    
    // Commercial
    'market': [
      { amenity: ['marketplace', 'market'] },
      { shop: 'mall' }
    ],
    'handicraft-center': [
      { craft: ['pottery', 'textile'] },
      { shop: 'craft' }
    ],
    
    // Entertainment
    'amusement-park': [
      { tourism: 'theme_park' },
      { leisure: 'water_park' }
    ],
    'zoo': [
      { tourism: 'zoo' },
      { amenity: 'zoo' }
    ],
    
    // Transportation
    'railway-heritage': [
      { railway: ['station', 'heritage'] },
      { tourism: 'attraction', railway: 'yes' }
    ]
  };
}

class OpenStreetMapTool {
  private overpassUrl = 'https://overpass-api.de/api/interpreter';
  private nominatimUrl = 'https://nominatim.openstreetmap.org';
  private userAgent = 'SATHI-Travel-App/1.0';
  private rateLimitDelay = 1000; // 1 second between requests
  private lastRequestTime = 0;

  /**
   * Rate limiting to respect OSM usage policy
   */
  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.rateLimitDelay) {
      const delay = this.rateLimitDelay - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    this.lastRequestTime = Date.now();
  }

  /**
   * Get headers for OSM requests
   */
  private getHeaders() {
    return {
      'User-Agent': this.userAgent,
      'Accept': 'application/json',
      'Accept-Language': 'en',
      'Content-Type': 'application/x-www-form-urlencoded'
    };
  }

  /**
   * Build Overpass query for specific category
   */
  private buildOverpassQuery(
    latitude: number,
    longitude: number,
    radius: number,
    categoryId: string
  ): string {
    const tagsMapping = getOSMTagsMapping();
    const tags = tagsMapping[categoryId];
    
    if (!tags || tags.length === 0) {
      return '';
    }

    const bbox = this.calculateBoundingBox(latitude, longitude, radius);
    let queryParts: string[] = [];

    for (const tagSet of tags) {
      const conditions: string[] = [];
      
      for (const [key, values] of Object.entries(tagSet)) {
        if (Array.isArray(values)) {
          const valueConditions = values.map(v => `["${key}"="${v}"]`).join('');
          conditions.push(`(${values.map(v => `["${key}"="${v}"]`).join('')})`);
        } else {
          conditions.push(`["${key}"="${values}"]`);
        }
      }
      
      if (conditions.length > 0) {
        queryParts.push(`(
          node${conditions.join('')}(${bbox});
          way${conditions.join('')}(${bbox});
          relation${conditions.join('')}(${bbox});
        )`);
      }
    }

    if (queryParts.length === 0) {
      return '';
    }

    return `
      [out:json][timeout:25];
      (
        ${queryParts.join('')}
      );
      out center meta;
    `;
  }

  /**
   * Calculate bounding box from center point and radius
   */
  private calculateBoundingBox(lat: number, lon: number, radiusMeters: number): string {
    const radiusDegrees = radiusMeters / 111320; // Convert meters to degrees (approximate)
    
    const south = lat - radiusDegrees;
    const west = lon - radiusDegrees;
    const north = lat + radiusDegrees;
    const east = lon + radiusDegrees;
    
    return `${south},${west},${north},${east}`;
  }

  /**
   * Convert OSM element to Place format
   */
  private convertToPlace(element: any, categoryId: string): Place | null {
    try {
      const lat = element.lat || element.center?.lat;
      const lon = element.lon || element.center?.lon;
      
      if (!lat || !lon) return null;
      
      const name = element.tags?.name || element.tags?.['name:en'] || 'Unnamed Place';
      const category = getCategoryById(categoryId);
      
      return {
        place_id: `osm-${element.type}-${element.id}`,
        name,
        vicinity: this.buildAddress(element.tags),
        rating: undefined,
        types: [categoryId, ...(element.tags?.tourism ? [element.tags.tourism] : [])],
        point: { lat, lon },
        photoUrl: 'https://placehold.co/600x400.png',
        photoHint: category?.name || categoryId,
        description: this.buildDescription(element.tags, name, category?.name || categoryId),
        formatted_address: this.buildAddress(element.tags)
      };
    } catch (error) {
      console.warn('[OpenStreetMap] Error converting element:', error);
      return null;
    }
  }

  /**
   * Build address from OSM tags
   */
  private buildAddress(tags: any): string {
    if (!tags) return 'Address not available';
    
    const addressParts: string[] = [];
    
    if (tags.addr_housenumber && tags.addr_street) {
      addressParts.push(`${tags.addr_housenumber} ${tags.addr_street}`);
    } else if (tags.addr_street) {
      addressParts.push(tags.addr_street);
    }
    
    if (tags.addr_city) addressParts.push(tags.addr_city);
    if (tags.addr_state) addressParts.push(tags.addr_state);
    if (tags.addr_country) addressParts.push(tags.addr_country);
    
    return addressParts.length > 0 ? addressParts.join(', ') : 'Address not available';
  }

  /**
   * Build description from OSM tags
   */
  private buildDescription(tags: any, name: string, categoryName: string): string {
    if (tags?.description) return tags.description;
    if (tags?.wikipedia) return `${name} is a notable ${categoryName.toLowerCase()}. More info: ${tags.wikipedia}`;
    
    return `${name} is a ${categoryName.toLowerCase()} in this area.`;
  }

  /**
   * Search for places by category using Overpass API
   */
  async searchByCategory(
    latitude: number,
    longitude: number,
    categoryId: string,
    radius: number = 5000
  ): Promise<Place[]> {
    try {
      await this.enforceRateLimit();
      
      const query = this.buildOverpassQuery(latitude, longitude, radius, categoryId);
      
      if (!query) {
        console.log(`[OpenStreetMap] No query built for category: ${categoryId}`);
        return [];
      }

      console.log(`[OpenStreetMap] Searching for ${categoryId} within ${radius}m`);
      
      const response = await axios.post(
        this.overpassUrl,
        query,
        {
          headers: this.getHeaders(),
          timeout: 30000
        }
      );

      if (!response.data?.elements) {
        console.log(`[OpenStreetMap] No elements found for ${categoryId}`);
        return [];
      }

      const places: Place[] = [];
      for (const element of response.data.elements) {
        const place = this.convertToPlace(element, categoryId);
        if (place) {
          places.push(place);
        }
      }

      console.log(`[OpenStreetMap] ✅ Found ${places.length} places for ${categoryId}`);
      return places.slice(0, 20); // Limit results

    } catch (error: any) {
      console.error(`[OpenStreetMap] Error searching for ${categoryId}:`, error.message);
      return [];
    }
  }

  /**
   * Comprehensive places search - fetches multiple high-priority categories
   */
  async fetchDiversePlaces(
    latitude: number,
    longitude: number,
    radius: number = 5000,
    maxPerCategory: number = 3
  ): Promise<Place[]> {
    console.log(`[OpenStreetMap] 🌟 Starting comprehensive place discovery`);
    
    const highPriorityCategories = getHighPriorityCategories();
    console.log(`[OpenStreetMap] Searching ${highPriorityCategories.length} high-priority categories`);
    
    const allResults: Place[] = [];
    
    for (const category of highPriorityCategories) {
      try {
        console.log(`[OpenStreetMap] 🔍 Searching for ${category.name} (${category.id})`);
        const places = await this.searchByCategory(latitude, longitude, category.id, radius);
        
        // Limit results per category
        const limitedPlaces = places.slice(0, maxPerCategory);
        allResults.push(...limitedPlaces);
        
        console.log(`[OpenStreetMap] ✅ Found ${places.length} ${category.name}s, added ${limitedPlaces.length}`);
        
        // Delay between requests to be respectful
        await new Promise(resolve => setTimeout(resolve, 1500));
        
      } catch (error) {
        console.warn(`[OpenStreetMap] ⚠️ Failed to search ${category.name}:`, error);
      }
    }
    
    console.log(`[OpenStreetMap] 🎉 Comprehensive search completed: ${allResults.length} total places`);
    return allResults;
  }

  /**
   * Search for religious places
   */
  async fetchReligiousPlaces(
    latitude: number,
    longitude: number,
    radius: number = 5000
  ): Promise<Place[]> {
    const religiousCategories = ['hindu-temple', 'mosque', 'church', 'gurudwara', 'buddhist-site'];
    const results: Place[] = [];
    
    for (const categoryId of religiousCategories) {
      const places = await this.searchByCategory(latitude, longitude, categoryId, radius);
      results.push(...places.slice(0, 5)); // Limit per category
      
      // Delay between searches
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log(`[OpenStreetMap] 🕉️ Found ${results.length} religious places`);
    return results;
  }

  /**
   * Search for historical places
   */
  async fetchHistoricalPlaces(
    latitude: number,
    longitude: number,
    radius: number = 5000
  ): Promise<Place[]> {
    const historicalCategories = ['fort', 'palace', 'monument', 'archaeological-site', 'heritage-building'];
    const results: Place[] = [];
    
    for (const categoryId of historicalCategories) {
      const places = await this.searchByCategory(latitude, longitude, categoryId, radius);
      results.push(...places.slice(0, 5)); // Limit per category
      
      // Delay between searches
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log(`[OpenStreetMap] 🏰 Found ${results.length} historical places`);
    return results;
  }

  /**
   * Search for nature places
   */
  async fetchNaturePlaces(
    latitude: number,
    longitude: number,
    radius: number = 5000
  ): Promise<Place[]> {
    const natureCategories = ['hill-station', 'waterfall', 'lake', 'national-park', 'garden', 'beach'];
    const results: Place[] = [];
    
    for (const categoryId of natureCategories) {
      const places = await this.searchByCategory(latitude, longitude, categoryId, radius);
      results.push(...places.slice(0, 5)); // Limit per category
      
      // Delay between searches
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log(`[OpenStreetMap] ⛰️ Found ${results.length} nature places`);
    return results;
  }
}

// Export singleton instance
export const openStreetMapTool = new OpenStreetMapTool();

// Export convenience functions
export async function fetchPlacesByCategory(
  latitude: number,
  longitude: number,
  categoryId: string,
  radius: number = 5000
): Promise<Place[]> {
  return openStreetMapTool.searchByCategory(latitude, longitude, categoryId, radius);
}

export async function fetchDiversePlaces(
  latitude: number,
  longitude: number,
  radius: number = 5000,
  maxPerCategory: number = 3
): Promise<Place[]> {
  return openStreetMapTool.fetchDiversePlaces(latitude, longitude, radius, maxPerCategory);
}

export async function fetchReligiousPlaces(
  latitude: number,
  longitude: number,
  radius: number = 5000
): Promise<Place[]> {
  return openStreetMapTool.fetchReligiousPlaces(latitude, longitude, radius);
}

export async function fetchHistoricalPlaces(
  latitude: number,
  longitude: number,
  radius: number = 5000
): Promise<Place[]> {
  return openStreetMapTool.fetchHistoricalPlaces(latitude, longitude, radius);
}

export async function fetchNaturePlaces(
  latitude: number,
  longitude: number,
  radius: number = 5000
): Promise<Place[]> {
  return openStreetMapTool.fetchNaturePlaces(latitude, longitude, radius);
}